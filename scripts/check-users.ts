import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Count users by role
  const usersByRole = await prisma.user.groupBy({
    by: ['role'],
    _count: { id: true },
    where: { isActive: true }
  });
  
  console.log('Users by role:');
  usersByRole.forEach(r => {
    console.log(`  ${r.role}: ${r._count.id}`);
  });

  // Check if there are ANSP users
  const anspUsers = await prisma.user.findMany({
    where: {
      role: { in: ['ANSP_ADMIN', 'SAFETY_MANAGER', 'STAFF'] },
      isActive: true,
    },
    select: { id: true, email: true, role: true, isActive: true }
  });
  
  console.log('\nANSP-level users:', anspUsers.length);
  anspUsers.slice(0, 5).forEach(u => {
    console.log(`  - ${u.email} (${u.role}) active=${u.isActive}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
