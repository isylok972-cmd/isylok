import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // CA Mensuel (sur l'année en cours)
    const factures = await prisma.facture.findMany({
      where: { statut: { not: 'ANNULEE' } },
      select: { dateCreation: true, montantHt: true, montantTva: true }
    })

    const moisNoms = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
    const anneeCourante = new Date().getFullYear()
    
    let caMensuelMap = new Map()
    let totalCA = 0
    let totalTVA = 0

    factures.forEach(f => {
      const d = new Date(f.dateCreation)
      if (d.getFullYear() === anneeCourante) {
        const mois = moisNoms[d.getMonth()]
        caMensuelMap.set(mois, (caMensuelMap.get(mois) || 0) + f.montantHt)
        totalCA += f.montantHt
        totalTVA += f.montantTva
      }
    })

    const caMensuel = moisNoms.map(m => ({
      name: m,
      CA: caMensuelMap.get(m) || 0
    }))

    // Achats et Sous-locations
    const sousLocations = await prisma.sousLocation.findMany({
      where: { statut: { not: 'ANNULEE' } },
      select: { prixAchat: true, quantite: true }
    })
    
    let totalAchats = 0
    sousLocations.forEach(sl => {
      totalAchats += (sl.prixAchat * sl.quantite)
    })

    const margeData = [
      { name: 'Marge Nette', value: totalCA - totalAchats },
      { name: 'Achats/Sous-loc', value: totalAchats }
    ]

    // Top 5 Matériel
    const lignesDevis = await prisma.ligneDevis.findMany({
      where: {
        devis: { statut: { in: ['VALIDE', 'FACTURE'] } },
        articleId: { not: null }
      },
      include: { article: { select: { nom: true } } }
    })

    const topMap = new Map<string, number>()
    lignesDevis.forEach(l => {
      if (l.article) {
        topMap.set(l.article.nom, (topMap.get(l.article.nom) || 0) + l.quantite)
      }
    })

    const topMateriel = Array.from(topMap.entries())
      .map(([nom, quantite]) => ({ nom, quantite }))
      .sort((a, b) => b.quantite - a.quantite)
      .slice(0, 5)

    return NextResponse.json({
      succes: true,
      donnees: {
        caMensuel,
        margeData,
        topMateriel,
        kpi: {
          totalCA,
          totalTVA,
          marge: totalCA - totalAchats,
          margePourcentage: totalCA > 0 ? ((totalCA - totalAchats) / totalCA) * 100 : 0
        }
      }
    })
  } catch (erreur) {
    console.error('[API Stats] Erreur:', erreur)
    return NextResponse.json({ succes: false, message: 'Erreur serveur' }, { status: 500 })
  }
}
