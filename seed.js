// backend/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 1. Create a user
  const hashedPassword = await bcrypt.hash('password', 10);
  const user = await prisma.user.upsert({
    where: { username: 'testuser' },
    update: { password: hashedPassword },
    create: {
      username: 'testuser',
      password: hashedPassword,
    },
  });
  console.log(`Created user: ${user.username}`);

  // 2. Create cattle entries
  const cattle1 = await prisma.cattle.upsert({
    where: { deviceId: 'esp32-001' },
    update: { name: 'Bessie' },
    create: {
      name: 'Bessie',
      deviceId: 'esp32-001',
    },
  });
  const cattle2 = await prisma.cattle.upsert({
    where: { deviceId: 'esp32-002' },
    update: { name: 'Daisy' },
    create: {
      name: 'Daisy',
      deviceId: 'esp32-002',
    },
  });
  const cattle3 = await prisma.cattle.upsert({
    where: { deviceId: 'esp32-003' },
    update: { name: 'MooMoo' },
    create: {
      name: 'MooMoo',
      deviceId: 'esp32-003',
    },
  });
  console.log('Created cattle:', cattle1.name, cattle2.name, cattle3.name);

  // 3. Create some initial sensor readings for each cattle
  const now = new Date();
  const readings = [];

  for (let i = 0; i < 100; i++) {
    const timeOffset = new Date(now.getTime() - (i * 60 * 1000)); // 1 minute apart
    readings.push(
      prisma.sensorReading.create({
        data: {
          cattleId: cattle1.id,
          temperature: parseFloat((37.5 + (Math.random() * 2)).toFixed(2)), // 37.5 - 39.5
          humidity: parseFloat((60 + (Math.random() * 10)).toFixed(2)),    // 60 - 70
          createdAt: timeOffset,
        },
      }),
      prisma.sensorReading.create({
        data: {
          cattleId: cattle2.id,
          temperature: parseFloat((38.0 + (Math.random() * 1.5)).toFixed(2)), // 38.0 - 39.5
          humidity: parseFloat((65 + (Math.random() * 8)).toFixed(2)),     // 65 - 73
          createdAt: timeOffset,
        },
      }),
      prisma.sensorReading.create({
        data: {
          cattleId: cattle3.id,
          temperature: parseFloat((36.0 + (Math.random() * 3)).toFixed(2)), // 36.0 - 39.0
          humidity: parseFloat((55 + (Math.random() * 15)).toFixed(2)),    // 55 - 70
          createdAt: timeOffset,
        },
      })
    );
  }
  await Promise.all(readings);
  console.log('Created initial sensor readings.');

  // 4. Create a couple of alerts
  const alert1 = await prisma.alert.create({
    data: {
      cattleId: cattle1.id,
      message: 'Temperature slightly elevated for Bessie.',
      level: 'warning',
      createdAt: new Date(now.getTime() - (5 * 60 * 1000)), // 5 minutes ago
    },
  });
  const alert2 = await prisma.alert.create({
    data: {
      cattleId: cattle2.id,
      message: 'High humidity detected for Daisy. Check environment.',
      level: 'critical',
      createdAt: new Date(now.getTime() - (2 * 60 * 1000)), // 2 minutes ago
    },
  });
  console.log('Created alerts:', alert1.message, alert2.message);

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
