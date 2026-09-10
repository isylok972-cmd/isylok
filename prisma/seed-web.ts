import { prisma } from '../src/lib/prisma'
import bcrypt from 'bcryptjs'

async function main() {
  console.log('--- Initialisation des données Web & CMS ---')

  // 1. Compte Gestionnaire Web
  const hash = await bcrypt.hash('admin123', 12)
  const userWeb = await prisma.utilisateur.upsert({
    where: { email: 'web@isylok.local' },
    update: {
      role: 'GESTIONNAIRE_WEB',
      nom: 'Web & CMS',
      prenom: 'Gestionnaire'
    },
    create: {
      email: 'web@isylok.local',
      nom: 'Web & CMS',
      prenom: 'Gestionnaire',
      telephone: '0596000000',
      role: 'GESTIONNAIRE_WEB',
      motDePasse: hash
    }
  })
  console.log('✅ Utilisateur web créé :', userWeb.email, `(${userWeb.role})`)

  // 2. Zones de livraison Martinique
  const zones = [
    {
      nomZone: 'Centre (CACEM)',
      communes: 'Fort-de-France, Le Lamentin, Schoelcher, Saint-Joseph',
      delaiLivraison: '24h',
      tarifEstime: 50,
      ordreAffichage: 1
    },
    {
      nomZone: 'Sud Martinique (CAESM)',
      communes: 'Ducos, Rivière-Salée, Sainte-Luce, Le Marin, Les Trois-Îlets, Sainte-Anne, Le Diamant, Rivière-Pilote, Les Anses-d\'Arlet',
      delaiLivraison: '24h à 48h',
      tarifEstime: 85,
      ordreAffichage: 2
    },
    {
      nomZone: 'Nord Caraïbe (CAP NORD)',
      communes: 'Case-Pilote, Bellefontaine, Le Carbet, Saint-Pierre, Le Morne-Rouge, Le Prêcheur, Fonds-Saint-Denis',
      delaiLivraison: '24h à 48h',
      tarifEstime: 95,
      ordreAffichage: 3
    },
    {
      nomZone: 'Nord Atlantique (CAP NORD)',
      communes: 'Le Robert, La Trinité, Le François, Sainte-Marie, Le Marigot, Le Lorrain, Basse-Pointe, Grand\'Rivière, Macouba, Gros-Morne, L\'Ajoupa-Bouillon',
      delaiLivraison: '24h à 48h',
      tarifEstime: 95,
      ordreAffichage: 4
    }
  ]

  for (const z of zones) {
    const existe = await prisma.optionZoneLivraison.findFirst({ where: { nomZone: z.nomZone } })
    if (!existe) {
      await prisma.optionZoneLivraison.create({ data: z })
    }
  }
  console.log('✅ Zones de livraison initialisées')

  // 3. Récupération de quelques articles pour les packs
  const articles = await prisma.article.findMany({ take: 10 })
  if (articles.length > 0) {
    // Mettre quelques articles en vedette
    await prisma.article.updateMany({
      where: { id: { in: articles.slice(0, 4).map(a => a.id) } },
      data: { enVedette: true, visibleSurWeb: true, afficherPrixWeb: true }
    })

    // Créer des packs événements clés en main si non existants
    const packsData = [
      {
        nom: 'Pack Mariage Prestige & Sérénité',
        slug: 'pack-mariage-prestige',
        description: 'Solution complète pour un mariage inoubliable sous les alizés : chapiteau cristal, tables rondes, chaises Napoléon et service de table complet.',
        typeEvenement: 'MARIAGE',
        capacitePersonnes: 100,
        prixEstime: 2450,
        enVedette: true,
        ordreAffichage: 1,
        image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80'
      },
      {
        nom: 'Pack Cocktail & Soirée Tropicale',
        slug: 'pack-cocktail-tropical',
        description: 'Ambiance lounge et festive : mange-debout habillés, tabourets hauts, verrerie cocktail et éclairage guirlandes guinguettes.',
        typeEvenement: 'COCKTAIL',
        capacitePersonnes: 60,
        prixEstime: 1150,
        enVedette: true,
        ordreAffichage: 2,
        image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80'
      },
      {
        nom: 'Pack Séminaire & Conférence Pro',
        slug: 'pack-seminaire-conference',
        description: 'Équipement corporate tout-en-un : chaises de conférence confortables, sonorisation, mange-debout pause-café et nappage soigné.',
        typeEvenement: 'ENTREPRISE',
        capacitePersonnes: 80,
        prixEstime: 1600,
        enVedette: false,
        ordreAffichage: 3,
        image: 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=800&q=80'
      }
    ]

    for (const p of packsData) {
      const existe = await prisma.packEvenement.findUnique({ where: { slug: p.slug } })
      if (!existe) {
        const pack = await prisma.packEvenement.create({ data: p })
        // Associer 2 à 3 articles au pack
        const articlesAssocies = articles.slice(0, 3)
        for (const art of articlesAssocies) {
          await prisma.packArticle.create({
            data: {
              packId: pack.id,
              articleId: art.id,
              quantiteDefaut: p.capacitePersonnes
            }
          })
        }
      }
    }
    console.log('✅ Packs événements créés')
  }

  console.log('--- Initialisation terminée avec succès ---')
}

main()
  .catch((e) => {
    console.error('Erreur seed-web:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
