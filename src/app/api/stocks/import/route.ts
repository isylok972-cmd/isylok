import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export interface ArticleImportLigne {
  reference: string
  nom: string
  famille?: string
  sousFamille?: string
  categorieNom: string
  type: 'GROS_MATERIEL' | 'PETIT_MATERIEL'
  prixLocationJour: number
  prixVente?: number | null
  quantiteTotale: number
  quantiteDisponible?: number
  seuilAlerte?: number
  description?: string | null
}

export async function POST(requete: NextRequest) {
  try {
    const corps = await requete.json()
    const { articles }: { articles: ArticleImportLigne[] } = corps

    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      return NextResponse.json(
        { succes: false, message: 'Aucun article valide fourni pour l\'importation' },
        { status: 400 }
      )
    }

    // Filtrer et nettoyer les articles
    const articlesValides: ArticleImportLigne[] = []
    const erreursValidation: { ligne: number; reference?: string; message: string }[] = []

    for (let index = 0; index < articles.length; index++) {
      const art = articles[index]
      const ref = (art.reference || '').trim()
      const nom = (art.nom || '').trim()

      if (!ref) {
        erreursValidation.push({ ligne: index + 1, message: 'Référence manquante' })
        continue
      }
      if (!nom) {
        erreursValidation.push({ ligne: index + 1, reference: ref, message: 'Désignation/Nom manquant' })
        continue
      }

      // Catégorie par défaut si non renseignée
      let catNom = (art.categorieNom || art.sousFamille || art.famille || 'Divers').trim()
      if (!catNom) catNom = 'Divers'

      const type = art.type === 'GROS_MATERIEL' ? 'GROS_MATERIEL' : 'PETIT_MATERIEL'
      const prix = typeof art.prixLocationJour === 'number' && !isNaN(art.prixLocationJour)
        ? Math.max(0, art.prixLocationJour)
        : 0
      const qte = typeof art.quantiteTotale === 'number' && !isNaN(art.quantiteTotale)
        ? Math.max(0, Math.floor(art.quantiteTotale))
        : 0

      articlesValides.push({
        reference: ref,
        nom,
        famille: art.famille?.trim(),
        sousFamille: art.sousFamille?.trim(),
        categorieNom: catNom,
        type,
        prixLocationJour: prix,
        prixVente: art.prixVente ?? null,
        quantiteTotale: qte,
        quantiteDisponible: art.quantiteDisponible ?? qte,
        seuilAlerte: art.seuilAlerte ?? (qte > 20 ? Math.max(5, Math.floor(qte * 0.1)) : 5),
        description: art.description?.trim() || null,
      })
    }

    if (articlesValides.length === 0) {
      return NextResponse.json(
        {
          succes: false,
          message: 'Aucun article valide trouvé dans les données fournies',
          erreurs: erreursValidation,
        },
        { status: 400 }
      )
    }

    // Récupérer toutes les catégories uniques nécessaires
    const mapCategories = new Map<string, { nom: string; type: string }>()
    for (const art of articlesValides) {
      if (!mapCategories.has(art.categorieNom)) {
        mapCategories.set(art.categorieNom, { nom: art.categorieNom, type: art.type })
      }
    }

    // Récupérer les catégories existantes en base
    const categoriesExistantes = await prisma.categorie.findMany({
      where: {
        nom: { in: Array.from(mapCategories.keys()) },
      },
    })

    const mapIdCategories = new Map<string, string>()
    categoriesExistantes.forEach((c) => {
      mapIdCategories.set(c.nom, c.id)
    })

    // Créer les catégories manquantes
    const categoriesACreer = Array.from(mapCategories.values()).filter(
      (c) => !mapIdCategories.has(c.nom)
    )

    const categoriesNouvelles: string[] = []
    for (const cat of categoriesACreer) {
      // Déterminer une icône et une couleur sympathiques par défaut
      const nomMin = cat.nom.toLowerCase()
      let icone = cat.type === 'GROS_MATERIEL' ? '⛺' : '🍽️'
      let couleur = cat.type === 'GROS_MATERIEL' ? '#8b5cf6' : '#06b6d4'

      if (nomMin.includes('chapiteau') || nomMin.includes('tente') || nomMin.includes('structure')) {
        icone = '⛺'
        couleur = '#6366f1'
      } else if (nomMin.includes('table') || nomMin.includes('chaise') || nomMin.includes('mobilier') || nomMin.includes('bar')) {
        icone = '🪑'
        couleur = '#8b5cf6'
      } else if (nomMin.includes('vaisselle') || nomMin.includes('assiette')) {
        icone = '🍽️'
        couleur = '#06b6d4'
      } else if (nomMin.includes('verre') || nomMin.includes('flute') || nomMin.includes('coupe')) {
        icone = '🍷'
        couleur = '#3b82f6'
      } else if (nomMin.includes('couvert') || nomMin.includes('fourchette') || nomMin.includes('couteau')) {
        icone = '🍴'
        couleur = '#10b981'
      } else if (nomMin.includes('linge') || nomMin.includes('nappe') || nomMin.includes('serviette') || nomMin.includes('textile')) {
        icone = '🧺'
        couleur = '#f59e0b'
      } else if (nomMin.includes('eclairage') || nomMin.includes('lumiere') || nomMin.includes('son')) {
        icone = '💡'
        couleur = '#ec4899'
      }

      try {
        const nouvelleCat = await prisma.categorie.create({
          data: {
            nom: cat.nom,
            type: cat.type,
            icone,
            couleur,
          },
        })
        mapIdCategories.set(nouvelleCat.nom, nouvelleCat.id)
        categoriesNouvelles.push(nouvelleCat.nom)
      } catch (err) {
        // En cas de conflit de concurrence, récupérer la catégorie
        const catExistante = await prisma.categorie.findUnique({ where: { nom: cat.nom } })
        if (catExistante) {
          mapIdCategories.set(catExistante.nom, catExistante.id)
        } else {
          console.error(`Erreur création catégorie ${cat.nom}:`, err)
        }
      }
    }

    // Récupérer les articles existants par référence pour identifier créations vs mises à jour
    const references = articlesValides.map((a) => a.reference)
    const articlesExistants = await prisma.article.findMany({
      where: { reference: { in: references } },
      select: { reference: true, quantiteTotale: true, quantiteDisponible: true },
    })

    const existantsMap = new Map(articlesExistants.map((a) => [a.reference, a]))

    let nbCrees = 0
    let nbMisAJour = 0
    const erreursImport: { reference: string; message: string }[] = []

    // Effectuer les upserts
    for (const art of articlesValides) {
      const categorieId = mapIdCategories.get(art.categorieNom)
      if (!categorieId) {
        erreursImport.push({ reference: art.reference, message: `Catégorie ${art.categorieNom} introuvable` })
        continue
      }

      const existant = existantsMap.get(art.reference)
      const estCreation = !existant

      try {
        await prisma.article.upsert({
          where: { reference: art.reference },
          update: {
            nom: art.nom,
            description: art.description,
            categorieId,
            type: art.type,
            prixLocationJour: art.prixLocationJour,
            prixVente: art.prixVente,
            quantiteTotale: art.quantiteTotale,
            quantiteDisponible: art.quantiteTotale, // met à jour le stock disponible
            seuilAlerte: art.seuilAlerte,
            statut: 'ACTIF',
          },
          create: {
            reference: art.reference,
            nom: art.nom,
            description: art.description,
            categorieId,
            type: art.type,
            prixLocationJour: art.prixLocationJour,
            prixVente: art.prixVente,
            quantiteTotale: art.quantiteTotale,
            quantiteDisponible: art.quantiteTotale,
            seuilAlerte: art.seuilAlerte,
            statut: 'ACTIF',
          },
        })

        if (estCreation) {
          nbCrees++
        } else {
          nbMisAJour++
        }
      } catch (err: unknown) {
        console.error(`Erreur import article ${art.reference}:`, err)
        erreursImport.push({
          reference: art.reference,
          message: err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement',
        })
      }
    }

    return NextResponse.json({
      succes: true,
      message: `Importation terminée avec succès : ${nbCrees} créés, ${nbMisAJour} mis à jour.`,
      statistiques: {
        totalSoumis: articles.length,
        totalValides: articlesValides.length,
        crees: nbCrees,
        misAJour: nbMisAJour,
        categoriesNouvelles,
      },
      erreurs: [...erreursValidation, ...erreursImport],
    })
  } catch (erreur: unknown) {
    console.error('[API Stocks Import] Erreur serveur:', erreur)
    return NextResponse.json(
      {
        succes: false,
        message: erreur instanceof Error ? erreur.message : 'Erreur interne lors de l\'importation',
      },
      { status: 500 }
    )
  }
}
