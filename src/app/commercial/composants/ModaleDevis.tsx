'use client'

import { useState, useEffect, useRef } from 'react'
import styles from '../commercial.module.css'
import { formaterPrix } from '@/lib/utilitaires'

export interface Client {
  id: string
  nom: string
  prenom: string | null
  entreprise: string | null
  ville: string | null
  telephone?: string | null
}

export interface ArticleStock {
  id: string
  reference: string
  nom: string
  prixLocationJour: number
  quantiteDisponible?: number
  categorie?: { nom: string }
}

interface PropsModaleDevis {
  devisIdEditer?: string | null
  onFermer: () => void
  onSucces: () => void
}

export interface LigneDevisModel {
  id: string // temporary internal id
  articleId: string
  designation: string
  quantite: number
  prixUnitaire: number
  remiseLigneType: 'POURCENTAGE' | 'MONTANT'
  remiseLigneValeur: number
  remiseLigne: number // calculated amount in €
  totalLigne: number
}

export function ModaleDevis({ devisIdEditer, onFermer, onSucces }: PropsModaleDevis) {
  const [clients, setClients] = useState<Client[]>([])
  const [articles, setArticles] = useState<ArticleStock[]>([])

  const [numeroDevis, setNumeroDevis] = useState('')
  const [sourceDevis, setSourceDevis] = useState('INTERNE')
  const [statutDevis, setStatutDevis] = useState('BROUILLON')

  // Client autocompletion state
  const [clientId, setClientId] = useState('')
  const [clientRecherche, setClientRecherche] = useState('')
  const [clientMenuOuvert, setClientMenuOuvert] = useState(false)
  const clientRef = useRef<HTMLDivElement>(null)

  const [dateEvenement, setDateEvenement] = useState('')
  const [lieuEvenement, setLieuEvenement] = useState('')
  const [lignes, setLignes] = useState<LigneDevisModel[]>([])
  
  // Article active dropdown search state per row
  const [rechercheArticleParLigne, setRechercheArticleParLigne] = useState<Record<string, string>>({})
  const [menuArticleOuvertParLigne, setMenuArticleOuvertParLigne] = useState<Record<string, boolean>>({})

  // Global discount state
  const [remiseGlobaleType, setRemiseGlobaleType] = useState<'POURCENTAGE' | 'MONTANT'>('MONTANT')
  const [remiseGlobaleValeur, setRemiseGlobaleValeur] = useState(0)

  // TVA selection state (Default: 8.5% Martinique / DOM)
  const [modeTauxTva, setModeTauxTva] = useState<string>('8.5')
  const [tauxTvaPerso, setTauxTvaPerso] = useState<number>(8.5)

  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    fetch('/api/clients')
      .then(r => r.json())
      .then(data => {
        if (data.succes) setClients(data.donnees)
      })
      .catch(console.error)

    fetch('/api/stocks')
      .then(r => r.json())
      .then(data => {
        if (data.succes) setArticles(data.donnees)
      })
      .catch(console.error)
  }, [])

  // Load existing quote if devisIdEditer is provided
  useEffect(() => {
    if (!devisIdEditer) return
    setChargement(true)
    fetch(`/api/commercial/devis/${devisIdEditer}`)
      .then(r => r.json())
      .then(data => {
        if (data.succes && data.donnees) {
          const d = data.donnees
          setNumeroDevis(d.numero || '')
          setSourceDevis(d.source || 'INTERNE')
          setStatutDevis(d.statut || 'BROUILLON')
          setClientId(d.clientId || '')
          if (d.client) {
            setClientRecherche(d.client.prenom ? `${d.client.prenom} ${d.client.nom}` : d.client.nom)
          }
          if (d.dateEvenement) {
            setDateEvenement(new Date(d.dateEvenement).toISOString().split('T')[0])
          }
          setLieuEvenement(d.lieuEvenement || '')

          const tvaVal = typeof d.tauxTva === 'number' ? d.tauxTva : 8.5
          if ([0, 2.1, 8.5, 20].includes(tvaVal)) {
            setModeTauxTva(String(tvaVal))
          } else {
            setModeTauxTva('PERSO')
            setTauxTvaPerso(tvaVal)
          }

          if (d.remise && d.remise > 0) {
            setRemiseGlobaleType('MONTANT')
            setRemiseGlobaleValeur(d.remise)
          }

          if (Array.isArray(d.lignes)) {
            const mappedLignes: LigneDevisModel[] = d.lignes.map((l: any, idx: number) => ({
              id: l.id || `l-${Date.now()}-${idx}`,
              articleId: l.articleId || '',
              designation: l.designation,
              quantite: l.quantite,
              prixUnitaire: l.prixUnitaire,
              remiseLigneType: 'MONTANT' as const,
              remiseLigneValeur: l.remiseLigne || 0,
              remiseLigne: l.remiseLigne || 0,
              totalLigne: l.totalLigne
            }))
            setLignes(mappedLignes)

            const mapNoms: Record<string, string> = {}
            mappedLignes.forEach(ml => {
              mapNoms[ml.id] = ml.designation
            })
            setRechercheArticleParLigne(mapNoms)
          }
        }
      })
      .catch(console.error)
      .finally(() => setChargement(false))
  }, [devisIdEditer])

  // Close menus on outside click
  useEffect(() => {
    const handleClickEnDehors = (e: MouseEvent) => {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) {
        setClientMenuOuvert(false)
      }
    }
    document.addEventListener('mousedown', handleClickEnDehors)
    return () => document.removeEventListener('mousedown', handleClickEnDehors)
  }, [])

  const clientsFiltres = clients.filter(c => {
    if (!clientRecherche.trim()) return true
    const q = clientRecherche.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const nomComplet = `${c.prenom || ''} ${c.nom}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const entreprise = (c.entreprise || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const ville = (c.ville || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return nomComplet.includes(q) || entreprise.includes(q) || ville.includes(q)
  })

  const clientSelectionne = clients.find(c => c.id === clientId)

  const ajouterLigne = () => {
    const newId = Math.random().toString()
    setLignes([
      ...lignes,
      {
        id: newId,
        articleId: '',
        designation: '',
        quantite: 1,
        prixUnitaire: 0,
        remiseLigneType: 'MONTANT',
        remiseLigneValeur: 0,
        remiseLigne: 0,
        totalLigne: 0
      }
    ])
  }

  const majLigne = (id: string, modifications: Partial<LigneDevisModel>) => {
    setLignes(prev =>
      prev.map(l => {
        if (l.id !== id) return l
        const updated = { ...l, ...modifications }

        const brut = (updated.quantite || 0) * (updated.prixUnitaire || 0)
        let montantRemise = 0

        if (updated.remiseLigneType === 'POURCENTAGE') {
          montantRemise = brut * ((updated.remiseLigneValeur || 0) / 100)
        } else {
          montantRemise = updated.remiseLigneValeur || 0
        }

        montantRemise = Math.max(0, Math.min(brut, montantRemise))
        updated.remiseLigne = Math.round(montantRemise * 100) / 100
        updated.totalLigne = Math.max(0, Math.round((brut - montantRemise) * 100) / 100)

        return updated
      })
    )
  }

  const selectionnerArticlePourLigne = (ligneId: string, article: ArticleStock) => {
    majLigne(ligneId, {
      articleId: article.id,
      designation: article.nom,
      prixUnitaire: article.prixLocationJour
    })
    setRechercheArticleParLigne(prev => ({ ...prev, [ligneId]: article.nom }))
    setMenuArticleOuvertParLigne(prev => ({ ...prev, [ligneId]: false }))
  }

  const supprimerLigne = (id: string) => {
    setLignes(lignes.filter(l => l.id !== id))
    setRechercheArticleParLigne(prev => {
      const copy = { ...prev }
      delete copy[id]
      return copy
    })
    setMenuArticleOuvertParLigne(prev => {
      const copy = { ...prev }
      delete copy[id]
      return copy
    })
  }

  // Dynamic calculations
  const sousTotal = Math.round(lignes.reduce((sum, l) => sum + l.totalLigne, 0) * 100) / 100
  const montantRemiseGlobale = Math.round(
    (remiseGlobaleType === 'POURCENTAGE'
      ? sousTotal * ((remiseGlobaleValeur || 0) / 100)
      : Math.min(sousTotal, remiseGlobaleValeur || 0)) * 100
  ) / 100

  const totalApresRemise = Math.max(0, Math.round((sousTotal - montantRemiseGlobale) * 100) / 100)
  const tauxTvaEffectif = modeTauxTva === 'PERSO' ? (tauxTvaPerso || 0) : parseFloat(modeTauxTva)
  const montantTva = Math.round(totalApresRemise * (tauxTvaEffectif / 100) * 100) / 100
  const totalTtc = Math.round((totalApresRemise + montantTva) * 100) / 100

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientId) {
      setErreur('Veuillez sélectionner un client')
      return
    }
    if (lignes.length === 0) {
      setErreur('Veuillez ajouter au moins une ligne')
      return
    }

    setChargement(true)
    setErreur('')

    try {
      const url = devisIdEditer ? `/api/commercial/devis/${devisIdEditer}` : '/api/commercial/devis'
      const method = devisIdEditer ? 'PUT' : 'POST'

      const rep = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          dateEvenement: dateEvenement || null,
          lieuEvenement,
          sousTotal,
          remise: montantRemiseGlobale,
          tauxTva: tauxTvaEffectif,
          montantTva,
          totalTtc,
          source: sourceDevis,
          statut: statutDevis,
          lignes: lignes.map(l => ({
            articleId: l.articleId || null,
            designation: l.designation,
            quantite: l.quantite,
            prixUnitaire: l.prixUnitaire,
            remiseLigne: l.remiseLigne,
            totalLigne: l.totalLigne
          }))
        })
      })

      const data = await rep.json()
      if (data.succes) {
        onSucces()
      } else {
        setErreur(data.message || "Erreur lors de l'enregistrement du devis")
      }
    } catch {
      setErreur('Erreur réseau')
    } finally {
      setChargement(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onFermer}>
      <div className={styles.modale} onClick={e => e.stopPropagation()}>
        <div className={styles.modaleEntete}>
          <h2>{devisIdEditer ? `📝 Modifier le Devis ${numeroDevis}` : '📝 Nouveau Devis'}</h2>
          <button className={styles.boutonFermer} onClick={onFermer} title="Fermer">✕</button>
        </div>

        <form className={styles.formulaire} onSubmit={soumettre}>
          {/* CLIENT AUTOCOMPLETE */}
          <div className={styles.champGroupe} ref={clientRef}>
            <label>Client * (recherche par nom, entreprise, ville)</label>
            
            {clientSelectionne ? (
              <div className={styles.clientSelectionneCarte}>
                <div className={styles.clientSelectionneInfos}>
                  <div className={styles.clientNomTitre}>
                    👤 {clientSelectionne.prenom ? `${clientSelectionne.prenom} ` : ''}{clientSelectionne.nom}
                  </div>
                  <div className={styles.clientSousTitre}>
                    {clientSelectionne.entreprise && `🏢 ${clientSelectionne.entreprise} • `}
                    {clientSelectionne.ville && `📍 ${clientSelectionne.ville} • `}
                    {clientSelectionne.telephone && `📞 ${clientSelectionne.telephone}`}
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.boutonEffacer}
                  onClick={() => {
                    setClientId('')
                    setClientRecherche('')
                    setClientMenuOuvert(true)
                  }}
                  title="Changer de client"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className={styles.autocompletionWrapper}>
                <div className={styles.champAutocompletion}>
                  <span className={styles.iconeChamp}>🔍</span>
                  <input
                    type="text"
                    placeholder="Tapez un nom, une entreprise ou une ville…"
                    value={clientRecherche}
                    onChange={e => {
                      setClientRecherche(e.target.value)
                      setClientMenuOuvert(true)
                    }}
                    onFocus={() => setClientMenuOuvert(true)}
                    required={!clientId}
                  />
                  {clientRecherche && (
                    <button
                      type="button"
                      className={styles.boutonEffacer}
                      onClick={() => setClientRecherche('')}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {clientMenuOuvert && (
                  <ul className={styles.menuSuggestions}>
                    {clientsFiltres.length === 0 ? (
                      <li style={{ padding: '10px 12px', fontSize: 13, color: '#94a3b8' }}>
                        Aucun client trouvé pour cette recherche
                      </li>
                    ) : (
                      clientsFiltres.map(c => (
                        <li
                          key={c.id}
                          className={styles.itemSuggestion}
                          onClick={() => {
                            setClientId(c.id)
                            setClientMenuOuvert(false)
                          }}
                        >
                          <div className={styles.suggestionNom}>
                            <span>
                              {c.prenom ? `${c.prenom} ` : ''}<strong>{c.nom}</strong>
                            </span>
                            {c.entreprise && <span className={styles.badgeMini}>{c.entreprise}</span>}
                          </div>
                          <div className={styles.suggestionDetails}>
                            {c.ville && <span>📍 {c.ville}</span>}
                            {c.telephone && <span>📞 {c.telephone}</span>}
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* DATE & LIEU */}
          <div className={styles.champLigne}>
            <div className={styles.champGroupe}>
              <label>Date de l'événement</label>
              <input
                type="date"
                value={dateEvenement}
                onChange={e => setDateEvenement(e.target.value)}
              />
            </div>
            <div className={styles.champGroupe}>
              <label>Lieu de l'événement</label>
              <input
                value={lieuEvenement}
                onChange={e => setLieuEvenement(e.target.value)}
                placeholder="Ex: Domaine de Mont-Parnasse, Lamentin..."
              />
            </div>
          </div>

          {/* LIGNES D'ARTICLES */}
          <div style={{ marginTop: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>
              Lignes d'articles du devis *
            </label>
            
            <div className={styles.lignesDevis}>
              <div className={styles.ligneDevisEnteteV2}>
                <span>Article / Recherche</span>
                <span>Qté</span>
                <span>Prix U. HT</span>
                <span>Remise</span>
                <span style={{ textAlign: 'right' }}>Total HT</span>
                <span></span>
              </div>

              {lignes.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                  Aucun article ajouté. Cliquez sur le bouton ci-dessous pour ajouter une ligne.
                </div>
              ) : (
                lignes.map(ligne => {
                  const queryLigne = rechercheArticleParLigne[ligne.id] ?? ''
                  const menuOuvert = menuArticleOuvertParLigne[ligne.id] ?? false

                  const articlesFiltres = articles.filter(a => {
                    if (!queryLigne.trim()) return true
                    const q = queryLigne.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    const nom = a.nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    const ref = a.reference.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    return nom.includes(q) || ref.includes(q)
                  })

                  return (
                    <div key={ligne.id} className={styles.ligneDevisItemV2}>
                      {/* Recherche article ou désignation manuelle */}
                      <div className={styles.autocompletionWrapper}>
                        <div className={styles.champAutocompletion}>
                          <input
                            placeholder="Recherche stock (nom ou réf)..."
                            value={queryLigne}
                            onChange={e => {
                              const val = e.target.value
                              setRechercheArticleParLigne(prev => ({ ...prev, [ligne.id]: val }))
                              majLigne(ligne.id, { designation: val })
                              setMenuArticleOuvertParLigne(prev => ({ ...prev, [ligne.id]: true }))
                            }}
                            onFocus={() => {
                              setMenuArticleOuvertParLigne(prev => ({ ...prev, [ligne.id]: true }))
                            }}
                            required
                            style={{ padding: '8px 10px', fontSize: 13 }}
                          />
                        </div>

                        {menuOuvert && (
                          <ul className={styles.menuSuggestions}>
                            {articlesFiltres.length === 0 ? (
                              <li style={{ padding: '8px 10px', fontSize: 12, color: '#94a3b8' }}>
                                Aucun article en stock trouvé (la saisie reste personnalisée)
                              </li>
                            ) : (
                              articlesFiltres.slice(0, 8).map(a => (
                                <li
                                  key={a.id}
                                  className={styles.itemSuggestion}
                                  onMouseDown={e => {
                                    e.preventDefault()
                                    selectionnerArticlePourLigne(ligne.id, a)
                                  }}
                                >
                                  <div className={styles.suggestionNom}>
                                    <span>{a.nom}</span>
                                    <span className={styles.badgeMini}>{a.reference}</span>
                                  </div>
                                  <div className={styles.suggestionDetails}>
                                    <span>{formaterPrix(a.prixLocationJour)}/j</span>
                                    {a.categorie?.nom && <span>• {a.categorie.nom}</span>}
                                    {a.quantiteDisponible !== undefined && (
                                      <span>• Dispo: {a.quantiteDisponible}</span>
                                    )}
                                  </div>
                                </li>
                              ))
                            )}
                          </ul>
                        )}
                      </div>

                      {/* Quantité */}
                      <input
                        type="number"
                        min="1"
                        value={ligne.quantite}
                        onChange={e =>
                          majLigne(ligne.id, { quantite: parseInt(e.target.value, 10) || 1 })
                        }
                        style={{ padding: '8px', textAlign: 'center', fontSize: 13 }}
                        title="Quantité"
                      />

                      {/* Prix unitaire HT */}
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={ligne.prixUnitaire}
                        onChange={e =>
                          majLigne(ligne.id, { prixUnitaire: parseFloat(e.target.value) || 0 })
                        }
                        style={{ padding: '8px', textAlign: 'right', fontSize: 13 }}
                        title="Prix unitaire HT"
                      />

                      {/* Remise par ligne avec bascule % / € */}
                      <div className={styles.groupeRemise}>
                        <div className={styles.basculeRemise}>
                          <button
                            type="button"
                            className={`${styles.boutonBascule} ${
                              ligne.remiseLigneType === 'POURCENTAGE' ? styles.boutonBasculeActif : ''
                            }`}
                            onClick={() => majLigne(ligne.id, { remiseLigneType: 'POURCENTAGE' })}
                            title="Remise en pourcentage"
                          >
                            %
                          </button>
                          <button
                            type="button"
                            className={`${styles.boutonBascule} ${
                              ligne.remiseLigneType === 'MONTANT' ? styles.boutonBasculeActif : ''
                            }`}
                            onClick={() => majLigne(ligne.id, { remiseLigneType: 'MONTANT' })}
                            title="Remise en euros"
                          >
                            €
                          </button>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={ligne.remiseLigneType === 'POURCENTAGE' ? 100 : undefined}
                          value={ligne.remiseLigneValeur}
                          onChange={e =>
                            majLigne(ligne.id, {
                              remiseLigneValeur: parseFloat(e.target.value) || 0
                            })
                          }
                          style={{
                            width: '100%',
                            minWidth: 50,
                            padding: '8px 6px',
                            textAlign: 'right',
                            fontSize: 13
                          }}
                          placeholder="0"
                        />
                      </div>

                      {/* Total Ligne */}
                      <div className={styles.colonneTotalLigne}>
                        {formaterPrix(ligne.totalLigne)}
                      </div>

                      {/* Supprimer */}
                      <button
                        type="button"
                        className={styles.boutonAction}
                        style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171' }}
                        onClick={() => supprimerLigne(ligne.id)}
                        title="Supprimer la ligne"
                      >
                        ✕
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            <button type="button" className={styles.boutonAjoutLigne} onClick={ajouterLigne}>
              + Ajouter une ligne
            </button>
          </div>

          {/* SÉLECTION DU TAUX DE TVA */}
          <div className={styles.sectionTva}>
            <div className={styles.sectionTvaEntete}>
              <span className={styles.sectionTvaTitre}>
                📊 Taux de TVA applicable :
              </span>
              {modeTauxTva === 'PERSO' && (
                <div className={styles.champTvaPersoConteneur}>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={tauxTvaPerso}
                    onChange={e => setTauxTvaPerso(Math.max(0, parseFloat(e.target.value) || 0))}
                    className={styles.champTvaPersoInput}
                    placeholder="Ex: 5.5"
                  />
                  <span style={{ fontSize: 13, color: '#fcd34d', fontWeight: 600 }}>%</span>
                </div>
              )}
            </div>

            <div className={styles.pastillesTva}>
              <button
                type="button"
                className={`${styles.pastilleTva} ${modeTauxTva === '8.5' ? styles.pastilleTvaActive : ''}`}
                onClick={() => setModeTauxTva('8.5')}
              >
                <span>8,5 %</span>
                <span className={styles.pastilleTvaBadge}>Martinique / DOM (Défaut)</span>
              </button>

              <button
                type="button"
                className={`${styles.pastilleTva} ${modeTauxTva === '0' ? styles.pastilleTvaActive : ''}`}
                onClick={() => setModeTauxTva('0')}
              >
                <span>0 %</span>
                <span className={styles.pastilleTvaBadge}>Exonéré / Franchise</span>
              </button>

              <button
                type="button"
                className={`${styles.pastilleTva} ${modeTauxTva === '2.1' ? styles.pastilleTvaActive : ''}`}
                onClick={() => setModeTauxTva('2.1')}
              >
                <span>2,1 %</span>
                <span className={styles.pastilleTvaBadge}>Taux réduit DOM</span>
              </button>

              <button
                type="button"
                className={`${styles.pastilleTva} ${modeTauxTva === '20' ? styles.pastilleTvaActive : ''}`}
                onClick={() => setModeTauxTva('20')}
              >
                <span>20 %</span>
                <span className={styles.pastilleTvaBadge}>Métropole</span>
              </button>

              <button
                type="button"
                className={`${styles.pastilleTva} ${modeTauxTva === 'PERSO' ? styles.pastilleTvaActive : ''}`}
                onClick={() => setModeTauxTva('PERSO')}
              >
                <span>Personnalisé</span>
              </button>
            </div>

            {tauxTvaEffectif === 0 && (
              <div className={styles.mentionExonerationTva}>
                <span>⚖️</span>
                <span>
                  <strong>Mention légale :</strong> TVA non applicable, art. 293 B du CGI
                </span>
              </div>
            )}
          </div>

          {/* TOTAUX AVEC BASCULE REMISE GLOBALE */}
          <div className={styles.totauxPanel}>
            <div className={styles.totauxLigne}>
              <span>Sous-total HT :</span>
              <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{formaterPrix(sousTotal)}</span>
            </div>

            <div className={styles.totauxLigne} style={{ alignItems: 'center' }}>
              <span>Remise globale :</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div className={styles.basculeRemise}>
                  <button
                    type="button"
                    className={`${styles.boutonBascule} ${
                      remiseGlobaleType === 'POURCENTAGE' ? styles.boutonBasculeActif : ''
                    }`}
                    onClick={() => setRemiseGlobaleType('POURCENTAGE')}
                    title="Remise globale en %"
                  >
                    %
                  </button>
                  <button
                    type="button"
                    className={`${styles.boutonBascule} ${
                      remiseGlobaleType === 'MONTANT' ? styles.boutonBasculeActif : ''
                    }`}
                    onClick={() => setRemiseGlobaleType('MONTANT')}
                    title="Remise globale en €"
                  >
                    €
                  </button>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={remiseGlobaleType === 'POURCENTAGE' ? 100 : undefined}
                  value={remiseGlobaleValeur}
                  onChange={e => setRemiseGlobaleValeur(parseFloat(e.target.value) || 0)}
                  style={{
                    width: 75,
                    padding: '6px 8px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(251,191,36,0.3)',
                    borderRadius: 8,
                    color: '#fff',
                    textAlign: 'right',
                    fontSize: 13,
                    fontWeight: 700
                  }}
                />
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  (-{formaterPrix(montantRemiseGlobale)})
                </span>
              </div>
            </div>

            <div className={styles.totauxLigne}>
              <span>TVA ({tauxTvaEffectif.toString().replace('.', ',')}%) :</span>
              <span style={{ color: '#f1f5f9' }}>{formaterPrix(montantTva)}</span>
            </div>

            <div className={styles.totauxLigneTtc}>
              <span>Total TTC :</span>
              <span>{formaterPrix(totalTtc)}</span>
            </div>
          </div>

          {erreur && <div className={styles.erreurMessage}>⚠️ {erreur}</div>}

          <button
            type="submit"
            className={styles.boutonSoumettre}
            disabled={chargement || lignes.length === 0}
          >
            {chargement
              ? '⏳ Enregistrement…'
              : devisIdEditer
              ? '💾 Enregistrer les modifications'
              : '✅ Valider et créer le devis'}
          </button>
        </form>
      </div>
    </div>
  )
}
