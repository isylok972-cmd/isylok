import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const sousLocations = await prisma.sousLocation.findMany({
      include: {
        fournisseur: true,
      },
      orderBy: { dateCreation: 'desc' }
    })
    
    // Pour le formulaire, on renvoie aussi la liste des fournisseurs et des devis
    const fournisseurs = await prisma.fournisseur.findMany()
    const devis = await prisma.devis.findMany({ 
      where: { statut: { in: ['BROUILLON', 'ENVOYE', 'VALIDE'] } },
      select: { id: true, numero: true, client: { select: { nom: true } } }
    })

    return NextResponse.json({ succes: true, donnees: { sousLocations, fournisseurs, devis } })
  } catch (erreur) {
    console.error('[API SousLocations] Erreur GET:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(requete: NextRequest) {
  try {
    const corps = await requete.json()
    const { fournisseurId, designation, quantite, prixAchat, prixRevente, dateDebut, dateFin } = corps

    if (!fournisseurId || !designation || !quantite || prixAchat === undefined || prixRevente === undefined) {
      return NextResponse.json({ succes: false, message: 'Données manquantes' }, { status: 400 })
    }

    const margeNette = (prixRevente - prixAchat) * quantite

    const sousLocation = await prisma.sousLocation.create({
      data: {
        fournisseurId,
        designation,
        quantite: parseInt(quantite),
        prixAchat: parseFloat(prixAchat),
        prixRevente: parseFloat(prixRevente),
        margeNette,
        dateDebut: new Date(dateDebut),
        dateFin: new Date(dateFin),
        statut: 'EN_COURS'
      },
      include: { fournisseur: true }
    })

    // NOTE: Pour le "lien avec le devis", si on voulait l'ajouter au devis, 
    // on créerait ici une LigneDevis pointant vers devisId (si passé).
    // On simplifie pour l'instant en enregistrant la sous-location dans le module Achats.

    return NextResponse.json({ succes: true, donnees: sousLocation }, { status: 201 })
  } catch (erreur) {
    console.error('[API SousLocations] Erreur POST:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur création' }, { status: 400 })
  }
}
