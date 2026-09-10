'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

export default function PageConnexion() {
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const router = useRouter()

  const handleLogin = async (e: any) => {
    e.preventDefault()
    setErreur('')
    
    try {
      const rep = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, motDePasse })
      })
      const data = await rep.json()
      
      if (data.succes) {
        window.location.href = '/' // Force reload pour appliquer le cookie au header
      } else {
        setErreur(data.message)
      }
    } catch (err) {
      setErreur('Erreur de connexion')
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a12',
      backgroundImage: 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(124, 16, 35, 0.15) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(201, 168, 76, 0.07) 0%, transparent 50%)',
    }}>
      <div style={{
        background: 'rgba(15, 10, 14, 0.8)',
        padding: '40px',
        borderRadius: '20px',
        border: '1px solid rgba(124, 16, 35, 0.3)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(201, 168, 76, 0.1)',
        backdropFilter: 'blur(20px)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ background: '#080508', borderRadius: '10px', padding: '6px 12px', display: 'inline-block', marginBottom: '8px' }}>
            <Image
              src="/logo-transparent.png"
              alt="Isy Lok"
              width={200}
              height={80}
              style={{ objectFit: 'contain', display: 'block' }}
              priority
            />
          </div>
          <p style={{ color: '#a89090', fontSize: '13px', marginTop: '8px' }}>Accès à votre espace de gestion</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {erreur && <div style={{ color: '#f87171', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px', textAlign: 'center', fontSize: '14px' }}>{erreur}</div>}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 600 }}>Adresse e-mail</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              placeholder="nom@exemple.mq"
              style={{ padding: '12px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(124, 16, 35, 0.4)', borderRadius: '8px', color: 'white', outline: 'none' }}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 600 }}>Mot de passe</label>
            <input 
              type="password" 
              value={motDePasse} 
              onChange={e => setMotDePasse(e.target.value)}
              placeholder="••••••••"
              style={{ padding: '12px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(124, 16, 35, 0.4)', borderRadius: '8px', color: 'white', outline: 'none' }}
              required
            />
          </div>

          <button type="submit" style={{
            padding: '14px',
            background: 'linear-gradient(135deg, #7C1023, #A01830)',
            border: '1px solid rgba(201, 168, 76, 0.25)',
            borderRadius: '8px',
            color: 'white',
            fontWeight: 700,
            cursor: 'pointer',
            marginTop: '8px',
            fontSize: '15px',
            boxShadow: '0 4px 16px rgba(124, 16, 35, 0.4)',
            transition: 'all 0.2s ease',
            fontFamily: 'Outfit, sans-serif',
          }}>
            Se connecter
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <Link href="/" style={{ color: '#94a3b8', fontSize: '13px', textDecoration: 'none' }}>← Retour à l&apos;accueil</Link>
        </div>
      </div>
    </main>
  )
}
