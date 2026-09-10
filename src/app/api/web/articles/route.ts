import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const categorieId = searchParams.get('categorieId')
    const search = searchParams.get('q')

    const where: any = {}
    if (categorieId) where.categorieId = categorieId
    if (search) {
      where.OR = [
        { nom: { contains: search } },
        { reference: { contains: search } }
      ]
    }

    const articles = await prisma.article.findMany({
      where,
      orderBy: [{ enVedette: 'desc' }, { nom: 'asc' }],
      include: {
        categorie: true
      }
    })

    const categories = await prisma.categorie.findMany({
      orderBy: { nom: 'asc' }
    })

    return NextResponse.json({
      succes: true,
      donnees: { articles, categories }
    })
  } catch (err: any) {
    console.error('[API Web Articles GET] Erreur:', err)
    return NextResponse.json({ succes: false, message: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const corps = await req.json()
    const { id, visibleSurWeb, enVedette, afficherPrixWeb, imageWebUrl, prixLocationJour } = corps

    if (!id) {
      return NextResponse.json({ succes: false, message: 'ID article requis' }, { status: 400 })
    }

    const data: any = {}
    if (visibleSurWeb !== undefined) data.visibleSurWeb = Boolean(visibleSurWeb)
    if (enVedette !== undefined) data.enVedette = Boolean(enVedette)
    if (afficherPrixWeb !== undefined) data.afficherPrixWeb = Boolean(afficherPrixWeb)
    if (imageWebUrl !== undefined) data.imageWebUrl = imageWebUrl || null
    if (prixLocationJour !== undefined) data.prixLocationJour = Number(prixLocationJour)

    const article = await prisma.article.update({
      where: { id },
      data,
      include: { categorie: true }
    })

    return NextResponse.json({ succes: true, donnees: article })
  } catch (err: any) {
    console.error('[API Web Articles PATCH] Erreur:', err)
    return NextResponse.json({ succes: false, message: err.message }, { status: 500 })
  }
}
