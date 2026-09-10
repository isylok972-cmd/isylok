'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import BoutonDeconnexion from '@/composants/BoutonDeconnexion'
import styles from './administration.module.css'

interface Parametres {
  nom: string
  adresse: string
  telephone: string
  email: string
  siteWeb: string
  siret: string
  numTVA: string
  formeJuridique: string
  iban: string
  bic: string
  mentionsLegales: string
  emailComptable: string
  jourEnvoiComptable: number
}

const defautParams: Parametres = {
  nom: 'Isy Lok', adresse: '', telephone: '', email: '', siteWeb: '',
  siret: '', numTVA: '', formeJuridique: '', iban: '', bic: '',
  mentionsLegales: '', emailComptable: '', jourEnvoiComptable: 1
}

export default function PageAdministration() {
  const [ongletActif, setOngletActif] = useState<'parametres'|'equipe'>('parametres')
  const router = useRouter()
  
  const [params, setParams] = useState<Parametres>(defautParams)
  const [chargement, setChargement] = useState(true)
  const [sauvegardeEnCours, setSauvegardeEnCours] = useState(false)
  const [message, setMessage] = useState<{ texte: string, type: 'succes' | 'erreur' } | null>(null)

  const [equipe, setEquipe] = useState<any[]>([])
  const [modaleUtilisateur, setModaleUtilisateur] = useState(false)
  const [utilisateurEnEdition, setUtilisateurEnEdition] = useState<string | null>(null)
  const [nouvelUtilisateur, setNouvelUtilisateur] = useState({ nom: '', prenom: '', email: '', telephone: '', role: 'OPERATEUR_ATELIER', motDePasse: '123456' })

  const chargerParametres = async () => {
    try {
      const rep = await fetch('/api/administration/parametres')
      const data = await rep.json()
      if (data.succes && data.donnees) setParams({ ...defautParams, ...data.donnees })
    } catch {}
  }

  const chargerEquipe = async () => {
    try {
      const rep = await fetch('/api/administration/utilisateurs')
      const data = await rep.json()
      if (data.succes) setEquipe(data.donnees)
    } catch {}
  }

  useEffect(() => {
    // Vérification du rôle côté client (plus simple et sans erreur serveur)
    const cookies = document.cookie.split('; ')
    const roleCookie = cookies.find(row => row.startsWith('isylok_role='))
    if (roleCookie) {
      const role = roleCookie.split('=')[1]
      if (role === 'LIVREUR') {
        router.push('/')
        return
      }
    }
    
    Promise.all([chargerParametres(), chargerEquipe()]).finally(() => setChargement(false))
  }, [])

  const maj = (champ: keyof Parametres, valeur: any) => {
    setParams(prev => ({ ...prev, [champ]: valeur }))
  }

  const sauvegarderParams = async () => {
    setSauvegardeEnCours(true)
    setMessage(null)
    try {
      const rep = await fetch('/api/administration/parametres', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      })
      const data = await rep.json()
      if (data.succes) {
        setMessage({ texte: 'Paramètres sauvegardés !', type: 'succes' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ texte: 'Erreur lors de la sauvegarde.', type: 'erreur' })
      }
    } catch {
      setMessage({ texte: 'Erreur réseau.', type: 'erreur' })
    } finally {
      setSauvegardeEnCours(false)
    }
  }

  const ouvrirAjoutUtilisateur = () => {
    setUtilisateurEnEdition(null)
    setNouvelUtilisateur({ nom: '', prenom: '', email: '', telephone: '', role: 'OPERATEUR_ATELIER', motDePasse: '123456' })
    setModaleUtilisateur(true)
  }

  const ouvrirEditionUtilisateur = (u: any) => {
    setUtilisateurEnEdition(u.id)
    setNouvelUtilisateur({
      nom: u.nom || '',
      prenom: u.prenom || '',
      email: u.email || '',
      telephone: u.telephone || '',
      role: u.role || 'OPERATEUR_ATELIER',
      motDePasse: ''
    })
    setModaleUtilisateur(true)
  }

  const sauvegarderUtilisateur = async (e: any) => {
    e.preventDefault()
    try {
      if (utilisateurEnEdition) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const corps: any = {
          id: utilisateurEnEdition,
          nom: nouvelUtilisateur.nom,
          prenom: nouvelUtilisateur.prenom,
          email: nouvelUtilisateur.email,
          telephone: nouvelUtilisateur.telephone,
          role: nouvelUtilisateur.role,
        }
        if (nouvelUtilisateur.motDePasse) {
          corps.motDePasse = nouvelUtilisateur.motDePasse
        }

        const rep = await fetch('/api/administration/utilisateurs', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(corps)
        })
        const data = await rep.json()
        if (data.succes) {
          setModaleUtilisateur(false)
          chargerEquipe()
          setMessage({ texte: 'Utilisateur mis à jour !', type: 'succes' })
          setTimeout(() => setMessage(null), 3000)
        } else {
          alert(data.message || 'Erreur lors de la modification')
        }
      } else {
        const rep = await fetch('/api/administration/utilisateurs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nouvelUtilisateur)
        })
        const data = await rep.json()
        if (data.succes) {
          setModaleUtilisateur(false)
          chargerEquipe()
          setNouvelUtilisateur({ nom: '', prenom: '', email: '', telephone: '', role: 'OPERATEUR_ATELIER', motDePasse: '123456' })
          setMessage({ texte: 'Utilisateur créé avec succès !', type: 'succes' })
          setTimeout(() => setMessage(null), 3000)
        } else {
          alert(data.message || 'Erreur lors de la création')
        }
      }
    } catch {
      alert("Erreur lors de l'enregistrement")
    }
  }

  const reinitialiserMotDePasse = async (u: any) => {
    const nouveauMdp = prompt(`Nouveau mot de passe pour ${u.prenom} ${u.nom} :`, 'isylok2026')
    if (!nouveauMdp) return
    try {
      const rep = await fetch('/api/administration/utilisateurs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: u.id, motDePasse: nouveauMdp })
      })
      const data = await rep.json()
      if (data.succes) {
        alert(`Mot de passe réinitialisé avec succès pour ${u.email} !`)
      } else {
        alert(data.message || 'Erreur lors de la réinitialisation')
      }
    } catch {
      alert('Erreur réseau')
    }
  }

  const getCouleurRole = (role: string) => {
    switch(role) {
      case 'ADMIN': return '#fbbf24'
      case 'SECRETAIRE': return '#60a5fa'
      case 'LIVREUR': return '#10b981'
      case 'OPERATEUR_ATELIER': return '#06b6d4'
      case 'GESTIONNAIRE_WEB': return '#8b5cf6'
      default: return '#94a3b8'
    }
  }

  const getLibelleRole = (role: string) => {
    switch(role) {
      case 'ADMIN': return 'Administrateur'
      case 'SECRETAIRE': return 'Secrétaire'
      case 'LIVREUR': return 'Livreur'
      case 'OPERATEUR_ATELIER': return 'Opérateur Atelier (Vaisselle & Linge)'
      case 'GESTIONNAIRE_WEB': return 'Gestionnaire Site Web / CMS'
      default: return role
    }
  }

  if (chargement) return <div className={styles.conteneur}><p style={{color: '#94a3b8', textAlign: 'center', marginTop: 100}}>⏳ Chargement...</p></div>

  return (
    <main className={styles.conteneur}>
      <header className={styles.entete}>
        <div className={styles.enteteGauche}>
          <Link href="/" className={styles.boutonRetour}>← Accueil</Link>
          <div className={styles.titreModule}>
            <span>⚙️</span>
            <h1>Administration</h1>
          </div>
        </div>
        
        <div className={styles.onglets}>
          <button className={`${styles.onglet} ${ongletActif === 'parametres' ? styles.ongletActif : ''}`} onClick={() => setOngletActif('parametres')}>
            🏢 Paramètres
          </button>
          <button className={`${styles.onglet} ${ongletActif === 'equipe' ? styles.ongletActif : ''}`} onClick={() => setOngletActif('equipe')}>
            👥 Équipe
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {ongletActif === 'parametres' ? (
            <button className={styles.boutonSauvegarder} onClick={sauvegarderParams} disabled={sauvegardeEnCours}>
              {sauvegardeEnCours ? '⏳ Sauvegarde...' : '💾 Enregistrer'}
            </button>
          ) : (
            <button className={styles.boutonSauvegarder} onClick={ouvrirAjoutUtilisateur}>
              + Ajouter un membre
            </button>
          )}
          <BoutonDeconnexion />
        </div>
      </header>

      {ongletActif === 'parametres' && (
        <div className={styles.grilleFormulaire}>
          {/* Infos Publiques */}
          <div className={styles.carteParametres}>
            <div className={styles.carteEntete}>
              <span className={styles.carteEnteteIcone}>🏢</span>
              <h2 className={styles.carteEnteteTitre}>Informations Publiques</h2>
            </div>
            <div className={styles.champGroupe}>
              <label>Nom de l'entreprise *</label>
              <input value={params.nom} onChange={e => maj('nom', e.target.value)} required />
            </div>
            <div className={styles.champGroupe}>
              <label>Adresse complète</label>
              <textarea value={params.adresse} onChange={e => maj('adresse', e.target.value)} />
            </div>
            <div className={styles.champLigne}>
              <div className={styles.champGroupe}>
                <label>Téléphone</label>
                <input value={params.telephone} onChange={e => maj('telephone', e.target.value)} />
              </div>
              <div className={styles.champGroupe}>
                <label>Email</label>
                <input type="email" value={params.email} onChange={e => maj('email', e.target.value)} />
              </div>
            </div>
            <div className={styles.champGroupe}>
              <label>Site Web</label>
              <input value={params.siteWeb} onChange={e => maj('siteWeb', e.target.value)} />
            </div>
          </div>

          {/* Infos Légales & Paiement */}
          <div className={styles.carteParametres}>
            <div className={styles.carteEntete}>
              <span className={styles.carteEnteteIcone}>⚖️</span>
              <h2 className={styles.carteEnteteTitre}>Légal &amp; Paiement</h2>
            </div>
            <div className={styles.champLigne}>
              <div className={styles.champGroupe}>
                <label>SIRET</label>
                <input value={params.siret} onChange={e => maj('siret', e.target.value)} />
              </div>
              <div className={styles.champGroupe}>
                <label>Numéro de TVA</label>
                <input value={params.numTVA} onChange={e => maj('numTVA', e.target.value)} />
              </div>
            </div>
            <div className={styles.champGroupe}>
              <label>Forme Juridique / RCS</label>
              <input value={params.formeJuridique} onChange={e => maj('formeJuridique', e.target.value)} />
            </div>
            <div className={styles.champGroupe}>
              <label>IBAN</label>
              <input value={params.iban} onChange={e => maj('iban', e.target.value)} />
            </div>
            <div className={styles.champGroupe}>
              <label>BIC</label>
              <input value={params.bic} onChange={e => maj('bic', e.target.value)} />
            </div>
          </div>

          {/* Facturation */}
          <div className={styles.carteParametres}>
            <div className={styles.carteEntete}>
              <span className={styles.carteEnteteIcone}>📄</span>
              <h2 className={styles.carteEnteteTitre}>Facturation &amp; Comptabilité</h2>
            </div>
            <div className={styles.champGroupe}>
              <label>Mentions Légales</label>
              <textarea value={params.mentionsLegales} onChange={e => maj('mentionsLegales', e.target.value)} style={{ minHeight: 100 }} />
            </div>
            <div className={styles.champLigne}>
              <div className={styles.champGroupe}>
                <label>Email du comptable</label>
                <input type="email" value={params.emailComptable} onChange={e => maj('emailComptable', e.target.value)} />
              </div>
              <div className={styles.champGroupe}>
                <label>Jour d'envoi</label>
                <input type="number" min="1" max="28" value={params.jourEnvoiComptable} onChange={e => maj('jourEnvoiComptable', parseInt(e.target.value) || 1)} />
              </div>
            </div>
          </div>
        </div>
      )}

      {ongletActif === 'equipe' && (
        <div className={styles.tableauConteneur}>
          <table className={styles.tableau}>
            <thead>
              <tr>
                <th>Nom &amp; Prénom</th>
                <th>Email</th>
                <th>Téléphone</th>
                <th>Rôle</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {equipe.filter((u: any) => u.role !== 'SUPER_ADMIN').map((u: any) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.prenom} {u.nom}</td>
                  <td>{u.email}</td>
                  <td style={{ color: '#94a3b8', fontSize: 13 }}>{u.telephone || '—'}</td>
                  <td>
                    <span
                      className={styles.badgeRole}
                      style={{
                        borderColor: getCouleurRole(u.role),
                        color: getCouleurRole(u.role),
                        backgroundColor: `${getCouleurRole(u.role)}18`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: getCouleurRole(u.role) }} />
                      {getLibelleRole(u.role)}
                    </span>
                  </td>
                  <td>
                    <button className={styles.boutonAction} onClick={() => ouvrirEditionUtilisateur(u)}>Modifier</button>
                    <button className={styles.boutonAction} style={{ marginLeft: 8 }} onClick={() => reinitialiserMotDePasse(u)}>Reset MDP</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {message && (
        <div className={`${styles.messageStatus} ${message.type === 'succes' ? styles.messageSucces : styles.messageErreur}`}>
          {message.texte}
        </div>
      )}

      {modaleUtilisateur && (
        <div className={styles.overlay} onClick={() => setModaleUtilisateur(false)}>
          <div className={styles.modale} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, color: '#f1f5f9', margin: 0 }}>
                {utilisateurEnEdition ? "Modifier le collaborateur" : "Ajouter un collaborateur"}
              </h2>
              <button onClick={() => setModaleUtilisateur(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={sauvegarderUtilisateur}>
              <div className={styles.champLigne}>
                <div className={styles.champGroupe}>
                  <label>Nom *</label>
                  <input value={nouvelUtilisateur.nom} onChange={e => setNouvelUtilisateur({...nouvelUtilisateur, nom: e.target.value})} required />
                </div>
                <div className={styles.champGroupe}>
                  <label>Prénom *</label>
                  <input value={nouvelUtilisateur.prenom} onChange={e => setNouvelUtilisateur({...nouvelUtilisateur, prenom: e.target.value})} required />
                </div>
              </div>
              <div className={styles.champGroupe}>
                <label>Email *</label>
                <input type="email" value={nouvelUtilisateur.email} onChange={e => setNouvelUtilisateur({...nouvelUtilisateur, email: e.target.value})} required />
              </div>
              <div className={styles.champGroupe}>
                <label>Téléphone</label>
                <input value={nouvelUtilisateur.telephone} onChange={e => setNouvelUtilisateur({...nouvelUtilisateur, telephone: e.target.value})} />
              </div>
              <div className={styles.champLigne}>
                <div className={styles.champGroupe}>
                  <label>Rôle *</label>
                  <select value={nouvelUtilisateur.role} onChange={e => setNouvelUtilisateur({...nouvelUtilisateur, role: e.target.value})} required>
                    <option value="ADMIN">Administrateur</option>
                    <option value="SECRETAIRE">Secrétaire</option>
                    <option value="LIVREUR">Livreur</option>
                    <option value="OPERATEUR_ATELIER">Opérateur Atelier (Vaisselle & Linge)</option>
                    <option value="GESTIONNAIRE_WEB">Gestionnaire Site Web / CMS</option>
                  </select>
                </div>
                <div className={styles.champGroupe}>
                  <label>
                    {utilisateurEnEdition ? "Nouveau mot de passe" : "Mot de passe initial *"}
                  </label>
                  <input
                    type="text"
                    value={nouvelUtilisateur.motDePasse}
                    onChange={e => setNouvelUtilisateur({...nouvelUtilisateur, motDePasse: e.target.value})}
                    required={!utilisateurEnEdition}
                    placeholder={utilisateurEnEdition ? 'Laisser vide pour conserver' : '123456'}
                  />
                </div>
              </div>

              <button type="submit" className={styles.boutonSauvegarder} style={{ width: '100%', marginTop: 24, padding: 14, justifyContent: 'center' }}>
                {utilisateurEnEdition ? "Enregistrer les modifications" : "Enregistrer le collaborateur"}
              </button>
            </form>
          </div>
        </div>
      )}

    </main>
  )
}
