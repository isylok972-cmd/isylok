'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './reseaux.module.css'

// Fausses données pour la galerie
const faussesPhotos = [
  { id: 1, url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=500&auto=format&fit=crop', titre: 'Mariage Mairie de Bordeaux', date: '2026-04-25' },
  { id: 2, url: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?q=80&w=500&auto=format&fit=crop', titre: 'Soirée Corporate', date: '2026-04-20' },
  { id: 3, url: 'https://images.unsplash.com/photo-1533174000253-1d3140b93836?q=80&w=500&auto=format&fit=crop', titre: 'Anniversaire Plage', date: '2026-04-18' },
  { id: 4, url: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=500&auto=format&fit=crop', titre: 'Réception VIP', date: '2026-04-15' },
  { id: 5, url: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=500&auto=format&fit=crop', titre: 'Inauguration Boutiques', date: '2026-04-10' },
]

export default function PageReseaux() {
  const [contenu, setContenu] = useState('')

  return (
    <main className={styles.conteneur}>
      <header className={styles.entete}>
        <div className={styles.enteteGauche}>
          <Link href="/" className={styles.boutonRetour}>← Accueil</Link>
          <div className={styles.titreModule}>
            <span>📸</span>
            <h1>Réseaux Sociaux &amp; Galerie</h1>
          </div>
        </div>
      </header>

      <div className={styles.grilleMiseEnPage}>
        
        {/* Panneau Galerie */}
        <div className={styles.panneau}>
          <h2 className={styles.panneauTitre}>🖼️ Galerie Terrain</h2>
          <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>
            Photos remontées par les livreurs depuis l'application mobile lors des installations.
          </p>

          <div className={styles.grilleGalerie}>
            {faussesPhotos.map(photo => (
              <div key={photo.id} className={styles.cartePhoto}>
                <img src={photo.url} alt={photo.titre} className={styles.photoImage} />
                <div className={styles.photoDetails}>
                  <div className={styles.photoTitre}>{photo.titre}</div>
                  <div className={styles.photoDate}>{new Date(photo.date).toLocaleDateString('fr-FR')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Panneau Préparer Post */}
        <div className={styles.panneau}>
          <h2 className={styles.panneauTitre}>✍️ Préparer un post</h2>
          <div className={styles.formPost}>
            <div className={styles.champGroupe}>
              <label>Plateforme</label>
              <select>
                <option>Instagram &amp; Facebook (Meta Suite)</option>
                <option>Instagram uniquement</option>
                <option>Facebook uniquement</option>
              </select>
            </div>
            
            <div className={styles.champGroupe}>
              <label>Texte de la publication</label>
              <textarea 
                value={contenu} 
                onChange={e => setContenu(e.target.value)}
                placeholder="Retour en images sur notre magnifique installation de ce week-end ! ✨..."
              />
            </div>

            <div className={styles.zoneUpload}>
              <div>📥 Glissez vos photos ici</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>(Ou cliquez pour sélectionner depuis la galerie)</div>
            </div>

            <button className={styles.boutonPublier}>
              🚀 Publier (Prochainement)
            </button>

            <div style={{ padding: 12, background: 'rgba(219, 39, 119, 0.1)', borderRadius: 8, color: '#f472b6', fontSize: 12, textAlign: 'center' }}>
              🚧 L'API Meta sera branchée dans une prochaine mise à jour pour permettre la publication directe.
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}
