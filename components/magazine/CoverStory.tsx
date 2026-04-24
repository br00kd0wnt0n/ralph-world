'use client'

import { useAuth } from '@/context/AuthContext'
import type { ArticleSummary } from '@/lib/data/magazine'

interface CoverStoryProps {
  article: ArticleSummary
  onRead: (slug: string) => void
  onSubscribe: () => void
}

export default function CoverStory({ article, onRead, onSubscribe }: CoverStoryProps) {
  const { user } = useAuth()

  return (
    <section className="bg-ralph-pink/10 px-6 py-10">
      <div className="max-w-5xl mx-auto">
        {/* Section label */}
        <h2 className="text-2xl md:text-3xl font-bold text-ralph-pink mb-6 font-[family-name:var(--font-display)] italic">
          <span className="border-b-2 border-ralph-orange pb-1">COVER STORY</span>
        </h2>

        <div className="flex flex-col md:flex-row gap-0 border border-gray-900 bg-white overflow-hidden">
          {/* Thumbnail */}
          <div className="md:w-[40%] aspect-[4/3] md:aspect-auto relative bg-gray-200">
            {article.leadMediaUrl ? (
              <img
                src={article.leadMediaUrl}
                alt={article.title ?? ''}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted text-sm">
                Cover image
              </div>
            )}
            {/* HOT badge */}
            <div className="absolute top-0 left-0 bg-black text-white text-[10px] font-bold px-3 py-1 uppercase tracking-wide">
              HOT
            </div>
          </div>

          {/* Content */}
          <div className="md:w-[60%] p-6 md:p-8 flex flex-col justify-center">
            {/* Category tags */}
            {article.contentTags && article.contentTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {article.contentTags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-bold uppercase tracking-wide text-gray-500"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-500 mb-2 font-medium">
              All the information is on the task.
            </p>

            <h3 className="text-xl md:text-2xl font-bold text-black mb-3 leading-tight">
              {article.title}
            </h3>

            {article.intro && (
              <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                {article.intro}
              </p>
            )}

            {user ? (
              <button
                onClick={() => onRead(article.slug)}
                className="self-start border border-black px-5 py-2 text-black text-sm font-medium hover:bg-black hover:text-white transition-colors"
              >
                Read now
              </button>
            ) : (
              <button
                onClick={onSubscribe}
                className="self-start border border-black px-5 py-2 text-black text-sm font-medium hover:bg-black hover:text-white transition-colors"
              >
                Sign up to read
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
