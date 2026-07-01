import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedDemoTenant() {
  const tenantSlug = 'demo';
  const ownerEmail = 'owner@demo.local';
  const ownerPassword = 'Admin1234!';

  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: {},
    create: {
      name: 'Демо-магазин',
      slug: tenantSlug,
      plan: 'TRIAL',
      status: 'ACTIVE',
    },
  });

  const passwordHash = await bcrypt.hash(ownerPassword, 10);

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: ownerEmail } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: ownerEmail,
      passwordHash,
      fullName: 'Власник Демо',
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  console.info(`Seed: demo tenant ${tenant.slug} → ${ownerEmail} / ${ownerPassword}`);
}

/**
 * Створити (або оновити) платформного адміна.
 * Тенант з slug _platform існує лише як "власник" облікових записів PLATFORM_ADMIN,
 * жодних даних синхронізації там не буде.
 */
async function seedPlatformAdmin() {
  const slug = process.env.PLATFORM_TENANT_SLUG ?? '_platform';
  const email = process.env.PLATFORM_ADMIN_EMAIL;
  const password = process.env.PLATFORM_ADMIN_PASSWORD;
  if (!email || !password) {
    console.info('Seed: пропущено platform-адміна (немає PLATFORM_ADMIN_EMAIL/PASSWORD)');
    return;
  }

  const tenant = await prisma.tenant.upsert({
    where: { slug },
    update: { status: 'ACTIVE' },
    create: {
      name: 'Platform',
      slug,
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
    },
  });

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: email.toLowerCase() } },
    update: { passwordHash, role: 'PLATFORM_ADMIN', status: 'ACTIVE' },
    create: {
      tenantId: tenant.id,
      email: email.toLowerCase(),
      passwordHash,
      fullName: 'Platform Admin',
      role: 'PLATFORM_ADMIN',
      status: 'ACTIVE',
    },
  });

  console.info(`Seed: platform admin ${email} готовий (tenant slug=${slug})`);
}

async function main() {
  await seedDemoTenant();
  await seedPlatformAdmin();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
