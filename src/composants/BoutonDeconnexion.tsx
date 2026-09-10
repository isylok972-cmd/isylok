'use client'

import { useState } from 'react'

interface BoutonDeconnexionProps {
  style?: React.CSSProperties
  className?: string
  variante?: 'compact' | 'standard'
}

export default function BoutonDeconnexion({ style, className, variante = 'standard' }: BoutonDeconnexionProps) {
  const [enCours, setEnCours] = useState(false)

  const handleDeconnexion = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (enCours) return

    setEnCours(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (err) {
      console.error('Erreur lors de la déconnexion:', err)
    } finally {
      // Force le rechargement vers la page de connexion pour nettoyer la session
      window.location.href = '/connexion'
    }
  }

  const estCompact = variante === 'compact'

  return (
    <button
      onClick={handleDeconnexion}
      disabled={enCours}
      className={className}
      title="Se déconnecter de la session"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: estCompact ? '6px 10px' : '7px 14px',
        background: 'rgba(239, 68, 68, 0.12)',
        border: '1px solid rgba(239, 68, 68, 0.35)',
        borderRadius: '10px',
        color: '#fca5a5',
        fontSize: estCompact ? '12px' : '13px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        fontFamily: 'Outfit, sans-serif',
        ...style
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'
        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.6)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'
        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.35)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <span style={{ fontSize: '14px' }}>🚪</span>
      <span>{enCours ? 'Déconnexion…' : 'Déconnexion'}</span>
    </button>
  )
}
