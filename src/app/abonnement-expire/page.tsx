'use client'

import Image from 'next/image'
import Link from 'next/link'

export default function PageAbonnementExpire() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a12',
      backgroundImage: 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(239, 68, 68, 0.15) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(201, 168, 76, 0.08) 0%, transparent 50%)',
      padding: '24px',
      fontFamily: 'Outfit, sans-serif'
    }}>
      <div style={{
        background: 'rgba(18, 12, 16, 0.85)',
        padding: '48px 40px',
        borderRadius: '24px',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        boxShadow: '0 12px 50px rgba(0,0,0,0.7), inset 0 1px 0 rgba(239, 68, 68, 0.2)',
        backdropFilter: 'blur(20px)',
        width: '100%',
        maxWidth: '520px',
        textAlign: 'center'
      }}>
        {/* Logo */}
        <div style={{ background: '#080508', borderRadius: '12px', padding: '10px 16px', display: 'inline-block', marginBottom: '24px', border: '1px solid rgba(201, 168, 76, 0.2)' }}>
          <Image
            src="/logo-transparent.png"
            alt="Isy Lok"
            width={180}
            height={70}
            style={{ objectFit: 'contain', display: 'block' }}
            priority
          />
        </div>

        {/* Badge statut */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '999px',
          padding: '6px 16px',
          color: '#fca5a5',
          fontSize: '13px',
          fontWeight: 600,
          marginBottom: '20px'
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
          Abonnement SaaS Interrompu
        </div>

        <h1 style={{ color: '#ffffff', fontSize: '24px', fontWeight: 800, margin: '0 0 12px 0' }}>
          Licence Isy Lok Expirée ou Suspendue
        </h1>

        <p style={{ color: '#94a3b8', fontSize: '15px', lineHeight: 1.6, margin: '0 0 28px 0' }}>
          La période de validité de votre instance Isy Lok est arrivée à échéance ou l&apos;accès a été temporairement suspendu par l&apos;éditeur. Vos données restent sécurisées.
        </p>

        {/* Bloc support */}
        <div style={{
          background: 'rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '28px',
          textAlign: 'left'
        }}>
          <div style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
            📞 Pour réactiver votre accès immédiat :
          </div>
          <div style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.7 }}>
            • Contactez votre gestionnaire de compte ou l&apos;assistance Isy Lok.<br />
            • Email : <span style={{ color: '#c4b5fd' }}>contact@isylok.mq</span><br />
            • Téléphone : <span style={{ color: '#c4b5fd' }}>05 96 12 34 56</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Link
            href="/connexion"
            style={{
              display: 'block',
              padding: '14px',
              background: 'linear-gradient(135deg, #7C1023, #A01830)',
              border: '1px solid rgba(201, 168, 76, 0.3)',
              borderRadius: '10px',
              color: 'white',
              fontWeight: 700,
              fontSize: '14px',
              textDecoration: 'none',
              boxShadow: '0 4px 16px rgba(124, 16, 35, 0.4)'
            }}
          >
            Accès Super Admin (Déverrouillage)
          </Link>

          <Link
            href="/vitrine"
            style={{
              display: 'block',
              padding: '12px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: '#94a3b8',
              fontSize: '13px',
              textDecoration: 'none'
            }}
          >
            Consulter le site vitrine public →
          </Link>
        </div>
      </div>
    </main>
  )
}
