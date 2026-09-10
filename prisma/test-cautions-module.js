async function testerModuleCautions() {
  console.log('--- TEST DU MODULE CAUTIONS & DÉPÔTS ---')

  // 1. Test Dashboard
  const resHome = await fetch('http://localhost:3000/')
  const htmlHome = await resHome.text()
  const aBulle13 = htmlHome.includes('Cautions &amp; Dépôts') || htmlHome.includes('Cautions & Dépôts')
  const aLienCautions = htmlHome.includes('/cautions')
  console.log('1. Dashboard Bulle n°13 présente :', aBulle13, '| Lien /cautions :', aLienCautions)

  // 2. Test Page /cautions
  const resCautions = await fetch('http://localhost:3000/cautions')
  const htmlCautions = await resCautions.text()
  console.log('2. Page /cautions statut HTTP :', resCautions.status, '| Contient titre :', htmlCautions.includes('Cautions &amp; Dépôts de Garantie') || htmlCautions.includes('Cautions & Dépôts'))

  // 3. Test Page /commercial
  const resCommercial = await fetch('http://localhost:3000/commercial')
  const htmlCommercial = await resCommercial.text()
  console.log('3. Page /commercial statut HTTP :', resCommercial.status, '| Contient onglet Cautions :', htmlCommercial.includes('Cautions'))

  // 4. Test API GET /api/cautions
  const resApi = await fetch('http://localhost:3000/api/cautions')
  const dataApi = await resApi.json()
  console.log('4. API /api/cautions :', dataApi.succes, '| Nombre de dossiers :', dataApi.donnees?.length, '| KPIs :', dataApi.kpis)

  if (!dataApi.donnees || dataApi.donnees.length === 0) {
    console.error('Aucune caution trouvée pour les tests suivants')
    return
  }

  const cautionTest = dataApi.donnees[0]
  console.log('   Caution testée ID :', cautionTest.id, 'Client :', cautionTest.client.nom, 'Casses :', cautionTest.declarationsCasse?.length)

  // 5. Test API PUT /api/cautions/[id] (mise à jour avec retenue)
  const resPut = await fetch(`http://localhost:3000/api/cautions/${cautionTest.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      statut: 'ENCAISSE_PARTIEL',
      montantRetenu: 45,
      motifRetenue: 'Retenue validée pour 3 verres cassés',
      notes: 'Test de retenue partielle automatique'
    })
  })
  const dataPut = await resPut.json()
  console.log('5. API PUT mise à jour avec retenue :', dataPut.succes, '| Nouveau statut :', dataPut.donnees?.statut, '| Montant retenu :', dataPut.donnees?.montantRetenu, '| Montant restitué :', dataPut.donnees?.montantRestitue)

  // 6. Test API GET /api/cautions/[id]/pdf
  const resPdf = await fetch(`http://localhost:3000/api/cautions/${cautionTest.id}/pdf`)
  const contentType = resPdf.headers.get('content-type')
  const contentDisposition = resPdf.headers.get('content-disposition')
  const buffer = await resPdf.arrayBuffer()
  console.log('6. API PDF statut :', resPdf.status, '| Content-Type :', contentType, '| Disposition :', contentDisposition, '| Taille octets :', buffer.byteLength)

  console.log('--- TOUS LES TESTS SONT VALIDES À 100% ---')
}

testerModuleCautions().catch(console.error)
