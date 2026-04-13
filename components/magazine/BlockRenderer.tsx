'use client'

interface ContentBlock {
  type: string
  text?: string
  caption?: string
  imageUrl?: string
  videoUrl?: string
  quote?: string
  attribution?: string
  signoffText?: string
}

export default function BlockRenderer({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="flex flex-col gap-8">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'ArticleText':
            return (
              <p key={i} className="text-gray-800 leading-relaxed">
                {block.text}
              </p>
            )

          case 'ArticleImage1Col':
            return (
              <figure key={i}>
                <div className="w-full aspect-[16/9] bg-gray-100 rounded-lg overflow-hidden">
                  {block.imageUrl ? (
                    <img
                      src={block.imageUrl}
                      alt={block.caption ?? ''}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                      Image
                    </div>
                  )}
                </div>
                {block.caption && (
                  <figcaption className="text-xs text-gray-500 mt-2 text-center">
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            )

          case 'ArticleImage2ColLeft':
            return (
              <div key={i} className="flex flex-col md:flex-row gap-4">
                <div className="md:w-[60%] aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden">
                  {block.imageUrl ? (
                    <img src={block.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">Image</div>
                  )}
                </div>
                <div className="md:w-[40%] flex items-center">
                  <p className="text-sm text-gray-600">{block.caption}</p>
                </div>
              </div>
            )

          case 'ArticleImage2ColRight':
            return (
              <div key={i} className="flex flex-col md:flex-row gap-4">
                <div className="md:w-[40%] flex items-center">
                  <p className="text-sm text-gray-600">{block.caption}</p>
                </div>
                <div className="md:w-[60%] aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden">
                  {block.imageUrl ? (
                    <img src={block.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">Image</div>
                  )}
                </div>
              </div>
            )

          case 'ArticleVideo':
            return (
              <figure key={i}>
                <div className="w-full aspect-video bg-black rounded-lg flex items-center justify-center text-gray-500 text-sm">
                  {block.videoUrl ? (
                    <video src={block.videoUrl} controls className="w-full h-full rounded-lg" />
                  ) : (
                    'Video placeholder'
                  )}
                </div>
                {block.caption && (
                  <figcaption className="text-xs text-gray-500 mt-2 text-center">
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            )

          case 'ArticleQuote':
            return (
              <blockquote
                key={i}
                className="border-l-4 border-ralph-orange pl-6 py-2"
              >
                <p className="text-xl md:text-2xl font-bold text-gray-800 italic leading-snug">
                  &ldquo;{block.quote}&rdquo;
                </p>
                {block.attribution && (
                  <cite className="text-sm text-gray-500 mt-2 block not-italic">
                    &mdash; {block.attribution}
                  </cite>
                )}
              </blockquote>
            )

          case 'RalphSignoff':
            return (
              <div key={i} className="flex flex-col items-center py-6">
                <img
                  src="/ralph-logo.png"
                  alt="ralph"
                  width={48}
                  height={48}
                  className="rounded-full mb-2"
                />
                {block.signoffText && (
                  <p className="text-sm text-gray-500 text-center">
                    {block.signoffText}
                  </p>
                )}
              </div>
            )

          default:
            return null
        }
      })}
    </div>
  )
}
