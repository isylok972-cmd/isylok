'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { BULLES_CONFIG } from '@/lib/config-bulles'
import type { ConfigBulle, RoleUtilisateur } from '@/types'
import styles from './page.module.css'

export default function PageAccueil() {
  const router = useRouter()
  const [roleUtilisateur, setRoleUtilisateur] = useState<RoleUtilisateur | null>(null)
  const [bullesVisibles, setBullesVisibles] = useState<number[]>([])
  const [heureActuelle, setHeureActuelle] = useState('')
  const [dateActuelle, setDateActuelle] = useState('')
  
  const [badges, setBadges] = useState<{ stocks?: number, commercial?: number, rh?: number, atelier?: number }>({})
  const [recherche, setRecherche] = useState('')
  const [resultats, setResultats] = useState<any>(null)

  useEffect(() => {
    // Vérification du rôle connecté pour redirection et visibilité
    const verifierAuth = async () => {
      try {
        const rep = await fetch('/api/auth/me')
        const data = await rep.json()
        if (data.succes && data.donnees.role) {
          const role = data.donnees.role as RoleUtilisateur
          setRoleUtilisateur(role)
          if (role === 'OPERATEUR_ATELIER') {
            router.push('/atelier')
          }
        }
      } catch (err) {
        console.error(err)
      }
    }
    verifierAuth()
  }, [router])

  useEffect(() => {
    BULLES_CONFIG.forEach((_, index) => {
      setTimeout(() => {
        setBullesVisibles((prev) => [...prev, index])
      }, 100 + index * 80)
    })
    
    // Fetch badges
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { if (d.succes) setBadges(d.donnees.badges) })
  }, [])

  useEffect(() => {
    const maj = () => {
      const m = new Date()
      setHeureActuelle(m.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
      setDateActuelle(m.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
    }
    maj()
    const i = setInterval(maj, 30000)
    return () => clearInterval(i)
  }, [])

  useEffect(() => {
    if (recherche.length > 1) {
      const delay = setTimeout(() => {
        fetch(`/api/dashboard?q=${encodeURIComponent(recherche)}`)
          .then(r => r.json())
          .then(d => { if (d.succes) setResultats(d.donnees) })
      }, 300)
      return () => clearTimeout(delay)
    } else {
      setResultats(null)
    }
  }, [recherche])

  return (
    <main className={styles.conteneur}>
      <div className={styles.particules}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={styles.particule} style={{ left: `${15 + i * 15}%`, top: `${10 + (i % 3) * 25}%`, animationDelay: `${i * 0.8}s`, animationDuration: `${6 + i * 1.5}s` }} />
        ))}
      </div>

      <header className={styles.entete}>
        <div className={styles.enteteGauche}>
          <div className={styles.logo}>
            <div className={styles.logoWrapper}>
              <Image
                src="/logo-transparent.png"
                alt="Isy Lok"
                width={340}
                height={136}
                className={styles.logoImage}
                priority
              />
            </div>
          </div>
        </div>
        
        <div className={styles.zoneRecherche}>
          <span className={styles.iconeRecherche}>🔍</span>
          <input 
            className={styles.champRecherche} 
            placeholder="Rechercher un client, article, devis..." 
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
          />
          {resultats && (
            <div className={styles.resultatsRecherche}>
              {resultats.clients?.length > 0 && <div className={styles.resultatTitre}>Clients</div>}
              {resultats.clients?.map((c: any) => (
                <Link key={c.id} href={`/clients`} className={styles.resultatItem}>👤 {c.prenom} {c.nom} {c.entreprise ? `(${c.entreprise})` : ''}</Link>
              ))}
              
              {resultats.articles?.length > 0 && <div className={styles.resultatTitre}>Articles</div>}
              {resultats.articles?.map((a: any) => (
                <Link key={a.id} href={`/stocks`} className={styles.resultatItem}>📦 {a.nom}</Link>
              ))}
              
              {resultats.devis?.length > 0 && <div className={styles.resultatTitre}>Devis</div>}
              {resultats.devis?.map((d: any) => (
                <Link key={d.id} href={`/commercial`} className={styles.resultatItem}>📝 {d.numero} - {d.client.nom}</Link>
              ))}

              {resultats.clients?.length === 0 && resultats.articles?.length === 0 && resultats.devis?.length === 0 && (
                <div style={{ padding: 10, color: '#94a3b8', fontSize: 12 }}>Aucun résultat trouvé.</div>
              )}
            </div>
          )}
        </div>

        <div className={styles.enteteDroite}>
          <Link
            href="/vitrine"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              background: 'rgba(139, 92, 246, 0.15)',
              border: '1px solid rgba(139, 92, 246, 0.35)',
              borderRadius: '10px',
              color: '#c4b5fd',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
            title="Ouvrir le site web vitrine public"
          >
            <span>🌐</span>
            <span>Site Vitrine</span>
          </Link>
          <div className={styles.horloge}>
            <span className={styles.heure}>{heureActuelle}</span>
            <span className={styles.date}>{dateActuelle}</span>
          </div>
          <div className={styles.indicateurReseau}>
            <span className={styles.pointReseau} />
            <span>En ligne</span>
          </div>
        </div>
      </header>

      <section className={styles.grilleBulles}>
        {BULLES_CONFIG
          .filter(bulle => !roleUtilisateur || bulle.rolesAutorises.includes(roleUtilisateur))
          .map((bulle, index) => {
            let badgeVal = 0
            if (bulle.id === 2) badgeVal = badges.stocks || 0 // Bulle 2: Stocks
            if (bulle.id === 1) badgeVal = badges.commercial || 0 // Bulle 1: Commercial
            if (bulle.id === 6) badgeVal = badges.rh || 0 // Bulle 6: RH
            if (bulle.id === 11) badgeVal = badges.atelier || 0 // Bulle 11: Atelier

            return <CarteBulle key={bulle.id} bulle={bulle} visible={bullesVisibles.includes(index)} delai={index * 80} badge={badgeVal} />
          })}
      </section>

      <footer className={styles.piedPage}>
        <span className={styles.version}>v1.0.0</span>
        <span className={styles.copyright}>© 2026 Isy Lok — Tous droits réservés</span>
      </footer>
    </main>
  )
}

function CarteBulle({ bulle, visible, delai, badge }: { bulle: ConfigBulle; visible: boolean; delai: number, badge: number }) {
  const [survol, setSurvol] = useState(false)

  return (
    <Link href={bulle.lien} className={`${styles.bulle} ${visible ? styles.bulleVisible : ''}`}
      style={{ '--couleur-bulle': bulle.couleur, '--couleur-gradient': bulle.couleurGradient, '--delai-animation': `${delai}ms` } as React.CSSProperties}
      onMouseEnter={() => setSurvol(true)} onMouseLeave={() => setSurvol(false)} id={`bulle-${bulle.id}`}>
      {badge > 0 && <span className={styles.badgeNotification}>{badge}</span>}
      <div className={styles.bulleLueur} style={{ opacity: survol ? 1 : 0 }} />
      <span className={styles.bulleNumero}>{String(bulle.id).padStart(2, '0')}</span>
      <div className={styles.bulleIcone}>
        <span className={styles.bulleEmoji} style={{ transform: survol ? 'scale(1.2)' : 'scale(1)' }}>{bulle.icone}</span>
      </div>
      <h2 className={styles.bulleNom}>{bulle.nom}</h2>
      <p className={styles.bulleSousTitre}>{bulle.sousTitre}</p>
      <div className={styles.bulleFleche} style={{ transform: survol ? 'translateX(4px)' : 'translateX(0)' }}>→</div>
    </Link>
  )
}

