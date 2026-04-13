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
    <section className="bg-[#FAFAFA] px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <p className="text-ralph-orange font-bold text-sm mb-4 tracking-wide uppercase">
          <span className="border-b-2 border-ralph-orange pb-1">Cover Story</span>
        </p>

        <div className="flex flex-col md:flex-row gap-6 bg-white rounded-2xl overflow-hidden shadow-sm">
          {/* Thumbnail */}
          <div className="md:w-[40%] aspect-[4/3] bg-ralph-orange/10 flex items-center justify-center text-muted text-sm">
            {article.leadMediaUrl ? (
              <img
                src={article.leadMediaUrl}
                alt={article.title ?? ''}
                className="w-full h-full object-cover"
              />
            ) : (
              'Cover image'
            )}
          </div>

          {/* Content */}
          <div className="md:w-[60%] p-6 flex flex-col justify-center">
            {article.contentTags && article.contentTags.length > 0 && (
              <div className="flex gap-2 mb-3">
                {article.contentTags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-ralph-orange/10 text-ralph-orange"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <h2 className="text-2xl md:text-3xl font-bold text-black mb-3">
              {article.title}
            </h2>

            {article.intro && (
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {article.intro}
              </p>
            )}

            {user ? (
              <button
                onClick={() => onRead(article.slug)}
                className="self-start rounded-full bg-ralph-orange px-6 py-2.5 text-white font-medium text-sm hover:bg-ralph-orange/90 transition-colors"
              >
                Read now
              </button>
            ) : (
              <button
                onClick={onSubscribe}
                className="self-start rounded-full bg-ralph-pink px-6 py-2.5 text-white font-medium text-sm hover:bg-ralph-pink/90 transition-colors"
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
