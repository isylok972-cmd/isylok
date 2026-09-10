import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { genererNumero } from '@/lib/utilitaires'

export async function GET(requete: NextRequest) {
  try {
    const params = requete.nextUrl.searchParams
    const statut = params.get('statut')
    const source = params.get('source')
    
    const filtres: Record<string, unknown> = {}
    if (statut) filtres.statut = statut
    if (source) filtres.source = source

    const devis = await prisma.devis.findMany({
      where: filtres,
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            entreprise: true,
            type: true,
            email: true,
            telephone: true,
            statutApprobation: true
          }
        },
      },
      orderBy: { dateCreation: 'desc' },
    })

    return NextResponse.json({ succes: true, donnees: devis })
  } catch (erreur) {
    console.error('[API Devis] Erreur GET:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(requete: NextRequest) {
  try {
    const corps = await requete.json()

    // On récupère le premier utilisateur pour le createurId (temporaire)
    const admin = await prisma.utilisateur.findFirst()
    if (!admin) {
      return NextResponse.json({ succes: false, message: 'Aucun utilisateur trouvé pour créer le devis' }, { status: 400 })
    }

    // Générer un numéro de devis
    const annee = new Date().getFullYear()
    const count = await prisma.devis.count({ where: { numero: { startsWith: `DEV-${annee}` } } })
    const numero = genererNumero('DEV', annee, count + 1)

    // Créer le devis
    const devis = await prisma.devis.create({
      data: {
        numero,
        clientId: corps.clientId,
        createurId: admin.id,
        statut: 'BROUILLON',
        dateEvenement: corps.dateEvenement ? new Date(corps.dateEvenement) : null,
        lieuEvenement: corps.lieuEvenement || null,
        sousTotal: corps.sousTotal,
        tauxTva: typeof corps.tauxTva === 'number' ? corps.tauxTva : (corps.tauxTva !== undefined && corps.tauxTva !== null ? parseFloat(corps.tauxTva) : 8.5),
        montantTva: corps.montantTva,
        totalTtc: corps.totalTtc,
        lignes: {
          create: corps.lignes.map((l: any) => ({
            articleId: l.articleId || null,
            designation: l.designation,
            description: l.description || null,
            quantite: l.quantite,
            prixUnitaire: l.prixUnitaire,
            remiseLigne: l.remiseLigne || 0,
            totalLigne: l.totalLigne
          }))
        }
      },
      include: {
        client: true,
        lignes: true
      }
    })

    return NextResponse.json({ succes: true, donnees: devis }, { status: 201 })
  } catch (erreur) {
    console.error('[API Devis] Erreur POST:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur lors de la création du devis' }, { status: 400 })
  }
}
