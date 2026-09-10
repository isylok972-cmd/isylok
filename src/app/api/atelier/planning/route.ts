import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(requete: NextRequest) {
  try {
    const params = requete.nextUrl.searchParams
    const dateCibleStr = params.get('date') || new Date().toISOString().slice(0, 10)

    // 1. Récupérer les devis avec date d'événement contenant du PETIT_MATERIEL
    const devis = await prisma.devis.findMany({
      where: {
        dateEvenement: { not: null },
        statut: { in: ['VALIDE', 'FACTURE', 'ENVOYE', 'BROUILLON'] }
      },
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            entreprise: true,
            telephone: true,
            ville: true
          }
        },
        lignes: {
          where: {
            article: {
              type: 'PETIT_MATERIEL'
            }
          },
          select: {
            id: true,
            articleId: true,
            designation: true,
            quantite: true,
            article: {
              select: {
                id: true,
                nom: true,
                reference: true,
                quantiteTotale: true,
                quantiteDisponible: true,
                categorie: {
                  select: {
                    id: true,
                    nom: true,
                    icone: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { dateEvenement: 'asc' }
    })

    // Filtrer pour ne garder que les devis qui ont au moins une ligne de PETIT_MATERIEL
    const devisAtelier = devis.filter(d => d.lignes.length > 0)

    // Récupérer l'état des conditionnements existants
    const conditionnements = await prisma.conditionnementAtelier.findMany()
    const conditionnementsMap = new Map<string, boolean>()
    conditionnements.forEach(c => {
      conditionnementsMap.set(`${c.devisId}_${c.articleId}`, c.valide)
    })

    // 2. Construire la liste des flux de départs et retours
    interface FluxAtelier {
      id: string
      devisId: string
      numeroDevis: string
      typeFlux: 'DEPART' | 'RETOUR'
      date: string
      lieuEvenement: string
      client: {
        nom: string
        prenom: string | null
        entreprise: string | null
        telephone: string
        ville: string | null
      }
      totalPieces: number
      lignes: Array<{
        articleId: string | null
        nom: string
        reference: string
        quantite: number
        conditionne: boolean
      }>
    }

    const fluxDeparts: FluxAtelier[] = []
    const fluxRetours: FluxAtelier[] = []

    devisAtelier.forEach(d => {
      const dateDepart = new Date(d.dateEvenement!)
      const duree = Math.max(1, d.dureeLocation || 1)
      const dateRetour = new Date(dateDepart)
      dateRetour.setDate(dateRetour.getDate() + duree)

      const lignesFlux = d.lignes.map(l => ({
        articleId: l.articleId,
        nom: l.article?.nom || l.designation,
        reference: l.article?.reference || '—',
        quantite: l.quantite,
        conditionne: l.articleId ? (conditionnementsMap.get(`${d.id}_${l.articleId}`) || false) : false
      }))

      const totalPieces = lignesFlux.reduce((s, l) => s + l.quantite, 0)

      fluxDeparts.push({
        id: `depart_${d.id}`,
        devisId: d.id,
        numeroDevis: d.numero,
        typeFlux: 'DEPART',
        date: dateDepart.toISOString().slice(0, 10),
        lieuEvenement: d.lieuEvenement || 'Lieu non renseigné',
        client: d.client,
        totalPieces,
        lignes: lignesFlux
      })

      fluxRetours.push({
        id: `retour_${d.id}`,
        devisId: d.id,
        numeroDevis: d.numero,
        typeFlux: 'RETOUR',
        date: dateRetour.toISOString().slice(0, 10),
        lieuEvenement: d.lieuEvenement || 'Lieu non renseigné',
        client: d.client,
        totalPieces,
        lignes: lignesFlux
      })
    })

    // 3. Détection des ROTATIONS SERRÉES (< 5 jours)
    // On compare les dates de retour d'un article avec ses dates de prochain départ
    interface AlerteRotationSerree {
      articleId: string
      nomArticle: string
      referenceArticle: string
      quantiteARotater: number
      dateRetourSale: string
      numeroDevisRetour: string
      clientRetour: string
      dateDepartPrevu: string
      numeroDevisDepart: string
      clientDepart: string
      delaiJours: number
    }

    const alertesRotations: AlerteRotationSerree[] = []

    // Regrouper par articleId
    const retoursParArticle = new Map<string, Array<{ date: string; quantite: number; devisNumero: string; client: string; article: any }>>()
    const departsParArticle = new Map<string, Array<{ date: string; quantite: number; devisNumero: string; client: string }>>()

    fluxRetours.forEach(ret => {
      ret.lignes.forEach(l => {
        if (!l.articleId) return
        const list = retoursParArticle.get(l.articleId) || []
        const clientNom = `${ret.client.prenom ? `${ret.client.prenom} ` : ''}${ret.client.nom}${ret.client.entreprise ? ` (${ret.client.entreprise})` : ''}`
        list.push({
          date: ret.date,
          quantite: l.quantite,
          devisNumero: ret.numeroDevis,
          client: clientNom,
          article: l
        })
        retoursParArticle.set(l.articleId, list)
      })
    })

    fluxDeparts.forEach(dep => {
      dep.lignes.forEach(l => {
        if (!l.articleId) return
        const list = departsParArticle.get(l.articleId) || []
        const clientNom = `${dep.client.prenom ? `${dep.client.prenom} ` : ''}${dep.client.nom}${dep.client.entreprise ? ` (${dep.client.entreprise})` : ''}`
        list.push({
          date: dep.date,
          quantite: l.quantite,
          devisNumero: dep.numeroDevis,
          client: clientNom
        })
        departsParArticle.set(l.articleId, list)
      })
    })

    // Détecter les croisements < 5 jours
    retoursParArticle.forEach((retoursList, articleId) => {
      const departsList = departsParArticle.get(articleId)
      if (!departsList) return

      retoursList.forEach(r => {
        const dRetour = new Date(r.date).getTime()
        departsList.forEach(dep => {
          const dDepart = new Date(dep.date).getTime()
          const diffJours = Math.round((dDepart - dRetour) / (24 * 60 * 60 * 1000))

          if (diffJours >= 0 && diffJours < 5) {
            alertesRotations.push({
              articleId,
              nomArticle: r.article.nom,
              referenceArticle: r.article.reference,
              quantiteARotater: Math.min(r.quantite, dep.quantite),
              dateRetourSale: r.date,
              numeroDevisRetour: r.devisNumero,
              clientRetour: r.client,
              dateDepartPrevu: dep.date,
              numeroDevisDepart: dep.devisNumero,
              clientDepart: dep.client,
              delaiJours: diffJours
            })
          }
        })
      })
    })

    // Trier les alertes par urgence (délai le plus court d'abord)
    alertesRotations.sort((a, b) => a.delaiJours - b.delaiJours)

    // 4. Feuille de route journalière pour `dateCibleStr`
    const feuilleDeRoute = {
      date: dateCibleStr,
      aPreparer: fluxDeparts.filter(f => f.date === dateCibleStr),
      aReceptionner: fluxRetours.filter(f => f.date === dateCibleStr),
      rotationsDuJour: alertesRotations.filter(
        a => a.dateRetourSale === dateCibleStr || a.dateDepartPrevu === dateCibleStr
      )
    }

    return NextResponse.json({
      succes: true,
      donnees: {
        fluxDeparts,
        fluxRetours,
        alertesRotations,
        feuilleDeRoute
      }
    })
  } catch (erreur) {
    console.error('[API Atelier Planning] Erreur GET:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur chargement planning atelier' }, { status: 500 })
  }
}
