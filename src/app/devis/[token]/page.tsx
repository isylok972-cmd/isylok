'use client'

import { useState, useEffect, useRef, use } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import styles from './devis.module.css'

interface DevisComplet {
  id: string
  numero: string
  source: string
  statut: string
  tokenSignature: string
  dateCreation: string
  dateEvenement: string | null
  lieuEvenement: string | null
  typeEvenement: string | null
  sousTotal: number
  remise: number
  tauxTva: number
  montantTva: number
  totalTtc: number
  acompte: number
  resteAPayer: number
  conditions: string | null
  signatureClientDate: string | null
  signatureClientIp: string | null
  client: {
    id: string
    nom: string
    prenom: string | null
    entreprise: string | null
    siret: string | null
    email: string | null
    telephone: string
    adresse: string | null
    ville: string | null
  }
  lignes: {
    id: string
    designation: string
    description: string | null
    quantite: number
    prixUnitaire: number
    totalLigne: number
  }[]
}

export default function PageConsultationSignature({
  params
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const [devis, setDevis] = useState<DevisComplet | null>(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  // Signature Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [estEnTrainDeDessiner, setEstEnTrainDeDessiner] = useState(false)
  const [aSigne, setASigne] = useState(false)
  const [nomSignataire, setNomSignataire] = useState('')
  const [accordCgl, setAccordCgl] = useState(false)
  const [envoiSignature, setEnvoiSignature] = useState(false)
  const [messageSucces, setMessageSucces] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/web/devis/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.succes) {
          setDevis(d.donnees)
          setNomSignataire(`${d.donnees.client.prenom || ''} ${d.donnees.client.nom}`.trim())
        } else {
          setErreur(d.message || 'Impossible de charger le devis')
        }
      })
      .catch(() => setErreur('Erreur réseau lors de la consultation du devis'))
      .finally(() => setChargement(false))
  }, [token])

  // Canvas drawing handlers
  const demarrerDessin = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setEstEnTrainDeDessiner(true)
    setASigne(true)

    const rect = canvas.getBoundingClientRect()
    const x = ('clientX' in e ? e.clientX : e.touches[0].clientX) - rect.left
    const y = ('clientY' in e ? e.clientY : e.touches[0].clientY) - rect.top

    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const dessiner = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!estEnTrainDeDessiner) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = ('clientX' in e ? e.clientX : e.touches[0].clientX) - rect.left
    const y = ('clientY' in e ? e.clientY : e.touches[0].clientY) - rect.top

    ctx.lineTo(x, y)
    ctx.strokeStyle = '#c4b5fd'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }

  const arreterDessin = () => {
    setEstEnTrainDeDessiner(false)
  }

  const effacerSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setASigne(false)
  }

  const soumettreSignature = async () => {
    if (!aSigne) return alert('Veuillez apposer votre signature manuscrite dans le cadre prévu.')
    if (!accordCgl) return alert('Veuillez cocher la case d\'acceptation des conditions de location.')
    if (!nomSignataire.trim()) return alert('Veuillez renseigner votre nom de signataire.')

    const canvas = canvasRef.current
    const signatureImage = canvas ? canvas.toDataURL('image/png') : ''

    setEnvoiSignature(true)
    try {
      const rep = await fetch(`/api/web/devis/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureImage,
          nomSignataire: nomSignataire.trim()
        })
      })
      const data = await rep.json()
      if (data.succes) {
        setDevis(data.donnees)
        setMessageSucces(data.message || 'Devis validé et signé avec succès !')
      } else {
        alert(data.message || 'Erreur lors de la signature')
      }
    } catch {
      alert('Erreur réseau lors de la validation de la signature')
    } finally {
      setEnvoiSignature(false)
    }
  }

  if (chargement) {
    return (
      <main className={styles.conteneur}>
        <div style={{ textAlign: 'center', padding: '100px 20px', color: '#94a3b8' }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>📄</div>
          <p>Chargement sécurisé de votre devis...</p>
        </div>
      </main>
    )
  }

  if (erreur || !devis) {
    return (
      <main className={styles.conteneur}>
        <div style={{ textAlign: 'center', padding: '100px 20px', color: '#f87171' }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>⚠️</div>
          <h2>Devis introuvable</h2>
          <p style={{ color: '#94a3b8' }}>{erreur || 'Le jeton de consultation est invalide ou expiré.'}</p>
          <Link href="/vitrine" style={{ color: '#c4b5fd', marginTop: 16, display: 'inline-block' }}>
            ← Retour à l'accueil
          </Link>
        </div>
      </main>
    )
  }

  const estDejaValide = devis.statut === 'VALIDE' || Boolean(devis.signatureClientDate)

  return (
    <main className={styles.conteneur}>
      <div className={styles.carteDevis}>
        {/* En-tête officiel */}
        <div className={styles.enteteDevis}>
          <div>
            <Image
              src="/logo-transparent.png"
              alt="Isy Lok"
              width={160}
              height={50}
              style={{ objectFit: 'contain', marginBottom: 12 }}
            />
            <div className={styles.coordsEmetteur}>
              <strong>Isy Lok SARL</strong><br />
              Location de Matériel &amp; Réceptions Événementielles<br />
              Z.I. La Lézarde — 97232 Le Lamentin, Martinique<br />
              SIRET : 922 456 789 00012 | TVA : FR 84 922456789<br />
              Tél : 05 96 00 00 00 | Email : contact@isylok.fr
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div className={`${styles.badgeStatut} ${estDejaValide ? styles.statutValide : styles.statutBrouillon}`}>
              <span>{estDejaValide ? '✅ Devis Confirmé & Signé' : '⏳ En attente de signature'}</span>
            </div>
            <h1 className={styles.numeroDevis}>{devis.numero}</h1>
            <div className={styles.dateDevis}>
              Émis le {new Date(devis.dateCreation).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Détails Client & Événement */}
        <div className={styles.grilleDetails}>
          <div>
            <div className={styles.blocInfoTitre}>Client / Destinataire</div>
            <div className={styles.infoLigne}>
              <strong>{devis.client.entreprise || `${devis.client.prenom || ''} ${devis.client.nom}`.trim()}</strong>
            </div>
            {devis.client.entreprise && (
              <div className={styles.infoLigne}>Contact : {devis.client.prenom} {devis.client.nom}</div>
            )}
            {devis.client.siret && (
              <div className={styles.infoLigne}>SIRET : {devis.client.siret}</div>
            )}
            <div className={styles.infoLigne}>Tél : {devis.client.telephone}</div>
            <div className={styles.infoLigne}>Email : {devis.client.email}</div>
            {devis.client.adresse && (
              <div className={styles.infoLigne}>Adresse : {devis.client.adresse}, {devis.client.ville}</div>
            )}
          </div>

          <div>
            <div className={styles.blocInfoTitre}>Détails de la Réception</div>
            <div className={styles.infoLigne}>
              Type d'événement : <strong>{devis.typeEvenement || 'Réception Privée'}</strong>
            </div>
            <div className={styles.infoLigne}>
              Date prévue : <strong>{devis.dateEvenement ? new Date(devis.dateEvenement).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'À définir'}</strong>
            </div>
            <div className={styles.infoLigne}>
              Lieu / Commune : <strong>{devis.lieuEvenement || 'Martinique'}</strong>
            </div>
            <div className={styles.infoLigne}>
              Canal de réservation : <strong style={{ color: '#c4b5fd' }}>Site Web Vitrine (Isy Lok Online)</strong>
            </div>
          </div>
        </div>

        {/* Tableau des Prestations */}
        <table className={styles.tableauPrestations}>
          <thead>
            <tr>
              <th>Désignation</th>
              <th style={{ width: 80, textAlign: 'center' }}>Quantité</th>
              <th style={{ width: 120, textAlign: 'right' }}>Prix Unit. HT</th>
              <th style={{ width: 120, textAlign: 'right' }}>Total HT</th>
            </tr>
          </thead>
          <tbody>
            {devis.lignes.map(l => (
              <tr key={l.id}>
                <td>
                  <div style={{ fontWeight: 600, color: '#f8fafc' }}>{l.designation}</div>
                  {l.description && (
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{l.description}</div>
                  )}
                </td>
                <td style={{ textAlign: 'center', fontWeight: 600 }}>{l.quantite}</td>
                <td style={{ textAlign: 'right' }}>{l.prixUnitaire} €</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: '#cbd5e1' }}>{l.totalLigne} €</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totaux */}
        <div className={styles.zoneTotaux}>
          <div className={styles.blocTotaux}>
            <div className={styles.ligneTotal}>
              <span>Sous-total HT :</span>
              <strong>{devis.sousTotal} €</strong>
            </div>
            <div className={styles.ligneTotal}>
              <span>TVA Martinique ({devis.tauxTva} %) :</span>
              <span>{devis.montantTva} €</span>
            </div>
            <div className={styles.ligneTotalTTC}>
              <span>Total TTC :</span>
              <span>{devis.totalTtc} €</span>
            </div>
            <div className={styles.ligneAcompte}>
              <span>Acompte de réservation (30%) :</span>
              <span>{devis.acompte} €</span>
            </div>
            <div className={styles.ligneTotal} style={{ fontSize: 12, color: '#64748b' }}>
              <span>Solde restant :</span>
              <span>{devis.resteAPayer} €</span>
            </div>
          </div>
        </div>

        {/* Mentions Légales */}
        <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6, marginBottom: 30, background: 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 10 }}>
          <strong>Conditions de location :</strong> Le matériel loué demeure la propriété exclusive d'Isy Lok.
          La réservation est confirmée dès signature électronique du présent devis et versement de l'acompte de 30%.
          Une caution de garantie non encaissée sera demandée avant la mise à disposition du matériel conformément aux barèmes en vigueur.
        </div>

        {/* Section Signature Électronique */}
        <div className={styles.sectionSignature}>
          {estDejaValide ? (
            <div className={styles.carteSuccesSignature}>
              <div className={styles.succesTitre}>✅ Devis Officiellement Validé &amp; Signé</div>
              <p className={styles.succesInfo}>
                Ce document a été signé électroniquement le {devis.signatureClientDate ? new Date(devis.signatureClientDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'récemment'}.<br />
                {devis.signatureClientIp && <span>Adresse IP signataire : <code>{devis.signatureClientIp}</code></span>}
              </p>
              <div style={{ marginTop: 16 }}>
                <button
                  onClick={() => window.print()}
                  style={{
                    padding: '10px 20px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: 10,
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600
                  }}
                >
                  🖨️ Imprimer / Sauvegarder en PDF
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h2 className={styles.signatureTitre}>✍️ Signature Électronique pour Accord</h2>
              <p className={styles.signatureDesc}>
                Apposez votre signature manuscrite à l'aide de votre souris, stylet ou directement au doigt sur écran tactile :
              </p>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 6 }}>
                  Nom et Prénom du signataire *
                </label>
                <input
                  value={nomSignataire}
                  onChange={e => setNomSignataire(e.target.value)}
                  placeholder="Ex : Marie Dupont"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: 'white',
                    fontSize: 14,
                    outline: 'none'
                  }}
                  required
                />
              </div>

              <div className={styles.boiteSignature}>
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={180}
                  className={styles.canvasSignature}
                  onMouseDown={demarrerDessin}
                  onMouseMove={dessiner}
                  onMouseUp={arreterDessin}
                  onMouseLeave={arreterDessin}
                  onTouchStart={demarrerDessin}
                  onTouchMove={dessiner}
                  onTouchEnd={arreterDessin}
                />
                <div className={styles.actionsCanvas}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Zone tactile certifiée</span>
                  <button type="button" onClick={effacerSignature} className={styles.boutonEffacer}>
                    Effacer la signature
                  </button>
                </div>
              </div>

              <label className={styles.caseCgl}>
                <input
                  type="checkbox"
                  checked={accordCgl}
                  onChange={e => setAccordCgl(e.target.checked)}
                  style={{ width: 18, height: 18, marginTop: 2, accentColor: '#10b981', cursor: 'pointer' }}
                />
                <span>
                  <strong>Bon pour accord :</strong> Je déclare accepter l'ensemble des prestations et tarifs listés ci-dessus,
                  ainsi que les conditions générales de location de matériel événementiel d'Isy Lok.
                </span>
              </label>

              {messageSucces && (
                <div style={{ color: '#34d399', marginBottom: 14, textAlign: 'center', fontWeight: 600 }}>
                  {messageSucces}
                </div>
              )}

              <button
                type="button"
                onClick={soumettreSignature}
                disabled={envoiSignature || !aSigne || !accordCgl}
                className={styles.boutonValiderSignature}
              >
                {envoiSignature ? '⏳ Enregistrement de la signature...' : '✅ Signer et Confirmer mon Devis Officiellement'}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
