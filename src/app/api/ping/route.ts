// API de vérification de connexion (heartbeat)
import { NextResponse } from 'next/server'

export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}

export async function GET() {
  return NextResponse.json({ statut: 'ok', horodatage: new Date().toISOString() })
}
