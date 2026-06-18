const bcrypt = require('bcryptjs');
const prisma = require('./db');

async function seedAdmin() {
  try {
    const adminEmail = 'admin@test.com';
    const adminUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (!adminUser) {
      console.log('Seeding default Admin user...');
      const hashedPassword = await bcrypt.hash('AdminPassword@1234', 12);
      await prisma.user.create({
        data: {
          name: 'System Administrator',
          email: adminEmail,
          password: hashedPassword,
          role: 'ADMIN',
        }
      });
      console.log('Default Admin user seeded successfully (admin@test.com).');
    } else {
      console.log('Default Admin user already exists.');
    }
  } catch (error) {
    console.error('Error seeding default admin:', error);
  }
}

module.exports = seedAdmin;
