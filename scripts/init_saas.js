const { Client } = require('pg')
const bcrypt = require('bcryptjs')
require('dotenv').config()

const DATABASE_URL = process.env.DATABASE_URL

async function main() {
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()

  try {
    const email = 'madacreaapp@gmail.com'
    const mdpClair = 'spyKim@102412'
    const hash = await bcrypt.hash(mdpClair, 12)

    // 1. Vérifier si l'utilisateur existe déjà
    const resUser = await client.query('SELECT id FROM utilisateurs WHERE email = $1', [email])
    if (resUser.rows.length > 0) {
      await client.query(
        'UPDATE utilisateurs SET role = $1, "motDePasse" = $2, nom = $3, prenom = $4, "dateMaj" = NOW() WHERE email = $5',
        ['SUPER_ADMIN', hash, 'Super Admin', 'SaaS', email]
      )
      console.log('✅ Compte Super Admin mis à jour :', email)
    } else {
      const id = 'cm_' + Math.random().toString(36).substring(2, 11)
      await client.query(
        'INSERT INTO utilisateurs (id, email, "motDePasse", nom, prenom, role, actif, telephone, "dateCreation", "dateMaj") VALUES ($1, $2, $3, $4, $5, $6, true, $7, NOW(), NOW())',
        [id, email, hash, 'Super Admin', 'SaaS', 'SUPER_ADMIN', '0596000000']
      )
      console.log('✅ Compte Super Admin inséré avec succès :', email)
    }

    // 2. Vérifier si une licence SaaS existe
    const resLicence = await client.query('SELECT id FROM licences_saas LIMIT 1')
    if (resLicence.rows.length === 0) {
      const idLicence = 'saas_' + Math.random().toString(36).substring(2, 11)
      const expirationDefaut = new Date()
      expirationDefaut.setFullYear(expirationDefaut.getFullYear() + 1) // +1 an d'accès initial

      const modulesConfig = JSON.stringify({
        stocks: true,
        commercial: true,
        planning: true,
        atelier: true,
        terrain: true,
        achats: true,
        rh: true,
        cautions: true,
        web: true,
        direction: true
      })

      await client.query(
        'INSERT INTO licences_saas (id, "cleLicence", "nomEntreprise", "statutActif", "dateExpirationGlobale", "modulesConfig", "dateCreation", "dateMaj") VALUES ($1, $2, $3, true, $4, $5, NOW(), NOW())',
        [idLicence, 'ISYLOK-PRO-972', 'Isy Lok Martinique', expirationDefaut, modulesConfig]
      )
      console.log('✅ Licence SaaS par défaut initialisée : ISYLOK-PRO-972 (Valide 1 an)')
    } else {
      console.log('✅ Licence SaaS existante détectée en base.')
    }
  } catch (err) {
    console.error('❌ Erreur initialisation :', err)
  } finally {
    await client.end()
  }
}

main()
