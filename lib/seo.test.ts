import { describe, expect, it } from 'vitest'
import { DEFAULT_COPY } from '@/lib/data/site-copy'
import {
  PAGE_SEO_IDS,
  STATIC_SHARE_IMAGE,
  buildPageMetadata,
  pageSeoKeys,
  resolveArticleSeo,
  resolveCaseStudySeo,
  resolveEventSeo,
  shareImages,
  stripHtml,
} from './seo'

const article = {
  title: 'The Big Read',
  subtitle: null as string | null,
  intro: null as string | null,
  leadMediaUrl: null as string | null,
  cardImageUrl: null as string | null,
}

describe('stripHtml', () => {
  it('turns Tiptap HTML into one line of text', () => {
    expect(stripHtml('<p>Hello <strong>there</strong> &amp; welcome</p><p>Next&nbsp;bit</p>')).toBe(
      'Hello there & welcome Next bit'
    )
  })
  it('handles null and empty', () => {
    expect(stripHtml(null)).toBe('')
    expect(stripHtml('')).toBe('')
  })
})

describe('resolveArticleSeo', () => {
  it('uses the overrides when set', () => {
    expect(
      resolveArticleSeo({
        ...article,
        subtitle: 'Sub',
        leadMediaUrl: 'https://cdn/lead.jpg',
        seoTitle: 'SEO title',
        seoDescription: 'SEO description',
        seoImageUrl: 'https://cdn/seo.jpg',
      })
    ).toEqual({
      title: 'SEO title',
      description: 'SEO description',
      image: 'https://cdn/seo.jpg',
    })
  })

  it('falls back to title, subtitle and lead image when blank or whitespace', () => {
    expect(
      resolveArticleSeo({
        ...article,
        subtitle: 'Sub',
        leadMediaUrl: 'https://cdn/lead.jpg',
        cardImageUrl: 'https://cdn/card.jpg',
        seoTitle: '   ',
        seoDescription: '',
        seoImageUrl: null,
      })
    ).toEqual({ title: 'The Big Read', description: 'Sub', image: 'https://cdn/lead.jpg' })
  })

  it('uses the intro as plain text (not HTML) when there is no subtitle', () => {
    const r = resolveArticleSeo({ ...article, intro: '<p>' + 'word '.repeat(80) + '</p>' })
    expect(r.description.startsWith('word word')).toBe(true)
    expect(r.description).not.toContain('<')
    expect(r.description.length).toBeLessThanOrEqual(200)
  })

  it('falls back to the card image, then null', () => {
    expect(resolveArticleSeo({ ...article, cardImageUrl: 'https://cdn/card.jpg' }).image).toBe(
      'https://cdn/card.jpg'
    )
    expect(resolveArticleSeo(article).image).toBeNull()
  })

  it('has fixed last-resort title and description', () => {
    expect(resolveArticleSeo({ ...article, title: null })).toMatchObject({
      title: 'Article',
      description: 'Read it on Ralph.',
    })
  })
})

describe('resolveEventSeo', () => {
  const event = {
    title: 'Quiz Night',
    descriptionShort: null as string | null,
    locationName: 'The Pub',
    locationAddress: '1 High St',
    thumbnailUrl: 'https://cdn/thumb.jpg',
  }
  it('falls back to short description, then location', () => {
    expect(resolveEventSeo({ ...event, descriptionShort: 'Bring a pen' }).description).toBe('Bring a pen')
    expect(resolveEventSeo(event).description).toBe('The Pub, 1 High St')
    expect(resolveEventSeo(event).image).toBe('https://cdn/thumb.jpg')
  })
  it('uses the overrides when set', () => {
    expect(
      resolveEventSeo({ ...event, seoTitle: 'Pub quiz', seoDescription: 'D', seoImageUrl: 'https://cdn/x.jpg' })
    ).toEqual({ title: 'Pub quiz', description: 'D', image: 'https://cdn/x.jpg' })
  })
})

describe('resolveCaseStudySeo', () => {
  it('returns a bare title (the layout template adds " | Ralph")', () => {
    const r = resolveCaseStudySeo({ title: 'Nike', subtitle: 'Run club', thumbnailUrl: null })
    expect(r.title).toBe('Nike')
    expect(r.title).not.toContain('Ralph')
    expect(r.description).toBe('Run club')
  })
  it('uses the overrides when set', () => {
    expect(
      resolveCaseStudySeo({
        title: 'Nike',
        subtitle: null,
        thumbnailUrl: 't.jpg',
        seoTitle: 'Nike Run Club',
        seoImageUrl: 's.jpg',
      })
    ).toMatchObject({ title: 'Nike Run Club', image: 's.jpg' })
  })
})

describe('shareImages', () => {
  it('takes the first non-blank candidate', () => {
    expect(shareImages('', null, 'b.jpg')).toEqual([{ url: 'b.jpg' }])
  })
  it('never returns an empty list', () => {
    expect(shareImages(null, '  ', undefined)).toEqual([{ ...STATIC_SHARE_IMAGE }])
  })
})

describe('buildPageMetadata', () => {
  it('has Site Copy defaults for every page', () => {
    for (const id of PAGE_SEO_IDS) {
      const keys = pageSeoKeys(id)
      expect(DEFAULT_COPY[keys.title], id).toBeTruthy()
      expect(DEFAULT_COPY[keys.description], id).toBeTruthy()
      expect(keys.image in DEFAULT_COPY, id).toBe(true)
    }
  })

  it('reproduces the old hard-coded values from the defaults', () => {
    const m = buildPageMetadata({ ...DEFAULT_COPY }, 'magazine', { path: '/magazine' })
    expect(m.title).toBe('Magazine')
    expect(m.description).toBe('Long reads, sharp takes, and proper pop-culture coverage from Ralph.')
    expect(m.alternates).toEqual({ canonical: '/magazine' })
    expect(m.openGraph).toMatchObject({
      siteName: 'Ralph',
      locale: 'en_GB',
      title: 'Magazine',
      url: '/magazine',
      images: [{ ...STATIC_SHARE_IMAGE }],
    })
  })

  it('uses edited values, and the default when a field is blanked', () => {
    const m = buildPageMetadata(
      { ...DEFAULT_COPY, seo_events_title: 'Ralph Events', seo_events_description: '  ' },
      'events',
      { path: '/events' }
    )
    expect(m.title).toBe('Ralph Events')
    expect(m.description).toBe(DEFAULT_COPY.seo_events_description)
  })

  it('uses an absolute title on the homepage', () => {
    const m = buildPageMetadata({ ...DEFAULT_COPY }, 'home', { path: '/', absoluteTitle: true })
    expect(m.title).toEqual({ absolute: 'Ralph — The Entertainment People' })
  })

  it('image order: page field, automatic image, site default, static card', () => {
    const base = { ...DEFAULT_COPY, seo_default_image: 'default.jpg' }
    const og = (copy: typeof base, auto?: string) =>
      (buildPageMetadata(copy, 'subscribe', { path: '/subscribe', autoImage: auto }).openGraph as {
        images: unknown
      }).images
    expect(og({ ...base, seo_subscribe_image: 'page.jpg' }, 'cover.jpg')).toEqual([{ url: 'page.jpg' }])
    expect(og(base, 'cover.jpg')).toEqual([{ url: 'cover.jpg' }])
    expect(og(base)).toEqual([{ url: 'default.jpg' }])
    expect(og({ ...DEFAULT_COPY })).toEqual([{ ...STATIC_SHARE_IMAGE }])
  })

  it('applies an automatic description only while the field is untouched', () => {
    const auto = 'Pre-order Issue 09'
    expect(
      buildPageMetadata({ ...DEFAULT_COPY }, 'issue9', { path: '/issue9', autoDescription: auto }).description
    ).toBe(auto)
    expect(
      buildPageMetadata({ ...DEFAULT_COPY, seo_issue9_description: 'Edited' }, 'issue9', {
        path: '/issue9',
        autoDescription: auto,
      }).description
    ).toBe('Edited')
  })
})
