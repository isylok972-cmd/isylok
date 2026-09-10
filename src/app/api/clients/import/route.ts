import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export interface ClientImportLigne {
  code?: string | null
  nom: string
  contact?: string | null
  prenom?: string | null
  entreprise?: string | null
  adresse1?: string | null
  adresse2?: string | null
  adresse?: string | null
  codePostal?: string | null
  ville?: string | null
  fixe?: string | null
  portable?: string | null
  telephone: string
  telephoneSecondaire?: string | null
  email?: string | null
  type?: 'PARTICULIER' | 'PROFESSIONNEL'
  notes?: string | null
}

export async function POST(requete: NextRequest) {
  try {
    const corps = await requete.json()
    const { clients, nettoyerDemo }: { clients: ClientImportLigne[]; nettoyerDemo?: boolean } = corps

    if (!clients || !Array.isArray(clients) || clients.length === 0) {
      return NextResponse.json(
        { succes: false, message: 'Aucun client valide fourni pour l\'importation' },
        { status: 400 }
      )
    }

    // 1. Nettoyage des clients de démo si demandé ou présent
    const emailsDemo = [
      'contact@evenements-luxe.fr',
      'sophie.bernard@email.fr',
      'evenements@bordeaux.fr',
      'marc.durand@email.mq',
      'julie.lefevre@email.mq',
    ]

    let demoSupprimes = 0
    const clientsDemo = await prisma.client.findMany({
      where: {
        OR: [
          { email: { in: emailsDemo } },
          {
            AND: [
              { nom: { in: ['Événements Luxe SAS', 'Bernard', 'Mairie de Bordeaux', 'Durand', 'Lefevre'] } },
              { devis: { none: {} } },
              { factures: { none: {} } },
              { cautions: { none: {} } },
            ],
          },
        ],
      },
      select: { id: true },
    })

    if (clientsDemo.length > 0) {
      const del = await prisma.client.deleteMany({
        where: { id: { in: clientsDemo.map((c) => c.id) } },
      })
      demoSupprimes = del.count
    }

    // 2. Traitement et validation des lignes de clients
    const clientsValides: ClientImportLigne[] = []
    const erreursValidation: { ligne: number; nom?: string; message: string }[] = []

    for (let index = 0; index < clients.length; index++) {
      const c = clients[index]
      const nom = (c.nom || c.entreprise || '').trim()

      if (!nom) {
        erreursValidation.push({ ligne: index + 1, message: 'Nom / Raison sociale manquant' })
        continue
      }

      const code = (c.code || '').trim()
      const contact = (c.contact || c.prenom || '').trim()
      const fixe = (c.fixe || '').trim()
      const portable = (c.portable || '').trim()
      const telPrincipal = (c.telephone || portable || fixe || 'Non renseigné').trim()
      const telSecondaire = (c.telephoneSecondaire || (telPrincipal === portable ? fixe : portable) || '').trim()
      const email = (c.email || '').trim().toLowerCase() || null

      const adr1 = (c.adresse1 || '').trim()
      const adr2 = (c.adresse2 || '').trim()
      const adrComplete = (c.adresse || [adr1, adr2].filter(Boolean).join(', ')).trim() || null

      const cp = (c.codePostal || '').trim() || null
      const ville = (c.ville || '').trim() || null

      // Déduire le type : Professionnel si société / mot-clé pro ou contact renseigné distinctement
      let type: 'PARTICULIER' | 'PROFESSIONNEL' = 'PARTICULIER'
      const nomMin = nom.toLowerCase()
      if (
        c.type === 'PROFESSIONNEL' ||
        c.entreprise ||
        nomMin.includes('sas') ||
        nomMin.includes('sarl') ||
        nomMin.includes('eurl') ||
        nomMin.includes('sci') ||
        nomMin.includes('mairie') ||
        nomMin.includes('ste ') ||
        nomMin.includes('societe') ||
        nomMin.includes('hotel') ||
        nomMin.includes('restaurant') ||
        nomMin.includes('agence') ||
        nomMin.includes('events') ||
        nomMin.includes('association') ||
        (contact && contact.toLowerCase() !== nomMin)
      ) {
        type = 'PROFESSIONNEL'
      }

      // Concaténer le code client dans les notes si présent
      const notesParts: string[] = []
      if (code) notesParts.push(`Code client : ${code}`)
      if (contact && type === 'PROFESSIONNEL') notesParts.push(`Contact : ${contact}`)
      if (c.notes) notesParts.push(c.notes.trim())
      const notes = notesParts.length > 0 ? notesParts.join(' | ') : null

      clientsValides.push({
        code,
        nom,
        prenom: contact || null,
        entreprise: type === 'PROFESSIONNEL' ? nom : null,
        adresse: adrComplete,
        codePostal: cp,
        ville,
        telephone: telPrincipal,
        telephoneSecondaire: telSecondaire || null,
        email,
        type,
        notes,
      })
    }

    if (clientsValides.length === 0) {
      return NextResponse.json(
        {
          succes: false,
          message: 'Aucun client valide trouvé dans le fichier',
          erreurs: erreursValidation,
        },
        { status: 400 }
      )
    }

    // 3. Récupérer les clients existants pour effectuer un upsert intelligent
    const tousClientsExistants = await prisma.client.findMany({
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        notes: true,
      },
    })

    let nbCrees = 0
    let nbMisAJour = 0
    const erreursImport: { nom: string; message: string }[] = []

    for (const cl of clientsValides) {
      // Rechercher correspondance :
      // 1. Par Code client dans notes
      // 2. Par Email (si renseigné)
      // 3. Par Nom exact + Ville/Téléphone
      let clientExistant = null

      if (cl.code) {
        clientExistant = tousClientsExistants.find((c) =>
          c.notes && c.notes.includes(`Code client : ${cl.code}`)
        )
      }

      if (!clientExistant && cl.email) {
        clientExistant = tousClientsExistants.find(
          (c) => c.email && c.email.toLowerCase() === cl.email?.toLowerCase()
        )
      }

      if (!clientExistant) {
        clientExistant = tousClientsExistants.find(
          (c) =>
            c.nom.toLowerCase() === cl.nom.toLowerCase() &&
            (c.telephone === cl.telephone || !cl.telephone)
        )
      }

      try {
        if (clientExistant) {
          // Mise à jour
          await prisma.client.update({
            where: { id: clientExistant.id },
            data: {
              nom: cl.nom,
              prenom: cl.prenom,
              entreprise: cl.entreprise,
              type: cl.type,
              email: cl.email || clientExistant.email,
              telephone: cl.telephone || clientExistant.telephone,
              telephoneSecondaire: cl.telephoneSecondaire,
              adresse: cl.adresse,
              codePostal: cl.codePostal,
              ville: cl.ville,
              notes: cl.notes,
            },
          })
          nbMisAJour++
        } else {
          // Création
          const nouveau = await prisma.client.create({
            data: {
              nom: cl.nom,
              prenom: cl.prenom,
              entreprise: cl.entreprise,
              type: cl.type || 'PARTICULIER',
              email: cl.email,
              telephone: cl.telephone,
              telephoneSecondaire: cl.telephoneSecondaire,
              adresse: cl.adresse,
              codePostal: cl.codePostal,
              ville: cl.ville,
              notes: cl.notes,
            },
          })
          tousClientsExistants.push(nouveau)
          nbCrees++
        }
      } catch (err: unknown) {
        console.error(`Erreur import client ${cl.nom}:`, err)
        erreursImport.push({
          nom: cl.nom,
          message: err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement',
        })
      }
    }

    return NextResponse.json({
      succes: true,
      message: `Importation réussie : ${nbCrees} client(s) créé(s), ${nbMisAJour} mis à jour.${demoSupprimes > 0 ? ` (${demoSupprimes} client(s) de démo supprimé(s))` : ''}`,
      statistiques: {
        totalSoumis: clients.length,
        totalValides: clientsValides.length,
        crees: nbCrees,
        misAJour: nbMisAJour,
        demoSupprimes,
      },
      erreurs: [...erreursValidation, ...erreursImport],
    })
  } catch (erreur: unknown) {
    console.error('[API Clients Import] Erreur serveur:', erreur)
    return NextResponse.json(
      {
        succes: false,
        message: erreur instanceof Error ? erreur.message : 'Erreur interne lors de l\'importation',
      },
      { status: 500 }
    )
  }
}
