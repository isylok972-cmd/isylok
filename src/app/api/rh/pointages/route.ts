import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(requete: NextRequest) {
  try {
    const params = requete.nextUrl.searchParams
    const dateStr = params.get('date')
    
    const filtres: any = {}
    if (dateStr) {
      const debut = new Date(dateStr)
      debut.setHours(0,0,0,0)
      const fin = new Date(dateStr)
      fin.setHours(23,59,59,999)
      filtres.horodatage = { gte: debut, lte: fin }
    }

    const pointages = await prisma.pointage.findMany({
      where: filtres,
      include: {
        utilisateur: { select: { id: true, nom: true, prenom: true, role: true } }
      },
      orderBy: { horodatage: 'desc' }
    })

    return NextResponse.json({ succes: true, donnees: pointages })
  } catch (erreur) {
    console.error('[API Pointages] Erreur GET:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(requete: NextRequest) {
  try {
    const corps = await requete.json()
    const { utilisateurId, type, latitudeGps, longitudeGps } = corps

    if (!utilisateurId || !type) {
      return NextResponse.json({ succes: false, message: 'Données manquantes' }, { status: 400 })
    }

    const pointage = await prisma.pointage.create({
      data: {
        utilisateurId,
        type, // DEBUT, FIN
        latitudeGps: latitudeGps || null,
        longitudeGps: longitudeGps || null,
        adresseGps: null, // À géo-décoder plus tard si besoin
      },
      include: { utilisateur: { select: { nom: true, prenom: true } } }
    })

    return NextResponse.json({ succes: true, donnees: pointage }, { status: 201 })
  } catch (erreur) {
    console.error('[API Pointages] Erreur POST:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur création pointage' }, { status: 400 })
  }
}
