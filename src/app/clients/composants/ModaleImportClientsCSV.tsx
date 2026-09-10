'use client'

import { useState, useRef, useMemo, ChangeEvent, DragEvent } from 'react'
import styles from '../clients.module.css'

export interface ClientImportApercu {
  idTemp: string
  code: string
  nom: string
  contact: string
  adresse1: string
  adresse2: string
  adresseComplete: string
  codePostal: string
  ville: string
  fixe: string
  portable: string
  telephone: string
  email: string
  type: 'PARTICULIER' | 'PROFESSIONNEL'
  estValide: boolean
  erreurs: string[]
}

export interface ImportClientsResultat {
  succes: boolean
  message: string
  statistiques: {
    totalSoumis: number
    totalValides: number
    crees: number
    misAJour: number
    demoSupprimes: number
  }
}

interface ModaleImportClientsCSVProps {
  onFermer: () => void
  onSucces: (resultat: ImportClientsResultat) => void
}

export function ModaleImportClientsCSV({
  onFermer,
  onSucces,
}: ModaleImportClientsCSVProps) {
  const [etape, setEtape] = useState<'upload' | 'apercu'>('upload')
  const [nomFichier, setNomFichier] = useState<string>('')
  const [tailleFichier, setTailleFichier] = useState<string>('')
  const [clients, setClients] = useState<ClientImportApercu[]>([])
  const [dragSurvol, setDragSurvol] = useState<boolean>(false)
  const [erreurUpload, setErreurUpload] = useState<string>('')
  const [filtreTypeApercu, setFiltreTypeApercu] = useState<'TOUS' | 'PARTICULIER' | 'PROFESSIONNEL' | 'ERREURS'>('TOUS')
  const [rechercheApercu, setRechercheApercu] = useState<string>('')
  const [nettoyerDemo, setNettoyerDemo] = useState<boolean>(true)
  const [enCoursImport, setEnCoursImport] = useState<boolean>(false)
  const [erreurImport, setErreurImport] = useState<string>('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Normalisation des clés d'en-têtes CSV
  const normaliserEntete = (entete: string): string => {
    return entete
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]/g, '')
      .trim()
  }

  // Détection du type particulier vs pro
  const detecterTypeClient = (nom: string, contact: string): 'PARTICULIER' | 'PROFESSIONNEL' => {
    const nomMin = nom.toLowerCase()
    if (
      nomMin.includes('sas') ||
      nomMin.includes('sarl') ||
      nomMin.includes('eurl') ||
      nomMin.includes('sci') ||
      nomMin.includes('mairie') ||
      nomMin.includes('ste ') ||
      nomMin.includes('societe') ||
      nomMin.includes('hotel') ||
      nomMin.includes('restaurant') ||
      nomMin.includes('agence') ||
      nomMin.includes('events') ||
      nomMin.includes('association') ||
      nomMin.includes('syndic') ||
      nomMin.includes('domaine') ||
      (contact && contact.trim().toLowerCase() !== nomMin.trim())
    ) {
      return 'PROFESSIONNEL'
    }
    return 'PARTICULIER'
  }

  // Traiter le contenu texte du fichier CSV
  const traiterContenuFichier = (texte: string, nom: string, taille: number) => {
    setErreurUpload('')
    try {
      const lignesBrutes = texte.split(/\r\n|\n|\r/)
      const lignes = lignesBrutes
        .map((l) => l.trimEnd())
        .filter((l) => l.trim().length > 0)

      if (lignes.length < 2) {
        setErreurUpload('Le fichier CSV est vide ou ne contient pas d\'en-têtes.')
        return
      }

      // Détecter le séparateur (priorité à la tabulation \t)
      const premiereLigne = lignes[0]
      let separateur = '\t'
      if (!premiereLigne.includes('\t')) {
        if (premiereLigne.includes(';')) separateur = ';'
        else if (premiereLigne.includes(',')) separateur = ','
      }

      const colonnes = premiereLigne.split(separateur).map((c) => c.trim().replace(/^["']|["']$/g, ''))
      const indexMap: { [cle: string]: number } = {}

      colonnes.forEach((col, idx) => {
        const norm = normaliserEntete(col)
        if (norm === 'CODE' || norm.includes('CODECLIENT') || norm === 'REF' || norm === 'ID') {
          indexMap['code'] = idx
        } else if (norm.includes('NOM') || norm.includes('RAISONSOCIALE') || norm === 'CLIENT' || norm === 'SOCIETE' || norm === 'ENTREPRISE') {
          indexMap['nom'] = idx
        } else if (norm === 'ADRESSE1' || norm === 'ADRESSE' || norm === 'RUE' || norm.includes('ADR1')) {
          indexMap['adresse1'] = idx
        } else if (norm === 'ADRESSE2' || norm.includes('ADR2') || norm.includes('COMPLEMENT')) {
          indexMap['adresse2'] = idx
        } else if (norm.includes('CODEPOSTAL') || norm === 'CP' || norm === 'POSTAL') {
          indexMap['codePostal'] = idx
        } else if (norm.includes('VILLE') || norm === 'COMMUNE' || norm === 'LOCALITE') {
          indexMap['ville'] = idx
        } else if (norm.includes('CONTACT1') || norm === 'CONTACT' || norm === 'INTERLOCUTEUR' || norm === 'PRENOM') {
          indexMap['contact'] = idx
        } else if (norm === 'FIXE' || norm.includes('TELFIXE') || norm === 'TELEPHONE') {
          indexMap['fixe'] = idx
        } else if (norm.includes('PORTABLE1') || norm === 'PORTABLE' || norm === 'MOBILE' || norm.includes('TELMOBILE') || norm === 'TEL2') {
          indexMap['portable'] = idx
        } else if (norm.includes('MAIL1') || norm === 'MAIL' || norm.includes('EMAIL') || norm === 'COURRIEL') {
          indexMap['email'] = idx
        }
      })

      if (indexMap['nom'] === undefined) {
        setErreurUpload('Format non reconnu. La colonne NOM est introuvable dans l\'en-tête.')
        return
      }

      const listeClients: ClientImportApercu[] = []

      for (let i = 1; i < lignes.length; i++) {
        const ligneTexte = lignes[i]
        if (!ligneTexte.trim()) continue

        const cellules = ligneTexte.split(separateur).map((c) => c.trim().replace(/^["']|["']$/g, ''))

        const getValeur = (cle: string): string => {
          const idx = indexMap[cle]
          return idx !== undefined && cellules[idx] !== undefined ? cellules[idx].trim() : ''
        }

        const rawCode = getValeur('code')
        const rawNom = getValeur('nom')
        const rawContact = getValeur('contact')
        const rawAdr1 = getValeur('adresse1')
        const rawAdr2 = getValeur('adresse2')
        const rawCp = getValeur('codePostal')
        const rawVille = getValeur('ville')
        const rawFixe = getValeur('fixe')
        const rawPortable = getValeur('portable')
        const rawEmail = getValeur('email')

        if (!rawNom && !rawCode) continue

        const erreurs: string[] = []
        if (!rawNom) erreurs.push('Nom manquant')

        const telPrincipal = rawPortable || rawFixe || 'Non renseigné'
        const adrComplete = [rawAdr1, rawAdr2].filter(Boolean).join(', ')
        const type = detecterTypeClient(rawNom, rawContact)

        listeClients.push({
          idTemp: `client-${i}-${Date.now()}`,
          code: rawCode || `CL-${i}`,
          nom: rawNom || 'Client Inconnu',
          contact: rawContact,
          adresse1: rawAdr1,
          adresse2: rawAdr2,
          adresseComplete: adrComplete,
          codePostal: rawCp,
          ville: rawVille,
          fixe: rawFixe,
          portable: rawPortable,
          telephone: telPrincipal,
          email: rawEmail,
          type,
          estValide: erreurs.length === 0,
          erreurs,
        })
      }

      if (listeClients.length === 0) {
        setErreurUpload('Aucune donnée client valide trouvée dans le fichier.')
        return
      }

      setNomFichier(nom)
      setTailleFichier(`${(taille / 1024).toFixed(1)} Ko`)
      setClients(listeClients)
      setEtape('apercu')
    } catch (err) {
      console.error('Erreur parsing CSV clients:', err)
      setErreurUpload('Erreur lors de la lecture du fichier.')
    }
  }

  const handleFichier = (fichier: File) => {
    if (!fichier) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const texte = e.target?.result as string
      traiterContenuFichier(texte, fichier.name, fichier.size)
    }
    reader.onerror = () => setErreurUpload('Impossible de lire le fichier sélectionné.')
    reader.readAsText(fichier, 'UTF-8')
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) handleFichier(e.target.files[0])
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragSurvol(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFichier(e.dataTransfer.files[0])
  }

  const basculerTypeClient = (idTemp: string) => {
    setClients((prev) =>
      prev.map((c) =>
        c.idTemp === idTemp
          ? { ...c, type: c.type === 'PROFESSIONNEL' ? 'PARTICULIER' : 'PROFESSIONNEL' }
          : c
      )
    )
  }

  const statsApercu = useMemo(() => {
    const total = clients.length
    const valides = clients.filter((c) => c.estValide).length
    const pros = clients.filter((c) => c.type === 'PROFESSIONNEL').length
    const particuliers = clients.filter((c) => c.type === 'PARTICULIER').length
    const erreurs = clients.filter((c) => !c.estValide).length
    const villesUniques = new Set(clients.map((c) => c.ville).filter(Boolean)).size

    return { total, valides, pros, particuliers, erreurs, villesUniques }
  }, [clients])

  const clientsFiltres = useMemo(() => {
    return clients.filter((c) => {
      if (filtreTypeApercu === 'PROFESSIONNEL' && c.type !== 'PROFESSIONNEL') return false
      if (filtreTypeApercu === 'PARTICULIER' && c.type !== 'PARTICULIER') return false
      if (filtreTypeApercu === 'ERREURS' && c.estValide) return false

      if (rechercheApercu) {
        const rech = rechercheApercu.toLowerCase()
        const match =
          c.nom.toLowerCase().includes(rech) ||
          c.code.toLowerCase().includes(rech) ||
          c.contact.toLowerCase().includes(rech) ||
          c.ville.toLowerCase().includes(rech) ||
          c.email.toLowerCase().includes(rech) ||
          c.telephone.toLowerCase().includes(rech)
        if (!match) return false
      }
      return true
    })
  }, [clients, filtreTypeApercu, rechercheApercu])

  const lancerImportation = async () => {
    const clientsAEnvoyer = clients.filter((c) => c.estValide)
    if (clientsAEnvoyer.length === 0) {
      setErreurImport('Aucun client valide à importer.')
      return
    }

    setEnCoursImport(true)
    setErreurImport('')

    try {
      const rep = await fetch('/api/clients/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clients: clientsAEnvoyer.map((c) => ({
            code: c.code,
            nom: c.nom,
            contact: c.contact,
            adresse1: c.adresse1,
            adresse2: c.adresse2,
            adresse: c.adresseComplete,
            codePostal: c.codePostal,
            ville: c.ville,
            fixe: c.fixe,
            portable: c.portable,
            telephone: c.telephone,
            email: c.email,
            type: c.type,
          })),
          nettoyerDemo,
        }),
      })

      const resultat = await rep.json()

      if (resultat.succes) {
        onSucces(resultat)
      } else {
        setErreurImport(resultat.message || 'Erreur lors de l\'importation des clients')
      }
    } catch {
      setErreurImport('Erreur de connexion réseau avec le serveur')
    } finally {
      setEnCoursImport(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onFermer}>
      <div
        className={`${styles.modale} ${styles.modaleLarge}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Entête */}
        <div className={styles.modaleEntete}>
          <div className={styles.modaleTitreAvecIcone}>
            <span className={styles.modaleIcone}>👥</span>
            <div>
              <h2>Importer des Clients (CSV / TSV)</h2>
              <p className={styles.modaleSousTitre}>
                Importation des coordonnées, contacts, adresses et typologie client.
              </p>
            </div>
          </div>
          <button className={styles.boutonFermer} onClick={onFermer} title="Fermer">✕</button>
        </div>

        {/* Étape 1 : Upload */}
        {etape === 'upload' && (
          <div className={styles.importContenu}>
            <div
              className={`${styles.dropzone} ${dragSurvol ? styles.dropzoneActive : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragSurvol(true) }}
              onDragLeave={() => setDragSurvol(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".csv,.tsv,.txt"
                onChange={handleInputChange}
              />
              <div className={styles.dropzoneIcone}>📇</div>
              <h3>Glissez-déposez votre fichier clients CSV / TSV ici</h3>
              <p>ou cliquez pour choisir un fichier sur votre appareil</p>
              <div className={styles.dropzoneBadges}>
                <span className={styles.dropzoneBadge}>Séparateur : Tabulation (\t) ou point-virgule</span>
                <span className={styles.dropzoneBadge}>Encodage : UTF-8</span>
                <span className={styles.dropzoneBadge}>Format : .csv, .tsv</span>
              </div>
            </div>

            {erreurUpload && (
              <div className={styles.erreurMessage}>
                ❌ {erreurUpload}
              </div>
            )}

            {/* Guide de mapping */}
            <div className={styles.guideMapping}>
              <h4>📋 Colonnes reconnues et mappées vers Prisma :</h4>
              <div className={styles.grilleMapping}>
                <div className={styles.itemMapping}>
                  <strong>CODE</strong>
                  <span>Code client (archivé dans les notes)</span>
                </div>
                <div className={styles.itemMapping}>
                  <strong>NOM</strong>
                  <span>Nom du client / Raison sociale</span>
                </div>
                <div className={styles.itemMapping}>
                  <strong>CONTACT 1</strong>
                  <span>Contact privilégié / Interlocuteur</span>
                </div>
                <div className={styles.itemMapping}>
                  <strong>ADRESSE 1 &amp; 2</strong>
                  <span>Adresse postale complète</span>
                </div>
                <div className={styles.itemMapping}>
                  <strong>CODE POSTAL / VILLE</strong>
                  <span>Localisation géographique</span>
                </div>
                <div className={styles.itemMapping}>
                  <strong>FIXE / PORTABLE / MAIL</strong>
                  <span>Téléphones &amp; Adresse e-mail</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Étape 2 : Aperçu */}
        {etape === 'apercu' && (
          <div className={styles.importContenu}>
            <div className={styles.infoFichierCharge}>
              <div className={styles.infoFichierTexte}>
                <span>📄 Fichier : <strong>{nomFichier}</strong> ({tailleFichier})</span>
                <span>• {statsApercu.total} client(s) détecté(s)</span>
              </div>
              <button
                className={styles.boutonChangerFichier}
                onClick={() => {
                  setClients([])
                  setNomFichier('')
                  setEtape('upload')
                }}
              >
                🔄 Choisir un autre fichier
              </button>
            </div>

            {/* Statistiques d'aperçu */}
            <div className={styles.grilleStatsApercu}>
              <div className={styles.carteStatApercu}>
                <span className={styles.statLabel}>Total Clients</span>
                <strong className={styles.statValeur}>{statsApercu.total}</strong>
                <span className={styles.statSous}>{statsApercu.valides} valides</span>
              </div>
              <div className={`${styles.carteStatApercu} ${styles.statPro}`}>
                <span className={styles.statLabel}>🏢 Professionnels</span>
                <strong className={styles.statValeur}>{statsApercu.pros}</strong>
                <span className={styles.statSous}>Entreprises &amp; Mairies</span>
              </div>
              <div className={`${styles.carteStatApercu} ${styles.statPart}`}>
                <span className={styles.statLabel}>👤 Particuliers</span>
                <strong className={styles.statValeur}>{statsApercu.particuliers}</strong>
                <span className={styles.statSous}>Clients individuels</span>
              </div>
              <div className={styles.carteStatApercu}>
                <span className={styles.statLabel}>📍 Villes</span>
                <strong className={styles.statValeur}>{statsApercu.villesUniques}</strong>
                <span className={styles.statSous}>communes différentes</span>
              </div>
            </div>

            {/* Option de nettoyage des démos */}
            <div className={styles.optionNettoyage}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={nettoyerDemo}
                  onChange={(e) => setNettoyerDemo(e.target.checked)}
                />
                <span>Supprimer automatiquement les 5 clients de démonstration initiaux</span>
              </label>
            </div>

            {/* Filtres & Recherche */}
            <div className={styles.barreFiltreApercu}>
              <div className={styles.ongletsApercu}>
                <button
                  className={`${styles.ongletApercu} ${filtreTypeApercu === 'TOUS' ? styles.ongletApercuActif : ''}`}
                  onClick={() => setFiltreTypeApercu('TOUS')}
                >
                  Tous ({statsApercu.total})
                </button>
                <button
                  className={`${styles.ongletApercu} ${filtreTypeApercu === 'PROFESSIONNEL' ? styles.ongletApercuActif : ''}`}
                  onClick={() => setFiltreTypeApercu('PROFESSIONNEL')}
                >
                  🏢 Pro ({statsApercu.pros})
                </button>
                <button
                  className={`${styles.ongletApercu} ${filtreTypeApercu === 'PARTICULIER' ? styles.ongletApercuActif : ''}`}
                  onClick={() => setFiltreTypeApercu('PARTICULIER')}
                >
                  👤 Particuliers ({statsApercu.particuliers})
                </button>
                {statsApercu.erreurs > 0 && (
                  <button
                    className={`${styles.ongletApercu} ${styles.ongletApercuErreur} ${filtreTypeApercu === 'ERREURS' ? styles.ongletApercuActif : ''}`}
                    onClick={() => setFiltreTypeApercu('ERREURS')}
                  >
                    ⚠️ Anomalies ({statsApercu.erreurs})
                  </button>
                )}
              </div>

              <div className={styles.champRechercheApercu}>
                <input
                  type="text"
                  placeholder="Filtrer les clients…"
                  value={rechercheApercu}
                  onChange={(e) => setRechercheApercu(e.target.value)}
                />
              </div>
            </div>

            {/* Tableau d'aperçu */}
            <div className={styles.tableauApercuConteneur}>
              <table className={styles.tableauApercu}>
                <thead>
                  <tr>
                    <th>CODE</th>
                    <th>NOM / RAISON SOCIALE</th>
                    <th>CONTACT</th>
                    <th>LOCALISATION</th>
                    <th>TÉLÉPHONE</th>
                    <th>EMAIL</th>
                    <th>TYPE</th>
                    <th>STATUT</th>
                  </tr>
                </thead>
                <tbody>
                  {clientsFiltres.length === 0 ? (
                    <tr>
                      <td colSpan={8} className={styles.celluleVideApercu}>
                        Aucun client ne correspond aux critères de filtre.
                      </td>
                    </tr>
                  ) : (
                    clientsFiltres.slice(0, 100).map((cl) => (
                      <tr key={cl.idTemp} className={!cl.estValide ? styles.ligneInvalide : undefined}>
                        <td>
                          <span className={styles.badgeRef}>{cl.code}</span>
                        </td>
                        <td>
                          <div className={styles.nomApercu}>{cl.nom}</div>
                        </td>
                        <td>
                          <span className={styles.contactApercu}>{cl.contact || '—'}</span>
                        </td>
                        <td>
                          <div className={styles.locApercu}>
                            <span>{cl.ville || '—'}</span>
                            {cl.codePostal && <small>{cl.codePostal}</small>}
                          </div>
                        </td>
                        <td>
                          <span className={styles.telApercu}>{cl.telephone}</span>
                        </td>
                        <td>
                          <span className={styles.emailApercu}>{cl.email || '—'}</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`${styles.badgeTypeApercu} ${
                              cl.type === 'PROFESSIONNEL' ? styles.badgeTypePro : styles.badgeTypePart
                            }`}
                            onClick={() => basculerTypeClient(cl.idTemp)}
                            title="Cliquez pour changer Particulier / Pro"
                          >
                            {cl.type === 'PROFESSIONNEL' ? '🏢 Pro' : '👤 Particulier'}
                            <span className={styles.iconeChanger}>⇄</span>
                          </button>
                        </td>
                        <td>
                          {cl.estValide ? (
                            <span className={styles.badgeValide}>✓ Prêt</span>
                          ) : (
                            <span className={styles.badgeInvalide} title={cl.erreurs.join(', ')}>
                              ⚠️ {cl.erreurs[0]}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {clientsFiltres.length > 100 && (
                <div className={styles.indicationPagination}>
                  Affichage des 100 premiers clients sur {clientsFiltres.length}. Tous les clients valides seront importés.
                </div>
              )}
            </div>

            {erreurImport && (
              <div className={styles.erreurMessage}>
                ❌ {erreurImport}
              </div>
            )}

            {/* Boutons d'action */}
            <div className={styles.modalePied}>
              <button
                type="button"
                className={styles.boutonAnnuler}
                onClick={onFermer}
                disabled={enCoursImport}
              >
                Annuler
              </button>
              <button
                type="button"
                className={styles.boutonValiderImport}
                onClick={lancerImportation}
                disabled={enCoursImport || statsApercu.valides === 0}
              >
                {enCoursImport ? (
                  '⏳ Importation en cours…'
                ) : (
                  `✓ Importer ${statsApercu.valides} client(s) (${statsApercu.pros} Pro, ${statsApercu.particuliers} Particulier)`
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
