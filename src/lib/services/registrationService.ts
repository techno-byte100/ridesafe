import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import prisma from '../db/prisma'
import { billplzAdapter } from '../adapters/billplz'

export const REGISTRATION_FEE = Number(process.env.REGISTRATION_FEE_AMOUNT || 50)

interface RegistrationInput {
  parentName: string
  parentEmail: string
  parentContact1: string
  parentContact2?: string | null
  studentName: string
  studentGrade: string
  studentLevel?: string | null
  dob?: string | null
  preferredStartDate?: string | null
  selfPickupSession?: string | null
  origin: string // request origin, e.g. https://ridesafe.com.my
}

function generateTempPassword(): string {
  return crypto.randomBytes(6).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) || 'Ride' + Date.now()
}

export class RegistrationService {
  async createPendingRegistration(input: RegistrationInput) {
    const amount = REGISTRATION_FEE

    const pending = await prisma.pendingRegistration.create({
      data: {
        parentName: input.parentName.trim(),
        parentEmail: input.parentEmail.trim().toLowerCase(),
        parentContact1: input.parentContact1.trim(),
        parentContact2: input.parentContact2?.trim() || null,
        studentName: input.studentName.trim(),
        studentGrade: input.studentGrade.trim(),
        studentLevel: input.studentLevel?.trim() || 'Primary',
        dob: input.dob ? new Date(input.dob) : null,
        preferredStartDate: input.preferredStartDate ? new Date(input.preferredStartDate) : null,
        selfPickupSession: input.selfPickupSession || null,
        amount,
        status: 'PENDING',
      },
    })

    const bill = await billplzAdapter.createBill({
      name: input.parentName.trim(),
      email: input.parentEmail.trim(),
      mobile: input.parentContact1.trim(),
      amount,
      description: `RideSafe registration — ${input.studentName.trim()}`,
      callbackUrl: `${input.origin}/api/public/billplz/callback`,
      redirectUrl: `${input.origin}/student-form?regId=${pending.id}`,
      reference: pending.id,
    })

    if (!bill.success) {
      await prisma.pendingRegistration.update({ where: { id: pending.id }, data: { status: 'FAILED' } })
      throw new Error(bill.error || 'Failed to create payment bill')
    }

    const updated = await prisma.pendingRegistration.update({
      where: { id: pending.id },
      data: { billId: bill.billId, billUrl: bill.url },
    })

    return { pending: updated, redirectUrl: bill.url! }
  }

  /**
   * Idempotently marks a pending registration as paid and creates the
   * parent User + Student records. Safe to call more than once for the
   * same registration (e.g. webhook retries).
   */
  async fulfillRegistration(pendingId: string) {
    const pending = await prisma.pendingRegistration.findUnique({ where: { id: pendingId } })
    if (!pending) throw new Error('Registration not found')
    if (pending.status === 'PAID') return pending // already fulfilled

    const tempPassword = generateTempPassword()
    const passwordHash = await bcrypt.hash(tempPassword, 12)

    // Reuse an existing parent account if this email already has one
    let parent = await prisma.user.findUnique({ where: { email: pending.parentEmail } })
    if (!parent) {
      parent = await prisma.user.create({
        data: {
          name: pending.parentName,
          email: pending.parentEmail,
          password: passwordHash,
          role: 'PARENT',
          phone: pending.parentContact1,
        },
      })
    }

    const student = await prisma.student.create({
      data: {
        name: pending.studentName,
        grade: pending.studentGrade,
        level: pending.studentLevel,
        dob: pending.dob,
        preferredStartDate: pending.preferredStartDate,
        parentContact1: pending.parentContact1,
        parentContact2: pending.parentContact2,
        isSelfPickup: !!pending.selfPickupSession,
        selfPickupSession: pending.selfPickupSession,
        status: 'PENDING',
        parentId: parent.id,
      },
    })

    await prisma.payment.create({
      data: {
        parentId: parent.id,
        amount: pending.amount,
        status: 'PAID',
        paidAt: new Date(),
      },
    })

    return prisma.pendingRegistration.update({
      where: { id: pendingId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        tempPassword,
        createdUserId: parent.id,
        createdStudentId: student.id,
      },
    })
  }
}

export const registrationService = new RegistrationService()
