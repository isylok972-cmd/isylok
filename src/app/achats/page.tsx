'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './achats.module.css'
import { formaterPrix } from '@/lib/utilitaires'

export default function PageAchats() {
  const [sousLocs, setSousLocs] = useState<any[]>([])
  const [fournisseurs, setFournisseurs] = useState<any[]>([])
  const [devis, setDevis] = useState<any[]>([])
  const [modale, setModale] = useState(false)

  // Formulaire
  const [fournisseurId, setFournisseurId] = useState('')
  const [devisId, setDevisId] = useState('')
  const [designation, setDesignation] = useState('')
  const [quantite, setQuantite] = useState(1)
  const [prixAchat, setPrixAchat] = useState(0)
  const [prixRevente, setPrixRevente] = useState(0)
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')

  const margeNette = (prixRevente - prixAchat) * quantite

  const chargerDonnees = async () => {
    try {
      const rep = await fetch('/api/achats/sous-locations')
      const data = await rep.json()
      if (data.succes) {
        setSousLocs(data.donnees.sousLocations)
        setFournisseurs(data.donnees.fournisseurs)
        setDevis(data.donnees.devis)
      }
    } catch (e) { console.error(e) }
  }

  useEffect(() => { chargerDonnees() }, [])

  const creerSousLocation = async (e: any) => {
    e.preventDefault()
    try {
      const rep = await fetch('/api/achats/sous-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fournisseurId, devisId, designation, quantite, prixAchat, prixRevente, dateDebut, dateFin })
      })
      const data = await rep.json()
      if (data.succes) {
        setModale(false)
        chargerDonnees()
        // Reset form
        setDesignation(''); setQuantite(1); setPrixAchat(0); setPrixRevente(0);
      }
    } catch (e) { console.error(e) }
  }

  const margeTotale = sousLocs.reduce((acc, loc) => acc + loc.margeNette, 0)

  return (
    <main className={styles.conteneur}>
      <header className={styles.entete}>
        <div className={styles.enteteGauche}>
          <Link href="/" className={styles.boutonRetour}>← Accueil</Link>
          <div className={styles.titreModule}>
            <span>🤝</span>
            <h1>Achats &amp; Sous-location</h1>
          </div>
        </div>
        <button className={styles.boutonAjouter} onClick={() => setModale(true)}>+ Nouvelle sous-location</button>
      </header>

      <div className={styles.statsRapides}>
        <div className={styles.carteStat}>
          <div className={styles.carteStatLabel}>Matériels en location</div>
          <div className={styles.carteStatValeur}>{sousLocs.length}</div>
          <div className={styles.carteStatSous}>en cours</div>
        </div>
        <div className={styles.carteStat}>
          <div className={styles.carteStatLabel}>Marge Nette Dégagée</div>
          <div className={styles.carteStatValeur} style={{ color: margeTotale > 0 ? '#34d399' : '#f1f5f9' }}>{formaterPrix(margeTotale)}</div>
          <div className={styles.carteStatSous}>sur les sous-locations</div>
        </div>
        <div className={styles.carteStat}>
          <div className={styles.carteStatLabel}>Fournisseurs Actifs</div>
          <div className={styles.carteStatValeur}>{fournisseurs.length}</div>
          <div className={styles.carteStatSous}>confrères &amp; prestataires</div>
        </div>
      </div>

      <div className={styles.tableauConteneur}>
        <table className={styles.tableau}>
          <thead>
            <tr>
              <th>Fournisseur</th>
              <th>Désignation</th>
              <th>Qté</th>
              <th>Prix Achat (U)</th>
              <th>Prix Revente (U)</th>
              <th>Marge Totale</th>
              <th>Dates</th>
            </tr>
          </thead>
          <tbody>
            {sousLocs.map(loc => (
              <tr key={loc.id}>
                <td>{loc.fournisseur.nom}</td>
                <td style={{ fontWeight: 600 }}>{loc.designation}</td>
                <td>{loc.quantite}</td>
                <td>{formaterPrix(loc.prixAchat)}</td>
                <td>{formaterPrix(loc.prixRevente)}</td>
                <td className={loc.margeNette >= 0 ? styles.margePositive : styles.margeNegative}>
                  {loc.margeNette > 0 ? '+' : ''}{formaterPrix(loc.margeNette)}
                </td>
                <td style={{ fontSize: 12 }}>
                  {new Date(loc.dateDebut).toLocaleDateString()} → {new Date(loc.dateFin).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {sousLocs.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20 }}>Aucune sous-location enregistrée.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modale && (
        <div className={styles.overlay} onClick={() => setModale(false)}>
          <div className={styles.modale} onClick={e => e.stopPropagation()}>
            <div className={styles.modaleEntete}>
              <h2>🤝 Enregistrer une sous-location</h2>
              <button onClick={() => setModale(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={creerSousLocation}>
              <div className={styles.champLigne}>
                <div className={styles.champGroupe}>
                  <label>Fournisseur (Confrère) *</label>
                  <select value={fournisseurId} onChange={e => setFournisseurId(e.target.value)} required>
                    <option value="">Sélectionner...</option>
                    {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                  </select>
                </div>
                <div className={styles.champGroupe}>
                  <label>Lier à un Devis (Optionnel)</label>
                  <select value={devisId} onChange={e => setDevisId(e.target.value)}>
                    <option value="">Aucun devis</option>
                    {devis.map(d => <option key={d.id} value={d.id}>{d.numero} - {d.client.nom}</option>)}
                  </select>
                </div>
              </div>

              <div className={styles.champLigne}>
                <div className={styles.champGroupe}>
                  <label>Désignation du matériel *</label>
                  <input value={designation} onChange={e => setDesignation(e.target.value)} required placeholder="Ex: Tente stretch 10x15..." />
                </div>
                <div className={styles.champGroupe}>
                  <label>Quantité *</label>
                  <input type="number" min="1" value={quantite} onChange={e => setQuantite(parseInt(e.target.value))} required />
                </div>
              </div>

              <div className={styles.champLigne}>
                <div className={styles.champGroupe}>
                  <label>Prix d'Achat unitaire (HT) *</label>
                  <input type="number" step="0.01" value={prixAchat} onChange={e => setPrixAchat(parseFloat(e.target.value))} required />
                </div>
                <div className={styles.champGroupe}>
                  <label>Prix de Revente unitaire (HT) *</label>
                  <input type="number" step="0.01" value={prixRevente} onChange={e => setPrixRevente(parseFloat(e.target.value))} required />
                </div>
              </div>

              <div className={styles.champLigne}>
                <div className={styles.champGroupe}>
                  <label>Date de début *</label>
                  <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} required />
                </div>
                <div className={styles.champGroupe}>
                  <label>Date de fin *</label>
                  <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} required />
                </div>
              </div>

              <div className={styles.recapMarge}>
                <span style={{ color: '#94a3b8' }}>Marge Nette Prévue :</span>
                <strong className={margeNette >= 0 ? styles.margePositive : styles.margeNegative}>
                  {margeNette > 0 ? '+' : ''}{formaterPrix(margeNette)}
                </strong>
              </div>

              <button type="submit" className={styles.boutonSoumettre}>✅ Enregistrer la sous-location</button>
            </form>
          </div>
        </div>
      )}

    </main>
  )
}
