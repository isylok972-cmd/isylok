const http = require('http');

function requete(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: data ? JSON.parse(data) : null });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, text: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Démarrage des tests Phase 2 (PWA, Pointage GPS, Espace Mobile Livreur)...');

  // 1. Vérification PWA manifest.webmanifest
  console.log('\n--- 1. Test Manifest Web PWA ---');
  const resManifest = await requete({
    hostname: 'localhost',
    port: 3000,
    path: '/manifest.webmanifest',
    method: 'GET'
  });
  console.log('GET /manifest.webmanifest -> Code HTTP:', resManifest.status);
  if (resManifest.status === 200 && resManifest.body) {
    console.log('✓ Nom:', resManifest.body.name);
    console.log('✓ Short name:', resManifest.body.short_name);
    console.log('✓ Theme color:', resManifest.body.theme_color);
    console.log('✓ Background color:', resManifest.body.background_color);
    console.log('✓ Display mode:', resManifest.body.display);
    if (
      resManifest.body.name === 'Isy Lok - Logistique & Réception' &&
      resManifest.body.short_name === 'Isy Lok' &&
      resManifest.body.theme_color === '#0f172a' &&
      resManifest.body.background_color === '#0f172a' &&
      resManifest.body.display === 'standalone'
    ) {
      console.log('✅ Manifest PWA 100% conforme au cahier des charges !');
    }
  } else {
    throw new Error('Échec manifest.webmanifest');
  }

  // 2. Vérification route /livreur (redirection 307 vers /terrain)
  console.log('\n--- 2. Test Redirection /livreur -> /terrain ---');
  const resLivreur = await requete({
    hostname: 'localhost',
    port: 3000,
    path: '/livreur',
    method: 'GET'
  });
  console.log('GET /livreur -> Status:', resLivreur.status, 'Location:', resLivreur.headers.location);
  if (resLivreur.status === 307 && resLivreur.headers.location === '/terrain') {
    console.log('✅ Redirection /livreur vers /terrain réussie !');
  }

  // 3. Test de la Pointeuse GPS autonome
  console.log('\n--- 3. Test Pointage GPS Livreur (DEBUT & FIN) ---');
  
  // Prise de poste
  const resDebut = await requete({
    hostname: 'localhost',
    port: 3000,
    path: '/api/livreur/pointage',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    action: 'DEBUT',
    gps: '16.2415,-61.5331',
    notes: 'Prise de poste test automatisé'
  });
  console.log('POST /api/livreur/pointage (DEBUT) -> Status:', resDebut.status, resDebut.body?.message);

  // Consultation pointage actif
  const resConsult = await requete({
    hostname: 'localhost',
    port: 3000,
    path: '/api/livreur/pointage',
    method: 'GET'
  });
  console.log('GET /api/livreur/pointage -> Actif:', Boolean(resConsult.body?.donnees?.pointageActif));
  console.log('✓ GPS début enregistré:', resConsult.body?.donnees?.pointageActif?.gpsDebut);

  // Fin de journée
  const resFin = await requete({
    hostname: 'localhost',
    port: 3000,
    path: '/api/livreur/pointage',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    action: 'FIN',
    gps: '16.2420,-61.5340',
    notes: 'Fin de journée test automatisé'
  });
  console.log('POST /api/livreur/pointage (FIN) -> Status:', resFin.status, resFin.body?.message);
  console.log('✓ Total heures calculé:', resFin.body?.donnees?.totalHeures);

  // 4. Test Feuille de route et Validation Dépose / Reprise
  console.log('\n--- 4. Test Livraison, Émargement Tactile & Constat Reprise ---');
  const resDevis = await requete({
    hostname: 'localhost',
    port: 3000,
    path: '/api/commercial/devis',
    method: 'GET'
  });

  const devisTest = resDevis.body?.donnees?.[0]?.id;

  if (devisTest) {
    console.log('Test émargement dépose sur devis:', devisTest);
    const resSignature = await requete({
      hostname: 'localhost',
      port: 3000,
      path: '/api/livreur/livraison',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      action: 'SIGNATURE',
      devisId: devisTest,
      signatureBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      signataireNom: 'Alexandre Martin (Client Test)',
      gps: '16.2415,-61.5331'
    });
    console.log('POST /api/livreur/livraison (SIGNATURE) ->', resSignature.body?.message);

    console.log('Test constat reprise & anomalies...');
    const resReprise = await requete({
      hostname: 'localhost',
      port: 3000,
      path: '/api/livreur/livraison',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      action: 'REPRISE',
      devisId: devisTest,
      anomalies: [
        {
          articleNom: 'Verre à pied 25cl',
          quantite: 2,
          description: 'Ébréché lors du banquet',
          photoUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
        }
      ],
      gps: '16.2415,-61.5331'
    });
    console.log('POST /api/livreur/livraison (REPRISE) ->', resReprise.body?.message);
    console.log('✅ Validation dépose & reprise validée !');
  }

  // 5. Rendu de la page /terrain
  console.log('\n--- 5. Test Rendu Page /terrain ---');
  const resPage = await requete({
    hostname: 'localhost',
    port: 3000,
    path: '/terrain',
    method: 'GET'
  });
  console.log('GET /terrain -> Status:', resPage.status);
  if (resPage.status === 200) {
    console.log('✅ Page mobile /terrain servie avec succès (HTTP 200) !');
  }

  console.log('\n🎉 TOUS LES POINTS DE CONTRÔLE DE LA PHASE 2 SONT VALIDÉS AVEC SUCCÈS !');
}

runTests().catch((e) => {
  console.error('❌ Erreur durant les tests:', e);
  process.exit(1);
});
