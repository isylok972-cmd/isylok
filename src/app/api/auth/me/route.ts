import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(requete: NextRequest) {
  try {
    const roleCookie = requete.cookies.get('isylok_role')?.value
    const userIdCookie = requete.cookies.get('isylok_user_id')?.value

    if (!roleCookie && !userIdCookie) {
      return NextResponse.json({
        succes: true,
        donnees: { role: null, utilisateur: null }
      })
    }

    let utilisateur = null
    if (userIdCookie) {
      utilisateur = await prisma.utilisateur.findUnique({
        where: { id: userIdCookie },
        select: { id: true, nom: true, prenom: true, email: true, role: true }
      })
    }

    const role = utilisateur?.role || roleCookie || null

    return NextResponse.json({
      succes: true,
      donnees: {
        role,
        utilisateur
      }
    })
  } catch (erreur) {
    console.error('[API Auth Me]', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur serveur' }, { status: 500 })
  }
}
