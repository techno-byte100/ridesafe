import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Clean existing data for clean seed
  await prisma.attendance.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.message.deleteMany()
  await prisma.trip.deleteMany()
  await prisma.stop.deleteMany()
  await prisma.emergencyAlert.deleteMany()
  await prisma.student.deleteMany()
  await prisma.bus.deleteMany()
  await prisma.route.deleteMany()
  await prisma.user.deleteMany()
  await prisma.systemSetting.deleteMany()

  // Seed Settings
  await prisma.systemSetting.create({
    data: {
      key: 'PICKUP_TIMES',
      value: JSON.stringify(['3:00 PM', '4:00 PM', '5:00 PM'])
    }
  })

  // Seed Users
  const passwordHash = await bcrypt.hash('password123', 10)

  const admin = await prisma.user.create({
    data: {
      name: 'School Admin',
      email: 'admin@ridesafe.com',
      password: passwordHash,
      role: 'SUPER_ADMIN',
      phone: '+1 555-000-0001'
    }
  })

  const driver = await prisma.user.create({
    data: {
      name: 'John Driver',
      email: 'driver@ridesafe.com',
      password: passwordHash,
      role: 'DRIVER',
      phone: '+1 555-000-0002'
    }
  })

  const parent1 = await prisma.user.create({
    data: {
      name: 'Alice Parent',
      email: 'parent1@ridesafe.com',
      password: passwordHash,
      role: 'PARENT',
      phone: '+1 555-111-2222'
    }
  })

  const parent2 = await prisma.user.create({
    data: {
      name: 'Bob Parent',
      email: 'parent2@ridesafe.com',
      password: passwordHash,
      role: 'PARENT',
      phone: '+1 555-333-4444'
    }
  })

  // Seed Route
  const routeA = await prisma.route.create({
    data: {
      name: 'Morning Route A',
      morningTime: '7:30 AM',
      afternoonTime: '3:00 PM'
    }
  })

  // Seed Stops
  const stop1 = await prisma.stop.create({
    data: {
      name: 'Maple Street Corner',
      latitude: 34.0522,
      longitude: -118.2437,
      order: 1,
      routeId: routeA.id
    }
  })

  const stop2 = await prisma.stop.create({
    data: {
      name: 'Oak Avenue Gate',
      latitude: 34.0530,
      longitude: -118.2450,
      order: 2,
      routeId: routeA.id
    }
  })

  // Seed Bus
  const bus1 = await prisma.bus.create({
    data: {
      plateNumber: 'BUS-001',
      capacity: 30,
      status: 'ACTIVE',
      driverId: driver.id,
      routeId: routeA.id
    }
  })

  // Seed Trip
  const trip1 = await prisma.trip.create({
    data: {
      routeId: routeA.id,
      driverId: driver.id,
      busId: bus1.id,
      status: 'TRIP_CREATED'
    }
  })

  // Seed Students
  await prisma.student.create({
    data: {
      name: 'Timmy Parent',
      grade: 'Grade 3',
      level: 'Primary',
      parentContact1: parent1.phone!,
      parentId: parent1.id,
      pickupTime: '3:00 PM',
      routeId: routeA.id,
      pickupStopId: stop1.id,
      dropoffStopId: stop2.id
    }
  })

  await prisma.student.create({
    data: {
      name: 'Sarah Parent',
      grade: 'Grade 1',
      level: 'Primary',
      parentContact1: parent2.phone!,
      parentId: parent2.id,
      isSelfPickup: true,
      routeId: routeA.id,
      pickupStopId: stop2.id,
      dropoffStopId: stop1.id
    }
  })

  await prisma.student.create({
    data: {
      name: 'Dave Student (No App Parent)',
      grade: 'Grade 5',
      level: 'Middle',
      parentContact1: '+1 555-999-8888',
      pickupTime: '4:00 PM',
      routeId: routeA.id,
      pickupStopId: stop1.id,
      dropoffStopId: stop2.id
    }
  })

  console.log('Database seeded successfully!')
  console.log('---------------------------')
  console.log('Test Accounts (Password: password123)')
  console.log('Admin : admin@ridesafe.com')
  console.log('Driver: driver@ridesafe.com')
  console.log('Parent: parent1@ridesafe.com')
  console.log('---------------------------')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
