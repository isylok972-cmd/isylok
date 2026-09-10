'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import styles from './vitrine.module.css'
import ChatbotConseiller from './composants/ChatbotConseiller'

export default function PageVitrine() {
  const [packs, setPacks] = useState<any[]>([])
  const [articles, setArticles] = useState<any[]>([])
  const [zones, setZones] = useState<any[]>([])
  const [zoneSelectionnee, setZoneSelectionnee] = useState<string>('')
  const [rechercheCommune, setRechercheCommune] = useState<string>('')

  useEffect(() => {
    fetch('/api/web/packs')
      .then(r => r.json())
      .then(d => { if (d.succes) setPacks(d.donnees.filter((p: any) => p.actif)) })
      .catch(console.error)

    fetch('/api/web/articles')
      .then(r => r.json())
      .then(d => {
        if (d.succes) {
          const webArticles = d.donnees.articles.filter((a: any) => a.visibleSurWeb)
          setArticles(webArticles)
        }
      })
      .catch(console.error)

    fetch('/api/web/zones-livraison')
      .then(r => r.json())
      .then(d => { if (d.succes) setZones(d.donnees.filter((z: any) => z.actif)) })
      .catch(console.error)
  }, [])

  const articlesEnVedette = articles.filter(a => a.enVedette)

  const zoneFiltree = zones.find(z => {
    if (zoneSelectionnee && z.id === zoneSelectionnee) return true
    if (rechercheCommune.trim().length > 1) {
      return z.communes.toLowerCase().includes(rechercheCommune.toLowerCase().trim())
    }
    return false
  })

  return (
    <main className={styles.conteneur}>
      {/* Barre de navigation */}
      <nav className={styles.barreNavigation}>
        <div className={styles.logoZone}>
          <Image
            src="/logo-transparent.png"
            alt="Isy Lok"
            width={140}
            height={46}
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>

        <div className={styles.liensNav}>
          <Link href="/vitrine/catalogue" className={styles.lienNav} style={{ color: '#c4b5fd', fontWeight: 600 }}>📦 Catalogue</Link>
          <a href="#packs" className={styles.lienNav}>Packs Événements</a>
          <a href="#materiel" className={styles.lienNav}>Matériel &amp; Mobilier</a>
          <a href="#livraison" className={styles.lienNav}>Zones de Livraison</a>
          <a href="#contact" className={styles.lienNav}>Contact</a>
        </div>

        <Link href="/connexion" className={styles.boutonPro} title="Accéder au back-office de gestion">
          <span>🔐</span>
          <span>Espace Pro</span>
        </Link>
      </nav>

      {/* Hero Header */}
      <section className={styles.hero}>
        <div className={styles.heroTag}>
          <span>✨</span>
          <span>Location Événementielle Haut de Gamme en Martinique</span>
        </div>

        <h1 className={styles.heroTitre}>
          Sublimez vos réceptions et événements sous les tropiques
        </h1>

        <p className={styles.heroSousTitre}>
          Spécialiste de la location de chapiteaux, tentes nomades, mobilier prestige,
          vaisselle raffinée et sonorisation professionnelle pour vos mariages, soirées et séminaires.
        </p>

        <div className={styles.heroCtas}>
          <a href="#packs" className={styles.ctaPrimaire}>
            🎉 Découvrir nos Packs Clés en Main
          </a>
          <a href="#livraison" className={styles.ctaSecondaire}>
            🚚 Estimer la Livraison par Commune
          </a>
        </div>

        <div className={styles.pointsConfiance}>
          <div className={styles.pointConfianceItem}>
            <span>🚚</span>
            <span>Livraison &amp; Installation sur toute la Martinique</span>
          </div>
          <div className={styles.pointConfianceItem}>
            <span>⭐</span>
            <span>Matériel premium certifié &amp; soigné</span>
          </div>
          <div className={styles.pointConfianceItem}>
            <span>⚡</span>
            <span>Devis rapide et accompagnement sur mesure</span>
          </div>
        </div>
      </section>

      {/* Section Packs Événements */}
      <section id="packs" className={styles.section}>
        <div className={styles.sectionEntete}>
          <span className={styles.sectionBadge}>Formules Complètes</span>
          <h2 className={styles.sectionTitre}>Packs Événements Clés en Main</h2>
          <p className={styles.sectionDesc}>
            Des formules pensées pour vous simplifier la vie : tout le matériel coordonné
            et dimensionné selon le nombre de convives.
          </p>
        </div>

        <div className={styles.grilleCartes}>
          {packs.map(p => (
            <div key={p.id} className={styles.cartePack}>
              <div className={styles.cartePackImage}>
                <img
                  src={p.image || 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80'}
                  alt={p.nom}
                />
              </div>
              <div className={styles.cartePackContenu}>
                <h3 className={styles.cartePackTitre}>{p.nom}</h3>
                <p className={styles.cartePackDesc}>{p.description}</p>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                  paddingTop: 12,
                  borderTop: '1px solid rgba(255,255,255,0.08)'
                }}>
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>
                    👥 Capacité conseillée : <strong>{p.capacitePersonnes} pers.</strong>
                  </span>
                  <span className={styles.cartePackPrix}>
                    {p.prixEstime ? `${p.prixEstime} € HT` : 'Sur mesure'}
                  </span>
                </div>

                <a
                  href="#contact"
                  className={styles.ctaSecondaire}
                  style={{ textAlign: 'center', display: 'block' }}
                >
                  Demander un devis pour ce pack
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section Matériel en Vedette */}
      <section id="materiel" className={styles.section} style={{ background: 'rgba(255, 255, 255, 0.01)', borderRadius: 24 }}>
        <div className={styles.sectionEntete}>
          <span className={styles.sectionBadge}>Notre Catalogue</span>
          <h2 className={styles.sectionTitre}>Sélection de Matériel en Vedette</h2>
          <p className={styles.sectionDesc}>
            Mobilier design, chapiteaux élégants, verres et vaisselle de table pour toutes vos ambiances.
          </p>
        </div>

        <div className={styles.grilleArticles}>
          {(articlesEnVedette.length > 0 ? articlesEnVedette : articles.slice(0, 8)).map(art => (
            <div key={art.id} className={styles.carteArticle}>
              <div className={styles.carteArticleVisuel}>
                {art.imageWebUrl || art.photoUrl ? (
                  <img src={art.imageWebUrl || art.photoUrl} alt={art.nom} />
                ) : (
                  <span style={{ fontSize: 32 }}>📦</span>
                )}
              </div>
              <h4 className={styles.carteArticleNom}>{art.nom}</h4>
              <span className={styles.carteArticleCat}>{art.categorie?.nom || 'Mobilier'}</span>
              <div className={styles.carteArticlePrix}>
                {art.afficherPrixWeb ? (
                  `${art.prixLocationJour} € / jour`
                ) : (
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>Prix sur devis</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section Simulateur de Livraison */}
      <section id="livraison" className={styles.section}>
        <div className={styles.sectionEntete}>
          <span className={styles.sectionBadge}>Logistique &amp; Transport</span>
          <h2 className={styles.sectionTitre}>Barème de Livraison en Martinique</h2>
          <p className={styles.sectionDesc}>
            Nous livrons et installons votre matériel sur toute l'île. Estimez immédiatement vos frais d'acheminement.
          </p>
        </div>

        <div className={styles.boiteSimulateur}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#c4b5fd', marginBottom: 10 }}>
              🔎 Recherchez votre commune ou sélectionnez un secteur :
            </label>
            <input
              type="text"
              placeholder="Tapez le nom de votre commune (ex: Sainte-Luce, Lamentin, Carbet, Robert...)"
              value={rechercheCommune}
              onChange={e => {
                setRechercheCommune(e.target.value)
                setZoneSelectionnee('')
              }}
              style={{
                width: '100%',
                maxWidth: 450,
                padding: '12px 18px',
                borderRadius: 12,
                background: 'rgba(10, 10, 26, 0.8)',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                color: 'white',
                fontSize: 14,
                outline: 'none',
                textAlign: 'center'
              }}
            />
          </div>

          {zoneFiltree && (
            <div style={{
              background: 'rgba(139, 92, 246, 0.15)',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              borderRadius: 14,
              padding: '18px 24px',
              textAlign: 'center',
              margin: '20px 0'
            }}>
              <div style={{ fontSize: 13, color: '#a78bfa', textTransform: 'uppercase', fontWeight: 700 }}>
                Zone Identifiée
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#f8fafc', margin: '4px 0' }}>
                {zoneFiltree.nomZone}
              </div>
              <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 10 }}>
                Délai estimé : <strong>⏱️ {zoneFiltree.delaiLivraison || '24h à 48h'}</strong>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#34d399' }}>
                Forfait estimé : {zoneFiltree.tarifEstime} € HT
              </div>
            </div>
          )}

          <div className={styles.zoneGrid}>
            {zones.map(z => (
              <div
                key={z.id}
                className={`${styles.carteZone} ${zoneSelectionnee === z.id || zoneFiltree?.id === z.id ? styles.carteZoneActive : ''}`}
                onClick={() => {
                  setZoneSelectionnee(z.id)
                  setRechercheCommune('')
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.carteZoneTitre}>{z.nomZone}</div>
                <div className={styles.carteZoneCommunes}>{z.communes}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>⏱️ {z.delaiLivraison || '24h'}</span>
                  <span className={styles.carteZoneTarif}>{z.tarifEstime} € HT</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section Contact & Devis Rapide */}
      <section id="contact" className={styles.section} style={{ textAlign: 'center' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(124, 16, 35, 0.15))',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 24,
          padding: '48px 32px',
          maxWidth: 800,
          margin: '0 auto'
        }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Prêt à organiser votre événement ?</h2>
          <p style={{ color: '#94a3b8', fontSize: 15, maxWidth: 540, margin: '0 auto 28px auto' }}>
            Contactez notre équipe de conseillers événementiels ou demandez un devis gratuit personnalisé.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            <a href="tel:0596000000" className={styles.ctaPrimaire}>
              📞 05 96 00 00 00
            </a>
            <a href="mailto:contact@isylok.fr" className={styles.ctaSecondaire}>
              ✉️ contact@isylok.fr
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.piedPage}>
        <div style={{ marginBottom: 16 }}>
          <Image
            src="/logo-transparent.png"
            alt="Isy Lok"
            width={120}
            height={40}
            style={{ objectFit: 'contain' }}
          />
        </div>
        <p style={{ margin: '6px 0' }}>Isy Lok — Événementiel &amp; Location de Réception en Martinique</p>
        <p style={{ margin: '6px 0', fontSize: 12 }}>Le Lamentin — Fort-de-France — 97232 Martinique</p>
        <p style={{ margin: '14px 0 0 0', fontSize: 11, color: '#475569' }}>
          © 2026 Isy Lok. Tous droits réservés. | <Link href="/connexion" style={{ color: '#64748b' }}>Espace Collaborateurs</Link>
        </p>
      </footer>

      {/* Chatbot Virtuel Conseiller de Réception */}
      <ChatbotConseiller />
    </main>
  )
}
