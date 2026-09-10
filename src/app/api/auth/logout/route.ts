import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({
    succes: true,
    message: 'Déconnexion réussie'
  })

  // Supprimer les cookies d'authentification en fixant maxAge à 0
  response.cookies.set('isylok_user_id', '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  })

  response.cookies.set('isylok_role', '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  })

  return response
}

export const GET = POST
