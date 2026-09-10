'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import styles from './atelier.module.css'
import { formaterDate } from '@/lib/utilitaires'

type OngletActif = 'sorties' | 'retours' | 'lavage' | 'planning'

interface ArticlePetitMateriel {
  id: string
  reference: string
  nom: string
  quantiteDisponible: number
  quantiteTotale: number
  categorie?: { nom: string; icone?: string }
}

interface LigneSortie {
  id: string
  articleId: string
  designation: string
  quantite: number
  conditionne: boolean
  article?: ArticlePetitMateriel
}

interface SortieEvenement {
  id: string
  numero: string
  dateEvenement: string | null
  lieuEvenement: string | null
  client: {
    id: string
    nom: string
    prenom: string | null
    entreprise: string | null
    telephone: string
    ville: string | null
  }
  totalArticles: number
  articlesConditionnes: number
  estComplet: boolean
  lignes: LigneSortie[]
}

interface LotLavage {
  id: string
  numero: string
  articleId: string
  quantite: number
  statut: 'A_LAVER' | 'EN_COURS' | 'PROPRE'
  type: 'VAISSELLE' | 'TEXTILE'
  evenementOrigine: string | null
  notes: string | null
  reintegreStock: boolean
  dateCreation: string
  article: ArticlePetitMateriel
}

interface DeclarationCasse {
  id: string
  quantite: number
  motif: string
  description: string | null
  dateCreation: string
  client: { nom: string; prenom: string | null; entreprise: string | null }
  article: { nom: string; reference: string }
}

export default function PageAtelier() {
  const [onglet, setOnglet] = useState<OngletActif>('sorties')
  const [chargement, setChargement] = useState(true)
  const [roleUtilisateur, setRoleUtilisateur] = useState<string | null>(null)

  // Données
  const [articles, setArticles] = useState<ArticlePetitMateriel[]>([])
  const [sorties, setSorties] = useState<SortieEvenement[]>([])
  const [lotsLavage, setLotsLavage] = useState<{
    tous: LotLavage[]
    aLaver: LotLavage[]
    enCours: LotLavage[]
    propre: LotLavage[]
    stats: { totalALaver: number; totalEnCours: number; totalPropre: number }
  }>({
    tous: [],
    aLaver: [],
    enCours: [],
    propre: [],
    stats: { totalALaver: 0, totalEnCours: 0, totalPropre: 0 }
  })
  const [declarations, setDeclarations] = useState<DeclarationCasse[]>([])
  const [evenementsRetours, setEvenementsRetours] = useState<any[]>([])

  // Planning & Rotations Atelier
  const [planningAtelier, setPlanningAtelier] = useState<{
    fluxDeparts: any[]
    fluxRetours: any[]
    alertesRotations: any[]
    feuilleDeRoute: {
      date: string
      aPreparer: any[]
      aReceptionner: any[]
      rotationsDuJour: any[]
    }
  }>({
    fluxDeparts: [],
    fluxRetours: [],
    alertesRotations: [],
    feuilleDeRoute: {
      date: new Date().toISOString().slice(0, 10),
      aPreparer: [],
      aReceptionner: [],
      rotationsDuJour: []
    }
  })
  const [dateFeuilleDeRoute, setDateFeuilleDeRoute] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [vueChronologiqueAtelier, setVueChronologiqueAtelier] = useState<'DEPARTS' | 'RETOURS' | 'TOUS'>('TOUS')

  // Formulaire Casse / Perte
  const [formCasse, setFormCasse] = useState({
    clientId: '',
    devisId: '',
    articleId: '',
    quantite: 1,
    motif: 'CASSE',
    description: '',
    envoyerResteAuLavage: true,
    quantiteAuLavage: 0
  })
  const [messageSucces, setMessageSucces] = useState('')
  const [erreur, setErreur] = useState('')

  // Formulaire Nouveau Lot Lavage
  const [modaleLot, setModaleLot] = useState(false)
  const [nouveauLot, setNouveauLot] = useState({
    articleId: '',
    quantite: 10,
    type: 'VAISSELLE',
    notes: ''
  })

  // Vérification de rôle
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.succes && d.donnees.role) setRoleUtilisateur(d.donnees.role)
      })
      .catch(console.error)
  }, [])

  // Charger les articles PETIT_MATERIEL
  const chargerArticles = useCallback(async () => {
    try {
      const rep = await fetch('/api/atelier/articles')
      const data = await rep.json()
      if (data.succes) setArticles(data.donnees)
    } catch (err) {
      console.error(err)
    }
  }, [])

  // Charger les sorties prévues
  const chargerSorties = useCallback(async () => {
    try {
      const rep = await fetch('/api/atelier/sorties')
      const data = await rep.json()
      if (data.succes) setSorties(data.donnees)
    } catch (err) {
      console.error(err)
    }
  }, [])

  // Charger les retours et déclarations
  const chargerRetours = useCallback(async () => {
    try {
      const rep = await fetch('/api/atelier/retours')
      const data = await rep.json()
      if (data.succes) {
        setEvenementsRetours(data.donnees.evenements || [])
        setDeclarations(data.donnees.declarations || [])
      }
    } catch (err) {
      console.error(err)
    }
  }, [])

  // Charger les lots de blanchisserie / lavage
  const chargerLavage = useCallback(async () => {
    try {
      const rep = await fetch('/api/atelier/lavage')
      const data = await rep.json()
      if (data.succes) setLotsLavage(data.donnees)
    } catch (err) {
      console.error(err)
    }
  }, [])

  // Charger les données du planning atelier (rotations serrées et feuille de route)
  const chargerPlanningAtelier = useCallback(async (dateStr?: string) => {
    try {
      const d = dateStr || dateFeuilleDeRoute
      const rep = await fetch(`/api/atelier/planning?date=${d}`)
      const data = await rep.json()
      if (data.succes) setPlanningAtelier(data.donnees)
    } catch (err) {
      console.error(err)
    }
  }, [dateFeuilleDeRoute])

  useEffect(() => {
    setChargement(true)
    Promise.all([chargerArticles(), chargerSorties(), chargerRetours(), chargerLavage(), chargerPlanningAtelier()]).finally(() => {
      setChargement(false)
    })
  }, [chargerArticles, chargerSorties, chargerRetours, chargerLavage, chargerPlanningAtelier])

  // Validation du conditionnement d'un article
  const basculerConditionnement = async (devisId: string, articleId: string, etatActuel: boolean, quantite: number) => {
    try {
      await fetch('/api/atelier/sorties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          devisId,
          articleId,
          quantite,
          valide: !etatActuel
        })
      })
      chargerSorties()
    } catch (err) {
      console.error(err)
    }
  }

  // Valider tout le lot d'un événement
  const validerToutLeLot = async (devisId: string, nouvelEtat: boolean) => {
    try {
      await fetch('/api/atelier/sorties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          devisId,
          toutLeDevis: true,
          valide: nouvelEtat
        })
      })
      chargerSorties()
    } catch (err) {
      console.error(err)
    }
  }

  // Enregistrer une déclaration de casse / dégradation / perte
  const soumettreCasse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formCasse.clientId || !formCasse.articleId || !formCasse.quantite) {
      setErreur('Veuillez sélectionner un client, un article et une quantité.')
      return
    }

    setErreur('')
    setMessageSucces('')

    try {
      const rep = await fetch('/api/atelier/retours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formCasse)
      })
      const data = await rep.json()

      if (data.succes) {
        setMessageSucces(data.message || 'Signalement enregistré avec succès !')
        setFormCasse({
          clientId: '',
          devisId: '',
          articleId: '',
          quantite: 1,
          motif: 'CASSE',
          description: '',
          envoyerResteAuLavage: true,
          quantiteAuLavage: 0
        })
        chargerRetours()
        chargerLavage()
      } else {
        setErreur(data.message || 'Erreur lors de l\'enregistrement')
      }
    } catch {
      setErreur('Erreur réseau')
    }
  }

  // Faire avancer le statut d'un lot de lavage
  const changerStatutLot = async (lotId: string, nouveauStatut: 'A_LAVER' | 'EN_COURS' | 'PROPRE') => {
    try {
      const rep = await fetch('/api/atelier/lavage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lotId, nouveauStatut })
      })
      const data = await rep.json()
      if (data.succes) {
        chargerLavage()
        chargerArticles()
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Créer un nouveau lot de lavage
  const creerLotLavage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nouveauLot.articleId || !nouveauLot.quantite) return

    try {
      const rep = await fetch('/api/atelier/lavage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nouveauLot)
      })
      const data = await rep.json()
      if (data.succes) {
        setModaleLot(false)
        setNouveauLot({ articleId: '', quantite: 10, type: 'VAISSELLE', notes: '' })
        chargerLavage()
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Calculs KPI
  const totalSortiesAujourdhui = sorties.length
  const totalArticlesAujourdhui = sorties.reduce((acc, s) => acc + s.totalArticles, 0)
  const totalArticlesPrets = sorties.reduce((acc, s) => acc + s.articlesConditionnes, 0)
  const totalEnLavage = lotsLavage.stats.totalALaver + lotsLavage.stats.totalEnCours

  return (
    <main className={styles.conteneur}>
      {/* EN-TÊTE */}
      <header className={styles.entete}>
        <div className={styles.enteteGauche}>
          <Link href="/" className={styles.boutonRetour}>← Accueil</Link>
          <div className={styles.titreModule}>
            <span>🧺</span>
            <h1>Atelier Vaisselle &amp; Linge</h1>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className={styles.badgeOperateur}>
            <span>👷 {roleUtilisateur === 'OPERATEUR_ATELIER' ? 'Opérateur Atelier' : 'Gestion Atelier'}</span>
          </div>
        </div>
      </header>

      {/* STATS RAPIDES (Aucun montant financier affiché) */}
      <section className={styles.statsRapides}>
        <div className={styles.carteStat}>
          <div className={styles.carteStatEntete}>
            <span className={styles.carteStatLabel}>Sorties à préparer</span>
            <span className={styles.carteStatIcone}>📦</span>
          </div>
          <div className={styles.carteStatValeur}>{totalSortiesAujourdhui}</div>
          <div className={styles.carteStatSous}>événements programmés</div>
        </div>

        <div className={styles.carteStat}>
          <div className={styles.carteStatEntete}>
            <span className={styles.carteStatLabel}>Conditionnement</span>
            <span className={styles.carteStatIcone}>✅</span>
          </div>
          <div className={styles.carteStatValeur} style={{ color: totalArticlesPrets === totalArticlesAujourdhui && totalArticlesAujourdhui > 0 ? '#34d399' : '#38bdf8' }}>
            {totalArticlesPrets} / {totalArticlesAujourdhui}
          </div>
          <div className={styles.carteStatSous}>pièces validées en bacs</div>
        </div>

        <div className={styles.carteStat}>
          <div className={styles.carteStatEntete}>
            <span className={styles.carteStatLabel}>Circuit Lavage / Repassage</span>
            <span className={styles.carteStatIcone}>🧼</span>
          </div>
          <div className={styles.carteStatValeur} style={{ color: '#fbbf24' }}>
            {totalEnLavage}
          </div>
          <div className={styles.carteStatSous}>pièces en cours de traitement</div>
        </div>

        <div className={styles.carteStat}>
          <div className={styles.carteStatEntete}>
            <span className={styles.carteStatLabel}>Propre &amp; Prêt en rayon</span>
            <span className={styles.carteStatIcone}>✨</span>
          </div>
          <div className={styles.carteStatValeur} style={{ color: '#34d399' }}>
            {lotsLavage.stats.totalPropre}
          </div>
          <div className={styles.carteStatSous}>pièces réintégrées au stock</div>
        </div>
      </section>

      {/* ONGLETS */}
      <div className={styles.onglets}>
        <button
          className={`${styles.onglet} ${onglet === 'sorties' ? styles.ongletActif : ''}`}
          onClick={() => setOnglet('sorties')}
        >
          <span className={styles.ongletEmoji}>📦</span> Sorties prévues
        </button>
        <button
          className={`${styles.onglet} ${onglet === 'retours' ? styles.ongletActif : ''}`}
          onClick={() => setOnglet('retours')}
        >
          <span className={styles.ongletEmoji}>🔄</span> Retours &amp; Contrôle
        </button>
        <button
          className={`${styles.onglet} ${onglet === 'lavage' ? styles.ongletActif : ''}`}
          onClick={() => setOnglet('lavage')}
        >
          <span className={styles.ongletEmoji}>🧼</span> Circuit Blanchisserie / Lavage
        </button>
        <button
          className={`${styles.onglet} ${onglet === 'planning' ? styles.ongletActif : ''}`}
          onClick={() => {
            setOnglet('planning')
            chargerPlanningAtelier()
          }}
        >
          <span className={styles.ongletEmoji}>📅</span> Planning &amp; Rotations
        </button>
      </div>

      {chargement ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
          <p style={{ fontSize: 36 }}>⏳</p>
          <h3>Chargement des données de l'atelier…</h3>
        </div>
      ) : (
        <div className={styles.panneauContenu}>
          {/* ======================================================== */}
          {/* SECTION 1 : SORTIES PRÉVUES */}
          {/* ======================================================== */}
          {onglet === 'sorties' && (
            <div className={styles.listeEvenementsSorties}>
              {sorties.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(18, 18, 42, 0.4)', borderRadius: 16 }}>
                  <p style={{ fontSize: 48 }}>🎉</p>
                  <h3 style={{ color: '#f1f5f9', marginBottom: 6 }}>Aucune sortie de vaisselle ou textile prévue</h3>
                  <p style={{ color: '#94a3b8', fontSize: 14 }}>Toutes les commandes de petit matériel ont été traitées.</p>
                </div>
              ) : (
                sorties.map(sortie => {
                  const pourcentage = sortie.totalArticles > 0
                    ? Math.round((sortie.articlesConditionnes / sortie.totalArticles) * 100)
                    : 0

                  return (
                    <div key={sortie.id} className={styles.carteEvenementSortie}>
                      <div className={styles.evenementEntete}>
                        <div className={styles.evenementInfosPrincipales}>
                          <div className={styles.evenementBadgeDate}>
                            📅 {sortie.dateEvenement ? formaterDate(sortie.dateEvenement) : 'Date à fixer'}
                          </div>
                          <div>
                            <div className={styles.evenementTitre}>
                              Devis {sortie.numero} • {sortie.client.prenom ? `${sortie.client.prenom} ` : ''}{sortie.client.nom}
                              {sortie.client.entreprise && ` (${sortie.client.entreprise})`}
                            </div>
                            <div className={styles.evenementSousTitre}>
                              📍 {sortie.lieuEvenement || 'Lieu non spécifié'} {sortie.client.ville ? `• ${sortie.client.ville}` : ''}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: sortie.estComplet ? '#34d399' : '#38bdf8' }}>
                            {sortie.articlesConditionnes} / {sortie.totalArticles} pièces ({pourcentage}%)
                          </span>
                          <button
                            type="button"
                            onClick={() => validerToutLeLot(sortie.id, !sortie.estComplet)}
                            style={{
                              padding: '6px 12px',
                              background: sortie.estComplet ? 'rgba(16, 185, 129, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                              border: `1px solid ${sortie.estComplet ? 'rgba(16, 185, 129, 0.3)' : 'rgba(6, 182, 212, 0.3)'}`,
                              borderRadius: 8,
                              color: sortie.estComplet ? '#34d399' : '#38bdf8',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {sortie.estComplet ? 'Dévalider le lot' : 'Tout conditionner ✅'}
                          </button>
                        </div>
                      </div>

                      {/* Barre de progression */}
                      <div className={styles.barreProgressionConteneur}>
                        <div
                          className={styles.barreProgressionRemplissage}
                          style={{ width: `${pourcentage}%` }}
                        />
                      </div>

                      {/* Grille des articles petit matériel avec cases à cocher */}
                      <div className={styles.grilleArticlesSortie}>
                        {sortie.lignes.map(ligne => (
                          <div
                            key={ligne.id}
                            className={`${styles.itemArticleSortie} ${ligne.conditionne ? styles.itemArticleSortieConditionne : ''}`}
                            onClick={() => basculerConditionnement(sortie.id, ligne.articleId, ligne.conditionne, ligne.quantite)}
                          >
                            <div className={styles.itemArticleSortieInfos}>
                              <div className={`${styles.caseCocherCustom} ${ligne.conditionne ? styles.caseCocherCustomActive : ''}`}>
                                {ligne.conditionne ? '✓' : ''}
                              </div>
                              <div>
                                <div className={styles.itemArticleNom}>{ligne.designation}</div>
                                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                  {ligne.article?.reference} • {ligne.article?.categorie?.nom || 'Petit Matériel'}
                                </div>
                              </div>
                            </div>
                            <div className={styles.itemArticleQte}>
                              {ligne.quantite}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 2 : RETOURS & CONTRÔLE AVEC DÉCLARATION CASSE */}
          {/* ======================================================== */}
          {onglet === 'retours' && (
            <div>
              {/* Formulaire rapide de déclaration */}
              <div className={styles.panneauDeclarationCasse}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f87171', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>⚠️</span> Déclaration Casse / Dégradation / Perte
                </h3>
                <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
                  Saisissez le matériel manquant ou détérioré lors du retour. Le dossier client et la caution seront immédiatement annotés.
                </p>

                <form onSubmit={soumettreCasse} className={styles.formulaireCasse}>
                  {/* Événement / Client */}
                  <div className={styles.champGroupe}>
                    <label>Événement / Client concerné *</label>
                    <select
                      value={formCasse.devisId}
                      onChange={e => {
                        const devisId = e.target.value
                        const ev = evenementsRetours.find(d => d.id === devisId)
                        setFormCasse(prev => ({
                          ...prev,
                          devisId,
                          clientId: ev ? ev.client.id : ''
                        }))
                      }}
                      required
                    >
                      <option value="">-- Sélectionner un retour client --</option>
                      {evenementsRetours.map(ev => (
                        <option key={ev.id} value={ev.id}>
                          {ev.numero} - {ev.client.prenom ? `${ev.client.prenom} ` : ''}{ev.client.nom}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Article Petit Matériel */}
                  <div className={styles.champGroupe}>
                    <label>Article concerné *</label>
                    <select
                      value={formCasse.articleId}
                      onChange={e => setFormCasse(prev => ({ ...prev, articleId: e.target.value }))}
                      required
                    >
                      <option value="">-- Sélectionner l'article --</option>
                      {articles.map(art => (
                        <option key={art.id} value={art.id}>
                          {art.nom} ({art.reference})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Motif */}
                  <div className={styles.champGroupe}>
                    <label>Motif de signalement *</label>
                    <select
                      value={formCasse.motif}
                      onChange={e => setFormCasse(prev => ({ ...prev, motif: e.target.value }))}
                    >
                      <option value="CASSE">Casse (assiette, verre brisé)</option>
                      <option value="PERTE">Perte / Non restitué</option>
                      <option value="DEGRADATION">Dégradation (tache indélébile, brûlure)</option>
                    </select>
                  </div>

                  {/* Quantité cassée */}
                  <div className={styles.champGroupe} style={{ maxWidth: 120 }}>
                    <label>Quantité *</label>
                    <input
                      type="number"
                      min="1"
                      value={formCasse.quantite}
                      onChange={e => setFormCasse(prev => ({ ...prev, quantite: parseInt(e.target.value, 10) || 1 }))}
                      required
                    />
                  </div>

                  {/* Description / Remarques */}
                  <div className={styles.champGroupe}>
                    <label>Remarques constatées</label>
                    <input
                      type="text"
                      placeholder="Ex: Ébréché, 4 verres manquants..."
                      value={formCasse.description}
                      onChange={e => setFormCasse(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  {/* Bouton de validation */}
                  <button type="submit" className={styles.boutonEnregistrerCasse}>
                    ⚠️ Enregistrer le constat
                  </button>
                </form>

                {erreur && <div style={{ marginTop: 12, color: '#f87171', fontSize: 13 }}>⚠️ {erreur}</div>}
                {messageSucces && <div style={{ marginTop: 12, color: '#34d399', fontSize: 13 }}>✅ {messageSucces}</div>}
              </div>

              {/* Historique des déclarations de casse */}
              <div style={{ background: 'rgba(18, 18, 42, 0.4)', borderRadius: 16, padding: 20, border: '1px solid rgba(6, 182, 212, 0.15)' }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>
                  📋 Historique récent des pointages de casse &amp; pertes
                </h4>
                {declarations.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: 13 }}>Aucun signalement de casse pour le moment.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#f1f5f9' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: '#94a3b8' }}>
                          <th style={{ padding: '8px 12px' }}>Date</th>
                          <th style={{ padding: '8px 12px' }}>Client</th>
                          <th style={{ padding: '8px 12px' }}>Article</th>
                          <th style={{ padding: '8px 12px' }}>Quantité</th>
                          <th style={{ padding: '8px 12px' }}>Motif</th>
                          <th style={{ padding: '8px 12px' }}>Détails constatés</th>
                        </tr>
                      </thead>
                      <tbody>
                        {declarations.map(d => (
                          <tr key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{formaterDate(d.dateCreation)}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                              {d.client.prenom ? `${d.client.prenom} ` : ''}{d.client.nom}
                            </td>
                            <td style={{ padding: '10px 12px' }}>{d.article.nom}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 800, color: '#f87171' }}>{d.quantite}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: 10,
                                fontSize: 11,
                                fontWeight: 700,
                                background: d.motif === 'CASSE' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                color: d.motif === 'CASSE' ? '#f87171' : '#fbbf24'
                              }}>
                                {d.motif}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{d.description || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 3 : KANBAN BLANCHISSERIE / LAVAGE */}
          {/* ======================================================== */}
          {onglet === 'lavage' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                    🧼 Suivi du Circuit Blanchisserie &amp; Lavage
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 0 0' }}>
                    Le passage au statut « Propre / Prêt » réintègre automatiquement les quantités au stock disponible.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModaleLot(true)}
                  style={{
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, #06b6d4, #0284c7)',
                    border: 'none',
                    borderRadius: 10,
                    color: 'white',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  + Créer un lot de lavage
                </button>
              </div>

              {/* Kanban à 3 colonnes */}
              <div className={styles.kanbanLavage}>
                {/* 1. À LAVER */}
                <div className={styles.colonneKanban}>
                  <div className={styles.colonneEntete}>
                    <div className={styles.colonneTitre}>
                      <span>🔴</span> À laver
                    </div>
                    <span className={styles.badgeCompte} style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                      {lotsLavage.aLaver.length} lots ({lotsLavage.stats.totalALaver} pièces)
                    </span>
                  </div>

                  {lotsLavage.aLaver.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 10px', color: '#64748b', fontSize: 13 }}>
                      Aucun lot en attente de lavage
                    </div>
                  ) : (
                    lotsLavage.aLaver.map(lot => (
                      <div key={lot.id} className={styles.carteLot}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span className={styles.lotNumero}>{lot.numero}</span>
                          <span className={styles.lotTypeBadge}>{lot.type}</span>
                        </div>
                        <div className={styles.lotNomArticle}>{lot.article.nom}</div>
                        <div className={styles.lotQuantite}>{lot.quantite} pièces</div>
                        {lot.notes && <div style={{ fontSize: 11, color: '#94a3b8' }}>{lot.notes}</div>}
                        <button
                          type="button"
                          className={styles.boutonAvancerStatut}
                          onClick={() => changerStatutLot(lot.id, 'EN_COURS')}
                        >
                          ▶ Démarrer le traitement
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* 2. EN COURS DE REPASSAGE / TRAITEMENT */}
                <div className={styles.colonneKanban}>
                  <div className={styles.colonneEntete}>
                    <div className={styles.colonneTitre}>
                      <span>🟡</span> En cours de repassage / traitement
                    </div>
                    <span className={styles.badgeCompte} style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                      {lotsLavage.enCours.length} lots ({lotsLavage.stats.totalEnCours} pièces)
                    </span>
                  </div>

                  {lotsLavage.enCours.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 10px', color: '#64748b', fontSize: 13 }}>
                      Aucun lot en traitement actuellement
                    </div>
                  ) : (
                    lotsLavage.enCours.map(lot => (
                      <div key={lot.id} className={styles.carteLot}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span className={styles.lotNumero}>{lot.numero}</span>
                          <span className={styles.lotTypeBadge}>{lot.type}</span>
                        </div>
                        <div className={styles.lotNomArticle}>{lot.article.nom}</div>
                        <div className={styles.lotQuantite}>{lot.quantite} pièces</div>
                        {lot.notes && <div style={{ fontSize: 11, color: '#94a3b8' }}>{lot.notes}</div>}
                        <button
                          type="button"
                          className={`${styles.boutonAvancerStatut} ${styles.boutonPropre}`}
                          onClick={() => changerStatutLot(lot.id, 'PROPRE')}
                        >
                          ✅ Valider Propre &amp; Réintégrer au stock
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* 3. PROPRE / PRÊT EN RAYON */}
                <div className={styles.colonneKanban}>
                  <div className={styles.colonneEntete}>
                    <div className={styles.colonneTitre}>
                      <span>🟢</span> Propre / Prêt en rayon
                    </div>
                    <span className={styles.badgeCompte} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                      {lotsLavage.propre.length} lots ({lotsLavage.stats.totalPropre} pièces)
                    </span>
                  </div>

                  {lotsLavage.propre.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 10px', color: '#64748b', fontSize: 13 }}>
                      Aucun lot validé aujourd'hui
                    </div>
                  ) : (
                    lotsLavage.propre.map(lot => (
                      <div key={lot.id} className={styles.carteLot} style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span className={styles.lotNumero}>{lot.numero}</span>
                          <span className={styles.lotTypeBadge} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                            Prêt en stock
                          </span>
                        </div>
                        <div className={styles.lotNomArticle}>{lot.article.nom}</div>
                        <div className={styles.lotQuantite} style={{ color: '#34d399' }}>
                          +{lot.quantite} réintégrés
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>
                          Dispo actuel : {lot.article.quantiteDisponible} / {lot.article.quantiteTotale}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 4 : PLANNING & ROTATIONS ATELIER */}
          {/* ======================================================== */}
          {onglet === 'planning' && (
            <div className={styles.sectionPlanningAtelier}>
              {/* ALERTE ROTATIONS SERRÉES (< 5 JOURS) */}
              {planningAtelier.alertesRotations.length > 0 ? (
                <div className={styles.banniereRotationsSerrees}>
                  <div className={styles.titreAlerteRotations}>
                    <span style={{ fontSize: 20 }}>⚠️</span>
                    <span>
                      Alertes Rotations Serrées (&lt; 5 jours) — {planningAtelier.alertesRotations.length} article(s) à prioriser en blanchisserie / lavage !
                    </span>
                  </div>

                  <div className={styles.grilleRotations}>
                    {planningAtelier.alertesRotations.map((rot, idx) => (
                      <div key={`${rot.articleId}_${idx}`} className={styles.carteRotation}>
                        <div className={styles.rotationBadgeDelai}>
                          🚨 Rotation en {rot.delaiJours} jour(s) seulement !
                        </div>
                        <div className={styles.rotationNomArticle}>
                          {rot.nomArticle} ({rot.referenceArticle})
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#fcd34d' }}>
                          Quantité critique : {rot.quantiteARotater} pièces
                        </div>
                        <div className={styles.rotationDetailsFlux}>
                          <div>📥 Retour sale prévu : <strong>{formaterDate(rot.dateRetourSale)}</strong> ({rot.numeroDevisRetour})</div>
                          <div>📤 Prochain départ : <strong>{formaterDate(rot.dateDepartPrevu)}</strong> ({rot.numeroDevisDepart})</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setNouveauLot({
                              articleId: rot.articleId,
                              quantite: rot.quantiteARotater,
                              type: rot.nomArticle.toLowerCase().includes('nappe') || rot.nomArticle.toLowerCase().includes('serviette') ? 'TEXTILE' : 'VAISSELLE',
                              notes: `Priorité rotation serrée (${rot.delaiJours}j) pour ${rot.numeroDevisDepart}`
                            })
                            setModaleLot(true)
                          }}
                          style={{
                            marginTop: 6,
                            padding: '6px 10px',
                            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                            border: 'none',
                            borderRadius: 6,
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          🧼 Créer le lot de lavage urgent
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 12, color: '#34d399', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>✅</span>
                  <span>Aucune rotation serrée détectée sur les prochains départs. Le temps de rotation est fluide (&gt; 5 jours).</span>
                </div>
              )}

              {/* FEUILLE DE ROUTE DU JOUR */}
              <div className={styles.panneauFeuilleDeRoute}>
                <div className={styles.feuilleDeRouteEntete}>
                  <div className={styles.feuilleDeRouteTitre}>
                    <span>📋</span>
                    <span>Feuille de route atelier du jour</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Choisir une date :</label>
                    <input
                      type="date"
                      value={dateFeuilleDeRoute}
                      onChange={e => {
                        setDateFeuilleDeRoute(e.target.value)
                        chargerPlanningAtelier(e.target.value)
                      }}
                      style={{
                        padding: '6px 10px',
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid rgba(6, 182, 212, 0.4)',
                        borderRadius: 8,
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 600
                      }}
                    />
                  </div>
                </div>

                <div className={styles.colonnesFeuilleDeRoute}>
                  {/* COLONNE 1 : DÉPARTS DU JOUR */}
                  <div className={styles.colonneFeuille}>
                    <div className={styles.colonneFeuilleTitre}>
                      <span>📦 À préparer &amp; expédier ({planningAtelier.feuilleDeRoute.aPreparer.length})</span>
                      <span style={{ fontSize: 11, color: '#38bdf8' }}>{formaterDate(dateFeuilleDeRoute)}</span>
                    </div>

                    {planningAtelier.feuilleDeRoute.aPreparer.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b', fontSize: 12, fontStyle: 'italic' }}>
                        Aucun départ programmé à cette date.
                      </div>
                    ) : (
                      planningAtelier.feuilleDeRoute.aPreparer.map(dep => (
                        <div key={dep.id} className={styles.carteFluxItem}>
                          <div className={styles.carteFluxEntete}>
                            <span className={styles.carteFluxNumero}>{dep.numeroDevis}</span>
                            <span style={{ fontSize: 11, color: '#38bdf8', fontWeight: 700 }}>
                              {dep.totalPieces} pièces au total
                            </span>
                          </div>
                          <div className={styles.carteFluxClient}>
                            👤 {dep.client.prenom ? `${dep.client.prenom} ` : ''}{dep.client.nom}
                            {dep.client.entreprise && ` (${dep.client.entreprise})`}
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>
                            📍 {dep.lieuEvenement}
                          </div>

                          <div className={styles.listeArticlesPuces}>
                            {dep.lignes.map((l: any, i: number) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>• {l.nom}</span>
                                <span style={{ fontWeight: 700, color: l.conditionne ? '#34d399' : '#fcd34d' }}>
                                  {l.quantite} pcs {l.conditionne ? '✓ Prêt' : 'En attente'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* COLONNE 2 : RETOURS DU JOUR */}
                  <div className={styles.colonneFeuille}>
                    <div className={styles.colonneFeuilleTitre}>
                      <span>🔄 À réceptionner &amp; contrôler ({planningAtelier.feuilleDeRoute.aReceptionner.length})</span>
                      <span style={{ fontSize: 11, color: '#f59e0b' }}>{formaterDate(dateFeuilleDeRoute)}</span>
                    </div>

                    {planningAtelier.feuilleDeRoute.aReceptionner.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b', fontSize: 12, fontStyle: 'italic' }}>
                        Aucun retour programmé à cette date.
                      </div>
                    ) : (
                      planningAtelier.feuilleDeRoute.aReceptionner.map(ret => (
                        <div key={ret.id} className={styles.carteFluxItem} style={{ borderLeft: '3px solid #f59e0b' }}>
                          <div className={styles.carteFluxEntete}>
                            <span className={styles.carteFluxNumero} style={{ color: '#fcd34d' }}>{ret.numeroDevis}</span>
                            <span style={{ fontSize: 11, color: '#fcd34d', fontWeight: 700 }}>
                              {ret.totalPieces} pièces attendues
                            </span>
                          </div>
                          <div className={styles.carteFluxClient}>
                            👤 {ret.client.prenom ? `${ret.client.prenom} ` : ''}{ret.client.nom}
                            {ret.client.entreprise && ` (${ret.client.entreprise})`}
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>
                            📍 Provenance : {ret.lieuEvenement}
                          </div>

                          <div className={styles.listeArticlesPuces}>
                            {ret.lignes.map((l: any, i: number) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>• {l.nom}</span>
                                <span style={{ fontWeight: 700, color: '#fcd34d' }}>
                                  {l.quantite} pcs à trier/laver
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* TIMELINE COMPLÈTE DÉPARTS / RETOURS */}
              <div style={{ background: 'rgba(18, 18, 42, 0.4)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>
                    🗓️ Calendrier des flux de vaisselle &amp; textile (Tous les départs et retours)
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setVueChronologiqueAtelier('TOUS')}
                      style={{
                        padding: '4px 10px',
                        fontSize: 11,
                        fontWeight: 600,
                        borderRadius: 6,
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: vueChronologiqueAtelier === 'TOUS' ? '#06b6d4' : 'transparent',
                        color: vueChronologiqueAtelier === 'TOUS' ? '#0b080b' : '#94a3b8',
                        cursor: 'pointer'
                      }}
                    >
                      Tous
                    </button>
                    <button
                      type="button"
                      onClick={() => setVueChronologiqueAtelier('DEPARTS')}
                      style={{
                        padding: '4px 10px',
                        fontSize: 11,
                        fontWeight: 600,
                        borderRadius: 6,
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: vueChronologiqueAtelier === 'DEPARTS' ? '#06b6d4' : 'transparent',
                        color: vueChronologiqueAtelier === 'DEPARTS' ? '#0b080b' : '#94a3b8',
                        cursor: 'pointer'
                      }}
                    >
                      📦 Départs
                    </button>
                    <button
                      type="button"
                      onClick={() => setVueChronologiqueAtelier('RETOURS')}
                      style={{
                        padding: '4px 10px',
                        fontSize: 11,
                        fontWeight: 600,
                        borderRadius: 6,
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: vueChronologiqueAtelier === 'RETOURS' ? '#06b6d4' : 'transparent',
                        color: vueChronologiqueAtelier === 'RETOURS' ? '#0b080b' : '#94a3b8',
                        cursor: 'pointer'
                      }}
                    >
                      🔄 Retours
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                  {[
                    ...(vueChronologiqueAtelier !== 'RETOURS' ? planningAtelier.fluxDeparts : []),
                    ...(vueChronologiqueAtelier !== 'DEPARTS' ? planningAtelier.fluxRetours : [])
                  ]
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((item, idx) => (
                      <div
                        key={`${item.id}_${idx}`}
                        style={{
                          padding: 12,
                          background: 'rgba(30, 41, 59, 0.5)',
                          border: `1px solid ${item.typeFlux === 'DEPART' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                          borderLeft: `3px solid ${item.typeFlux === 'DEPART' ? '#38bdf8' : '#f59e0b'}`,
                          borderRadius: 8,
                          fontSize: 12
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontWeight: 800, color: item.typeFlux === 'DEPART' ? '#38bdf8' : '#fcd34d' }}>
                            {item.typeFlux === 'DEPART' ? '📦 Départ' : '🔄 Retour'} • {item.numeroDevis}
                          </span>
                          <span style={{ fontWeight: 700, color: '#f1f5f9' }}>
                            {formaterDate(item.date)}
                          </span>
                        </div>
                        <div style={{ color: '#cbd5e1', marginBottom: 2 }}>
                          👤 {item.client.nom} ({item.totalPieces} pièces)
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>
                          📍 {item.lieuEvenement}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODALE CRÉATION LOT LAVAGE */}
      {modaleLot && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100
          }}
          onClick={() => setModaleLot(false)}
        >
          <div
            style={{
              background: '#0d080b',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: 16,
              padding: 24,
              width: '90%',
              maxWidth: 480
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 18, color: '#f1f5f9', marginBottom: 16 }}>
              🧺 Nouveau lot de lavage / blanchisserie
            </h3>

            <form onSubmit={creerLotLavage} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className={styles.champGroupe}>
                <label>Article à laver *</label>
                <select
                  value={nouveauLot.articleId}
                  onChange={e => {
                    const artId = e.target.value
                    const art = articles.find(a => a.id === artId)
                    const type = art && (art.nom.toLowerCase().includes('nappe') || art.nom.toLowerCase().includes('serviette'))
                      ? 'TEXTILE'
                      : 'VAISSELLE'
                    setNouveauLot(prev => ({ ...prev, articleId: artId, type }))
                  }}
                  required
                >
                  <option value="">-- Choisir un article --</option>
                  {articles.map(art => (
                    <option key={art.id} value={art.id}>
                      {art.nom} ({art.reference})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.champGroupe}>
                <label>Quantité de pièces *</label>
                <input
                  type="number"
                  min="1"
                  value={nouveauLot.quantite}
                  onChange={e => setNouveauLot(prev => ({ ...prev, quantite: parseInt(e.target.value, 10) || 1 }))}
                  required
                />
              </div>

              <div className={styles.champGroupe}>
                <label>Type de traitement</label>
                <select
                  value={nouveauLot.type}
                  onChange={e => setNouveauLot(prev => ({ ...prev, type: e.target.value as any }))}
                >
                  <option value="VAISSELLE">Vaisselle (Plonge / Lave-batterie)</option>
                  <option value="TEXTILE">Textile (Lavage / Repassage / Pliage)</option>
                </select>
              </div>

              <div className={styles.champGroupe}>
                <label>Notes (optionnel)</label>
                <input
                  type="text"
                  placeholder="Ex: Bac n°4, lavage délicat..."
                  value={nouveauLot.notes}
                  onChange={e => setNouveauLot(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setModaleLot(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 8,
                    color: '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: 'linear-gradient(135deg, #06b6d4, #0284c7)',
                    border: 'none',
                    borderRadius: 8,
                    color: 'white',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Créer le lot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
