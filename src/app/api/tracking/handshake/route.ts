import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { driverId, busId, qrToken, deviceId } = body;

    if (!driverId || !busId || !qrToken || !deviceId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Validate bus and driver assignment
    const bus = await prisma.bus.findUnique({
      where: { id: busId },
      include: { driver: true }
    });

    if (!bus) {
      return NextResponse.json({ error: 'Bus not found' }, { status: 404 });
    }

    if (bus.driverId !== driverId) {
      return NextResponse.json({ error: 'Driver is not assigned to this bus' }, { status: 403 });
    }

    // Validate QR token 
    if (bus.qrToken !== qrToken) {
      return NextResponse.json({ error: 'Invalid QR token' }, { status: 401 });
    }

    // Update user device id binding
    await prisma.user.update({
      where: { id: driverId },
      data: { deviceId }
    });

    // Invalidate any existing active session for this bus
    await prisma.trackingSession.updateMany({
      where: {
        busId,
        status: 'ACTIVE'
      },
      data: {
        status: 'EXPIRED',
        endTime: new Date()
      }
    });

    // Create tracking session
    const session = await prisma.trackingSession.create({
      data: {
        driverId,
        busId,
        deviceId,
        trackingMode: 'HYBRID', 
        status: 'ACTIVE',
      }
    });

    return NextResponse.json({
      sessionId: session.id,
      trackingMode: session.trackingMode,
      expiresIn: 8 * 60 * 60 // 8 hours in seconds
    });
  } catch (error) {
    console.error('Handshake Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
