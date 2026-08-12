import { NextRequest, NextResponse } from 'next/server'
import { registrationService, REGISTRATION_FEE } from '@/lib/services/registrationService'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { parentName, parentEmail, name, grade, level, dob, preferredStartDate, parentContact1, parentContact2, selfPickupSession } = await req.json()

    if (!parentName || !parentName.trim() || parentName.trim().length < 2) {
      return NextResponse.json({ error: 'Parent/guardian name must be at least 2 characters' }, { status: 400 })
    }
    if (!parentEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
      return NextResponse.json({ error: 'A valid parent/guardian email is required' }, { status: 400 })
    }
    if (!name || !name.trim() || name.trim().length < 2) {
      return NextResponse.json({ error: 'Student name must be at least 2 characters' }, { status: 400 })
    }
    if (!grade || !grade.trim()) {
      return NextResponse.json({ error: 'Grade is required' }, { status: 400 })
    }
    if (!parentContact1 || !/^[+0-9\s()-]{7,20}$/.test(parentContact1.trim())) {
      return NextResponse.json({ error: 'A valid parent/guardian phone number is required' }, { status: 400 })
    }
    const todayStr = new Date().toISOString().slice(0, 10)
    if (dob && dob > todayStr) {
      return NextResponse.json({ error: 'Date of birth cannot be in the future' }, { status: 400 })
    }
    if (preferredStartDate && preferredStartDate < todayStr) {
      return NextResponse.json({ error: 'Preferred start date cannot be in the past' }, { status: 400 })
    }

    const { pending, redirectUrl } = await registrationService.createPendingRegistration({
      parentName, parentEmail, parentContact1, parentContact2,
      studentName: name, studentGrade: grade, studentLevel: level, dob, preferredStartDate, selfPickupSession,
      origin: req.nextUrl.origin,
    })

    return NextResponse.json({ billId: pending.id, redirectUrl, amount: REGISTRATION_FEE })
  } catch (error) {
    console.error('Public student form error:', error)
    return NextResponse.json({ error: 'Failed to submit registration' }, { status: 500 })
  }
}
