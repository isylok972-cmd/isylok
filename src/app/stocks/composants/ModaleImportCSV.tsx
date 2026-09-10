'use client'

import { useState, useRef, useMemo, ChangeEvent, DragEvent } from 'react'
import styles from '../stocks.module.css'
import { formaterPrix } from '@/lib/utilitaires'

export interface ArticleImportApercu {
  idTemp: string
  reference: string
  nom: string
  famille: string
  categorieNom: string
  type: 'GROS_MATERIEL' | 'PETIT_MATERIEL'
  prixLocationJour: number
  quantiteTotale: number
  estValide: boolean
  erreurs: string[]
}

export interface ImportResultat {
  succes: boolean
  message: string
  statistiques: {
    totalSoumis: number
    totalValides: number
    crees: number
    misAJour: number
    categoriesNouvelles: string[]
  }
}

interface ModaleImportCSVProps {
  ongletActif: 'GROS_MATERIEL' | 'PETIT_MATERIEL'
  onFermer: () => void
  onSucces: (resultat: ImportResultat) => void
}

export function ModaleImportCSV({
  ongletActif,
  onFermer,
  onSucces,
}: ModaleImportCSVProps) {
  const [etape, setEtape] = useState<'upload' | 'apercu' | 'importation'>('upload')
  const [nomFichier, setNomFichier] = useState<string>('')
  const [tailleFichier, setTailleFichier] = useState<string>('')
  const [articles, setArticles] = useState<ArticleImportApercu[]>([])
  const [dragSurvol, setDragSurvol] = useState<boolean>(false)
  const [erreurUpload, setErreurUpload] = useState<string>('')
  const [filtreApercu, setFiltreApercu] = useState<'TOUS' | 'GROS_MATERIEL' | 'PETIT_MATERIEL' | 'ERREURS'>('TOUS')
  const [rechercheApercu, setRechercheApercu] = useState<string>('')
  const [enCoursImport, setEnCoursImport] = useState<boolean>(false)
  const [erreurImport, setErreurImport] = useState<string>('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Nettoyer les prix (remplacer virgule par point, supprimer symboles monétaires)
  const parserPrix = (valeurBrute: string): number => {
    if (!valeurBrute) return 0
    // Nettoyer espaces, symboles monétaires
    const nettoye = valeurBrute
      .toString()
      .replace(/[^\d,.-]/g, '')
      .replace(',', '.')
    const parsed = parseFloat(nettoye)
    return isNaN(parsed) ? 0 : Math.max(0, parsed)
  }

  // Nettoyer les quantités entières
  const parserQuantite = (valeurBrute: string): number => {
    if (!valeurBrute) return 0
    const nettoye = valeurBrute.toString().replace(/[^\d-]/g, '')
    const parsed = parseInt(nettoye, 10)
    return isNaN(parsed) ? 0 : Math.max(0, parsed)
  }

  // Déterminer le type (GROS_MATERIEL ou PETIT_MATERIEL) selon la famille
  const determinerType = (famille: string, categorie: string): 'GROS_MATERIEL' | 'PETIT_MATERIEL' => {
    const fam = famille.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
    const cat = categorie.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

    // 1. Structure ou Mobilier -> Gros Matériel
    if (
      fam.includes('STRUCTURE') ||
      fam.includes('MOBILIER') ||
      fam.includes('CHAPITEAU') ||
      fam.includes('TENTE') ||
      cat.includes('CHAPITEAU') ||
      cat.includes('MOBILIER') ||
      cat.includes('STRUCTURE') ||
      cat.includes('PAGODE')
    ) {
      return 'GROS_MATERIEL'
    }

    // 2. Vaisselle ou Textile -> Petit Matériel
    if (
      fam.includes('VAISSELLE') ||
      fam.includes('TEXTILE') ||
      fam.includes('LINGE') ||
      fam.includes('DECORATION') ||
      fam.includes('VERRE') ||
      cat.includes('VAISSELLE') ||
      cat.includes('TEXTILE') ||
      cat.includes('LINGE') ||
      cat.includes('VERRE') ||
      cat.includes('ASSIETTE') ||
      cat.includes('COUVERT') ||
      cat.includes('NAPPE')
    ) {
      return 'PETIT_MATERIEL'
    }

    // 3. Fallback selon l'onglet courant
    return ongletActif
  }

  // Normalisation des clés d'en-têtes CSV
  const normaliserEntete = (entete: string): string => {
    return entete
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]/g, '')
      .trim()
  }

  // Traiter le contenu texte du fichier
  const traiterContenuFichier = (texte: string, nom: string, taille: number) => {
    setErreurUpload('')
    try {
      // Découper par ligne en ignorant les lignes vides (skipEmptyLines: true)
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

      // Parser les colonnes d'en-tête
      const colonnes = premiereLigne.split(separateur).map((c) => c.trim().replace(/^["']|["']$/g, ''))
      const indexMap: { [cle: string]: number } = {}

      colonnes.forEach((col, idx) => {
        const norm = normaliserEntete(col)
        if (norm.includes('DESIGNATION') || norm === 'NOM' || norm === 'ARTICLE' || norm === 'LIBELLE') {
          indexMap['nom'] = idx
        } else if (norm.includes('REFERENCE') || norm.includes('REF') || norm.includes('SKU') || norm === 'CODE') {
          indexMap['reference'] = idx
        } else if (norm.includes('SOUSFAMILLE') || norm.includes('CATEGORIE') || norm.includes('SOUSCAT')) {
          indexMap['categorie'] = idx
        } else if (norm.includes('FAMILLE')) {
          indexMap['famille'] = idx
        } else if (norm.includes('STOCK') || norm.includes('QUANTITE') || norm.includes('QTE')) {
          indexMap['stock'] = idx
        } else if (norm.includes('HT') || norm.includes('PRIX') || norm.includes('PUHT') || norm.includes('TARIF')) {
          indexMap['ht'] = idx
        }
      })

      // Validation minimale des colonnes requises
      if (indexMap['nom'] === undefined && indexMap['reference'] === undefined) {
        setErreurUpload(
          'Format non reconnu. Les colonnes DESIGNATION ou RÉFÉRENCES sont introuvables dans l\'en-tête.'
        )
        return
      }

      const listeArticles: ArticleImportApercu[] = []

      // Parcourir chaque ligne de données
      for (let i = 1; i < lignes.length; i++) {
        const ligneTexte = lignes[i]
        if (!ligneTexte.trim()) continue

        const cellules = ligneTexte.split(separateur).map((c) => c.trim().replace(/^["']|["']$/g, ''))

        const getValeur = (cle: string): string => {
          const idx = indexMap[cle]
          return idx !== undefined && cellules[idx] !== undefined ? cellules[idx].trim() : ''
        }

        const rawRef = getValeur('reference')
        const rawNom = getValeur('nom')
        const rawFamille = getValeur('famille')
        const rawCategorie = getValeur('categorie') || rawFamille || 'Divers'
        const rawStock = getValeur('stock')
        const rawHt = getValeur('ht')

        // Ignorer une éventuelle répétition d'en-tête ou ligne vide
        if (!rawRef && !rawNom) continue

        const erreurs: string[] = []
        if (!rawRef) erreurs.push('Référence manquante')
        if (!rawNom) erreurs.push('Désignation manquante')

        const type = determinerType(rawFamille, rawCategorie)
        const prixLocationJour = parserPrix(rawHt)
        const quantiteTotale = parserQuantite(rawStock)

        listeArticles.push({
          idTemp: `import-${i}-${Date.now()}`,
          reference: rawRef || `REF-LIGNE-${i}`,
          nom: rawNom || 'Sans désignation',
          famille: rawFamille,
          categorieNom: rawCategorie,
          type,
          prixLocationJour,
          quantiteTotale,
          estValide: erreurs.length === 0,
          erreurs,
        })
      }

      if (listeArticles.length === 0) {
        setErreurUpload('Aucune donnée valide trouvée dans le fichier.')
        return
      }

      setNomFichier(nom)
      setTailleFichier(`${(taille / 1024).toFixed(1)} Ko`)
      setArticles(listeArticles)
      setEtape('apercu')
    } catch (err) {
      console.error('Erreur parsing CSV:', err)
      setErreurUpload('Erreur lors de la lecture du fichier. Assurez-vous qu\'il est encodé en UTF-8.')
    }
  }

  // Gestionnaire de fichier
  const handleFichier = (fichier: File) => {
    if (!fichier) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const texte = e.target?.result as string
      traiterContenuFichier(texte, fichier.name, fichier.size)
    }
    reader.onerror = () => {
      setErreurUpload('Impossible de lire le fichier sélectionné.')
    }
    reader.readAsText(fichier, 'UTF-8')
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFichier(e.target.files[0])
    }
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragSurvol(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFichier(e.dataTransfer.files[0])
    }
  }

  // Basculer le type d'un article dans l'aperçu
  const basculerTypeArticle = (idTemp: string) => {
    setArticles((prev) =>
      prev.map((a) =>
        a.idTemp === idTemp
          ? {
              ...a,
              type: a.type === 'GROS_MATERIEL' ? 'PETIT_MATERIEL' : 'GROS_MATERIEL',
            }
          : a
      )
    )
  }

  // Statistiques d'aperçu
  const statsApercu = useMemo(() => {
    const total = articles.length
    const valides = articles.filter((a) => a.estValide).length
    const gros = articles.filter((a) => a.type === 'GROS_MATERIEL').length
    const petit = articles.filter((a) => a.type === 'PETIT_MATERIEL').length
    const erreurs = articles.filter((a) => !a.estValide).length
    const categoriesUniques = new Set(articles.map((a) => a.categorieNom)).size
    const valeurTotale = articles.reduce((s, a) => s + a.prixLocationJour * a.quantiteTotale, 0)

    return { total, valides, gros, petit, erreurs, categoriesUniques, valeurTotale }
  }, [articles])

  // Articles filtrés pour l'affichage de l'aperçu
  const articlesFiltres = useMemo(() => {
    return articles.filter((a) => {
      // Filtre d'onglet
      if (filtreApercu === 'GROS_MATERIEL' && a.type !== 'GROS_MATERIEL') return false
      if (filtreApercu === 'PETIT_MATERIEL' && a.type !== 'PETIT_MATERIEL') return false
      if (filtreApercu === 'ERREURS' && a.estValide) return false

      // Filtre de recherche
      if (rechercheApercu) {
        const rech = rechercheApercu.toLowerCase()
        const correspond =
          a.reference.toLowerCase().includes(rech) ||
          a.nom.toLowerCase().includes(rech) ||
          a.categorieNom.toLowerCase().includes(rech) ||
          a.famille.toLowerCase().includes(rech)
        if (!correspond) return false
      }
      return true
    })
  }, [articles, filtreApercu, rechercheApercu])

  // Soumission finale vers l'API backend
  const lancerImportation = async () => {
    const articlesAEnvoyer = articles.filter((a) => a.estValide)
    if (articlesAEnvoyer.length === 0) {
      setErreurImport('Aucun article valide à importer.')
      return
    }

    setEnCoursImport(true)
    setErreurImport('')

    try {
      const rep = await fetch('/api/stocks/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articles: articlesAEnvoyer.map((a) => ({
            reference: a.reference,
            nom: a.nom,
            famille: a.famille,
            categorieNom: a.categorieNom,
            type: a.type,
            prixLocationJour: a.prixLocationJour,
            quantiteTotale: a.quantiteTotale,
          })),
        }),
      })

      const resultat = await rep.json()

      if (resultat.succes) {
        onSucces(resultat)
      } else {
        setErreurImport(resultat.message || 'Erreur lors de l\'importation en base de données')
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
            <span className={styles.modaleIcone}>📤</span>
            <div>
              <h2>Importer des articles (CSV / TSV)</h2>
              <p className={styles.modaleSousTitre}>
                Détection automatique de la structure, des familles et répartition dans les 2 onglets.
              </p>
            </div>
          </div>
          <button className={styles.boutonFermer} onClick={onFermer} title="Fermer">✕</button>
        </div>

        {/* Étape 1 : Téléversement / Sélection */}
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
              <div className={styles.dropzoneIcone}>📊</div>
              <h3>Glissez-déposez votre fichier CSV ici</h3>
              <p>ou cliquez pour sélectionner un fichier sur votre ordinateur</p>
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
              <h4>📋 Correspondance des colonnes reconnues :</h4>
              <div className={styles.grilleMapping}>
                <div className={styles.itemMapping}>
                  <strong>DÉSIGNATION</strong>
                  <span>Nom de l&apos;article</span>
                </div>
                <div className={styles.itemMapping}>
                  <strong>RÉFÉRENCES</strong>
                  <span>Référence unique / SKU</span>
                </div>
                <div className={styles.itemMapping}>
                  <strong>FAMILLE</strong>
                  <span>STRUCTURE/MOBILIER $\rightarrow$ Gros Matériel<br />VAISSELLE/TEXTILE $\rightarrow$ Petit Matériel</span>
                </div>
                <div className={styles.itemMapping}>
                  <strong>SOUS-FAMILLE / CATÉGORIE</strong>
                  <span>Catégorie de l&apos;article</span>
                </div>
                <div className={styles.itemMapping}>
                  <strong>STOCK</strong>
                  <span>Quantité totale / disponible</span>
                </div>
                <div className={styles.itemMapping}>
                  <strong>HT</strong>
                  <span>Prix unitaire HT par jour (virgule supportée)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Étape 2 : Aperçu et Répartition avant Importation */}
        {etape === 'apercu' && (
          <div className={styles.importContenu}>
            {/* Info fichier chargé */}
            <div className={styles.infoFichierCharge}>
              <div className={styles.infoFichierTexte}>
                <span>📄 Fichier : <strong>{nomFichier}</strong> ({tailleFichier})</span>
                <span>• {statsApercu.total} ligne(s) détectée(s)</span>
              </div>
              <button
                className={styles.boutonChangerFichier}
                onClick={() => {
                  setArticles([])
                  setNomFichier('')
                  setEtape('upload')
                }}
              >
                🔄 Choisir un autre fichier
              </button>
            </div>

            {/* Statistiques rapides de l'aperçu */}
            <div className={styles.grilleStatsApercu}>
              <div className={styles.carteStatApercu}>
                <span className={styles.statLabel}>Total Articles</span>
                <strong className={styles.statValeur}>{statsApercu.total}</strong>
                <span className={styles.statSous}>{statsApercu.valides} valides</span>
              </div>
              <div className={`${styles.carteStatApercu} ${styles.statGrosMat}`}>
                <span className={styles.statLabel}>⛺ Gros Matériel</span>
                <strong className={styles.statValeur}>{statsApercu.gros}</strong>
                <span className={styles.statSous}>Structures &amp; Mobilier</span>
              </div>
              <div className={`${styles.carteStatApercu} ${styles.statPetitMat}`}>
                <span className={styles.statLabel}>🍽️ Petit Matériel</span>
                <strong className={styles.statValeur}>{statsApercu.petit}</strong>
                <span className={styles.statSous}>Vaisselle &amp; Textile</span>
              </div>
              <div className={styles.carteStatApercu}>
                <span className={styles.statLabel}>📦 Catégories</span>
                <strong className={styles.statValeur}>{statsApercu.categoriesUniques}</strong>
                <span className={styles.statSous}>identifiées</span>
              </div>
            </div>

            {/* Barre de filtre & recherche de l'aperçu */}
            <div className={styles.barreFiltreApercu}>
              <div className={styles.ongletsApercu}>
                <button
                  className={`${styles.ongletApercu} ${filtreApercu === 'TOUS' ? styles.ongletApercuActif : ''}`}
                  onClick={() => setFiltreApercu('TOUS')}
                >
                  Tous ({statsApercu.total})
                </button>
                <button
                  className={`${styles.ongletApercu} ${filtreApercu === 'GROS_MATERIEL' ? styles.ongletApercuActif : ''}`}
                  onClick={() => setFiltreApercu('GROS_MATERIEL')}
                >
                  ⛺ Gros Matériel ({statsApercu.gros})
                </button>
                <button
                  className={`${styles.ongletApercu} ${filtreApercu === 'PETIT_MATERIEL' ? styles.ongletApercuActif : ''}`}
                  onClick={() => setFiltreApercu('PETIT_MATERIEL')}
                >
                  🍽️ Petit Matériel ({statsApercu.petit})
                </button>
                {statsApercu.erreurs > 0 && (
                  <button
                    className={`${styles.ongletApercu} ${styles.ongletApercuErreur} ${filtreApercu === 'ERREURS' ? styles.ongletApercuActif : ''}`}
                    onClick={() => setFiltreApercu('ERREURS')}
                  >
                    ⚠️ Anomalies ({statsApercu.erreurs})
                  </button>
                )}
              </div>

              <div className={styles.champRechercheApercu}>
                <input
                  type="text"
                  placeholder="Filtrer l'aperçu…"
                  value={rechercheApercu}
                  onChange={(e) => setRechercheApercu(e.target.value)}
                />
              </div>
            </div>

            {/* Tableau d'aperçu des lignes */}
            <div className={styles.tableauApercuConteneur}>
              <table className={styles.tableauApercu}>
                <thead>
                  <tr>
                    <th>RÉFÉRENCE</th>
                    <th>DÉSIGNATION</th>
                    <th>FAMILLE / CATÉGORIE</th>
                    <th>ONGLET ATTRIBUÉ</th>
                    <th>STOCK</th>
                    <th>PRIX HT / J</th>
                    <th>VALIDATION</th>
                  </tr>
                </thead>
                <tbody>
                  {articlesFiltres.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={styles.celluleVideApercu}>
                        Aucun article ne correspond aux filtres sélectionnés.
                      </td>
                    </tr>
                  ) : (
                    articlesFiltres.slice(0, 100).map((art) => (
                      <tr
                        key={art.idTemp}
                        className={!art.estValide ? styles.ligneInvalide : undefined}
                      >
                        <td>
                          <span className={styles.badgeRef}>{art.reference}</span>
                        </td>
                        <td>
                          <div className={styles.nomApercu}>{art.nom}</div>
                        </td>
                        <td>
                          <div className={styles.familleApercu}>
                            {art.famille && <span className={styles.familleTag}>{art.famille}</span>}
                            <span className={styles.catTag}>{art.categorieNom}</span>
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`${styles.badgeTypeApercu} ${
                              art.type === 'GROS_MATERIEL'
                                ? styles.badgeTypeGros
                                : styles.badgeTypePetit
                            }`}
                            onClick={() => basculerTypeArticle(art.idTemp)}
                            title="Cliquez pour changer d'onglet"
                          >
                            {art.type === 'GROS_MATERIEL' ? '⛺ Gros Matériel' : '🍽️ Petit Matériel'}
                            <span className={styles.iconeChanger}>⇄</span>
                          </button>
                        </td>
                        <td>
                          <span className={styles.valeurStockApercu}>
                            {art.quantiteTotale.toLocaleString('fr-FR')}
                          </span>
                        </td>
                        <td>
                          <span className={styles.prixApercu}>
                            {formaterPrix(art.prixLocationJour)}
                          </span>
                        </td>
                        <td>
                          {art.estValide ? (
                            <span className={styles.badgeValide}>✓ Prêt</span>
                          ) : (
                            <span className={styles.badgeInvalide} title={art.erreurs.join(', ')}>
                              ⚠️ {art.erreurs[0]}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {articlesFiltres.length > 100 && (
                <div className={styles.indicationPagination}>
                  Affichage des 100 premiers articles sur {articlesFiltres.length}. Tous les articles valides seront importés.
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
                  `✓ Importer ${statsApercu.valides} article(s) (${statsApercu.gros} Gros, ${statsApercu.petit} Petit)`
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
