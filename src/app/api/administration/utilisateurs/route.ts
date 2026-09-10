import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const ROLES_VALIDES = ['ADMIN', 'SECRETAIRE', 'LIVREUR', 'OPERATEUR_ATELIER', 'GESTIONNAIRE_WEB'] as const

export async function GET() {
  try {
    const utilisateurs = await prisma.utilisateur.findMany({
      where: {
        role: { not: 'SUPER_ADMIN' }
      },
      orderBy: { nom: 'asc' },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        role: true,
        telephone: true,
      }
    })
    return NextResponse.json({ succes: true, donnees: utilisateurs })
  } catch (erreur) {
    console.error('[API Utilisateurs GET] Erreur:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(requete: NextRequest) {
  try {
    const { nom, prenom, email, telephone, role, motDePasse } = await requete.json()

    if (!email || !motDePasse || !role) {
      return NextResponse.json({ succes: false, message: 'Champs obligatoires manquants' }, { status: 400 })
    }

    if (!ROLES_VALIDES.includes(role)) {
      return NextResponse.json({
        succes: false,
        message: `Rôle invalide "${role}". Rôles autorisés : ${ROLES_VALIDES.join(', ')}`
      }, { status: 400 })
    }

    const existe = await prisma.utilisateur.findUnique({ where: { email } })
    if (existe) {
      return NextResponse.json({ succes: false, message: 'Cet email est déjà utilisé' }, { status: 400 })
    }

    const hash = await bcrypt.hash(motDePasse, 12)

    const utilisateur = await prisma.utilisateur.create({
      data: {
        nom: nom || '',
        prenom: prenom || '',
        email,
        telephone: telephone || null,
        role,
        motDePasse: hash
      },
      select: { id: true, nom: true, prenom: true, email: true, role: true }
    })

    return NextResponse.json({ succes: true, donnees: utilisateur }, { status: 201 })
  } catch (erreur) {
    console.error('[API Utilisateurs POST] Erreur:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur création' }, { status: 500 })
  }
}

export async function PATCH(requete: NextRequest) {
  try {
    const { id, role, motDePasse, nom, prenom, email, telephone } = await requete.json()

    if (!id) return NextResponse.json({ succes: false, message: 'ID manquant' }, { status: 400 })

    if (role && !ROLES_VALIDES.includes(role)) {
      return NextResponse.json({
        succes: false,
        message: `Rôle invalide "${role}". Rôles autorisés : ${ROLES_VALIDES.join(', ')}`
      }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataToUpdate: any = {}
    if (role) dataToUpdate.role = role
    if (motDePasse) dataToUpdate.motDePasse = await bcrypt.hash(motDePasse, 12)
    if (nom !== undefined) dataToUpdate.nom = nom
    if (prenom !== undefined) dataToUpdate.prenom = prenom
    if (email !== undefined) dataToUpdate.email = email
    if (telephone !== undefined) dataToUpdate.telephone = telephone

    const utilisateur = await prisma.utilisateur.update({
      where: { id },
      data: dataToUpdate,
      select: { id: true, nom: true, prenom: true, email: true, role: true }
    })

    return NextResponse.json({ succes: true, donnees: utilisateur })
  } catch (erreur) {
    console.error('[API Utilisateurs PATCH] Erreur:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur modification' }, { status: 500 })
  }
}

export const PUT = PATCH
