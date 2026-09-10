'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import styles from './clients.module.css'
import { ModaleClient } from './composants/ModaleClient'
import type { ClientFormData } from './composants/ModaleClient'
import { ModaleCaution } from './composants/ModaleCaution'
import { PanneauDetailClient } from './composants/PanneauDetailClient'
import { ModaleImportClientsCSV, ImportClientsResultat } from './composants/ModaleImportClientsCSV'
import { formaterPrix } from '@/lib/utilitaires'

// Types
type CautionData = {
  id: string; clientId: string; montant: number; type: string;
  reference: string | null; statut: string; dateReception: string | null;
  dateRestitution: string | null; notes: string | null; dateCreation: string;
}

type DevisResume = {
  id: string; numero: string; totalTtc: number; statut: string;
  source?: string; dateEvenement?: string | null; dateCreation?: string;
}

type FactureResume = {
  id: string; numero: string; montantTtc: number; statut: string; dateCreation?: string;
}

export type ClientComplet = {
  id: string; type: string; nom: string; prenom: string | null;
  entreprise: string | null; siret: string | null; email: string | null;
  telephone: string; telephoneSecondaire: string | null;
  adresse: string | null; codePostal: string | null; ville: string | null;
  grillesTarifaires: string | null; notes: string | null;
  statutApprobation?: 'VALIDE' | 'EN_ATTENTE';
  dateCreation: string; dateMaj: string;
  cautions: CautionData[]; devis: DevisResume[]; factures?: FactureResume[];
}

type OngletActif = 'clients' | 'cautions'
type ModaleOuverte = null | 'ajout-client' | 'modif-client' | 'ajout-caution' | 'import-csv'

export default function PageClients() {
  const [onglet, setOnglet] = useState<OngletActif>('clients')
  const [sousOngletClients, setSousOngletClients] = useState<'OFFICIELS' | 'PROSPECTS'>('OFFICIELS')
  const [clients, setClients] = useState<ClientComplet[]>([])
  const [cautions, setCautions] = useState<(CautionData & { client: { id: string; nom: string; prenom: string | null; entreprise: string | null; type: string } })[]>([])
  const [recherche, setRecherche] = useState('')
  const [filtreType, setFiltreType] = useState('')
  const [filtreCautionStatut, setFiltreCautionStatut] = useState('')
  const [chargement, setChargement] = useState(true)
  const [modale, setModale] = useState<ModaleOuverte>(null)
  const [clientSelectionne, setClientSelectionne] = useState<ClientComplet | null>(null)
  const [clientEdition, setClientEdition] = useState<ClientFormData | null>(null)
  const [panneauOuvert, setPanneauOuvert] = useState(false)
  const [notification, setNotification] = useState<{ type: 'succes' | 'erreur'; message: string } | null>(null)

  // Chargement des données
  const chargerClients = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filtreType) params.set('type', filtreType)
      if (recherche) params.set('recherche', recherche)
      const rep = await fetch(`/api/clients?${params}`)
      const data = await rep.json()
      if (data.succes) setClients(data.donnees)
    } catch (err) {
      console.error('Erreur chargement clients:', err)
    } finally {
      setChargement(false)
    }
  }, [filtreType, recherche])

  const chargerCautions = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filtreCautionStatut) params.set('statut', filtreCautionStatut)
      const rep = await fetch(`/api/clients/cautions?${params}`)
      const data = await rep.json()
      if (data.succes) setCautions(data.donnees)
    } catch (err) {
      console.error('Erreur chargement cautions:', err)
    }
  }, [filtreCautionStatut])

  useEffect(() => {
    setChargement(true)
    if (onglet === 'clients') chargerClients()
    else chargerCautions().then(() => setChargement(false))
  }, [onglet, chargerClients, chargerCautions])

  // Ouvrir détail client
  const ouvrirDetail = async (clientId: string) => {
    try {
      const rep = await fetch(`/api/clients/${clientId}`)
      const data = await rep.json()
      if (data.succes) {
        setClientSelectionne(data.donnees)
        setPanneauOuvert(true)
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Validation d'un prospect
  const validerProspect = async (clientId: string) => {
    try {
      const rep = await fetch(`/api/commercial/clients/${clientId}/valider`, {
        method: 'PATCH'
      })
      const data = await rep.json()
      if (data.succes) {
        setNotification({
          type: 'succes',
          message: 'Prospect validé et transféré dans les clients officiels avec succès !'
        })
        chargerClients()
        if (clientSelectionne?.id === clientId) {
          ouvrirDetail(clientId)
        }
      } else {
        alert(data.message || 'Erreur lors de la validation du prospect')
      }
    } catch {
      alert('Erreur réseau')
    }
  }

  // Suppression client ou prospect
  const supprimerClient = async (clientId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement cette fiche ? Cette action est irréversible.')) return
    try {
      const rep = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' })
      const data = await rep.json()
      if (data.succes) {
        setNotification({
          type: 'succes',
          message: 'Fiche supprimée avec succès.'
        })
        chargerClients()
        setPanneauOuvert(false)
      } else {
        alert(data.message || 'Impossible de supprimer cette fiche')
      }
    } catch {
      alert('Erreur réseau')
    }
  }

  // Préparer édition
  const preparerEdition = (client: ClientComplet) => {
    setClientEdition({
      id: client.id,
      type: client.type,
      nom: client.nom,
      prenom: client.prenom || '',
      entreprise: client.entreprise || '',
      siret: client.siret || '',
      email: client.email || '',
      telephone: client.telephone,
      telephoneSecondaire: client.telephoneSecondaire || '',
      adresse: client.adresse || '',
      codePostal: client.codePostal || '',
      ville: client.ville || '',
      notes: client.notes || '',
    })
    setModale('modif-client')
  }

  const handleSuccesImport = (res: ImportClientsResultat) => {
    setModale(null)
    setNotification({
      type: 'succes',
      message: `${res.statistiques.crees} client(s) créé(s), ${res.statistiques.misAJour} mis à jour (${res.statistiques.totalSoumis} lignes traitées)`
    })
    chargerClients()
  }

  // Séparation Clients Officiels vs Nouveaux Prospects Web
  const clientsOfficiels = clients.filter(c => (c.statutApprobation || 'VALIDE') === 'VALIDE')
  const prospectsWeb = clients.filter(c => c.statutApprobation === 'EN_ATTENTE')
  const clientsAffiches = sousOngletClients === 'OFFICIELS' ? clientsOfficiels : prospectsWeb

  // Stats
  const totalClients = clientsOfficiels.length
  const clientsPro = clientsOfficiels.filter(c => c.type === 'PROFESSIONNEL').length
  const totalCautions = clients.reduce((s, c) => s + (c.cautions?.reduce((sc, ca) => sc + ca.montant, 0) || 0), 0)
  const cautionsEnAttente = clients.reduce((s, c) => s + (c.cautions?.filter(ca => ca.statut === 'EN_ATTENTE').length || 0), 0)

  return (
    <main className={styles.conteneur}>
      {/* Toast de Notification */}
      {notification && (
        <div className={`${styles.notificationToast} ${notification.type === 'succes' ? styles.notificationSucces : ''}`}>
          <span className={styles.notificationSuccesIcone}>
            {notification.type === 'succes' ? '✅' : '❌'}
          </span>
          <div>
            <strong>{notification.type === 'succes' ? 'Opération réussie' : 'Erreur'}</strong>
            <p style={{ margin: 0, fontSize: 13, color: '#cbd5e1' }}>{notification.message}</p>
          </div>
          <button
            className={styles.notificationFermer}
            onClick={() => setNotification(null)}
            title="Fermer"
          >
            ✕
          </button>
        </div>
      )}

      {/* En-tête */}
      <header className={styles.entete}>
        <div className={styles.enteteGauche}>
          <Link href="/" className={styles.boutonRetour}>← Accueil</Link>
          <div className={styles.titreModule}>
            <span>🏷️</span>
            <h1>Clients &amp; Cautions</h1>
          </div>
        </div>
        <div className={styles.enteteDroite}>
          <button
            className={styles.boutonImporter}
            onClick={() => setModale('import-csv')}
            title="Importer un fichier clients CSV ou TSV"
          >
            <span>📤</span> Importer CSV
          </button>
          <button className={styles.boutonAjouter} onClick={() => { setClientEdition(null); setModale('ajout-client') }}>
            + Nouveau client
          </button>
        </div>
      </header>

      {/* Stats */}
      <section className={styles.statsRapides}>
        <div className={styles.carteStat}>
          <div className={styles.carteStatEntete}>
            <span className={styles.carteStatLabel}>Clients Officiels</span>
            <span className={styles.carteStatIcone}>👥</span>
          </div>
          <div className={styles.carteStatValeur}>{totalClients}</div>
          <div className={styles.carteStatSous}>{clientsPro} professionnel{clientsPro > 1 ? 's' : ''}</div>
        </div>
        <div className={styles.carteStat}>
          <div className={styles.carteStatEntete}>
            <span className={styles.carteStatLabel}>Particuliers</span>
            <span className={styles.carteStatIcone}>👤</span>
          </div>
          <div className={styles.carteStatValeur}>{totalClients - clientsPro}</div>
          <div className={styles.carteStatSous}>clients particuliers</div>
        </div>
        <div className={styles.carteStat}>
          <div className={styles.carteStatEntete}>
            <span className={styles.carteStatLabel}>Prospects Web</span>
            <span className={styles.carteStatIcone}>🌐</span>
          </div>
          <div className={styles.carteStatValeur} style={{ color: prospectsWeb.length > 0 ? '#fb923c' : '#34d399' }}>
            {prospectsWeb.length}
          </div>
          <div className={styles.carteStatSous}>à qualifier et approuver</div>
        </div>
        <div className={styles.carteStat}>
          <div className={styles.carteStatEntete}>
            <span className={styles.carteStatLabel}>Cautions en attente</span>
            <span className={styles.carteStatIcone}>🔒</span>
          </div>
          <div className={styles.carteStatValeur} style={{ color: cautionsEnAttente > 0 ? '#fbbf24' : '#34d399' }}>
            {cautionsEnAttente}
          </div>
          <div className={styles.carteStatSous}>cautions à sécuriser</div>
        </div>
      </section>

      {/* Onglets Principaux */}
      <div className={styles.onglets}>
        <button className={`${styles.onglet} ${onglet === 'clients' ? styles.ongletActif : ''}`} onClick={() => setOnglet('clients')}>
          <span className={styles.ongletEmoji}>👥</span> Répertoire Clients ({clients.length})
          {prospectsWeb.length > 0 && (
            <span className={styles.pastilleProspects} title={`${prospectsWeb.length} nouveau(x) prospect(s) web`}>
              {prospectsWeb.length}
            </span>
          )}
        </button>
        <button className={`${styles.onglet} ${onglet === 'cautions' ? styles.ongletActif : ''}`} onClick={() => setOnglet('cautions')}>
          <span className={styles.ongletEmoji}>🔒</span> Suivi des Cautions
        </button>
      </div>

      {onglet === 'clients' && (
        <>
          {/* Sous-onglets de Filtrage : Clients Officiels vs Nouveaux Prospects Web */}
          <div className={styles.barreSousOnglets}>
            <div className={styles.sousOnglets}>
              <button
                className={`${styles.sousOnglet} ${sousOngletClients === 'OFFICIELS' ? styles.sousOngletActif : ''}`}
                onClick={() => setSousOngletClients('OFFICIELS')}
              >
                <span>👥</span> Clients Officiels ({clientsOfficiels.length})
              </button>
              <button
                className={`${styles.sousOnglet} ${sousOngletClients === 'PROSPECTS' ? styles.sousOngletActif : ''}`}
                onClick={() => setSousOngletClients('PROSPECTS')}
              >
                <span>🌐</span> Nouveaux Prospects Web ({prospectsWeb.length})
                {prospectsWeb.length > 0 && (
                  <span className={styles.pastilleProspects}>{prospectsWeb.length}</span>
                )}
              </button>
            </div>

            {sousOngletClients === 'PROSPECTS' && prospectsWeb.length > 0 && (
              <span style={{ fontSize: 13, color: '#fb923c', fontWeight: 600 }}>
                🔔 {prospectsWeb.length} prospect(s) web collecté(s) via la vitrine ou le chatbot en attente d&apos;approbation
              </span>
            )}
          </div>

          {/* Barre d'outils */}
          <div className={styles.barreOutils}>
            <div className={styles.champRecherche}>
              <span className={styles.iconeRecherche}>🔍</span>
              <input
                type="text"
                placeholder={sousOngletClients === 'PROSPECTS' ? 'Rechercher un prospect par nom, email, téléphone…' : 'Rechercher un client officiel…'}
                value={recherche}
                onChange={e => { setRecherche(e.target.value); setChargement(true) }}
              />
            </div>
            <select className={styles.selectFiltre} value={filtreType} onChange={e => { setFiltreType(e.target.value); setChargement(true) }}>
              <option value="">Tous les types</option>
              <option value="PARTICULIER">👤 Particuliers</option>
              <option value="PROFESSIONNEL">🏢 Professionnels</option>
            </select>
          </div>
        </>
      )}

      {onglet === 'cautions' && (
        <div className={styles.barreOutils}>
          <div className={styles.champRecherche}>
            <span className={styles.iconeRecherche}>🔍</span>
            <input
              type="text"
              placeholder="Rechercher une caution…"
              value={recherche}
              onChange={e => { setRecherche(e.target.value); setChargement(true) }}
            />
          </div>
          <select className={styles.selectFiltre} value={filtreCautionStatut} onChange={e => setFiltreCautionStatut(e.target.value)}>
            <option value="">Tous les statuts</option>
            <option value="EN_ATTENTE">⏳ En attente</option>
            <option value="ENCAISSEE">💰 Encaissées</option>
            <option value="RESTITUEE">✅ Restituées</option>
          </select>
        </div>
      )}

      {/* Contenu */}
      {chargement ? (
        <div className={styles.etatVide}><p>⏳</p><h3>Chargement…</h3></div>
      ) : onglet === 'clients' ? (
        <TableauClients
          mode={sousOngletClients}
          clients={clientsAffiches}
          onDetail={ouvrirDetail}
          onSupprimer={supprimerClient}
          onValiderProspect={validerProspect}
        />
      ) : (
        <TableauCautions cautions={cautions} onDetailClient={ouvrirDetail} />
      )}

      {/* Modales */}
      {modale === 'import-csv' && (
        <ModaleImportClientsCSV
          onFermer={() => setModale(null)}
          onSucces={handleSuccesImport}
        />
      )}
      {(modale === 'ajout-client' || modale === 'modif-client') && (
        <ModaleClient
          client={clientEdition}
          onFermer={() => setModale(null)}
          onSucces={() => {
            setModale(null)
            chargerClients()
            if (clientSelectionne) ouvrirDetail(clientSelectionne.id)
          }}
        />
      )}
      {modale === 'ajout-caution' && clientSelectionne && (
        <ModaleCaution
          clientId={clientSelectionne.id}
          clientNom={clientSelectionne.prenom ? `${clientSelectionne.prenom} ${clientSelectionne.nom}` : clientSelectionne.nom}
          onFermer={() => setModale(null)}
          onSucces={() => {
            setModale(null)
            chargerClients()
            if (clientSelectionne) ouvrirDetail(clientSelectionne.id)
          }}
        />
      )}

      {/* Panneau détail */}
      {panneauOuvert && clientSelectionne && (
        <PanneauDetailClient
          client={clientSelectionne}
          onFermer={() => setPanneauOuvert(false)}
          onModifier={() => preparerEdition(clientSelectionne)}
          onAjouterCaution={() => setModale('ajout-caution')}
          onRecharger={() => { chargerClients(); ouvrirDetail(clientSelectionne.id) }}
          onValiderProspect={() => validerProspect(clientSelectionne.id)}
        />
      )}
    </main>
  )
}

/* ===== Sous-composant : Tableau des clients / prospects ===== */
function TableauClients({
  mode,
  clients,
  onDetail,
  onSupprimer,
  onValiderProspect
}: {
  mode: 'OFFICIELS' | 'PROSPECTS'
  clients: ClientComplet[]
  onDetail: (id: string) => void
  onSupprimer: (id: string) => void
  onValiderProspect: (id: string) => void
}) {
  if (clients.length === 0) {
    return mode === 'PROSPECTS' ? (
      <div className={styles.etatVide}>
        <p>🌐</p>
        <h3>Aucun prospect web en attente</h3>
        <span>Tous les prospects collectés via le site vitrine et le chatbot ont été validés</span>
      </div>
    ) : (
      <div className={styles.etatVide}>
        <p>👥</p>
        <h3>Aucun client officiel</h3>
        <span>Commencez par ajouter un client ou validez un prospect</span>
      </div>
    )
  }

  return (
    <div className={styles.tableauConteneur}>
      <table className={styles.tableau}>
        <thead>
          <tr>
            <th>{mode === 'PROSPECTS' ? 'Prospect Web' : 'Client'}</th>
            <th>Type</th>
            <th>Coordonnées Directes</th>
            <th>Commune</th>
            <th>{mode === 'PROSPECTS' ? 'Entreprise / SIRET' : 'Cautions'}</th>
            <th>Devis Web / Rattachés</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {clients.map(client => {
            const initiales = `${(client.prenom || client.nom)?.[0] || ''}${client.nom?.[0] || ''}`.toUpperCase()
            const couleur = client.type === 'PROFESSIONNEL'
              ? 'linear-gradient(135deg, #8b5cf6, #a78bfa)'
              : 'linear-gradient(135deg, #ec4899, #f472b6)'
            const nbCautions = client.cautions?.length || 0
            const montantCautions = client.cautions?.reduce((s, c) => s + c.montant, 0) || 0
            const nbDevis = client.devis?.length || 0
            const estProspect = client.statutApprobation === 'EN_ATTENTE'

            return (
              <tr key={client.id} onClick={() => onDetail(client.id)}>
                <td>
                  <div className={styles.celluleClient}>
                    <div className={styles.avatarClient} style={{ background: couleur }}>{initiales}</div>
                    <div>
                      <div className={styles.nomClient}>
                        {client.prenom ? `${client.prenom} ${client.nom}` : client.nom}
                      </div>
                      {client.entreprise && (
                        <div className={styles.entrepriseClient}>{client.entreprise}</div>
                      )}
                      {estProspect ? (
                        <span className={styles.badgeProspectEnAttente} title="Prospect en attente d'approbation">
                          ⚠️ En attente
                        </span>
                      ) : (
                        <span className={styles.badgeClientOfficiel} title="Client officiel vérifié">
                          ✅ Officiel
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                <td>
                  <span className={`${styles.badge} ${client.type === 'PROFESSIONNEL' ? styles.badgeProfessionnel : styles.badgeParticulier}`}>
                    {client.type === 'PROFESSIONNEL' ? '🏢 Pro' : '👤 Part.'}
                  </span>
                </td>

                <td>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>📞 {client.telephone}</div>
                  {client.email && (
                    <div style={{ fontSize: 12, color: '#38bdf8', marginTop: 2 }}>
                      ✉️ {client.email}
                    </div>
                  )}
                </td>

                <td style={{ color: client.ville ? '#e2e8f0' : '#64748b' }}>
                  📍 {client.ville || 'Non renseignée'}
                </td>

                <td>
                  {mode === 'PROSPECTS' ? (
                    <div>
                      <div style={{ fontSize: 12.5, color: '#f1f5f9' }}>{client.entreprise || 'Particulier'}</div>
                      {client.siret && (
                        <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
                          SIRET : {client.siret}
                        </div>
                      )}
                    </div>
                  ) : (
                    nbCautions > 0 ? (
                      <div>
                        <span className={styles.montant}>{formaterPrix(montantCautions)}</span>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{nbCautions} caution{nbCautions > 1 ? 's' : ''}</div>
                      </div>
                    ) : (
                      <span style={{ color: '#64748b' }}>—</span>
                    )
                  )}
                </td>

                <td>
                  {nbDevis > 0 ? (
                    <span className={`${styles.badge} ${styles.badgeEncaissee}`}>
                      {nbDevis} devis
                    </span>
                  ) : (
                    <span style={{ color: '#64748b' }}>—</span>
                  )}
                </td>

                <td>
                  <div className={styles.actionsCell} onClick={e => e.stopPropagation()}>
                    {/* Bouton direct Valider pour les prospects */}
                    {estProspect && (
                      <button
                        type="button"
                        className={styles.boutonValiderProspect}
                        onClick={() => onValiderProspect(client.id)}
                        title="Valider ce prospect et le transférer dans les clients officiels"
                      >
                        ✅ Valider
                      </button>
                    )}
                    <button
                      type="button"
                      className={styles.boutonAction}
                      onClick={() => onDetail(client.id)}
                      title="Voir détail complet"
                    >
                      👁️
                    </button>
                    <button
                      type="button"
                      className={`${styles.boutonAction} ${styles.boutonDanger}`}
                      onClick={() => onSupprimer(client.id)}
                      title="Supprimer la fiche"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ===== Sous-composant : Tableau des cautions ===== */
function TableauCautions({ cautions, onDetailClient }: {
  cautions: (CautionData & { client: { id: string; nom: string; prenom: string | null; entreprise: string | null; type: string } })[]
  onDetailClient: (id: string) => void
}) {
  if (cautions.length === 0) {
    return <div className={styles.etatVide}><p>🔒</p><h3>Aucune caution</h3><span>Les cautions apparaîtront ici</span></div>
  }

  return (
    <div className={styles.tableauConteneur}>
      <table className={styles.tableau}>
        <thead>
          <tr>
            <th>Client</th>
            <th>Montant</th>
            <th>Type</th>
            <th>Référence</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {cautions.map(caution => (
            <tr key={caution.id} onClick={() => onDetailClient(caution.client.id)}>
              <td className={styles.celluleClient}>
                <div className={styles.nomClient}>
                  {caution.client.prenom ? `${caution.client.prenom} ${caution.client.nom}` : caution.client.nom}
                </div>
                {caution.client.entreprise && (
                  <div className={styles.entrepriseClient}>{caution.client.entreprise}</div>
                )}
              </td>
              <td className={styles.montant}>{formaterPrix(caution.montant)}</td>
              <td>{caution.type}</td>
              <td style={{ color: caution.reference ? '#e2e8f0' : '#64748b' }}>
                {caution.reference || '—'}
              </td>
              <td>
                <span className={`${styles.badge} ${caution.statut === 'RESTITUEE' ? styles.badgeRestituee : caution.statut === 'ENCAISSEE' ? styles.badgeEncaissee : styles.badgeEnAttente}`}>
                  {caution.statut}
                </span>
              </td>
              <td>
                <div className={styles.actionsCell} onClick={e => e.stopPropagation()}>
                  <button
                    className={styles.boutonAction}
                    onClick={() => onDetailClient(caution.client.id)}
                    title="Voir le client"
                  >
                    👁️
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
