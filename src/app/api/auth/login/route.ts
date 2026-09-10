import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(requete: NextRequest) {
  try {
    const { email, motDePasse } = await requete.json()

    if (!email || !motDePasse) {
      return NextResponse.json({ succes: false, message: 'Identifiants manquants' }, { status: 400 })
    }

    const utilisateur = await prisma.utilisateur.findUnique({ where: { email } })
    
    if (!utilisateur) {
      return NextResponse.json({ succes: false, message: 'Utilisateur introuvable' }, { status: 401 })
    }

    const mdpValide = await bcrypt.compare(motDePasse, utilisateur.motDePasse)
    if (!mdpValide) {
      return NextResponse.json({ succes: false, message: 'Mot de passe incorrect' }, { status: 401 })
    }

    // Création de la réponse avec un cookie simple
    const response = NextResponse.json({ 
      succes: true, 
      donnees: { id: utilisateur.id, nom: utilisateur.nom, role: utilisateur.role } 
    })
    
    response.cookies.set('isylok_role', utilisateur.role, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    })
    response.cookies.set('isylok_user_id', utilisateur.id, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    })

    return response
  } catch (erreur) {
    console.error('[API Login]', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur serveur' }, { status: 500 })
  }
}
