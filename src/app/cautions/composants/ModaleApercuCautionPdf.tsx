'use client'

import React, { useRef } from 'react'
import styles from '../cautions.module.css'

interface ModaleApercuCautionPdfProps {
  numero: string
  urlPdf: string
  onFermer: () => void
}

export function ModaleApercuCautionPdf({ numero, urlPdf, onFermer }: ModaleApercuCautionPdfProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const imprimer = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.focus()
      iframeRef.current.contentWindow.print()
    }
  }

  const urlTelechargement = `${urlPdf}?download=1`

  return (
    <div className={styles.modaleOverlay} onClick={onFermer}>
      <div
        className={styles.modaleConteneur}
        style={{ maxWidth: 960, width: '92vw', height: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.modaleEntete}>
          <div className={styles.modaleTitre}>
            <span>📄</span>
            <span>Attestation &amp; Récépissé de Caution — <span style={{ color: '#2dd4bf' }}>{numero}</span></span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className={styles.boutonSecondaire}
              onClick={imprimer}
              title="Imprimer directement l'attestation"
            >
              🖨️ Imprimer
            </button>

            <a
              href={urlTelechargement}
              download={`${numero}.pdf`}
              className={styles.boutonPrimaire}
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              title="Télécharger le fichier PDF officiel"
            >
              ⬇️ Télécharger PDF
            </a>

            <button className={styles.boutonFermer} onClick={onFermer} title="Fermer">✕</button>
          </div>
        </div>

        <div style={{ flex: 1, padding: 12, background: '#0b0f19' }}>
          <iframe
            ref={iframeRef}
            src={urlPdf}
            title={`Prévisualisation ${numero}`}
            style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8, background: '#ffffff' }}
          />
        </div>
      </div>
    </div>
  )
}
