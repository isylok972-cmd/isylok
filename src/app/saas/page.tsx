'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import BoutonDeconnexion from '@/composants/BoutonDeconnexion'

interface LicenceData {
  id?: string
  cleLicence: string
  nomEntreprise: string
  statutActif: boolean
  dateExpirationGlobale: string | null
  modulesConfig: Record<string, boolean>
}

const MODULES_DEFINITIONS = [
  { id: 'commercial', nom: 'Commercial & I.A.', icone: '💼', description: 'Devis, facturation, IA et exports comptables', couleur: '#6366f1' },
  { id: 'stocks', nom: 'Gestion des Stocks', icone: '📦', description: 'Articles, inventaire, réceptions et codes-barres', couleur: '#8b5cf6' },
  { id: 'planning', nom: 'Planning & Logistique', icone: '📅', description: 'Calendrier des sorties/retours et tournées', couleur: '#06b6d4' },
  { id: 'atelier', nom: 'Atelier Vaisselle & Linge', icone: '🧺', description: 'Conditionnements, retours et blanchisserie', couleur: '#14b8a6' },
  { id: 'terrain', nom: 'Espace Terrain & Livreur', icone: '🚛', description: 'PWA mobile, scans QR et pointages GPS', couleur: '#10b981' },
  { id: 'achats', nom: 'Achats & Sous-location', icone: '🤝', description: 'Confrères, bons de commande et marges', couleur: '#f59e0b' },
  { id: 'rh', nom: 'RH & Pointages', icone: '👥', description: 'Équipe, heures travaillées et exports paie', couleur: '#ef4444' },
  { id: 'cautions', nom: 'Cautions & Dépôts', icone: '🛡️', description: 'Dépôts de garantie, encaissements et restitutions', couleur: '#ec4899' },
  { id: 'web', nom: 'Gestion Site Web & CMS', icone: '🌐', description: 'Packs événements, zones de livraison et vitrine', couleur: '#a855f7' },
  { id: 'direction', nom: 'Direction & Statistiques', icone: '📊', description: 'Indicateurs de performance et analyse financière', couleur: '#3b82f6' },
]

export default function PageConsoleSaaS() {
  const router = useRouter()
  const [chargement, setChargement] = useState(true)
  const [autorise, setAutorise] = useState(false)
  const [sauvegardeEnCours, setSauvegardeEnCours] = useState(false)
  const [message, setMessage] = useState<{ texte: string; type: 'succes' | 'erreur' } | null>(null)

  const [licence, setLicence] = useState<LicenceData>({
    cleLicence: 'ISYLOK-PRO-972',
    nomEntreprise: 'Isy Lok Martinique',
    statutActif: true,
    dateExpirationGlobale: null,
    modulesConfig: {
      commercial: true,
      stocks: true,
      planning: true,
      atelier: true,
      terrain: true,
      achats: true,
      rh: true,
      cautions: true,
      web: true,
      direction: true
    }
  })

  useEffect(() => {
    const verifierSuperAdminEtCharger = async () => {
      try {
        const authRep = await fetch('/api/auth/me')
        const authData = await authRep.json()

        if (!authData.succes || authData.donnees?.role !== 'SUPER_ADMIN') {
          router.push('/')
          return
        }

        setAutorise(true)

        // Charger les données de licence
        const rep = await fetch('/api/saas')
        const data = await rep.json()

        if (data.succes && data.donnees) {
          setLicence({
            id: data.donnees.id,
            cleLicence: data.donnees.cleLicence || 'ISYLOK-PRO-972',
            nomEntreprise: data.donnees.nomEntreprise || 'Isy Lok Martinique',
            statutActif: data.donnees.statutActif ?? true,
            dateExpirationGlobale: data.donnees.dateExpirationGlobale
              ? new Date(data.donnees.dateExpirationGlobale).toISOString().split('T')[0]
              : null,
            modulesConfig: {
              commercial: true,
              stocks: true,
              planning: true,
              atelier: true,
              terrain: true,
              achats: true,
              rh: true,
              cautions: true,
              web: true,
              direction: true,
              ...(data.donnees.modulesConfig || {})
            }
          })
        }
      } catch (err) {
        console.error(err)
        router.push('/')
      } finally {
        setChargement(false)
      }
    }

    verifierSuperAdminEtCharger()
  }, [router])

  const toggleModule = (id: string) => {
    setLicence(prev => ({
      ...prev,
      modulesConfig: {
        ...prev.modulesConfig,
        [id]: !prev.modulesConfig[id]
      }
    }))
  }

  const appliquerProlongation = (mois: number | null) => {
    if (mois === null) {
      setLicence(prev => ({ ...prev, dateExpirationGlobale: null }))
      return
    }

    const base = licence.dateExpirationGlobale
      ? new Date(licence.dateExpirationGlobale)
      : new Date()
    
    // Si la date actuelle est déjà expirée, prolonger depuis aujourd'hui
    const ref = base < new Date() ? new Date() : base
    ref.setMonth(ref.getMonth() + mois)
    setLicence(prev => ({ ...prev, dateExpirationGlobale: ref.toISOString().split('T')[0] }))
  }

  const sauvegarder = async () => {
    setSauvegardeEnCours(true)
    setMessage(null)

    try {
      const rep = await fetch('/api/saas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(licence)
      })

      const data = await rep.json()

      if (data.succes) {
        setMessage({ texte: 'Configuration de la licence SaaS enregistrée avec succès.', type: 'succes' })
        setTimeout(() => setMessage(null), 4000)
      } else {
        setMessage({ texte: data.message || 'Erreur lors de la sauvegarde.', type: 'erreur' })
      }
    } catch (err) {
      setMessage({ texte: 'Erreur réseau.', type: 'erreur' })
    } finally {
      setSauvegardeEnCours(false)
    }
  }

  if (chargement) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a12', color: '#94a3b8' }}>
        Chargement de la Console SaaS…
      </main>
    )
  }

  if (!autorise) return null

  const estExpire = licence.dateExpirationGlobale
    ? new Date(licence.dateExpirationGlobale) < new Date()
    : false

  return (
    <main style={{
      minHeight: '100vh',
      background: '#0a0a12',
      backgroundImage: 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(201, 168, 76, 0.12) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(124, 16, 35, 0.12) 0%, transparent 50%)',
      padding: '32px 24px 64px 24px',
      fontFamily: 'Outfit, sans-serif',
      color: '#f8fafc'
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        
        {/* Entête */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '32px',
          paddingBottom: '20px',
          borderBottom: '1px solid rgba(201, 168, 76, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: '#080508', borderRadius: '12px', padding: '8px 14px', border: '1px solid rgba(201, 168, 76, 0.25)' }}>
              <Image src="/logo-transparent.png" alt="Isy Lok" width={140} height={50} style={{ objectFit: 'contain', display: 'block' }} priority />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                  Console de Pilotage SaaS
                </h1>
                <span style={{
                  background: 'linear-gradient(135deg, rgba(201, 168, 76, 0.2), rgba(201, 168, 76, 0.4))',
                  border: '1px solid rgba(201, 168, 76, 0.6)',
                  color: '#fbbf24',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  👑 Super Admin
                </span>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '14px', margin: '4px 0 0 0' }}>
                Gestion centralisée des licences, validité globale et permissions de modules
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '10px',
                color: '#e2e8f0',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              ← Retour au Dashboard
            </Link>
            <BoutonDeconnexion />
            <button
              onClick={sauvegarder}
              disabled={sauvegardeEnCours}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 22px',
                background: 'linear-gradient(135deg, #7C1023, #A01830)',
                border: '1px solid rgba(201, 168, 76, 0.4)',
                borderRadius: '10px',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(124, 16, 35, 0.4)'
              }}
            >
              {sauvegardeEnCours ? 'Sauvegarde…' : '💾 Enregistrer la Licence'}
            </button>
          </div>
        </header>

        {/* Message de notification */}
        {message && (
          <div style={{
            marginBottom: '24px',
            padding: '14px 18px',
            borderRadius: '12px',
            background: message.type === 'succes' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${message.type === 'succes' ? '#10b981' : '#ef4444'}`,
            color: message.type === 'succes' ? '#6ee7b7' : '#fca5a5',
            fontSize: '14px',
            fontWeight: 600
          }}>
            {message.texte}
          </div>
        )}

        {/* Section 1 : Statut Général & Expiration */}
        <section style={{
          background: 'rgba(15, 12, 18, 0.75)',
          borderRadius: '20px',
          border: '1px solid rgba(201, 168, 76, 0.2)',
          padding: '28px',
          marginBottom: '28px',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 20px 0', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚡</span> État Général de l&apos;Instance & Validité
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            
            {/* Carte Switch Statut Actif */}
            <div style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Statut de Fonctionnement
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                  <span style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: licence.statutActif && !estExpire ? '#10b981' : '#ef4444',
                    boxShadow: licence.statutActif && !estExpire ? '0 0 12px #10b981' : '0 0 12px #ef4444'
                  }} />
                  <span style={{ fontSize: '18px', fontWeight: 800, color: licence.statutActif && !estExpire ? '#10b981' : '#ef4444' }}>
                    {licence.statutActif ? (estExpire ? 'Expiré (Date Dépassée)' : 'Instance Active') : 'Suspendue Manuellement'}
                  </span>
                </div>
                <p style={{ color: '#64748b', fontSize: '12px', marginTop: '8px' }}>
                  Si suspendue ou expirée, tous les utilisateurs sont redirigés vers l&apos;écran d&apos;expiration.
                </p>
              </div>

              <div style={{ marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setLicence(p => ({ ...p, statutActif: !p.statutActif }))}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: licence.statutActif ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    border: `1px solid ${licence.statutActif ? '#ef4444' : '#10b981'}`,
                    color: licence.statutActif ? '#fca5a5' : '#86efac',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  {licence.statutActif ? 'Suspendre l\'instance' : 'Activer l\'instance'}
                </button>
              </div>
            </div>

            {/* Carte Date d'expiration */}
            <div style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px',
              padding: '20px'
            }}>
              <div style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Date d&apos;Expiration Globale
              </div>

              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="date"
                  value={licence.dateExpirationGlobale || ''}
                  onChange={e => setLicence(p => ({ ...p, dateExpirationGlobale: e.target.value || null }))}
                  style={{
                    background: 'rgba(15, 10, 14, 0.8)',
                    border: '1px solid rgba(201, 168, 76, 0.3)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                <span style={{ fontSize: '13px', color: licence.dateExpirationGlobale ? (estExpire ? '#ef4444' : '#10b981') : '#fbbf24', fontWeight: 700 }}>
                  {licence.dateExpirationGlobale ? (estExpire ? '⚠️ Expirée' : '✓ En cours') : '∞ Illimité'}
                </span>
              </div>

              {/* Raccourcis prolongation */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => appliquerProlongation(1)}
                  style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#e2e8f0', fontSize: '11px', cursor: 'pointer' }}
                >
                  +1 Mois
                </button>
                <button
                  type="button"
                  onClick={() => appliquerProlongation(6)}
                  style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#e2e8f0', fontSize: '11px', cursor: 'pointer' }}
                >
                  +6 Mois
                </button>
                <button
                  type="button"
                  onClick={() => appliquerProlongation(12)}
                  style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#e2e8f0', fontSize: '11px', cursor: 'pointer' }}
                >
                  +1 An
                </button>
                <button
                  type="button"
                  onClick={() => appliquerProlongation(null)}
                  style={{ padding: '5px 10px', background: 'rgba(201, 168, 76, 0.15)', border: '1px solid rgba(201, 168, 76, 0.4)', borderRadius: '6px', color: '#fbbf24', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Illimité
                </button>
              </div>
            </div>

            {/* Carte Infos Entreprise & Clé */}
            <div style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px',
              padding: '20px'
            }}>
              <div style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Identification Licence
              </div>
              <div style={{ marginTop: '10px' }}>
                <label style={{ fontSize: '11px', color: '#64748b' }}>Nom de l&apos;Entreprise Cliente</label>
                <input
                  type="text"
                  value={licence.nomEntreprise}
                  onChange={e => setLicence(p => ({ ...p, nomEntreprise: e.target.value }))}
                  style={{
                    width: '100%',
                    background: 'rgba(15, 10, 14, 0.8)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none',
                    marginTop: '2px'
                  }}
                />
              </div>
              <div style={{ marginTop: '10px' }}>
                <label style={{ fontSize: '11px', color: '#64748b' }}>Clé Unique</label>
                <input
                  type="text"
                  value={licence.cleLicence}
                  onChange={e => setLicence(p => ({ ...p, cleLicence: e.target.value }))}
                  style={{
                    width: '100%',
                    background: 'rgba(15, 10, 14, 0.8)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    color: '#fbbf24',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    outline: 'none',
                    marginTop: '2px'
                  }}
                />
              </div>
            </div>

          </div>
        </section>

        {/* Section 2 : Activation individuelle des modules */}
        <section style={{
          background: 'rgba(15, 12, 18, 0.75)',
          borderRadius: '20px',
          border: '1px solid rgba(201, 168, 76, 0.2)',
          padding: '28px',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🧩</span> Modules & Fonctionnalités Inclus
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 0' }}>
                Activez ou désactivez les fonctionnalités selon l&apos;offre commerciale souscrite par le client
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  const allOn = MODULES_DEFINITIONS.reduce((acc, m) => ({ ...acc, [m.id]: true }), {})
                  setLicence(p => ({ ...p, modulesConfig: allOn }))
                }}
                style={{ padding: '6px 12px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', borderRadius: '8px', color: '#86efac', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
              >
                Tout activer
              </button>
              <button
                type="button"
                onClick={() => {
                  const allOff = MODULES_DEFINITIONS.reduce((acc, m) => ({ ...acc, [m.id]: false }), {})
                  setLicence(p => ({ ...p, modulesConfig: allOff }))
                }}
                style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', color: '#fca5a5', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
              >
                Tout désactiver
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '16px' }}>
            {MODULES_DEFINITIONS.map(mod => {
              const actif = licence.modulesConfig[mod.id] !== false

              return (
                <div
                  key={mod.id}
                  onClick={() => toggleModule(mod.id)}
                  style={{
                    background: actif ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.2)',
                    border: `1px solid ${actif ? `${mod.couleur}44` : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: '14px',
                    padding: '18px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    transition: 'all 0.2s ease',
                    boxShadow: actif ? `0 4px 20px ${mod.couleur}15` : 'none',
                    opacity: actif ? 1 : 0.6
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      fontSize: '24px',
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      background: `${mod.couleur}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `1px solid ${mod.couleur}30`
                    }}>
                      {mod.icone}
                    </div>
                    <div>
                      <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '14px' }}>
                        {mod.nom}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>
                        {mod.description}
                      </div>
                    </div>
                  </div>

                  {/* Interrupteur toggle switch */}
                  <div style={{
                    width: '46px',
                    height: '24px',
                    background: actif ? '#10b981' : '#334155',
                    borderRadius: '999px',
                    position: 'relative',
                    transition: 'background 0.2s',
                    flexShrink: 0
                  }}>
                    <div style={{
                      width: '18px',
                      height: '18px',
                      background: '#ffffff',
                      borderRadius: '50%',
                      position: 'absolute',
                      top: '3px',
                      left: actif ? '24px' : '4px',
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

      </div>
    </main>
  )
}
