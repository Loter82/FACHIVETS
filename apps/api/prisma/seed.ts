import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
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

  console.info(`Seed готово. Tenant: ${tenant.slug}`);
  console.info(`Логін: ${ownerEmail} / Пароль: ${ownerPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
