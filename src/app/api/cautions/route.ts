import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(requete: NextRequest) {
  try {
    const { searchParams } = requete.nextUrl
    const recherche = searchParams.get('recherche')?.toLowerCase().trim() || ''
    const statut = searchParams.get('statut') || ''
    const clientId = searchParams.get('clientId') || ''

    // Récupérer toutes les cautions
    const cautions = await prisma.caution.findMany({
      include: {
        client: true,
        devis: {
          select: {
            id: true,
            numero: true,
            statut: true,
            dateEvenement: true,
            lieuEvenement: true,
            typeEvenement: true,
            totalTtc: true
          }
        },
        declarationsCasse: {
          include: {
            article: {
              select: {
                id: true,
                nom: true,
                reference: true,
                prixVente: true
              }
            }
          }
        }
      },
      orderBy: { dateCreation: 'desc' }
    })

    // Récupérer également les déclarations de casse non associées à une caution mais associées au même devis
    const devisIds = cautions.map(c => c.devisId).filter(Boolean) as string[]
    const cassesParDevis = await prisma.declarationCasse.findMany({
      where: {
        devisId: { in: devisIds },
        cautionId: null
      },
      include: {
        article: {
          select: { id: true, nom: true, reference: true, prixVente: true }
        }
      }
    })

    // Associer les casses orphelines éventuelles à la caution correspondante
    const cautionsEnrichies = cautions.map(c => {
      const cassesSupp = c.devisId ? cassesParDevis.filter(cp => cp.devisId === c.devisId) : []
      const toutesLesCasses = [...c.declarationsCasse, ...cassesSupp]
      return {
        ...c,
        declarationsCasse: toutesLesCasses
      }
    })

    // Calcul des 3 KPIs globaux (sur l'ensemble des cautions, hors filtrage)
    const maintenant = new Date()
    const ilYA7Jours = new Date(maintenant.getTime() - 7 * 24 * 60 * 60 * 1000)

    let totalCautionsEnCours = 0
    let alertesLitiges = 0
    let aRestituerCetteSemaine = 0

    cautionsEnrichies.forEach(c => {
      // 1. Total cautions en cours (sécurisées / non encaissées)
      if (c.statut === 'RECU_NON_ENCAISSE' || c.statut === 'EN_ATTENTE_DEPOT') {
        totalCautionsEnCours += c.montant
      }

      // 2. Alertes litiges : caution en cours ou en litige avec déclarations de casse
      const aDeLaCasse = c.declarationsCasse.length > 0
      if (aDeLaCasse && c.statut !== 'RESTITUE' && c.statut !== 'ENCAISSE_TOTAL') {
        alertesLitiges++
      }

      // 3. Cautions à restituer : événement passé récemment (dans les 7 jours) et caution encore détenue
      if (c.devis?.dateEvenement && (c.statut === 'RECU_NON_ENCAISSE' || c.statut === 'EN_ATTENTE_DEPOT')) {
        const dateEvt = new Date(c.devis.dateEvenement)
        if (dateEvt <= maintenant && dateEvt >= ilYA7Jours) {
          aRestituerCetteSemaine++
        }
      }
    })

    // Filtrage
    let donneesFiltrees = cautionsEnrichies

    if (clientId) {
      donneesFiltrees = donneesFiltrees.filter(c => c.clientId === clientId)
    }

    if (statut && statut !== 'TOUS') {
      donneesFiltrees = donneesFiltrees.filter(c => c.statut === statut)
    }

    if (recherche) {
      donneesFiltrees = donneesFiltrees.filter(c => {
        const clientNom = `${c.client.nom} ${c.client.prenom || ''} ${c.client.entreprise || ''}`.toLowerCase()
        const devisNum = c.devis?.numero.toLowerCase() || ''
        const ref = c.reference?.toLowerCase() || ''
        const notes = c.notes?.toLowerCase() || ''
        return clientNom.includes(recherche) || devisNum.includes(recherche) || ref.includes(recherche) || notes.includes(recherche)
      })
    }

    return NextResponse.json({
      succes: true,
      donnees: donneesFiltrees,
      kpis: {
        totalCautionsEnCours,
        alertesLitiges,
        aRestituerCetteSemaine,
        totalDossiers: cautions.length
      }
    })
  } catch (erreur) {
    console.error('[API Cautions GET] Erreur:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur lors de la récupération des cautions' }, { status: 500 })
  }
}

export async function POST(requete: NextRequest) {
  try {
    const corps = await requete.json()
    const {
      clientId,
      devisId,
      montant,
      type = 'CHEQUE',
      reference,
      statut = 'EN_ATTENTE_DEPOT',
      dateDepot,
      notes
    } = corps

    if (!clientId) {
      return NextResponse.json({ succes: false, message: 'Le client est obligatoire' }, { status: 400 })
    }

    const montantNumerique = parseFloat(montant)
    if (isNaN(montantNumerique) || montantNumerique <= 0) {
      return NextResponse.json({ succes: false, message: 'Le montant de caution doit être supérieur à 0' }, { status: 400 })
    }

    const nouvelleCaution = await prisma.caution.create({
      data: {
        clientId,
        devisId: devisId || null,
        montant: montantNumerique,
        type,
        reference: reference || null,
        statut,
        dateDepot: dateDepot ? new Date(dateDepot) : (statut === 'RECU_NON_ENCAISSE' ? new Date() : null),
        dateReception: dateDepot ? new Date(dateDepot) : (statut === 'RECU_NON_ENCAISSE' ? new Date() : null),
        notes: notes || null
      },
      include: {
        client: true,
        devis: true
      }
    })

    return NextResponse.json({
      succes: true,
      donnees: nouvelleCaution,
      message: 'Caution enregistrée avec succès'
    })
  } catch (erreur) {
    console.error('[API Cautions POST] Erreur:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur lors de la création de la caution' }, { status: 500 })
  }
}
