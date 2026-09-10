import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { genererNumero } from '@/lib/utilitaires'

export async function GET(requete: NextRequest) {
  try {
    const params = requete.nextUrl.searchParams
    const livreurId = params.get('livreurId')
    const dateStr = params.get('date')
    
    const filtres: any = {}
    if (livreurId) filtres.livreurId = livreurId
    
    if (dateStr) {
      const debut = new Date(dateStr)
      debut.setHours(0,0,0,0)
      const fin = new Date(dateStr)
      fin.setHours(23,59,59,999)
      filtres.date = { gte: debut, lte: fin }
    }

    const tournees = await prisma.tournee.findMany({
      where: filtres,
      include: {
        livreur: { select: { nom: true, prenom: true } },
        etapes: { 
          include: { devis: { include: { client: true } } },
          orderBy: { ordre: 'asc' }
        }
      },
      orderBy: { date: 'asc' }
    })

    // On récupère aussi les devis non planifiés (Validés, ayant une date, sans étape de livraison prévue)
    const devisAPlanifier = await prisma.devis.findMany({
      where: {
        statut: { in: ['VALIDE', 'FACTURE'] },
        dateEvenement: { not: null },
        etapesTournee: { none: { type: 'LIVRAISON' } }
      },
      include: { client: true }
    })

    return NextResponse.json({ succes: true, donnees: { tournees, devisAPlanifier } })
  } catch (erreur) {
    console.error('[API Tournees] Erreur GET:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(requete: NextRequest) {
  try {
    const corps = await requete.json()
    const { livreurId, date, devisIds } = corps

    if (!livreurId || !date || !devisIds || devisIds.length === 0) {
      return NextResponse.json({ succes: false, message: 'Données manquantes' }, { status: 400 })
    }

    const annee = new Date(date).getFullYear()
    const count = await prisma.tournee.count({ where: { numero: { startsWith: `TRN-${annee}` } } })
    const numero = genererNumero('TRN', annee, count + 1)

    // Récupérer les adresses des devis pour créer les étapes
    const devis = await prisma.devis.findMany({
      where: { id: { in: devisIds } },
      include: { client: true }
    })

    const etapesData = devis.map((d, index) => ({
      devisId: d.id,
      ordre: index + 1,
      type: 'LIVRAISON',
      adresse: d.lieuEvenement || d.client.adresse || 'Adresse inconnue',
      codePostal: d.client.codePostal,
      ville: d.client.ville,
      statut: 'EN_ATTENTE'
    }))

    const tournee = await prisma.tournee.create({
      data: {
        numero,
        date: new Date(date),
        livreurId,
        statut: 'PLANIFIEE',
        etapes: {
          create: etapesData
        }
      },
      include: { etapes: true }
    })

    return NextResponse.json({ succes: true, donnees: tournee }, { status: 201 })
  } catch (erreur) {
    console.error('[API Tournees] Erreur POST:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur création tournée' }, { status: 400 })
  }
}
