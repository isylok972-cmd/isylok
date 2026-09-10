'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import styles from './catalogue.module.css'
import ChatbotConseiller from '../composants/ChatbotConseiller'

interface ArticleCatalogue {
  id: string
  reference: string
  nom: string
  prixLocationJour: number
  photoUrl: string | null
  imageWebUrl: string | null
  afficherPrixWeb: boolean
  categorie: { id: string; nom: string }
}

interface LignePanier {
  article: ArticleCatalogue
  quantite: number
}

interface ZoneLivraison {
  id: string
  nomZone: string
  communes: string
  tarifEstime: number
  delaiLivraison: string | null
}

const UNIVERS = [
  { id: 'TOUS', label: '✨ Tous les Articles' },
  { id: 'TENTES', label: '🎪 Tentes & Chapiteaux' },
  { id: 'MOBILIER', label: '🪑 Mobilier & Tables' },
  { id: 'VAISSELLE', label: '🍽️ Vaisselle & Verrerie' },
  { id: 'NAPPAGE', label: '🎀 Nappage & Textile' },
  { id: 'SON_LUMIERE', label: '💡 Éclairage & Sols' }
]

export default function PageCatalogueVitrine() {
  const [articles, setArticles] = useState<ArticleCatalogue[]>([])
  const [zones, setZones] = useState<ZoneLivraison[]>([])
  const [chargement, setChargement] = useState(true)

  const [universActif, setUniversActif] = useState('TOUS')
  const [recherche, setRecherche] = useState('')
  const [quantites, setQuantites] = useState<{ [id: string]: number }>({})

  // Panier / Sélection
  const [panier, setPanier] = useState<LignePanier[]>([])
  const [panierOuvert, setPanierOuvert] = useState(false)
  const [zoneLivraisonId, setZoneLivraisonId] = useState('')

  // Formulaire client pour validation devis
  const [formClient, setFormClient] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    entreprise: '',
    siret: '',
    dateEvenement: '',
    commune: ''
  })
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [devisGenere, setDevisGenere] = useState<any>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/web/articles').then(r => r.json()),
      fetch('/api/web/zones-livraison').then(r => r.json())
    ])
      .then(([dataArt, dataZones]) => {
        if (dataArt.succes) {
          const webArticles = dataArt.donnees.articles.filter((a: any) => a.visibleSurWeb)
          setArticles(webArticles)
        }
        if (dataZones.succes) {
          setZones(dataZones.donnees)
          if (dataZones.donnees.length > 0) setZoneLivraisonId(dataZones.donnees[0].id)
        }
      })
      .catch(console.error)
      .finally(() => setChargement(false))
  }, [])

  const modifierQuantite = (id: string, delta: number) => {
    setQuantites(prev => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 1) + delta)
    }))
  }

  const ajouterAuPanier = (article: ArticleCatalogue) => {
    const qte = quantites[article.id] || 1
    setPanier(prev => {
      const existant = prev.find(p => p.article.id === article.id)
      if (existant) {
        return prev.map(p => p.article.id === article.id ? { ...p, quantite: p.quantite + qte } : p)
      } else {
        return [...prev, { article, quantite: qte }]
      }
    })
    setPanierOuvert(true)
  }

  const supprimerDuPanier = (articleId: string) => {
    setPanier(prev => prev.filter(p => p.article.id !== articleId))
  }

  // Filtrage par Univers
  const correspondUnivers = (article: ArticleCatalogue, univers: string) => {
    if (univers === 'TOUS') return true
    const cat = article.categorie?.nom.toUpperCase() || ''
    const nom = article.nom.toUpperCase()

    if (univers === 'TENTES') {
      return cat.includes('CARRÉE') || cat.includes('RECTANGULAIRE') || cat.includes('MODULABLE') || cat.includes('HEXAGONAL') || cat.includes('VELUM') || nom.includes('CHAPITEAU') || nom.includes('TENTE')
    }
    if (univers === 'MOBILIER') {
      return cat.includes('CHAISE') || cat.includes('TABLE') || cat.includes('NAPOLÉON') || cat.includes('MÉDAILLON') || cat.includes('BISTROT') || cat.includes('HAUTE') || nom.includes('CHAISE') || nom.includes('TABLE')
    }
    if (univers === 'VAISSELLE') {
      return cat.includes('ASSIETTE') || cat.includes('COUVERT') || cat.includes('VERRE') || cat.includes('CHAMPAGNE') || cat.includes('COCKTAIL') || cat.includes('BOL') || cat.includes('SALADIER') || cat.includes('CHAFING')
    }
    if (univers === 'NAPPAGE') {
      return cat.includes('NAPPAGE') || cat.includes('SERVIETTE') || cat.includes('JUPPONAGE') || cat.includes('NŒUD') || nom.includes('NAPPE')
    }
    if (univers === 'SON_LUMIERE') {
      return cat.includes('ÉCLAIRAGE') || cat.includes('SOL') || cat.includes('RIDEAU') || cat.includes('BUFFET') || cat.includes('DIVERS')
    }
    return true
  }

  const articlesFiltres = articles.filter(art => {
    const okUnivers = correspondUnivers(art, universActif)
    const okRecherche = !recherche ||
      art.nom.toLowerCase().includes(recherche.toLowerCase()) ||
      art.reference.toLowerCase().includes(recherche.toLowerCase())
    return okUnivers && okRecherche
  })

  // Calculs Panier
  const zoneSelectionnee = zones.find(z => z.id === zoneLivraisonId)
  const fraisLivraison = zoneSelectionnee ? zoneSelectionnee.tarifEstime : 0
  const sousTotalPanier = Math.round(panier.reduce((sum, p) => sum + p.quantite * p.article.prixLocationJour, 0) * 100) / 100
  const montantTva = Math.round((sousTotalPanier + fraisLivraison) * 0.085 * 100) / 100
  const totalTtcPanier = Math.round((sousTotalPanier + fraisLivraison + montantTva) * 100) / 100

  const validerDevisPanier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (panier.length === 0) return alert('Votre sélection est vide')
    if (!formClient.nom || !formClient.email || !formClient.telephone) {
      return alert('Veuillez renseigner vos coordonnées (Nom, Email, Téléphone)')
    }

    setEnvoiEnCours(true)
    try {
      const rep = await fetch('/api/web/demande-devis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: formClient,
          evenement: {
            date: formClient.dateEvenement,
            commune: formClient.commune || zoneSelectionnee?.nomZone,
            type: 'Demande Catalogue Web'
          },
          lignes: panier.map(p => ({
            articleId: p.article.id,
            designation: p.article.nom,
            quantite: p.quantite,
            prixUnitaire: p.article.prixLocationJour
          })),
          fraisLivraison,
          nomZoneLivraison: zoneSelectionnee?.nomZone
        })
      })

      const data = await rep.json()
      if (data.succes) {
        setDevisGenere(data)
      } else {
        alert(data.message || 'Erreur lors de la génération du devis')
      }
    } catch {
      alert('Erreur réseau lors de la validation')
    } finally {
      setEnvoiEnCours(false)
    }
  }

  return (
    <main className={styles.conteneur}>
      {/* Barre de navigation */}
      <nav className={styles.barreNavigation}>
        <div className={styles.logoZone}>
          <Link href="/vitrine">
            <Image
              src="/logo-transparent.png"
              alt="Isy Lok"
              width={130}
              height={42}
              style={{ objectFit: 'contain' }}
              priority
            />
          </Link>
        </div>

        <div className={styles.liensNav}>
          <Link href="/vitrine" className={styles.lienNav}>Accueil</Link>
          <Link href="/vitrine/catalogue" className={`${styles.lienNav} ${styles.lienNavActif}`}>Catalogue Équipements</Link>
          <Link href="/vitrine#packs" className={styles.lienNav}>Packs Clés en Main</Link>
          <Link href="/vitrine#livraison" className={styles.lienNav}>Livraison Martinique</Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className={styles.boutonPanier} onClick={() => setPanierOuvert(true)}>
            <span>🛒 Ma Sélection</span>
            <span className={styles.badgePanier}>{panier.reduce((sum, p) => sum + p.quantite, 0)}</span>
          </button>
          <Link href="/connexion" className={styles.lienNav} style={{ fontSize: 13 }}>
            🔐 Pro
          </Link>
        </div>
      </nav>

      {/* Hero Catalogue */}
      <header className={styles.heroCatalogue}>
        <h1 className={styles.heroTitre}>Catalogue Location de Matériel Événementiel</h1>
        <p className={styles.heroSousTitre}>
          Découvrez en temps réel notre matériel professionnel disponible en Martinique :
          tentes, mobilier de prestige, vaisselle et éclairage.
        </p>
      </header>

      {/* Barre de Recherche & Univers */}
      <div className={styles.barreFiltres}>
        <div className={styles.rechercheLigne}>
          <span style={{ fontSize: 18 }}>🔍</span>
          <input
            type="text"
            placeholder="Rechercher un article, chapiteau, chaise napoléon, assiette..."
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            className={styles.champRecherche}
          />
          {recherche && (
            <button onClick={() => setRecherche('')} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
          )}
        </div>

        <div className={styles.universLigne}>
          {UNIVERS.map(u => (
            <button
              key={u.id}
              className={`${styles.boutonUnivers} ${universActif === u.id ? styles.boutonUniversActif : ''}`}
              onClick={() => setUniversActif(u.id)}
            >
              {u.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grille des Articles */}
      {chargement ? (
        <p style={{ textAlign: 'center', color: '#94a3b8', padding: '60px 0' }}>⏳ Chargement du catalogue en direct...</p>
      ) : articlesFiltres.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#94a3b8', padding: '60px 0' }}>Aucun article ne correspond à votre recherche.</p>
      ) : (
        <section className={styles.grilleArticles}>
          {articlesFiltres.map(art => {
            const qteCourante = quantites[art.id] || 1

            return (
              <div key={art.id} className={styles.carteArticle}>
                <div className={styles.articleVisuel}>
                  {art.imageWebUrl || art.photoUrl ? (
                    <img src={(art.imageWebUrl || art.photoUrl) || undefined} alt={art.nom} />
                  ) : (
                    <span style={{ fontSize: 42 }}>📦</span>
                  )}
                  <span className={styles.badgeCategorie}>{art.categorie?.nom || 'Événementiel'}</span>
                </div>

                <h3 className={styles.articleNom}>{art.nom}</h3>
                <div className={styles.articleRef}>Réf: {art.reference}</div>

                <div className={styles.articlePrixLigne}>
                  <div>
                    {art.afficherPrixWeb ? (
                      <>
                        <span className={styles.articlePrix}>{art.prixLocationJour} €</span>
                        <span className={styles.articlePrixUnite}>/ jour HT</span>
                      </>
                    ) : (
                      <span style={{ fontSize: 13, color: '#c4b5fd', fontWeight: 600 }}>Tarif sur devis</span>
                    )}
                  </div>
                </div>

                <div className={styles.articleActionLigne}>
                  <div className={styles.selecteurQte}>
                    <button className={styles.btnQte} onClick={() => modifierQuantite(art.id, -1)}>-</button>
                    <span className={styles.valQte}>{qteCourante}</span>
                    <button className={styles.btnQte} onClick={() => modifierQuantite(art.id, 1)}>+</button>
                  </div>
                  <button className={styles.boutonAjoutPanier} onClick={() => ajouterAuPanier(art)}>
                    <span>+</span>
                    <span>Ajouter</span>
                  </button>
                </div>
              </div>
            )
          })}
        </section>
      )}

      {/* Tiroir Panier / Sélection */}
      {panierOuvert && (
        <div className={styles.overlayPanier} onClick={() => setPanierOuvert(false)}>
          <div className={styles.tiroirPanier} onClick={e => e.stopPropagation()}>
            <div className={styles.panierEntete}>
              <h2 className={styles.panierTitre}>📋 Votre Sélection de Matériel</h2>
              <button
                onClick={() => setPanierOuvert(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 22, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div className={styles.panierCorps}>
              {panier.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🧺</div>
                  <p>Votre panier est vide pour l'instant.</p>
                  <p style={{ fontSize: 13 }}>Sélectionnez des tentes, du mobilier ou de la vaisselle dans le catalogue.</p>
                </div>
              ) : (
                <>
                  {panier.map(p => (
                    <div key={p.article.id} className={styles.panierItem}>
                      <div className={styles.panierItemInfo}>
                        <div className={styles.panierItemNom}>{p.article.nom}</div>
                        <div className={styles.panierItemPrix}>
                          {p.quantite} x {p.article.prixLocationJour} € = {Math.round(p.quantite * p.article.prixLocationJour * 100) / 100} € HT
                        </div>
                      </div>
                      <button
                        onClick={() => supprimerDuPanier(p.article.id)}
                        style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 16 }}
                        title="Retirer"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}

                  {/* Formulaire Coordonnées et Livraison */}
                  <form id="form-devis" onSubmit={validerDevisPanier} className={styles.formulaireClientPanier}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#c4b5fd', marginTop: 10 }}>
                      🚚 Lieu de Livraison (Martinique) :
                    </div>
                    <select
                      value={zoneLivraisonId}
                      onChange={e => setZoneLivraisonId(e.target.value)}
                      className={styles.inputPanier}
                    >
                      {zones.map(z => (
                        <option key={z.id} value={z.id}>
                          {z.nomZone} — Forfait : {z.tarifEstime} € HT ({z.delaiLivraison || '24h'})
                        </option>
                      ))}
                    </select>

                    <input
                      placeholder="Commune exacte (ex: Sainte-Luce, Lamentin...)"
                      value={formClient.commune}
                      onChange={e => setFormClient({ ...formClient, commune: e.target.value })}
                      className={styles.inputPanier}
                    />

                    <input
                      type="date"
                      placeholder="Date de l'événement"
                      value={formClient.dateEvenement}
                      onChange={e => setFormClient({ ...formClient, dateEvenement: e.target.value })}
                      className={styles.inputPanier}
                    />

                    <div style={{ fontSize: 13, fontWeight: 700, color: '#c4b5fd', marginTop: 10 }}>
                      👤 Vos Coordonnées pour le Devis :
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <input
                        placeholder="Nom *"
                        value={formClient.nom}
                        onChange={e => setFormClient({ ...formClient, nom: e.target.value })}
                        className={styles.inputPanier}
                        required
                      />
                      <input
                        placeholder="Prénom"
                        value={formClient.prenom}
                        onChange={e => setFormClient({ ...formClient, prenom: e.target.value })}
                        className={styles.inputPanier}
                      />
                    </div>
                    <input
                      type="email"
                      placeholder="Adresse e-mail *"
                      value={formClient.email}
                      onChange={e => setFormClient({ ...formClient, email: e.target.value })}
                      className={styles.inputPanier}
                      required
                    />
                    <input
                      placeholder="Téléphone *"
                      value={formClient.telephone}
                      onChange={e => setFormClient({ ...formClient, telephone: e.target.value })}
                      className={styles.inputPanier}
                      required
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <input
                        placeholder="Entreprise (si pro)"
                        value={formClient.entreprise}
                        onChange={e => setFormClient({ ...formClient, entreprise: e.target.value })}
                        className={styles.inputPanier}
                      />
                      <input
                        placeholder="SIRET (si pro)"
                        value={formClient.siret}
                        onChange={e => setFormClient({ ...formClient, siret: e.target.value })}
                        className={styles.inputPanier}
                      />
                    </div>
                  </form>
                </>
              )}
            </div>

            {panier.length > 0 && (
              <div className={styles.panierPied}>
                <div className={styles.panierTotalLigne}>
                  <span>Sous-total matériel HT :</span>
                  <strong>{sousTotalPanier} €</strong>
                </div>
                <div className={styles.panierTotalLigne}>
                  <span>Livraison &amp; Reprise ({zoneSelectionnee?.nomZone || 'Martinique'}) :</span>
                  <strong>{fraisLivraison} €</strong>
                </div>
                <div className={styles.panierTotalLigne}>
                  <span>TVA Martinique (8,5 %) :</span>
                  <span>{montantTva} €</span>
                </div>
                <div className={styles.panierTotalLigne} style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ fontWeight: 700 }}>Total Estimé TTC :</span>
                  <span className={styles.panierTotalGrand}>{totalTtcPanier} €</span>
                </div>

                <button
                  type="submit"
                  form="form-devis"
                  disabled={envoiEnCours}
                  className={styles.boutonFinaliser}
                >
                  {envoiEnCours ? '⏳ Création du devis en cours...' : '🚀 Valider & Obtenir mon Devis en Ligne'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modale Succès Devis Généré */}
      {devisGenere && (
        <div className={styles.overlayPanier} onClick={() => setDevisGenere(null)}>
          <div style={{
            background: '#111126',
            border: '1px solid #10b981',
            borderRadius: 20,
            padding: 36,
            maxWidth: 500,
            width: '90%',
            margin: 'auto',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.7)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px 0', color: '#f8fafc' }}>
              Demande de Devis Enregistrée !
            </h2>
            <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>
              Votre devis officiel <strong>n° {devisGenere.numero}</strong> d'un montant de <strong>{devisGenere.totalTtc} € TTC</strong> est prêt.
              Vous pouvez le consulter immédiatement et le signer en ligne pour sécuriser votre matériel.
            </p>

            <Link
              href={devisGenere.lienSignature}
              target="_blank"
              style={{
                display: 'block',
                padding: '14px 24px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                borderRadius: 12,
                color: 'white',
                fontWeight: 700,
                textDecoration: 'none',
                fontSize: 15,
                boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)'
              }}
            >
              ✍️ Consulter &amp; Signer mon Devis en Ligne
            </Link>

            <button
              onClick={() => {
                setDevisGenere(null)
                setPanier([])
                setPanierOuvert(false)
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: 13,
                marginTop: 16,
                cursor: 'pointer'
              }}
            >
              Fermer et continuer la visite
            </button>
          </div>
        </div>
      )}

      {/* Chatbot Virtuel Conseiller de Réception */}
      <ChatbotConseiller />
    </main>
  )
}
