'use client'

import { useState } from 'react'
import styles from '../clients.module.css'

interface PropsModaleClient {
  client?: ClientFormData | null
  onFermer: () => void
  onSucces: () => void
}

export interface ClientFormData {
  id?: string
  type: string
  nom: string
  prenom: string
  entreprise: string
  siret: string
  email: string
  telephone: string
  telephoneSecondaire: string
  adresse: string
  codePostal: string
  ville: string
  notes: string
}

const defautClient: ClientFormData = {
  type: 'PARTICULIER', nom: '', prenom: '', entreprise: '', siret: '',
  email: '', telephone: '', telephoneSecondaire: '', adresse: '',
  codePostal: '', ville: '', notes: '',
}

export function ModaleClient({ client, onFermer, onSucces }: PropsModaleClient) {
  const edition = !!client?.id
  const [form, setForm] = useState<ClientFormData>(client || defautClient)
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')

  const maj = (champ: keyof ClientFormData, valeur: string) => setForm(prev => ({ ...prev, [champ]: valeur }))

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nom || !form.telephone) { setErreur('Le nom et le téléphone sont obligatoires'); return }
    setChargement(true)
    setErreur('')
    try {
      const url = edition ? `/api/clients/${client!.id}` : '/api/clients'
      const rep = await fetch(url, {
        method: edition ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await rep.json()
      if (data.succes) { onSucces() } else { setErreur(data.message || 'Erreur') }
    } catch { setErreur('Erreur réseau') }
    finally { setChargement(false) }
  }

  return (
    <div className={styles.overlay} onClick={onFermer}>
      <div className={styles.modale} onClick={e => e.stopPropagation()}>
        <div className={styles.modaleEntete}>
          <h2>{edition ? '✏️ Modifier le client' : '➕ Nouveau client'}</h2>
          <button className={styles.boutonFermer} onClick={onFermer}>✕</button>
        </div>

        <form className={styles.formulaire} onSubmit={soumettre}>
          <div className={styles.champGroupe}>
            <label>Type de client</label>
            <select value={form.type} onChange={e => maj('type', e.target.value)}>
              <option value="PARTICULIER">👤 Particulier</option>
              <option value="PROFESSIONNEL">🏢 Professionnel</option>
            </select>
          </div>

          <div className={styles.champLigne}>
            <div className={styles.champGroupe}>
              <label>Nom *</label>
              <input value={form.nom} onChange={e => maj('nom', e.target.value)} placeholder="Dupont" required />
            </div>
            <div className={styles.champGroupe}>
              <label>Prénom</label>
              <input value={form.prenom} onChange={e => maj('prenom', e.target.value)} placeholder="Jean" />
            </div>
          </div>

          <div className={styles.champLigne}>
            <div className={styles.champGroupe}>
              <label>Entreprise {form.type === 'PROFESSIONNEL' ? '*' : '(optionnel)'}</label>
              <input value={form.entreprise} onChange={e => maj('entreprise', e.target.value)} placeholder="SAS Événements ou Société" />
            </div>
            <div className={styles.champGroupe}>
              <label>SIRET (Facturation électronique Factur-X)</label>
              <input value={form.siret} onChange={e => maj('siret', e.target.value)} placeholder="123 456 789 00012" />
            </div>
          </div>

          <div className={styles.champLigne}>
            <div className={styles.champGroupe}>
              <label>Téléphone *</label>
              <input value={form.telephone} onChange={e => maj('telephone', e.target.value)} placeholder="06 12 34 56 78" required />
            </div>
            <div className={styles.champGroupe}>
              <label>Tél. secondaire</label>
              <input value={form.telephoneSecondaire} onChange={e => maj('telephoneSecondaire', e.target.value)} placeholder="01 23 45 67 89" />
            </div>
          </div>

          <div className={styles.champGroupe}>
            <label>Email</label>
            <input type="email" value={form.email} onChange={e => maj('email', e.target.value)} placeholder="jean.dupont@email.com" />
          </div>

          <div className={styles.champGroupe}>
            <label>Adresse</label>
            <input value={form.adresse} onChange={e => maj('adresse', e.target.value)} placeholder="12 rue de la Paix" />
          </div>

          <div className={styles.champLigne}>
            <div className={styles.champGroupe}>
              <label>Code postal</label>
              <input value={form.codePostal} onChange={e => maj('codePostal', e.target.value)} placeholder="75000" />
            </div>
            <div className={styles.champGroupe}>
              <label>Ville</label>
              <input value={form.ville} onChange={e => maj('ville', e.target.value)} placeholder="Paris" />
            </div>
          </div>

          <div className={styles.champGroupe}>
            <label>Notes</label>
            <textarea value={form.notes} onChange={e => maj('notes', e.target.value)} placeholder="Notes complémentaires…" />
          </div>

          {erreur && <div className={styles.erreurMessage}>⚠️ {erreur}</div>}

          <button type="submit" className={styles.boutonSoumettre} disabled={chargement}>
            {chargement ? '⏳ Enregistrement…' : edition ? '💾 Modifier' : '✅ Créer le client'}
          </button>
        </form>
      </div>
    </div>
  )
}
