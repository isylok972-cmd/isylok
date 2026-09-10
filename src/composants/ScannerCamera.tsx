'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

interface ScannerCameraProps {
  onScan: (code: string) => void
  onFermer?: () => void
  titre?: string
  description?: string
  actif?: boolean
  delaiEntreScansMs?: number
}

export default function ScannerCamera({
  onScan,
  onFermer,
  titre = 'Scanner de Code-barres & QR',
  description = 'Pointez la caméra vers un code QR ou code-barres (EAN-13, Code 128)',
  actif = true,
  delaiEntreScansMs = 1500,
}: ScannerCameraProps) {
  const [estDemarre, setEstDemarre] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [torcheActive, setTorcheActive] = useState(false)
  const [supportTorche, setSupportTorche] = useState(false)
  const [dernierCodeScanne, setDernierCodeScanne] = useState<string | null>(null)

  const scannerRef = useRef<Html5Qrcode | null>(null)
  const blocageScanRef = useRef(false)
  const elementIdRef = useRef(`isy-scanner-${Math.random().toString(36).substring(2, 9)}`)

  // Retour sonore Web Audio API
  const jouerBip = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime) // Fréquence A5 nette
      gain.gain.setValueAtTime(0.18, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.12)
    } catch {
      // Ignorer silencieusement si bloqué
    }
  }, [])

  // Vibration tactile
  const vibrer = useCallback(() => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([80, 40, 80])
      } catch {
        // Ignorer si non supporté
      }
    }
  }, [])

  // Callback de lecture réussie
  const gererScanReussi = useCallback(
    (decodedText: string) => {
      if (blocageScanRef.current) return

      blocageScanRef.current = true
      setDernierCodeScanne(decodedText)
      jouerBip()
      vibrer()
      onScan(decodedText)

      setTimeout(() => {
        blocageScanRef.current = false
      }, delaiEntreScansMs)
    },
    [onScan, jouerBip, vibrer, delaiEntreScansMs]
  )

  // Bascule de la torche
  const basculerTorche = async () => {
    if (!scannerRef.current) return
    try {
      const nouvelEtat = !torcheActive
      await (scannerRef.current.applyVideoConstraints as (constraints: unknown) => Promise<void>)({
        advanced: [{ torch: nouvelEtat }],
      })
      setTorcheActive(nouvelEtat)
    } catch {
      console.warn('Impossible d’activer la torche sur cet appareil.')
    }
  }

  useEffect(() => {
    if (!actif) return

    let annule = false
    const html5QrCode = new Html5Qrcode(elementIdRef.current, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.DATA_MATRIX,
      ],
      verbose: false,
    })
    scannerRef.current = html5QrCode

    const config = {
      fps: 15,
      qrbox: { width: 260, height: 260 },
      aspectRatio: 1.0,
    }

    html5QrCode
      .start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          if (!annule) {
            gererScanReussi(decodedText)
          }
        },
        () => {
          // Erreur frame par frame ignorée intentionnellement
        }
      )
      .then(() => {
        if (annule) {
          html5QrCode.stop().then(() => html5QrCode.clear()).catch(() => {})
          return
        }
        setEstDemarre(true)
        setErreur(null)

        // Vérifier si la torche est supportée
        try {
          const capabilities = html5QrCode.getRunningTrackCapabilities?.() as Record<string, unknown> | undefined
          if (capabilities && 'torch' in capabilities) {
            setSupportTorche(true)
          }
        } catch {
          // Support non détecté
        }
      })
      .catch((err) => {
        if (!annule) {
          console.error('Erreur démarrage caméra:', err)
          setErreur(
            "Impossible d'accéder à la caméra. Vérifiez les autorisations de votre navigateur."
          )
        }
      })

    return () => {
      annule = true
      if (html5QrCode.isScanning) {
        html5QrCode
          .stop()
          .then(() => {
            html5QrCode.clear()
          })
          .catch(() => {})
      }
    }
  }, [actif, gererScanReussi])

  return (
    <div
      style={{
        position: 'relative',
        background: '#0f172a',
        borderRadius: '20px',
        overflow: 'hidden',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
        color: '#ffffff',
        width: '100%',
        maxWidth: '480px',
        margin: '0 auto',
      }}
    >
      {/* En-tête */}
      <div
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(30, 41, 59, 0.6)',
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📷</span> {titre}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
            {description}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {supportTorche && (
            <button
              type="button"
              onClick={basculerTorche}
              aria-label={torcheActive ? 'Éteindre la torche' : 'Allumer la torche'}
              style={{
                background: torcheActive ? '#eab308' : 'rgba(255, 255, 255, 0.1)',
                color: torcheActive ? '#000000' : '#ffffff',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '16px',
                transition: 'all 0.2s ease',
              }}
            >
              💡
            </button>
          )}

          {onFermer && (
            <button
              type="button"
              onClick={onFermer}
              aria-label="Fermer le scanner"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Zone Vidéo & Scanner */}
      <div style={{ position: 'relative', width: '100%', minHeight: '320px', background: '#020617' }}>
        <div id={elementIdRef.current} style={{ width: '100%' }} />

        {/* Cadre de visée animé */}
        {estDemarre && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '240px',
              height: '240px',
              pointerEvents: 'none',
              borderRadius: '16px',
              border: '2px solid rgba(56, 189, 248, 0.7)',
              boxShadow: '0 0 25px rgba(56, 189, 248, 0.3)',
            }}
          >
            {/* 4 coins stylisés */}
            <div style={{ position: 'absolute', top: '-2px', left: '-2px', width: '20px', height: '20px', borderTop: '4px solid #38bdf8', borderLeft: '4px solid #38bdf8', borderTopLeftRadius: '16px' }} />
            <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '20px', height: '20px', borderTop: '4px solid #38bdf8', borderRight: '4px solid #38bdf8', borderTopRightRadius: '16px' }} />
            <div style={{ position: 'absolute', bottom: '-2px', left: '-2px', width: '20px', height: '20px', borderBottom: '4px solid #38bdf8', borderLeft: '4px solid #38bdf8', borderBottomLeftRadius: '16px' }} />
            <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '20px', height: '20px', borderBottom: '4px solid #38bdf8', borderRight: '4px solid #38bdf8', borderBottomRightRadius: '16px' }} />
            
            {/* Ligne laser animée */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: 'linear-gradient(90deg, transparent, #38bdf8, transparent)',
                boxShadow: '0 0 10px #38bdf8',
                animation: 'scannerLaser 2s infinite ease-in-out alternate',
              }}
            />
          </div>
        )}

        {/* Message d'erreur */}
        {erreur && (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              color: '#f87171',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '32px' }}>⚠️</span>
            <div style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>{erreur}</div>
          </div>
        )}
      </div>

      {/* Barre d'état inférieure */}
      <div
        style={{
          padding: '12px 20px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: '0.82rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ color: '#94a3b8' }}>
          {dernierCodeScanne ? (
            <span style={{ color: '#4ade80', fontWeight: 600 }}>
              ✓ Lu : {dernierCodeScanne}
            </span>
          ) : (
            'Scan actif en continu'
          )}
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: '#38bdf8',
            fontSize: '0.75rem',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#38bdf8',
              boxShadow: '0 0 8px #38bdf8',
            }}
          />
          Prêt
        </span>
      </div>

      <style jsx global>{`
        @keyframes scannerLaser {
          0% {
            top: 5%;
          }
          100% {
            top: 95%;
          }
        }
      `}</style>
    </div>
  )
}
