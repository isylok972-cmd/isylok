'use client'

import { useRef } from 'react'
import styles from '../commercial.module.css'

interface PropsModaleApercuPdf {
  titre: string
  numero: string
  urlPdf: string
  onFermer: () => void
}

export function ModaleApercuPdf({ titre, numero, urlPdf, onFermer }: PropsModaleApercuPdf) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const imprimer = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.focus()
      iframeRef.current.contentWindow.print()
    }
  }

  const urlTelechargement = `${urlPdf}?download=1`

  return (
    <div className={styles.overlay} onClick={onFermer}>
      <div
        className={styles.modale}
        style={{ maxWidth: 950, width: '92vw', height: '90vh', display: 'flex', flexDirection: 'column', padding: 20 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Entête de la modale */}
        <div className={styles.modaleEntete} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>📄</span>
            <div>
              <h2 style={{ fontSize: 18, margin: 0, color: '#f1f5f9' }}>
                {titre} — <span style={{ color: '#C9A84C' }}>{numero}</span>
              </h2>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                Document officiel A4 généré par Isy Lok
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className={styles.boutonActionPdf}
              onClick={imprimer}
              title="Imprimer directement le document"
            >
              🖨️ Imprimer
            </button>

            <a
              href={urlTelechargement}
              download={`${numero}.pdf`}
              className={styles.boutonTelechargerPdfDirect}
              title="Télécharger le fichier PDF sur votre appareil"
            >
              ⬇️ Télécharger PDF
            </a>

            <button
              type="button"
              className={styles.boutonFermer}
              onClick={onFermer}
              title="Fermer la prévisualisation"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Visionneuse PDF */}
        <div style={{ flex: 1, width: '100%', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(251, 191, 36, 0.2)', background: '#1e293b' }}>
          <iframe
            ref={iframeRef}
            src={urlPdf}
            title={`Aperçu PDF - ${numero}`}
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        </div>
      </div>
    </div>
  )
}
