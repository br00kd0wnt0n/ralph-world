'use client'

import { useAuth } from '@/context/AuthContext'
import Button from '@/components/ui/Button'
import type { ArticleSummary } from '@/lib/data/magazine'

interface CoverStoryProps {
  article: ArticleSummary
  onRead: (slug: string) => void
  onSubscribe: () => void
}

export default function CoverStory({ article, onRead, onSubscribe }: CoverStoryProps) {
  const { user } = useAuth()

  // Get first tag for the ribbon (if available)
  const ribbonTag = article.contentTags?.[0]

  return (
    <div className="w-full mx-auto px-6 pb-10" style={{ maxWidth: 1040 + 48 }}>
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Image with diagonal ribbon */}
        <div className="md:w-[45%] relative">
          <div
            className="bg-gray-200 overflow-hidden"
            style={{ aspectRatio: 1.6290322581, borderRadius: 12 }}
          >
            <img
              src={article.leadMediaUrl || '/imgs/article_lead.png'}
              alt={article.title ?? ''}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Diagonal ribbon tag */}
          {ribbonTag && (
            <div
              className="absolute top-0 left-0 overflow-hidden"
              style={{ width: 120, height: 120 }}
            >
              <div
                className="absolute bg-ralph-orange text-white text-xs font-bold uppercase tracking-wider py-2 text-center"
                style={{
                  width: 170,
                  transform: 'rotate(-45deg) translateX(-50px) translateY(20px)',
                }}
              >
                {ribbonTag}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="md:w-[55%] flex flex-col justify-start pt-2">
          {/* Category tags as pipe-separated list */}
          {article.contentTags && article.contentTags.length > 0 && (
            <p
              className="uppercase text-black"
              style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 800, fontSize: 12, lineHeight: 1, letterSpacing: 0, marginBottom: 10 }}
            >
              {article.contentTags.join('  |  ')}
            </p>
          )}

          {/* Tagline + Title — Gooper Trial 600, 18px, line-height 100% */}
          <p
            className="text-intro text-black mb-1"
            style={{ fontSize: 18, lineHeight: 1 }}
          >
            All the information is on the task.
          </p>
          <h3
            className="text-intro text-black mb-4"
            style={{ fontSize: 18, lineHeight: 1 }}
          >
            {article.title}
          </h3>

          {/* Body copy — Roboto 600, 14px, line-height 100% */}
          {article.intro && (
            <p
              className="text-black mb-6 font-semibold"
              style={{ fontSize: 14, lineHeight: 1 }}
            >
              {article.intro}
            </p>
          )}

          {/* Read button */}
          {user ? (
            <Button
              label="Read now"
              onClick={() => onRead(article.slug)}
            />
          ) : (
            <Button
              label="Sign up to read"
              onClick={onSubscribe}
            />
          )}
        </div>
      </div>
    </div>
  )
}
