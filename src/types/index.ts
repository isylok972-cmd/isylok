// ===========================================
// Event-Gérance Pro — Types Globaux
// ===========================================

// Rôles utilisateur
export type RoleUtilisateur = 'ADMIN' | 'SECRETAIRE' | 'LIVREUR' | 'OPERATEUR_ATELIER' | 'GESTIONNAIRE_WEB'

// Statuts des devis
export type StatutDevis = 'BROUILLON' | 'ENVOYE' | 'VALIDE' | 'REFUSE' | 'FACTURE'

// Statuts des factures
export type StatutFacture = 'EMISE' | 'PAYEE' | 'EN_RETARD' | 'ANNULEE'

// Statuts du matériel
export type StatutEquipement = 'DISPONIBLE' | 'LOUE' | 'EN_NETTOYAGE' | 'EN_REPARATION'

// Statuts des tournées
export type StatutTournee = 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE'

// Statuts des étapes
export type StatutEtape = 'EN_ATTENTE' | 'EN_ROUTE' | 'SUR_PLACE' | 'TERMINEE'

// Types de matériel
export type TypeMateriel = 'GROS_MATERIEL' | 'PETIT_MATERIEL'

// Types de client
export type TypeClient = 'PARTICULIER' | 'PROFESSIONNEL'
export type StatutApprobationClient = 'VALIDE' | 'EN_ATTENTE'

// Types de caution
export type TypeCaution = 'CHEQUE' | 'ESPECES' | 'VIREMENT' | 'CB'

// Modes de paiement
export type ModePaiement = 'CB' | 'VIREMENT' | 'CHEQUE' | 'ESPECES'

// Configuration des bulles de navigation
export interface ConfigBulle {
  id: number
  nom: string
  sousTitre: string
  icone: string
  couleur: string
  couleurGradient: string
  lien: string
  rolesAutorises: RoleUtilisateur[]
}

// Configuration de l'application
export interface ConfigApplication {
  nomEntreprise: string
  devise: string
  tauxTva: number
}

// État de synchronisation
export interface EtatSynchronisation {
  enLigne: boolean
  enCoursDeSynchro: boolean
  derniereSynchro: Date | null
  actionsEnAttente: number
}

// Action hors-ligne
export interface ActionHorsLigne {
  id: string
  entite: string
  entiteId: string
  action: 'CREATION' | 'MODIFICATION' | 'SUPPRESSION'
  donnees: Record<string, unknown>
  horodatage: Date
  tentatives: number
}
