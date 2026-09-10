// ===========================================
// Event-Gérance Pro — Données de Démonstration
// ===========================================

import { PrismaClient } from '../src/generated/prisma/client.js'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' })
const prisma = new PrismaClient({ adapter })

async function graine() {
  console.log('🌱 Insertion des données de démonstration…')

  // Créer Parametres Entreprise
  await prisma.parametresEntreprise.create({
    data: {
      nom: 'Isy Lok Martinique',
      adresse: 'Z.I. La Lézarde, 97232 Le Lamentin',
      telephone: '05 96 12 34 56',
      email: 'contact@isylok.mq',
      siteWeb: 'www.isylok.mq',
      siret: '123 456 789 00012',
      numTVA: 'FR 12 3456789',
      formeJuridique: 'SAS au capital de 20 000€ - RCS Fort-de-France',
      iban: 'FR76 1234 5678 9012 3456 7890 123',
      bic: 'AGRIFR2P',
      mentionsLegales: 'Pénalités de retard : 3 fois le taux d\'intérêt légal en vigueur...',
      emailComptable: 'compta@isylok.mq',
      jourEnvoiComptable: 5
    }
  })

  // Créer les catégories
  const catChapiteaux = await prisma.categorie.create({
    data: { nom: 'Chapiteaux', type: 'GROS_MATERIEL', description: 'Structures de tentes et chapiteaux', icone: '⛺', couleur: '#6366f1' },
  })
  const catMobilier = await prisma.categorie.create({
    data: { nom: 'Mobilier', type: 'GROS_MATERIEL', description: 'Tables, chaises, bars', icone: '🪑', couleur: '#8b5cf6' },
  })
  const catVaisselle = await prisma.categorie.create({
    data: { nom: 'Vaisselle', type: 'PETIT_MATERIEL', description: 'Assiettes, verres, couverts', icone: '🍽️', couleur: '#06b6d4' },
  })
  const catDecoration = await prisma.categorie.create({
    data: { nom: 'Décoration', type: 'PETIT_MATERIEL', description: 'Nappes, housses, centres de table', icone: '✨', couleur: '#f59e0b' },
  })

  // Créer des articles
  const chapiteau10 = await prisma.article.create({
    data: {
      reference: 'CHP-001', nom: 'Chapiteau 10x15m', description: 'Chapiteau PVC blanc 150m²',
      categorieId: catChapiteaux.id, type: 'GROS_MATERIEL', prixLocationJour: 350,
      quantiteTotale: 4, quantiteDisponible: 3, seuilAlerte: 1,
    },
  })
  await prisma.article.create({
    data: {
      reference: 'CHP-002', nom: 'Chapiteau 6x8m', description: 'Chapiteau pagode 48m²',
      categorieId: catChapiteaux.id, type: 'GROS_MATERIEL', prixLocationJour: 180,
      quantiteTotale: 6, quantiteDisponible: 5, seuilAlerte: 2,
    },
  })
  await prisma.article.create({
    data: {
      reference: 'MOB-001', nom: 'Table ronde 180cm', description: 'Table pliante ronde 10 places',
      categorieId: catMobilier.id, type: 'GROS_MATERIEL', prixLocationJour: 12,
      quantiteTotale: 80, quantiteDisponible: 72, seuilAlerte: 10,
    },
  })
  await prisma.article.create({
    data: {
      reference: 'MOB-002', nom: 'Chaise Napoléon dorée', description: 'Chaise de réception dorée',
      categorieId: catMobilier.id, type: 'GROS_MATERIEL', prixLocationJour: 4.5,
      quantiteTotale: 400, quantiteDisponible: 350, seuilAlerte: 50,
    },
  })
  await prisma.article.create({
    data: {
      reference: 'VAI-001', nom: 'Assiette plate blanche', description: 'Assiette porcelaine 27cm',
      categorieId: catVaisselle.id, type: 'PETIT_MATERIEL', prixLocationJour: 0.8,
      quantiteTotale: 1000, quantiteDisponible: 900, seuilAlerte: 100,
    },
  })
  await prisma.article.create({
    data: {
      reference: 'VAI-002', nom: 'Verre à vin cristal', description: 'Verre 35cl',
      categorieId: catVaisselle.id, type: 'PETIT_MATERIEL', prixLocationJour: 0.6,
      quantiteTotale: 800, quantiteDisponible: 750, seuilAlerte: 100,
    },
  })
  await prisma.article.create({
    data: {
      reference: 'DEC-001', nom: 'Nappe ronde blanche', description: 'Nappe polyester 300cm',
      categorieId: catDecoration.id, type: 'PETIT_MATERIEL', prixLocationJour: 6,
      quantiteTotale: 120, quantiteDisponible: 100, seuilAlerte: 15,
    },
  })

  // Créer des gros équipements avec numéros de série
  for (let i = 1; i <= 4; i++) {
    await prisma.grosEquipement.create({
      data: {
        articleId: chapiteau10.id, numeroSerie: `CHP10-2024-${String(i).padStart(3, '0')}`,
        statut: i <= 3 ? 'DISPONIBLE' : 'EN_NETTOYAGE', etat: 'BON',
        dateAchat: new Date('2024-03-15'), valeurAchat: 8500,
      },
    })
  }

  // Créer l'admin par défaut (mot de passe: admin123 — à changer en production)
  await prisma.utilisateur.create({
    data: {
      email: 'admin@event-gerance.fr', motDePasse: '$2a$12$LQv3c1yqBo9SkvXS7QTJPOu0IBJp6cW0jLsQXJY4FHNVh7JQwjDBa',
      nom: 'Administrateur', prenom: 'Système', role: 'ADMIN', telephone: '06 00 00 00 00',
    },
  })

  // Créer une secrétaire
  await prisma.utilisateur.create({
    data: {
      email: 'secretaire@event-gerance.fr', motDePasse: '$2a$12$LQv3c1yqBo9SkvXS7QTJPOu0IBJp6cW0jLsQXJY4FHNVh7JQwjDBa',
      nom: 'Dupont', prenom: 'Marie', role: 'SECRETAIRE', telephone: '06 11 22 33 44',
    },
  })

  // Créer des livreurs
  await prisma.utilisateur.create({
    data: {
      email: 'livreur1@event-gerance.fr', motDePasse: '$2a$12$LQv3c1yqBo9SkvXS7QTJPOu0IBJp6cW0jLsQXJY4FHNVh7JQwjDBa',
      nom: 'Martin', prenom: 'Lucas', role: 'LIVREUR', telephone: '06 55 66 77 88',
    },
  })
  await prisma.utilisateur.create({
    data: {
      email: 'livreur2@event-gerance.fr', motDePasse: '$2a$12$LQv3c1yqBo9SkvXS7QTJPOu0IBJp6cW0jLsQXJY4FHNVh7JQwjDBa',
      nom: 'Petit', prenom: 'Thomas', role: 'LIVREUR', telephone: '06 99 88 77 66',
    },
  })

  // Créer des clients
  await prisma.client.create({
    data: {
      type: 'PROFESSIONNEL', nom: 'Événements Luxe SAS', entreprise: 'Événements Luxe SAS',
      siret: '12345678901234', email: 'contact@evenements-luxe.fr', telephone: '01 23 45 67 89',
      adresse: '15 rue de la Paix', codePostal: '75002', ville: 'Paris',
    },
  })
  await prisma.client.create({
    data: {
      type: 'PARTICULIER', nom: 'Bernard', prenom: 'Sophie',
      email: 'sophie.bernard@email.fr', telephone: '06 12 34 56 78',
      adresse: '42 avenue des Fleurs', codePostal: '69006', ville: 'Lyon',
    },
  })
  await prisma.client.create({
    data: {
      type: 'PROFESSIONNEL', nom: 'Mairie de Bordeaux', entreprise: 'Mairie de Bordeaux',
      email: 'evenements@bordeaux.fr', telephone: '05 56 00 00 00',
      adresse: 'Place Pey Berland', codePostal: '33000', ville: 'Bordeaux',
    },
  })
  await prisma.client.create({
    data: {
      type: 'PARTICULIER', nom: 'Durand', prenom: 'Marc',
      email: 'marc.durand@email.mq', telephone: '06 96 11 22 33',
      adresse: 'Route des Anses', codePostal: '97217', ville: 'Les Anses-d\'Arlet',
    },
  })
  await prisma.client.create({
    data: {
      type: 'PARTICULIER', nom: 'Lefevre', prenom: 'Julie',
      email: 'julie.lefevre@email.mq', telephone: '06 96 44 55 66',
      adresse: 'Quartier Cluny', codePostal: '97200', ville: 'Fort-de-France',
    },
  })

  // Créer un fournisseur
  await prisma.fournisseur.create({
    data: {
      nom: 'Location Sud Events', contact: 'Jean Moreau', telephone: '04 91 00 00 00',
      email: 'contact@sud-events.fr', type: 'CONFRERE',
    },
  })

  console.log('✅ Données de démonstration insérées avec succès !')
}

graine()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => { console.error('❌ Erreur:', e); await prisma.$disconnect(); process.exit(1) })
