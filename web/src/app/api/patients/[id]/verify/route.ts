import { NextRequest, NextResponse } from 'next/server'
import { verifyAndGetPatient } from '@/lib/parser'

export const runtime = 'edge'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let body: { code?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const code = body.code
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Code required' }, { status: 400 })
  }

  const patient = verifyAndGetPatient(id, code)
  if (!patient) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 401 })
  }

  // Remove viewCode before sending to client
  const { viewCode: _, ...safeData } = patient
  return NextResponse.json(safeData)
}
