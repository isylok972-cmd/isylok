'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import styles from './ChatbotConseiller.module.css'

interface ArticleWeb {
  id: string
  nom: string
  reference: string
  prixLocationJour: number
  categorie?: { nom: string }
}

interface ZoneLivraison {
  id: string
  nomZone: string
  communes: string
  tarifEstime: number
  delaiLivraison: string | null
}

interface MessageChat {
  id: string
  emetteur: 'bot' | 'user'
  texte: string
  choix?: { label: string; valeur: any }[]
  composantSpecial?: 'recommandation' | 'formulaire_coordonnees' | 'succes_devis'
}

interface LigneRecommandee {
  articleId?: string
  designation: string
  quantite: number
  prixUnitaire: number
  totalLigne: number
}

export default function ChatbotConseiller() {
  const [ouvert, setOuvert] = useState(false)
  const [etape, setEtape] = useState<number>(1)
  const [messages, setMessages] = useState<MessageChat[]>([])
  
  // Données du projet de l'utilisateur
  const [typeEvenement, setTypeEvenement] = useState('MARIAGE')
  const [nombreInvites, setNombreInvites] = useState<number>(60)
  const [formatEvenement, setFormatEvenement] = useState<'ASSIS' | 'DEBOUT' | 'HYBRIDE'>('ASSIS')
  const [besoinsEquipements, setBesoinsEquipements] = useState<string[]>(['CHAPITEAU', 'MOBILIER', 'VAISSELLE', 'ECLAIRAGE'])
  const [communeChoisie, setCommuneChoisie] = useState('')
  const [zoneDetectee, setZoneDetectee] = useState<ZoneLivraison | null>(null)
  const [dateEvenement, setDateEvenement] = useState('')

  // Recommandation générée
  const [lignesSuggerees, setLignesSuggerees] = useState<LigneRecommandee[]>([])
  const [surfaceCalculee, setSurfaceCalculee] = useState<number>(0)
  const [sousTotalEstime, setSousTotalEstime] = useState<number>(0)
  const [totalTtcEstime, setTotalTtcEstime] = useState<number>(0)

  // Données client
  const [formClient, setFormClient] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    entreprise: '',
    siret: ''
  })
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [devisCree, setDevisCree] = useState<any>(null)

  // Articles & Zones en cache
  const [articles, setArticles] = useState<ArticleWeb[]>([])
  const [zones, setZones] = useState<ZoneLivraison[]>([])

  const finMessagesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/web/articles')
      .then(r => r.json())
      .then(d => { if (d.succes) setArticles(d.donnees.articles) })
      .catch(console.error)

    fetch('/api/web/zones-livraison')
      .then(r => r.json())
      .then(d => { if (d.succes) setZones(d.donnees) })
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (finMessagesRef.current) {
      finMessagesRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Initialisation du premier message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'msg-1',
          emetteur: 'bot',
          texte: '👋 Bonjour ! Je suis votre conseiller virtuel Isy Lok. Quel type d\'événement préparez-vous en Martinique ?',
          choix: [
            { label: '💍 Mariage', valeur: 'Mariage' },
            { label: '🎂 Anniversaire', valeur: 'Anniversaire' },
            { label: '🏢 Séminaire Pro', valeur: 'Séminaire' },
            { label: '🍸 Cocktail / Soirée', valeur: 'Cocktail' },
            { label: '🌴 Fête Privée', valeur: 'Fête privée' }
          ]
        }
      ])
    }
  }, [])

  // Étape 1 : Choix du type
  const choisirType = (type: string) => {
    setTypeEvenement(type)
    ajouterMessageUtilisateur(type)

    setTimeout(() => {
      ajouterMessageBot(
        `Merveilleux projet pour un ${type} ! Combien d'invités attendez-vous environ et quel est le format privilégié ?`,
        [
          { label: '30 invités (Assis)', valeur: { n: 30, f: 'ASSIS' } },
          { label: '50 invités (Assis)', valeur: { n: 50, f: 'ASSIS' } },
          { label: '80 invités (Assis)', valeur: { n: 80, f: 'ASSIS' } },
          { label: '100 invités (Assis)', valeur: { n: 100, f: 'ASSIS' } },
          { label: '60 convives (Cocktail)', valeur: { n: 60, f: 'DEBOUT' } },
          { label: '100 convives (Hybride + Danse)', valeur: { n: 100, f: 'HYBRIDE' } }
        ]
      )
      setEtape(2)
    }, 400)
  }

  // Étape 2 : Convives & Format
  const choisirConvivesEtFormat = (data: { n: number; f: 'ASSIS' | 'DEBOUT' | 'HYBRIDE' }) => {
    setNombreInvites(data.n)
    setFormatEvenement(data.f)
    const libelleFormat = data.f === 'ASSIS' ? 'Repas Assis' : data.f === 'DEBOUT' ? 'Debout / Cocktail' : 'Hybride avec piste de danse'
    ajouterMessageUtilisateur(`${data.n} personnes — ${libelleFormat}`)

    setTimeout(() => {
      ajouterMessageBot(
        'Quels équipements principaux souhaitez-vous intégrer à votre sélection ?',
        [
          { label: '🎪 Tout inclus (Tente + Mobilier + Vaisselle + Éclairage)', valeur: ['CHAPITEAU', 'MOBILIER', 'VAISSELLE', 'ECLAIRAGE'] },
          { label: '🎪 Tente & Mobilier uniquement', valeur: ['CHAPITEAU', 'MOBILIER'] },
          { label: '🍽️ Mobilier & Vaisselle uniquement', valeur: ['MOBILIER', 'VAISSELLE'] },
          { label: '💡 Mobilier & Éclairage', valeur: ['MOBILIER', 'ECLAIRAGE'] }
        ]
      )
      setEtape(3)
    }, 400)
  }

  // Étape 3 : Besoins
  const choisirBesoins = (besoins: string[]) => {
    setBesoinsEquipements(besoins)
    ajouterMessageUtilisateur(besoins.length > 2 ? 'Pack Complet de Réception' : 'Sélection sur mesure')

    setTimeout(() => {
      ajouterMessageBot(
        'Dans quelle commune de la Martinique aura lieu votre événement ? Cela me permettra de calculer immédiatement le forfait d\'acheminement.',
        [
          { label: 'Fort-de-France (Centre)', valeur: 'Fort-de-France' },
          { label: 'Le Lamentin (Centre)', valeur: 'Le Lamentin' },
          { label: 'Sainte-Luce (Sud)', valeur: 'Sainte-Luce' },
          { label: 'Ducos (Sud)', valeur: 'Ducos' },
          { label: 'Le Carbet (Nord Caraïbe)', valeur: 'Le Carbet' },
          { label: 'Le Robert (Nord Atlantique)', valeur: 'Le Robert' }
        ]
      )
      setEtape(4)
    }, 400)
  }

  // Étape 4 : Commune
  const choisirCommune = (commune: string) => {
    setCommuneChoisie(commune)
    ajouterMessageUtilisateur(`Commune : ${commune}`)

    // Détecter la zone
    const z = zones.find(zn => zn.communes.toLowerCase().includes(commune.toLowerCase()))
    setZoneDetectee(z || null)

    setTimeout(() => {
      ajouterMessageBot(
        `Parfait, ${commune} est couverte par notre zone ${z ? z.nomZone : 'Martinique'}. Enfin, quelle est la date prévue de votre réception ?`,
        [
          { label: '📅 Prochainement (dans 2 à 4 semaines)', valeur: new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0] },
          { label: '📅 Le mois prochain', valeur: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0] },
          { label: '📅 Dans 3 mois ou plus', valeur: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0] }
        ]
      )
      setEtape(5)
    }, 400)
  }

  // Étape 5 : Date & Génération Recommandation
  const choisirDate = (date: string) => {
    setDateEvenement(date)
    ajouterMessageUtilisateur(`Date : ${new Date(date).toLocaleDateString('fr-FR')}`)

    setTimeout(() => {
      genererRecommandation(date)
    }, 600)
  }

  // Moteur de calcul de recommandation
  const genererRecommandation = (date: string) => {
    // 1. Ratio surface tente
    let ratio = 1.2
    if (formatEvenement === 'DEBOUT') ratio = 0.6
    if (formatEvenement === 'HYBRIDE') ratio = 1.0

    let surface = Math.round(nombreInvites * ratio)
    if (formatEvenement === 'HYBRIDE') surface += 25 // Piste de danse

    setSurfaceCalculee(surface)

    const lignes: LigneRecommandee[] = []

    // 1. Tente
    if (besoinsEquipements.includes('CHAPITEAU')) {
      const tenteArticle = articles.find(a =>
        a.nom.toLowerCase().includes('chapiteau') &&
        (surface <= 36 ? a.nom.includes('6X6') : surface <= 64 ? a.nom.includes('8X8') : true)
      ) || articles.find(a => a.nom.toLowerCase().includes('chapiteau'))

      lignes.push({
        articleId: tenteArticle?.id,
        designation: tenteArticle ? tenteArticle.nom : `Chapiteau Réception (${surface} m² recommandés)`,
        quantite: 1,
        prixUnitaire: tenteArticle ? tenteArticle.prixLocationJour : 450,
        totalLigne: tenteArticle ? tenteArticle.prixLocationJour : 450
      })
    }

    // 2. Chaises
    if (besoinsEquipements.includes('MOBILIER')) {
      const chaiseArticle = articles.find(a => a.nom.toLowerCase().includes('chaise'))
      const qteChaises = formatEvenement === 'DEBOUT' ? Math.round(nombreInvites * 0.3) : nombreInvites
      const puChaise = chaiseArticle ? chaiseArticle.prixLocationJour : 4.5
      lignes.push({
        articleId: chaiseArticle?.id,
        designation: chaiseArticle ? chaiseArticle.nom : 'Chaises de réception Napoléon',
        quantite: qteChaises,
        prixUnitaire: puChaise,
        totalLigne: Math.round(qteChaises * puChaise * 100) / 100
      })

      // Tables
      const tableArticle = articles.find(a => a.nom.toLowerCase().includes('table'))
      const qteTables = Math.ceil(nombreInvites / 8)
      const puTable = tableArticle ? tableArticle.prixLocationJour : 16
      lignes.push({
        articleId: tableArticle?.id,
        designation: tableArticle ? tableArticle.nom : 'Tables rondes 8/10 personnes',
        quantite: qteTables,
        prixUnitaire: puTable,
        totalLigne: Math.round(qteTables * puTable * 100) / 100
      })
    }

    // 3. Vaisselle
    if (besoinsEquipements.includes('VAISSELLE')) {
      const assiette = articles.find(a => a.nom.toLowerCase().includes('assiette'))
      lignes.push({
        articleId: assiette?.id,
        designation: assiette ? assiette.nom : 'Assiettes porcelaine blanche',
        quantite: nombreInvites,
        prixUnitaire: assiette ? assiette.prixLocationJour : 0.9,
        totalLigne: Math.round(nombreInvites * (assiette ? assiette.prixLocationJour : 0.9) * 100) / 100
      })

      const verre = articles.find(a => a.nom.toLowerCase().includes('verre') || a.nom.toLowerCase().includes('cocktail') || a.nom.toLowerCase().includes('champagne'))
      lignes.push({
        articleId: verre?.id,
        designation: verre ? verre.nom : 'Verres & flûtes cocktail cristal',
        quantite: nombreInvites * 2,
        prixUnitaire: verre ? verre.prixLocationJour : 0.8,
        totalLigne: Math.round(nombreInvites * 2 * (verre ? verre.prixLocationJour : 0.8) * 100) / 100
      })
    }

    // 4. Éclairage
    if (besoinsEquipements.includes('ECLAIRAGE')) {
      const eclairage = articles.find(a => a.nom.toLowerCase().includes('éclairage') || a.nom.toLowerCase().includes('eclairage'))
      lignes.push({
        articleId: eclairage?.id,
        designation: eclairage ? eclairage.nom : 'Pack Guirlandes Guinguettes & Projecteurs LED',
        quantite: 1,
        prixUnitaire: eclairage ? eclairage.prixLocationJour : 95,
        totalLigne: eclairage ? eclairage.prixLocationJour : 95
      })
    }

    // Frais de livraison
    const fraisLiv = zoneDetectee ? zoneDetectee.tarifEstime : 60
    const sousTot = Math.round((lignes.reduce((sum, l) => sum + l.totalLigne, 0) + fraisLiv) * 100) / 100
    const totalTtc = Math.round(sousTot * 1.085 * 100) / 100

    setLignesSuggerees(lignes)
    setSousTotalEstime(sousTot)
    setTotalTtcEstime(totalTtc)

    // Message de recommandation
    setMessages(prev => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        emetteur: 'bot',
        texte: `✨ Voici la configuration sur mesure calculée pour votre événement de ${nombreInvites} personnes (${surface} m² recommandés) à ${communeChoisie || 'en Martinique'} :`,
        composantSpecial: 'recommandation'
      }
    ])
    setEtape(6)
  }

  // Soumission finale du devis
  const soumettreDemandeDevis = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formClient.nom || !formClient.email || !formClient.telephone) {
      alert('Veuillez renseigner votre nom, email et téléphone.')
      return
    }

    setEnvoiEnCours(true)
    try {
      const rep = await fetch('/api/web/demande-devis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: formClient,
          evenement: {
            date: dateEvenement,
            commune: communeChoisie,
            type: typeEvenement,
            nombreInvites,
            format: formatEvenement
          },
          lignes: lignesSuggerees,
          fraisLivraison: zoneDetectee ? zoneDetectee.tarifEstime : 60,
          nomZoneLivraison: zoneDetectee ? zoneDetectee.nomZone : 'Martinique'
        })
      })

      const data = await rep.json()
      if (data.succes) {
        setDevisCree(data)
        setMessages(prev => [
          ...prev,
          {
            id: `msg-succes-${Date.now()}`,
            emetteur: 'bot',
            texte: `🎉 Félicitations ${formClient.prenom || formClient.nom} ! Votre devis officiel n° ${data.numero} a été généré avec succès (${data.totalTtc} € TTC).`,
            composantSpecial: 'succes_devis'
          }
        ])
        setEtape(7)
      } else {
        alert(data.message || 'Erreur lors de la création du devis')
      }
    } catch {
      alert('Erreur réseau lors de la validation')
    } finally {
      setEnvoiEnCours(false)
    }
  }

  const ajouterMessageUtilisateur = (texte: string) => {
    setMessages(prev => [...prev, { id: `user-${Date.now()}`, emetteur: 'user', texte }])
  }

  const ajouterMessageBot = (texte: string, choix?: { label: string; valeur: any }[]) => {
    setMessages(prev => [...prev, { id: `bot-${Date.now()}`, emetteur: 'bot', texte, choix }])
  }

  return (
    <>
      {/* Bulle flottante lanceur */}
      {!ouvert && (
        <button
          className={styles.lanceurBulle}
          onClick={() => setOuvert(true)}
          aria-label="Ouvrir le conseiller virtuel Isy Lok"
        >
          <div className={styles.avatarBulle}>💬</div>
          <div className={styles.texteBulle}>
            <span className={styles.titreBulle}>Conseiller Événementiel</span>
            <span className={styles.sousTitreBulle}>Dimensionnez votre devis en 1 min</span>
          </div>
        </button>
      )}

      {/* Fenêtre de Chat */}
      {ouvert && (
        <div className={styles.fenetreChat}>
          <div className={styles.chatEntete}>
            <div className={styles.chatEnteteInfo}>
              <div className={styles.chatAvatar}>🌴</div>
              <div>
                <h3 className={styles.chatTitre}>Conseiller Isy Lok</h3>
                <div className={styles.chatStatut}>
                  <span className={styles.pointVert} />
                  <span>En ligne — Martinique</span>
                </div>
              </div>
            </div>
            <button className={styles.boutonFermer} onClick={() => setOuvert(false)}>✕</button>
          </div>

          <div className={styles.chatCorps}>
            {messages.map(m => (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column' }}>
                {m.emetteur === 'bot' ? (
                  <div className={styles.messageBot}>
                    <span style={{ fontSize: 20 }}>🤖</span>
                    <div className={styles.bulleBot}>
                      <div>{m.texte}</div>

                      {/* Choix rapides */}
                      {m.choix && m.choix.length > 0 && (
                        <div className={styles.grilleChoix}>
                          {m.choix.map((c, idx) => (
                            <button
                              key={idx}
                              className={styles.boutonChoix}
                              onClick={() => {
                                if (etape === 1) choisirType(c.valeur)
                                else if (etape === 2) choisirConvivesEtFormat(c.valeur)
                                else if (etape === 3) choisirBesoins(c.valeur)
                                else if (etape === 4) choisirCommune(c.valeur)
                                else if (etape === 5) choisirDate(c.valeur)
                              }}
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Carte Spéciale Recommandation */}
                      {m.composantSpecial === 'recommandation' && (
                        <div className={styles.carteRecommandation}>
                          <div className={styles.recomTitre}>📋 Équipements préconisés</div>
                          {lignesSuggerees.map((l, i) => (
                            <div key={i} className={styles.recomLigne}>
                              <span>{l.quantite}x {l.designation}</span>
                              <strong>{l.totalLigne} €</strong>
                            </div>
                          ))}
                          <div className={styles.recomLigne}>
                            <span>🚚 Forfait livraison ({zoneDetectee?.nomZone || communeChoisie})</span>
                            <strong>{zoneDetectee ? zoneDetectee.tarifEstime : 60} €</strong>
                          </div>
                          <div className={styles.recomTotal}>
                            <span>Total estimé TTC (TVA 8,5%) :</span>
                            <span>{totalTtcEstime} € TTC</span>
                          </div>

                          {/* Formulaire coordonnées intégré */}
                          <form onSubmit={soumettreDemandeDevis} className={styles.formulaireChat}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#c4b5fd', marginBottom: 4 }}>
                              Transformez cette sélection en devis officiel :
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                              <input
                                placeholder="Nom *"
                                value={formClient.nom}
                                onChange={e => setFormClient({ ...formClient, nom: e.target.value })}
                                className={styles.champChat}
                                required
                              />
                              <input
                                placeholder="Prénom"
                                value={formClient.prenom}
                                onChange={e => setFormClient({ ...formClient, prenom: e.target.value })}
                                className={styles.champChat}
                              />
                            </div>
                            <input
                              type="email"
                              placeholder="Adresse e-mail *"
                              value={formClient.email}
                              onChange={e => setFormClient({ ...formClient, email: e.target.value })}
                              className={styles.champChat}
                              required
                            />
                            <input
                              placeholder="Téléphone *"
                              value={formClient.telephone}
                              onChange={e => setFormClient({ ...formClient, telephone: e.target.value })}
                              className={styles.champChat}
                              required
                            />
                            <button type="submit" disabled={envoiEnCours} className={styles.boutonValidationDevis}>
                              {envoiEnCours ? '⏳ Génération en cours...' : '🚀 Valider ma Demande de Devis'}
                            </button>
                          </form>
                        </div>
                      )}

                      {/* Composant Succès & Lien Signature */}
                      {m.composantSpecial === 'succes_devis' && devisCree && (
                        <div style={{ marginTop: 12, textAlign: 'center' }}>
                          <Link
                            href={devisCree.lienSignature}
                            target="_blank"
                            className={styles.lienSignatureBtn}
                          >
                            <span>✍️</span>
                            <span>Consulter &amp; Signer mon Devis en Ligne</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className={styles.messageUser}>{m.texte}</div>
                )}
              </div>
            ))}
            <div ref={finMessagesRef} />
          </div>
        </div>
      )}
    </>
  )
}
