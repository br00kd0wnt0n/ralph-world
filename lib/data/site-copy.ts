import { inArray } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { homepageConfig } from '@/lib/db/schema'

/**
 * Default copy values — match what the CMS schema defines.
 * These are the fallback when no DB override exists.
 */
export const DEFAULT_COPY = {
  // Homepage hero
  home_hero_heading: 'Welcome to our World',
  home_hero_line_1:
    'We make entertainment that brings people together and celebrates the things that make life feel good.',
  home_hero_line_2:
    'From TV and live events to digital content and print, we partner with creatives and brands who share our belief that great ideas come from taking creative risks, not feeding the algorithm.',
  home_hero_line_3: "If it's new, different or makes you smile, we're into it.",

  // Module descriptions
  magazine_description:
    'Pop culture stories, interviews and photo essays from the people who make the things we love.',
  events_description:
    'Live events, screenings, parties and pop-ups. Check below for the latest.',
  shop_description:
    'Physical magazines, merch and random things we think are brilliant.',
  lab_description:
    'Interactive experiments, tools, and weird wonderful things from the Ralph team.',

  // Magazine section
  magazine_hero_heading: 'OUR FUN, GLOSSY MAG',
  magazine_hero_intro_1:
    'Stories, interviews and photo essays about the people and things that make pop culture worth caring about.',
  magazine_hero_intro_2: 'Edited by the Ralph team',
  magazine_shop_cta: 'Got coin? Get mag',

  // Events section
  events_hero_heading: "LET'S MEET UP",
  events_hero_subtitle: 'For real. IRL.',
  events_hero_helper: 'Check below for the latest events.',
  events_past_heading: 'Mate, you missed a classic, check these out',

  // TV section
  tv_hero_heading: 'Ralph TV',
  tv_hero_intro:
    "Our little TV channel. Switch on, tune in, and see what we're playing right now.",
  tv_offline_label: 'OFFLINE',
  tv_offline_message: 'Tune in later',
  tv_subscribe_heading: 'Subscribe to keep watching',
  tv_subscribe_body:
    "Ralph.world is just bursting with Pop Culture for the Fun of It™ and experiencing it couldn't be easier.",

  // Shop section
  shop_hero_heading: 'BUY RALPH STUFF',
  shop_hero_intro: 'Magazines, merch, and random things we think are brilliant.',
  shop_soldout_heading: 'You snooze, you lose',
  shop_soldout_body:
    'This issue is out in the world, being enjoyed by others, not in your hand...',

  // Lab section
  lab_hero_heading: 'LAB',
  lab_hero_intro:
    "Tools, experiments, generators and weird little projects. Everything we've been tinkering with lately.",
  lab_hero_cta: 'What you waiting for — pull the lever to see what comes out.',

  // Subscribe modal
  subscribe_heading: 'JOIN RALPH',
  subscribe_free_heading: 'Experience pop culture for the fun of it.',
  subscribe_free_body:
    'Get access to our magazine articles, events listings, and the full Ralph experience. Absolutely free.',
  subscribe_free_cta: 'Hook me up for free',
  subscribe_paid_heading: 'Prefer your culture more hands-on?',
  subscribe_paid_price: '£3 a month*',
  subscribe_paid_body: 'Quarterly mag + TV channel + everything else',
  subscribe_paid_cta: 'Join for £3 per month',
  subscribe_paid_smallprint:
    '* Payment taken once per quarter — not monthly. Includes VAT and postage.',

  // Footer
  footer_tagline: 'The Entertainment People',
  footer_agency_cta: "Hey. Aren't you an agency?",
  footer_contact_email: 'mailto:hello@ralph.world',
  footer_tiktok_url: '',
  footer_instagram_url: '',
  footer_youtube_url: '',
} as const

export type SiteCopyKey = keyof typeof DEFAULT_COPY
export type SiteCopy = Record<SiteCopyKey, string>

/**
 * Fetch all site copy, merged with defaults. Safe to call from server components.
 * Returns defaults if DB is unreachable.
 */
export async function getSiteCopy(): Promise<SiteCopy> {
  try {
    const db = getDb()
    const keys = Object.keys(DEFAULT_COPY) as SiteCopyKey[]
    const rows = await db
      .select()
      .from(homepageConfig)
      .where(inArray(homepageConfig.key, keys))

    const merged: SiteCopy = { ...DEFAULT_COPY }
    for (const row of rows) {
      if (typeof row.value === 'string' && row.key in DEFAULT_COPY) {
        merged[row.key as SiteCopyKey] = row.value
      }
    }
    return merged
  } catch {
    return { ...DEFAULT_COPY }
  }
}
