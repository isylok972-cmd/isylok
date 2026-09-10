'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './web.module.css'

interface ArticleWeb {
  id: string
  reference: string
  nom: string
  prixLocationJour: number
  photoUrl: string | null
  imageWebUrl: string | null
  visibleSurWeb: boolean
  enVedette: boolean
  afficherPrixWeb: boolean
  categorie: { id: string; nom: string }
}

interface PackArticleAssoc {
  id: string
  articleId: string
  quantiteDefaut: number
  article: {
    id: string
    nom: string
    reference: string
  }
}

interface PackEvenement {
  id: string
  nom: string
  slug: string
  description: string | null
  image: string | null
  typeEvenement: string
  capacitePersonnes: number
  prixEstime: number | null
  enVedette: boolean
  actif: boolean
  ordreAffichage: number
  articles: PackArticleAssoc[]
}

interface OptionZoneLivraison {
  id: string
  nomZone: string
  communes: string
  delaiLivraison: string | null
  tarifEstime: number
  actif: boolean
  ordreAffichage: number
}

export default function PageGestionSiteWeb() {
  const [ongletActif, setOngletActif] = useState<'articles' | 'packs' | 'zones'>('articles')
  const [chargement, setChargement] = useState(true)
  const [message, setMessage] = useState<{ texte: string; type: 'succes' | 'erreur' } | null>(null)

  // 1. État Articles
  const [articles, setArticles] = useState<ArticleWeb[]>([])
  const [categories, setCategories] = useState<{ id: string; nom: string }[]>([])
  const [rechercheArticle, setRechercheArticle] = useState('')
  const [categorieFiltre, setCategorieFiltre] = useState('')

  // 2. État Packs
  const [packs, setPacks] = useState<PackEvenement[]>([])
  const [modalePack, setModalePack] = useState(false)
  const [packEnEdition, setPackEnEdition] = useState<PackEvenement | null>(null)
  const [formPack, setFormPack] = useState({
    nom: '',
    slug: '',
    description: '',
    image: '',
    typeEvenement: 'MARIAGE',
    capacitePersonnes: 50,
    prixEstime: 1500,
    enVedette: false,
    actif: true,
    articlesAssocies: [] as { articleId: string; quantiteDefaut: number }[]
  })

  // 3. État Zones
  const [zones, setZones] = useState<OptionZoneLivraison[]>([])
  const [modaleZone, setModaleZone] = useState(false)
  const [zoneEnEdition, setZoneEnEdition] = useState<OptionZoneLivraison | null>(null)
  const [formZone, setFormZone] = useState({
    nomZone: '',
    communes: '',
    delaiLivraison: '24h à 48h',
    tarifEstime: 60,
    actif: true,
    ordreAffichage: 1
  })

  // Chargement des données
  const chargerArticles = async () => {
    try {
      const rep = await fetch('/api/web/articles')
      const data = await rep.json()
      if (data.succes) {
        setArticles(data.donnees.articles)
        setCategories(data.donnees.categories)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const chargerPacks = async () => {
    try {
      const rep = await fetch('/api/web/packs')
      const data = await rep.json()
      if (data.succes) setPacks(data.donnees)
    } catch (e) {
      console.error(e)
    }
  }

  const chargerZones = async () => {
    try {
      const rep = await fetch('/api/web/zones-livraison')
      const data = await rep.json()
      if (data.succes) setZones(data.donnees)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    Promise.all([chargerArticles(), chargerPacks(), chargerZones()]).finally(() => setChargement(false))
  }, [])

  const notifier = (texte: string, type: 'succes' | 'erreur' = 'succes') => {
    setMessage({ texte, type })
    setTimeout(() => setMessage(null), 3000)
  }

  // Actions Articles
  const basculerProprieteArticle = async (id: string, propriete: 'visibleSurWeb' | 'enVedette' | 'afficherPrixWeb', valeurActuelle: boolean) => {
    try {
      const rep = await fetch('/api/web/articles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, [propriete]: !valeurActuelle })
      })
      const data = await rep.json()
      if (data.succes) {
        setArticles(prev => prev.map(a => (a.id === id ? { ...a, [propriete]: !valeurActuelle } : a)))
        notifier('Article mis à jour')
      }
    } catch {
      notifier('Erreur mise à jour', 'erreur')
    }
  }

  const modifierImageUrl = async (article: ArticleWeb) => {
    const nouvelleUrl = prompt('URL de l\'image Web pour cet article :', article.imageWebUrl || article.photoUrl || '')
    if (nouvelleUrl === null) return
    try {
      const rep = await fetch('/api/web/articles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: article.id, imageWebUrl: nouvelleUrl })
      })
      const data = await rep.json()
      if (data.succes) {
        setArticles(prev => prev.map(a => (a.id === article.id ? { ...a, imageWebUrl: nouvelleUrl } : a)))
        notifier('Image enregistrée')
      }
    } catch {
      notifier('Erreur sauvegarde image', 'erreur')
    }
  }

  // Actions Packs
  const ouvrirModalePack = (pack?: PackEvenement) => {
    if (pack) {
      setPackEnEdition(pack)
      setFormPack({
        nom: pack.nom,
        slug: pack.slug,
        description: pack.description || '',
        image: pack.image || '',
        typeEvenement: pack.typeEvenement,
        capacitePersonnes: pack.capacitePersonnes,
        prixEstime: pack.prixEstime || 0,
        enVedette: pack.enVedette,
        actif: pack.actif,
        articlesAssocies: pack.articles.map(a => ({
          articleId: a.articleId,
          quantiteDefaut: a.quantiteDefaut
        }))
      })
    } else {
      setPackEnEdition(null)
      setFormPack({
        nom: '',
        slug: '',
        description: '',
        image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80',
        typeEvenement: 'MARIAGE',
        capacitePersonnes: 50,
        prixEstime: 1500,
        enVedette: false,
        actif: true,
        articlesAssocies: articles.slice(0, 3).map(a => ({ articleId: a.id, quantiteDefaut: 50 }))
      })
    }
    setModalePack(true)
  }

  const enregistrerPack = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const methode = packEnEdition ? 'PATCH' : 'POST'
      const corps = packEnEdition ? { id: packEnEdition.id, ...formPack } : formPack

      const rep = await fetch('/api/web/packs', {
        method: methode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corps)
      })
      const data = await rep.json()
      if (data.succes) {
        notifier(packEnEdition ? 'Pack mis à jour' : 'Pack créé')
        setModalePack(false)
        chargerPacks()
      } else {
        alert(data.message || 'Erreur enregistrement pack')
      }
    } catch {
      notifier('Erreur réseau', 'erreur')
    }
  }

  const supprimerPack = async (id: string) => {
    if (!confirm('Supprimer définitivement ce pack ?')) return
    try {
      const rep = await fetch(`/api/web/packs?id=${id}`, { method: 'DELETE' })
      const data = await rep.json()
      if (data.succes) {
        notifier('Pack supprimé')
        chargerPacks()
      }
    } catch {
      notifier('Erreur suppression', 'erreur')
    }
  }

  // Actions Zones
  const ouvrirModaleZone = (zone?: OptionZoneLivraison) => {
    if (zone) {
      setZoneEnEdition(zone)
      setFormZone({
        nomZone: zone.nomZone,
        communes: zone.communes,
        delaiLivraison: zone.delaiLivraison || '24h à 48h',
        tarifEstime: zone.tarifEstime,
        actif: zone.actif,
        ordreAffichage: zone.ordreAffichage
      })
    } else {
      setZoneEnEdition(null)
      setFormZone({
        nomZone: '',
        communes: '',
        delaiLivraison: '24h à 48h',
        tarifEstime: 60,
        actif: true,
        ordreAffichage: zones.length + 1
      })
    }
    setModaleZone(true)
  }

  const enregistrerZone = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const methode = zoneEnEdition ? 'PATCH' : 'POST'
      const corps = zoneEnEdition ? { id: zoneEnEdition.id, ...formZone } : formZone

      const rep = await fetch('/api/web/zones-livraison', {
        method: methode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corps)
      })
      const data = await rep.json()
      if (data.succes) {
        notifier(zoneEnEdition ? 'Zone mise à jour' : 'Zone créée')
        setModaleZone(false)
        chargerZones()
      }
    } catch {
      notifier('Erreur réseau', 'erreur')
    }
  }

  const articlesFiltres = articles.filter(a => {
    const correspondCat = !categorieFiltre || a.categorie?.id === categorieFiltre
    const correspondRecherche = !rechercheArticle ||
      a.nom.toLowerCase().includes(rechercheArticle.toLowerCase()) ||
      a.reference.toLowerCase().includes(rechercheArticle.toLowerCase())
    return correspondCat && correspondRecherche
  })

  if (chargement) {
    return (
      <main className={styles.conteneur}>
        <p style={{ textAlign: 'center', marginTop: 100, color: '#94a3b8' }}>⏳ Chargement du CMS...</p>
      </main>
    )
  }

  return (
    <main className={styles.conteneur}>
      {/* En-tête */}
      <header className={styles.entete}>
        <div className={styles.enteteGauche}>
          <Link href="/" className={styles.boutonRetour}>← Accueil</Link>
          <div className={styles.titreModule}>
            <span className={styles.iconeTitre}>🌐</span>
            <div className={styles.titreTexte}>
              <h1>Gestion Site Web &amp; CMS</h1>
              <p>Catalogue public, packs événements clés en main et barème livraison Martinique</p>
            </div>
          </div>
        </div>

        <div className={styles.enteteDroite}>
          <Link href="/vitrine" target="_blank" className={styles.boutonVoirVitrine}>
            <span>👁️</span>
            <span>Voir la Vitrine Publique</span>
          </Link>
        </div>
      </header>

      {/* Onglets */}
      <div className={styles.onglets}>
        <button
          className={`${styles.onglet} ${ongletActif === 'articles' ? styles.ongletActif : ''}`}
          onClick={() => setOngletActif('articles')}
        >
          <span>📦</span>
          <span>Catalogue &amp; Visibilité ({articles.filter(a => a.visibleSurWeb).length}/{articles.length})</span>
        </button>
        <button
          className={`${styles.onglet} ${ongletActif === 'packs' ? styles.ongletActif : ''}`}
          onClick={() => setOngletActif('packs')}
        >
          <span>🎉</span>
          <span>Packs Événements ({packs.length})</span>
        </button>
        <button
          className={`${styles.onglet} ${ongletActif === 'zones' ? styles.ongletActif : ''}`}
          onClick={() => setOngletActif('zones')}
        >
          <span>🚚</span>
          <span>Zones de Livraison Martinique ({zones.length})</span>
        </button>
      </div>

      {/* Notification toast */}
      {message && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          padding: '12px 20px',
          borderRadius: '12px',
          background: message.type === 'succes' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
          color: 'white',
          fontWeight: 600,
          zIndex: 200,
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
        }}>
          {message.texte}
        </div>
      )}

      {/* ================= ONGLET 1 : ARTICLES ================= */}
      {ongletActif === 'articles' && (
        <section>
          <div className={styles.barreAction}>
            <div className={styles.rechercheFiltre}>
              <input
                type="text"
                placeholder="Rechercher par nom ou référence..."
                value={rechercheArticle}
                onChange={e => setRechercheArticle(e.target.value)}
                className={styles.champRecherche}
              />
              <select
                value={categorieFiltre}
                onChange={e => setCategorieFiltre(e.target.value)}
                className={styles.selectCategorie}
              >
                <option value="">Toutes les catégories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>
            <div style={{ fontSize: 13, color: '#94a3b8' }}>
              ⭐ <strong style={{ color: '#fbbf24' }}>{articles.filter(a => a.enVedette).length}</strong> en vedette
            </div>
          </div>

          <div className={styles.tableauConteneur}>
            <table className={styles.tableau}>
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Visuel</th>
                  <th>Article</th>
                  <th>Catégorie</th>
                  <th>Prix/Jour</th>
                  <th>Visibilité Web</th>
                  <th>En Vedette</th>
                  <th>Prix Public</th>
                  <th style={{ textAlign: 'right' }}>Image Web</th>
                </tr>
              </thead>
              <tbody>
                {articlesFiltres.map(art => (
                  <tr key={art.id}>
                    <td>
                      <div style={{
                        width: 42,
                        height: 42,
                        borderRadius: 8,
                        overflow: 'hidden',
                        background: '#1e1e38',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        {art.imageWebUrl || art.photoUrl ? (
                          <img
                            src={art.imageWebUrl || art.photoUrl || ''}
                            alt={art.nom}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <span style={{ fontSize: 18 }}>📦</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>{art.nom}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Réf: {art.reference}</div>
                    </td>
                    <td>
                      <span style={{
                        fontSize: 12,
                        padding: '4px 8px',
                        borderRadius: 6,
                        background: 'rgba(255,255,255,0.05)',
                        color: '#94a3b8'
                      }}>
                        {art.categorie?.nom || 'Général'}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: '#cbd5e1' }}>{art.prixLocationJour} €</strong>
                    </td>
                    <td>
                      <button
                        onClick={() => basculerProprieteArticle(art.id, 'visibleSurWeb', art.visibleSurWeb)}
                        className={`${styles.toggleBtn} ${art.visibleSurWeb ? styles.toggleActif : styles.toggleInactif}`}
                      >
                        {art.visibleSurWeb ? '👁️ En ligne' : '🚫 Masqué'}
                      </button>
                    </td>
                    <td>
                      <button
                        onClick={() => basculerProprieteArticle(art.id, 'enVedette', art.enVedette)}
                        className={`${styles.toggleBtn} ${art.enVedette ? styles.toggleStarActif : styles.toggleStarInactif}`}
                      >
                        {art.enVedette ? '⭐ Vedette' : '☆ Standard'}
                      </button>
                    </td>
                    <td>
                      <button
                        onClick={() => basculerProprieteArticle(art.id, 'afficherPrixWeb', art.afficherPrixWeb)}
                        className={`${styles.toggleBtn} ${art.afficherPrixWeb ? styles.toggleActif : styles.toggleInactif}`}
                      >
                        {art.afficherPrixWeb ? '💶 Affiché' : '🔒 Sur devis'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => modifierImageUrl(art)}
                        className={styles.boutonSecondaire}
                        title="Définir une URL d'image personnalisée pour le web"
                      >
                        🖼️ {art.imageWebUrl ? 'Modifier' : 'Ajouter'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ================= ONGLET 2 : PACKS ÉVÉNEMENTS ================= */}
      {ongletActif === 'packs' && (
        <section>
          <div className={styles.barreAction}>
            <div style={{ fontSize: 14, color: '#c4b5fd' }}>
              Configurez vos offres tout-en-un présentées sur la page d'accueil et le catalogue en ligne.
            </div>
            <button onClick={() => ouvrirModalePack()} className={styles.boutonAjout}>
              + Créer un Pack Événement
            </button>
          </div>

          <div className={styles.grillePacks}>
            {packs.map(p => (
              <div key={p.id} className={styles.cartePack}>
                <div className={styles.cartePackImage}>
                  <img
                    src={p.image || 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80'}
                    alt={p.nom}
                  />
                  <div className={styles.cartePackBadges}>
                    <span className={styles.badgeType}>{p.typeEvenement}</span>
                    {p.enVedette && <span className={styles.badgeVedette}>⭐ Vedette</span>}
                  </div>
                </div>

                <div className={styles.cartePackContenu}>
                  <h3 className={styles.cartePackTitre}>{p.nom}</h3>
                  <p className={styles.cartePackDesc}>{p.description || 'Pack sur mesure sans description.'}</p>

                  <div className={styles.cartePackStats}>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Capacité</span>
                      <span className={styles.statValeur}>👥 {p.capacitePersonnes} pers.</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Tarif indicatif</span>
                      <span className={styles.statValeur} style={{ color: '#34d399' }}>
                        {p.prixEstime ? `${p.prixEstime} €` : 'Sur devis'}
                      </span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Articles inclus</span>
                      <span className={styles.statValeur}>{p.articles?.length || 0}</span>
                    </div>
                  </div>

                  <div className={styles.cartePackActions}>
                    <button onClick={() => ouvrirModalePack(p)} className={styles.boutonSecondaire}>
                      ✏️ Modifier
                    </button>
                    <button onClick={() => supprimerPack(p.id)} className={styles.boutonDanger}>
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ================= ONGLET 3 : ZONES DE LIVRAISON ================= */}
      {ongletActif === 'zones' && (
        <section>
          <div className={styles.barreAction}>
            <div style={{ fontSize: 14, color: '#c4b5fd' }}>
              Grille tarifaire de livraison par zone géographique en Martinique.
            </div>
            <button onClick={() => ouvrirModaleZone()} className={styles.boutonAjout}>
              + Ajouter une Zone
            </button>
          </div>

          <div className={styles.tableauConteneur}>
            <table className={styles.tableau}>
              <thead>
                <tr>
                  <th>Ordre</th>
                  <th>Zone Géographique</th>
                  <th>Communes Couvertes</th>
                  <th>Délai Indicatif</th>
                  <th>Tarif Forfaitaire</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {zones.map(z => (
                  <tr key={z.id}>
                    <td>
                      <span style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: 'rgba(139, 92, 246, 0.2)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#c4b5fd'
                      }}>
                        {z.ordreAffichage}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: '#f8fafc', fontSize: 15 }}>{z.nomZone}</strong>
                    </td>
                    <td style={{ color: '#94a3b8', fontSize: 13, maxWidth: 350 }}>
                      {z.communes}
                    </td>
                    <td>
                      <span style={{ fontSize: 13, color: '#cbd5e1' }}>⏱️ {z.delaiLivraison || '24h'}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#34d399' }}>
                        {z.tarifEstime} € HT
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.toggleBtn} ${z.actif ? styles.toggleActif : styles.toggleInactif}`}>
                        {z.actif ? 'Actif' : 'Désactivé'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => ouvrirModaleZone(z)} className={styles.boutonSecondaire}>
                        ✏️ Modifier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ================= MODALE PACK ================= */}
      {modalePack && (
        <div className={styles.overlay} onClick={() => setModalePack(false)}>
          <div className={styles.modale} onClick={e => e.stopPropagation()}>
            <div className={styles.modaleEntete}>
              <h2 className={styles.modaleTitre}>
                {packEnEdition ? 'Modifier le Pack Événement' : 'Créer un Pack Événement'}
              </h2>
              <button className={styles.boutonFermer} onClick={() => setModalePack(false)}>✕</button>
            </div>

            <form onSubmit={enregistrerPack}>
              <div className={styles.champLigne}>
                <div className={styles.champGroupe}>
                  <label>Nom du pack *</label>
                  <input
                    value={formPack.nom}
                    onChange={e => {
                      const nom = e.target.value
                      const slug = nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
                      setFormPack({ ...formPack, nom, ...(packEnEdition ? {} : { slug }) })
                    }}
                    required
                  />
                </div>
                <div className={styles.champGroupe}>
                  <label>Slug URL *</label>
                  <input
                    value={formPack.slug}
                    onChange={e => setFormPack({ ...formPack, slug: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className={styles.champGroupe}>
                <label>Description du pack</label>
                <textarea
                  value={formPack.description}
                  onChange={e => setFormPack({ ...formPack, description: e.target.value })}
                  style={{ minHeight: 70 }}
                />
              </div>

              <div className={styles.champLigne}>
                <div className={styles.champGroupe}>
                  <label>Type d'événement</label>
                  <select
                    value={formPack.typeEvenement}
                    onChange={e => setFormPack({ ...formPack, typeEvenement: e.target.value })}
                  >
                    <option value="MARIAGE">Mariage</option>
                    <option value="COCKTAIL">Cocktail &amp; Soirée</option>
                    <option value="ENTREPRISE">Entreprise &amp; Séminaire</option>
                    <option value="ANNIVERSAIRE">Anniversaire &amp; Fête</option>
                    <option value="AUTRE">Autre événement</option>
                  </select>
                </div>
                <div className={styles.champGroupe}>
                  <label>Capacité (personnes)</label>
                  <input
                    type="number"
                    min="10"
                    value={formPack.capacitePersonnes}
                    onChange={e => setFormPack({ ...formPack, capacitePersonnes: parseInt(e.target.value) || 50 })}
                  />
                </div>
              </div>

              <div className={styles.champLigne}>
                <div className={styles.champGroupe}>
                  <label>Tarif estimé (€ HT)</label>
                  <input
                    type="number"
                    step="10"
                    value={formPack.prixEstime}
                    onChange={e => setFormPack({ ...formPack, prixEstime: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className={styles.champGroupe}>
                  <label>Options d'affichage</label>
                  <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formPack.enVedette}
                        onChange={e => setFormPack({ ...formPack, enVedette: e.target.checked })}
                      />
                      ⭐ En vedette
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formPack.actif}
                        onChange={e => setFormPack({ ...formPack, actif: e.target.checked })}
                      />
                      ✅ Actif
                    </label>
                  </div>
                </div>
              </div>

              <div className={styles.champGroupe}>
                <label>URL de l'image de présentation</label>
                <input
                  value={formPack.image}
                  onChange={e => setFormPack({ ...formPack, image: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                />
              </div>

              <button type="submit" className={styles.boutonSauvegarde}>
                {packEnEdition ? 'Enregistrer les modifications' : 'Créer le pack'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODALE ZONE ================= */}
      {modaleZone && (
        <div className={styles.overlay} onClick={() => setModaleZone(false)}>
          <div className={styles.modale} onClick={e => e.stopPropagation()}>
            <div className={styles.modaleEntete}>
              <h2 className={styles.modaleTitre}>
                {zoneEnEdition ? 'Modifier la Zone de Livraison' : 'Ajouter une Zone de Livraison'}
              </h2>
              <button className={styles.boutonFermer} onClick={() => setModaleZone(false)}>✕</button>
            </div>

            <form onSubmit={enregistrerZone}>
              <div className={styles.champGroupe}>
                <label>Nom de la Zone *</label>
                <input
                  value={formZone.nomZone}
                  onChange={e => setFormZone({ ...formZone, nomZone: e.target.value })}
                  placeholder="Ex: Sud Martinique"
                  required
                />
              </div>

              <div className={styles.champGroupe}>
                <label>Communes couvertes *</label>
                <textarea
                  value={formZone.communes}
                  onChange={e => setFormZone({ ...formZone, communes: e.target.value })}
                  placeholder="Ex: Ducos, Sainte-Luce, Le Marin, Les Trois-Îlets..."
                  style={{ minHeight: 70 }}
                  required
                />
              </div>

              <div className={styles.champLigne}>
                <div className={styles.champGroupe}>
                  <label>Tarif estimé (€ HT) *</label>
                  <input
                    type="number"
                    step="5"
                    value={formZone.tarifEstime}
                    onChange={e => setFormZone({ ...formZone, tarifEstime: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className={styles.champGroupe}>
                  <label>Délai indicatif de livraison</label>
                  <input
                    value={formZone.delaiLivraison}
                    onChange={e => setFormZone({ ...formZone, delaiLivraison: e.target.value })}
                    placeholder="Ex: 24h à 48h"
                  />
                </div>
              </div>

              <div className={styles.champLigne}>
                <div className={styles.champGroupe}>
                  <label>Ordre d'affichage</label>
                  <input
                    type="number"
                    value={formZone.ordreAffichage}
                    onChange={e => setFormZone({ ...formZone, ordreAffichage: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className={styles.champGroupe}>
                  <label>Statut</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginTop: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formZone.actif}
                      onChange={e => setFormZone({ ...formZone, actif: e.target.checked })}
                    />
                    Zone active et visible
                  </label>
                </div>
              </div>

              <button type="submit" className={styles.boutonSauvegarde}>
                {zoneEnEdition ? 'Enregistrer les modifications' : 'Créer la zone'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
