'use client'

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function BandeauInstallationPwa() {
  const [promptDiffere, setPromptDiffere] = useState<BeforeInstallPromptEvent | null>(null)
  const [estVisible, setEstVisible] = useState(false)
  const [estIos, setEstIos] = useState(false)
  const [guideIosOuvert, setGuideIosOuvert] = useState(false)

  useEffect(() => {
    // Vérifier si déjà en mode standalone PWA
    const estStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true

    if (estStandalone) return

    // Vérifier si l'utilisateur a masqué le bandeau pour cette session
    if (sessionStorage.getItem('pwa_bandeau_masque') === 'true') {
      return
    }

    // Détection iOS Safari
    const ua = window.navigator.userAgent.toLowerCase()
    const estAppareilIos = /iphone|ipad|ipod/.test(ua) && !('MSStream' in window)
    if (estAppareilIos) {
      setEstIos(true)
      // Afficher le bandeau après 3 secondes sur mobile iOS
      const timer = setTimeout(() => {
        setEstVisible(true)
      }, 3000)
      return () => clearTimeout(timer)
    }

    // Gestion de l'événement natif Android / Chrome
    const gererBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setPromptDiffere(e as BeforeInstallPromptEvent)
      setEstVisible(true)
    }

    window.addEventListener('beforeinstallprompt', gererBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', gererBeforeInstallPrompt)
    }
  }, [])

  const installerApp = async () => {
    if (promptDiffere) {
      await promptDiffere.prompt()
      const choix = await promptDiffere.userChoice
      if (choix.outcome === 'accepted') {
        setEstVisible(false)
      }
      setPromptDiffere(null)
    } else if (estIos) {
      setGuideIosOuvert(true)
    }
  }

  const masquerBandeau = () => {
    setEstVisible(false)
    sessionStorage.setItem('pwa_bandeau_masque', 'true')
  }

  if (!estVisible) return null

  return (
    <aside
      aria-label="Installation de l'application"
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '16px',
        right: '16px',
        maxWidth: '480px',
        margin: '0 auto',
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        borderRadius: '16px',
        padding: '14px 18px',
        boxShadow: '0 20px 35px -10px rgba(0, 0, 0, 0.6), 0 0 20px rgba(56, 189, 248, 0.15)',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        animation: 'slideUp 0.3s ease-out',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
            }}
          >
            📦
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff', letterSpacing: '-0.01em' }}>
              Installer Isy Lok
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Accès rapide plein écran pour les livraisons et le terrain
            </div>
          </div>
        </div>

        <button
          onClick={masquerBandeau}
          aria-label="Fermer la bannière"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: 'none',
            color: '#94a3b8',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
          }}
        >
          ✕
        </button>
      </div>

      {guideIosOuvert ? (
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.7)',
            padding: '10px 12px',
            borderRadius: '10px',
            fontSize: '0.82rem',
            color: '#cbd5e1',
            lineHeight: '1.4',
            border: '1px dashed rgba(148, 163, 184, 0.3)',
          }}
        >
          📲 <strong>Sur iPhone / iPad :</strong> appuyez sur le bouton <strong>Partager</strong> (icône ⎋ en bas de Safari) puis choisissez <strong>&quot;Sur l&apos;écran d&apos;accueil&quot;</strong> ➕.
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '2px' }}>
          <button
            onClick={masquerBandeau}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              background: 'transparent',
              color: '#94a3b8',
              border: 'none',
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            Plus tard
          </button>
          <button
            onClick={installerApp}
            style={{
              padding: '7px 16px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0284c7, #2563eb)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)',
            }}
          >
            📲 Installer l&apos;application
          </button>
        </div>
      )}
    </aside>
  )
}
