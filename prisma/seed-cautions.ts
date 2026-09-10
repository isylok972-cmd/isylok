import { prisma } from '../src/lib/prisma'

async function main() {
  const clients = await prisma.client.findMany({ take: 5 })
  const devisList = await prisma.devis.findMany({ take: 5, include: { client: true } })
  const articles = await prisma.article.findMany({ where: { type: 'PETIT_MATERIEL' }, take: 5 })

  console.log(`Trouvé ${clients.length} clients, ${devisList.length} devis, ${articles.length} articles`)

  if (clients.length === 0) return

  // Vérifier si des cautions existent déjà
  const existing = await prisma.caution.count()
  console.log(`Cautions existantes: ${existing}`)

  if (existing < 3) {
    const client1 = clients[0]
    const devis1 = devisList[0]

    // 1. Caution en attente de restitution (événement récent)
    const caution1 = await prisma.caution.create({
      data: {
        clientId: client1.id,
        devisId: devis1?.id || null,
        montant: 800,
        type: 'CHEQUE',
        reference: 'CHQ-778901',
        statut: 'RECU_NON_ENCAISSE',
        dateDepot: new Date(),
        notes: 'Chèque conservé dans le coffre principal Isy Lok'
      }
    })

    // S'il y a un devis et des articles, créer un signalement de casse lié pour tester l'alerte litige !
    if (devis1 && articles.length > 0) {
      await prisma.declarationCasse.create({
        data: {
          clientId: client1.id,
          devisId: devis1.id,
          articleId: articles[0].id,
          quantite: 3,
          motif: 'CASSE',
          description: '3 verres cassés lors de la réception',
          impactCaution: 45,
          cautionId: caution1.id
        }
      })
      console.log('Créé déclaration de casse liée à caution 1')
    }

    // 2. Caution restituée totalement
    if (clients.length > 1) {
      const client2 = clients[1]
      const devis2 = devisList[1]
      await prisma.caution.create({
        data: {
          clientId: client2.id,
          devisId: devis2?.id || null,
          montant: 1200,
          type: 'CB_EMPREINTE',
          reference: 'EMP-CB-2026-99',
          statut: 'RESTITUE',
          dateDepot: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          dateRestitution: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          montantRestitue: 1200,
          montantRetenu: 0,
          notes: 'Matériel rendu en parfait état, empreinte CB libérée sans retenue.'
        }
      })
    }

    // 3. Caution restituée avec retenue partielle
    if (clients.length > 2) {
      const client3 = clients[2]
      const devis3 = devisList[2]
      await prisma.caution.create({
        data: {
          clientId: client3.id,
          devisId: devis3?.id || null,
          montant: 600,
          type: 'CHEQUE',
          reference: 'CHQ-55421',
          statut: 'ENCAISSE_PARTIEL',
          dateDepot: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          dateRestitution: new Date(),
          montantRetenu: 80,
          montantRestitue: 520,
          motifRetenue: 'Retenue 80 € pour 2 nappes tachées irrémédiablement et 4 verres ébréchés',
          notes: 'Accord amiable client signé. Chèque initial détruit, paiement solde par virement.'
        }
      })
    }

    // 4. Caution en attente de dépôt
    if (clients.length > 0) {
      await prisma.caution.create({
        data: {
          clientId: clients[0].id,
          montant: 500,
          type: 'VIREMENT',
          statut: 'EN_ATTENTE_DEPOT',
          notes: 'Demande de caution envoyée par email au client.'
        }
      })
    }
  }

  const finCount = await prisma.caution.count()
  console.log(`Nombre final de cautions: ${finCount}`)
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
