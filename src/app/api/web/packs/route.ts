import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const packs = await prisma.packEvenement.findMany({
      orderBy: [{ ordreAffichage: 'asc' }, { dateCreation: 'desc' }],
      include: {
        articles: {
          include: {
            article: {
              include: { categorie: true }
            }
          }
        }
      }
    })

    return NextResponse.json({ succes: true, donnees: packs })
  } catch (err: any) {
    console.error('[API Web Packs GET] Erreur:', err)
    return NextResponse.json({ succes: false, message: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const corps = await req.json()
    const {
      nom,
      slug,
      description,
      image,
      typeEvenement,
      capacitePersonnes,
      prixEstime,
      enVedette,
      actif,
      articlesAssocies // Tableau [{ articleId: string, quantiteDefaut: number }]
    } = corps

    if (!nom || !slug) {
      return NextResponse.json({ succes: false, message: 'Le nom et le slug sont requis' }, { status: 400 })
    }

    // Vérifier unicité slug
    const existeSlug = await prisma.packEvenement.findUnique({ where: { slug } })
    if (existeSlug) {
      return NextResponse.json({ succes: false, message: 'Ce slug URL est déjà utilisé' }, { status: 400 })
    }

    const pack = await prisma.packEvenement.create({
      data: {
        nom,
        slug,
        description: description || null,
        image: image || null,
        typeEvenement: typeEvenement || 'MARIAGE',
        capacitePersonnes: Number(capacitePersonnes) || 50,
        prixEstime: prixEstime ? Number(prixEstime) : null,
        enVedette: Boolean(enVedette),
        actif: actif !== undefined ? Boolean(actif) : true,
        articles: Array.isArray(articlesAssocies) && articlesAssocies.length > 0
          ? {
              create: articlesAssocies.map((a: any) => ({
                articleId: a.articleId,
                quantiteDefaut: Number(a.quantiteDefaut) || 1
              }))
            }
          : undefined
      },
      include: {
        articles: {
          include: { article: true }
        }
      }
    })

    return NextResponse.json({ succes: true, donnees: pack }, { status: 201 })
  } catch (err: any) {
    console.error('[API Web Packs POST] Erreur:', err)
    return NextResponse.json({ succes: false, message: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const corps = await req.json()
    const {
      id,
      nom,
      slug,
      description,
      image,
      typeEvenement,
      capacitePersonnes,
      prixEstime,
      enVedette,
      actif,
      ordreAffichage,
      articlesAssocies // Si fourni, remplace les articles du pack
    } = corps

    if (!id) {
      return NextResponse.json({ succes: false, message: 'ID pack requis' }, { status: 400 })
    }

    const data: any = {}
    if (nom !== undefined) data.nom = nom
    if (slug !== undefined) data.slug = slug
    if (description !== undefined) data.description = description
    if (image !== undefined) data.image = image
    if (typeEvenement !== undefined) data.typeEvenement = typeEvenement
    if (capacitePersonnes !== undefined) data.capacitePersonnes = Number(capacitePersonnes)
    if (prixEstime !== undefined) data.prixEstime = prixEstime ? Number(prixEstime) : null
    if (enVedette !== undefined) data.enVedette = Boolean(enVedette)
    if (actif !== undefined) data.actif = Boolean(actif)
    if (ordreAffichage !== undefined) data.ordreAffichage = Number(ordreAffichage)

    // Si articlesAssocies est fourni, remplacer les associations
    if (Array.isArray(articlesAssocies)) {
      await prisma.packArticle.deleteMany({ where: { packId: id } })
      if (articlesAssocies.length > 0) {
        data.articles = {
          create: articlesAssocies.map((a: any) => ({
            articleId: a.articleId,
            quantiteDefaut: Number(a.quantiteDefaut) || 1
          }))
        }
      }
    }

    const pack = await prisma.packEvenement.update({
      where: { id },
      data,
      include: {
        articles: {
          include: { article: true }
        }
      }
    })

    return NextResponse.json({ succes: true, donnees: pack })
  } catch (err: any) {
    console.error('[API Web Packs PATCH] Erreur:', err)
    return NextResponse.json({ succes: false, message: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ succes: false, message: 'ID requis' }, { status: 400 })
    }

    await prisma.packEvenement.delete({ where: { id } })
    return NextResponse.json({ succes: true, message: 'Pack supprimé' })
  } catch (err: any) {
    console.error('[API Web Packs DELETE] Erreur:', err)
    return NextResponse.json({ succes: false, message: err.message }, { status: 500 })
  }
}
