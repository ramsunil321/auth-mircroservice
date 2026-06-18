const prisma = require('./src/config/db');

const email = process.argv[2];

if (!email) {
  console.error('Please specify an email address. Example: node promote-admin.js admin@test.com');
  process.exit(1);
}

async function main() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      console.error(`User with email "${email}" not found.`);
      process.exit(1);
    }

    const updated = await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { role: 'ADMIN' }
    });

    console.log(`Successfully promoted "${updated.email}" to role: ${updated.role}`);
  } catch (error) {
    console.error('Failed to promote user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
