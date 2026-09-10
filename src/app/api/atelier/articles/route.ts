import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(requete: NextRequest) {
  try {
    const roleCookie = requete.cookies.get('isylok_role')?.value
    const estOperateurAtelier = roleCookie === 'OPERATEUR_ATELIER'

    // Périmètre strict : uniquement PETIT_MATERIEL (vaisselle, couverts, verres, nappes...)
    const articles = await prisma.article.findMany({
      where: {
        type: 'PETIT_MATERIEL',
        statut: 'ACTIF'
      },
      include: {
        categorie: true
      },
      orderBy: { nom: 'asc' }
    })

    // Masquage systématique des montants financiers pour OPERATEUR_ATELIER
    const donneesNettoyees = articles.map(art => {
      if (estOperateurAtelier) {
        const { prixLocationJour, prixVente, ...sansPrix } = art
        return {
          ...sansPrix,
          prixLocationJour: 0,
          prixVente: null
        }
      }
      return art
    })

    return NextResponse.json({ succes: true, donnees: donneesNettoyees })
  } catch (erreur) {
    console.error('[API Atelier Articles]', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur serveur' }, { status: 500 })
  }
}
