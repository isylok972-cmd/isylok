const Database = require('better-sqlite3');
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_lqJDSWi3Y4kb@ep-green-cake-aeaxcurh-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

// Ordre topologique strict d'insertion (du parent vers les enfants)
const TABLES_ORDRE_INSERTION = [
  'utilisateurs',
  'clients',
  'categories',
  'fournisseurs',
  'parametres_entreprise',
  'options_zones_livraison',
  'packs_evenements',
  'articles',
  'pack_articles',
  'gros_equipements',
  'devis',
  'cautions',
  'declarations_casse',
  'factures',
  'conditionnements_atelier',
  'lots_lavage',
  'pointages',
  'pointages_livreur',
  'lignes_devis',
  'tournees',
  'etapes',
  'signatures_electroniques',
  'photos_terrain',
  'casses_signalees',
  'maintenances',
  'sous_locations',
  'publications_sociales',
  'journal_audit',
  'file_synchronisation',
  'comptes',
  'sessions'
];

async function migrer() {
  console.log('🚀 Démarrage de la migration complète : SQLite (dev.db) -> Neon PostgreSQL...');

  const sqlite = new Database('./dev.db', { readonly: true });
  const pg = new Client({ connectionString: DATABASE_URL });

  await pg.connect();
  console.log('✓ Connecté à la base de données distante Neon.');

  try {
    // 1. Nettoyage préliminaire en ordre inverse (évite les doublons en cas de relance)
    console.log('\n--- 1. Nettoyage des tables distantes ---');
    for (const table of [...TABLES_ORDRE_INSERTION].reverse()) {
      await pg.query(`TRUNCATE TABLE "${table}" CASCADE;`);
    }
    console.log('✓ Tables distantes prêtes et vidées.');

    // 2. Migration table par table
    console.log('\n--- 2. Transfert des données ---');
    let totalLignesTransferees = 0;

    for (const table of TABLES_ORDRE_INSERTION) {
      // Récupérer les informations sur les colonnes SQLite
      const colonnesInfo = sqlite.prepare(`PRAGMA table_info("${table}")`).all();
      if (!colonnesInfo || colonnesInfo.length === 0) continue;

      const colonnesNoms = colonnesInfo.map(c => c.name);
      const typesMap = {};
      colonnesInfo.forEach(c => {
        typesMap[c.name] = (c.type || '').toUpperCase();
      });

      // Lire les lignes SQLite
      const lignes = sqlite.prepare(`SELECT * FROM "${table}"`).all();
      if (lignes.length === 0) {
        console.log(`- ${table}: 0 ligne (ignoré)`);
        continue;
      }

      console.log(`- ${table}: migration de ${lignes.length} ligne(s)...`);

      // Préparation de la requête d'insertion
      const nomsColonnesSql = colonnesNoms.map(col => `"${col}"`).join(', ');

      for (const ligne of lignes) {
        const valeurs = colonnesNoms.map(col => {
          const val = ligne[col];
          if (val === null || val === undefined) return null;

          const typeCol = typesMap[col];
          if (typeCol.includes('BOOLEAN')) {
            return val === 1 || val === true || val === '1';
          }
          if (typeCol.includes('DATETIME') || typeCol.includes('TIMESTAMP') || col.startsWith('date') || col.endsWith('Date') || col === 'horodatage' || col.startsWith('heure')) {
            // Parser la date si c'est un format date ou nombre
            if (typeof val === 'number') {
              return new Date(val);
            }
            if (typeof val === 'string' && val.trim() !== '') {
              const d = new Date(val);
              return isNaN(d.getTime()) ? val : d;
            }
          }
          return val;
        });

        const placeholders = valeurs.map((_, idx) => `$${idx + 1}`).join(', ');
        const sql = `INSERT INTO "${table}" (${nomsColonnesSql}) VALUES (${placeholders});`;

        try {
          await pg.query(sql, valeurs);
        } catch (errInsert) {
          console.error(`❌ Erreur sur la table ${table}, ID ${ligne.id}:`, errInsert.message);
          throw errInsert;
        }
      }

      totalLignesTransferees += lignes.length;
      console.log(`  ✓ ${table}: ${lignes.length} ligne(s) insérée(s) avec succès.`);
    }

    // 3. Vérification de cohérence (comparaison des décomptes)
    console.log('\n--- 3. Vérification de conformité des décomptes ---');
    let toutConforme = true;

    for (const table of TABLES_ORDRE_INSERTION) {
      const sqliteCount = sqlite.prepare(`SELECT count(*) as c FROM "${table}"`).get().c;
      const pgRes = await pg.query(`SELECT count(*) as c FROM "${table}";`);
      const pgCount = parseInt(pgRes.rows[0].c, 10);

      if (sqliteCount > 0 || pgCount > 0) {
        const match = sqliteCount === pgCount;
        console.log(`${match ? '✅' : '❌'} ${table}: SQLite = ${sqliteCount} | Neon = ${pgCount}`);
        if (!match) toutConforme = false;
      }
    }

    if (toutConforme) {
      console.log(`\n🎉 MIGRATION TERMINÉE AVEC SUCCÈS : ${totalLignesTransferees} lignes migrées vers Neon PostgreSQL !`);
    } else {
      console.warn('\n⚠️ Certaines tables présentent des écarts de lignes. Vérifiez les logs.');
    }

  } catch (err) {
    console.error('❌ Erreur durant la migration:', err);
    process.exit(1);
  } finally {
    sqlite.close();
    await pg.end();
  }
}

migrer();
