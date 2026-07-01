import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import type { JwtPayload, LoginResponse, UserDto } from '@unipro-crm/shared-types';
import { PrismaService } from '@/prisma/prisma.module';
import type { AppEnv } from '@/config/env.validation';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  async login(email: string, password: string, meta: { ip?: string; userAgent?: string }) {
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase().trim(), status: 'ACTIVE' },
      include: { tenant: true },
    });
    if (!user) throw new UnauthorizedException('Невірний email або пароль');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Невірний email або пароль');

    if (user.tenant.status !== 'ACTIVE' && user.role !== 'PLATFORM_ADMIN') {
      throw new UnauthorizedException('Тенант неактивний');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokens(
      { sub: user.id, tenantId: user.tenantId, email: user.email, role: user.role },
      meta,
    );

    const dto: UserDto = this.toUserDto(user);
    const response: LoginResponse = { accessToken: tokens.accessToken, user: dto };
    return { ...response, refreshToken: tokens.refreshToken, refreshExpiresAt: tokens.refreshExpiresAt };
  }

  async refresh(rawToken: string, meta: { ip?: string; userAgent?: string }) {
    if (!rawToken) throw new UnauthorizedException('Відсутній refresh-токен');
    const tokenHash = this.hashToken(rawToken);

    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!existing) throw new UnauthorizedException('Невалідний refresh-токен');
    if (existing.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: existing.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh-токен переюзаний — сесії відкликано');
    }
    if (existing.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh-токен прострочений');
    }

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokens(
      {
        sub: existing.user.id,
        tenantId: existing.user.tenantId,
        email: existing.user.email,
        role: existing.user.role,
      },
      meta,
    );
    return tokens;
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const tokenHash = this.hashToken(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(payload: JwtPayload): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('Користувача не знайдено');
    return this.toUserDto(user);
  }

  private async issueTokens(
    payload: JwtPayload,
    meta: { ip?: string; userAgent?: string },
  ): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: this.config.get('JWT_ACCESS_TTL', { infer: true }),
    });

    const refreshRaw = randomBytes(48).toString('hex');
    const refreshHash = this.hashToken(refreshRaw);
    const days = this.config.get('JWT_REFRESH_TTL_DAYS', { infer: true });
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId: payload.sub,
        tokenHash: refreshHash,
        expiresAt,
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    });

    return { accessToken, refreshToken: refreshRaw, refreshExpiresAt: expiresAt };
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private toUserDto(user: {
    id: string;
    tenantId: string;
    email: string;
    fullName: string;
    role: UserDto['role'];
    status: UserDto['status'];
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): UserDto {
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  // Helper for bootstrap/тестів
  async hashPassword(plain: string): Promise<string> {
    if (plain.length < 8) throw new BadRequestException('Закороткий пароль');
    return bcrypt.hash(plain, 10);
  }
}
