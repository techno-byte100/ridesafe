import { jwtVerify, SignJWT } from 'jose'
import { cookies } from 'next/headers'

const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET || 'super-secret-key-for-dev'
  return new TextEncoder().encode(secret)
}

export async function signToken(payload: { id: string; role: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d') // 1 day
    .sign(getJwtSecretKey())
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey())
    return payload as { id: string; role: string }
  } catch (error) {
    return null
  }
}

export async function getUserFromSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  
  if (!token) return null
  
  return await verifyToken(token)
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete('token')
}
