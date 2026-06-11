'use client'

import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

interface ContentBlock {
  type: string
  text?: string
  caption?: string
  imageUrl?: string
  /** 'cover' (default) — 16:9 crop. 'contain' — full image at natural proportions. */
  imageFit?: string
  /** ArticleImageTextWrap — float side for the portrait image. */
  wrapSide?: string
  /** ArticleCarousel — ordered image URLs. */
  carouselImages?: string[]
  videoUrl?: string
  quote?: string
  attribution?: string
  signoffText?: string
}

/**
 * Resolve a YouTube/Vimeo watch URL to an embeddable iframe src.
 * Returns null for anything that isn't a recognised platform URL (caller
 * falls back to a <video> tag for direct file URLs).
 */
function toEmbedUrl(raw: string): string | null {
  const url = raw.trim()
  // YouTube: watch?v=ID, youtu.be/ID, /embed/ID, /shorts/ID
  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i
  )
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  // Vimeo: vimeo.com/ID or player.vimeo.com/video/ID
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`
  return null
}

export default function BlockRenderer({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="flex flex-col gap-8">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'ArticleText':
            return (
              <div
                key={i}
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: block.text ?? '' }}
                className="leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_li]:mb-1 [&_a]:underline [&_a]:text-ralph-orange [&_a:hover]:opacity-80 [&_strong]:font-bold [&_em]:italic"
              />
            )

          case 'ArticleImage1Col':
            return (
              <figure key={i}>
                {block.imageFit === 'contain' ? (
                  // Fit mode — no forced aspect ratio, full image at natural proportions
                  <div className="w-full bg-gray-100 rounded-lg overflow-hidden">
                    {block.imageUrl ? (
                      <img
                        src={block.imageUrl}
                        alt={block.caption ?? ''}
                        className="w-full h-auto block"
                      />
                    ) : (
                      <div className="w-full h-32 flex items-center justify-center text-gray-400 text-sm">
                        Image
                      </div>
                    )}
                  </div>
                ) : (
                  // Fill mode (default) — 16:9 crop
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
                )}
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

          case 'ArticleImageTextWrap': {
            // Portrait image floated left/right; rich-text body wraps around
            // it. No crop — image shows at natural proportions, capped width.
            const onRight = block.wrapSide === 'right'
            return (
              <div key={i} className="overflow-hidden">
                {block.imageUrl && (
                  <figure
                    className={`mb-2 ${
                      onRight
                        ? 'float-none sm:float-right sm:ml-6'
                        : 'float-none sm:float-left sm:mr-6'
                    } w-full sm:w-[45%] md:w-[40%] max-w-[360px]`}
                  >
                    <img
                      src={block.imageUrl}
                      alt={block.caption ?? ''}
                      className="w-full h-auto block rounded-lg"
                    />
                    {block.caption && (
                      <figcaption className="text-xs text-gray-500 mt-2">
                        {block.caption}
                      </figcaption>
                    )}
                  </figure>
                )}
                <div
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: block.text ?? '' }}
                  className="leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_li]:mb-1 [&_a]:underline [&_a]:text-ralph-orange [&_a:hover]:opacity-80 [&_strong]:font-bold [&_em]:italic"
                />
              </div>
            )
          }

          case 'ArticleCarousel': {
            const images = (block.carouselImages ?? []).filter(Boolean)
            if (images.length === 0) return null
            return (
              <figure key={i} className="-mx-2 md:mx-0">
                <Swiper
                  modules={[Navigation, Pagination]}
                  navigation
                  pagination={{ clickable: true }}
                  spaceBetween={16}
                  slidesPerView="auto"
                  centeredSlides
                  className="ralph-carousel"
                >
                  {images.map((src, idx) => (
                    <SwiperSlide
                      key={idx}
                      // Uniform display height; width auto so portrait + landscape
                      // sit side by side at the same height without cropping.
                      className="!w-auto flex items-center justify-center"
                      style={{ height: '70vh', maxHeight: 560 }}
                    >
                      <img
                        src={src}
                        alt=""
                        className="h-full w-auto object-contain rounded-lg"
                      />
                    </SwiperSlide>
                  ))}
                </Swiper>
                {block.caption && (
                  <figcaption className="text-xs text-gray-500 mt-3 text-center">
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            )
          }

          case 'ArticleVideo': {
            const embed = block.videoUrl ? toEmbedUrl(block.videoUrl) : null
            return (
              <figure key={i}>
                <div className="w-full aspect-video bg-black rounded-lg overflow-hidden border border-black/10 shadow-sm flex items-center justify-center text-gray-500 text-sm">
                  {embed ? (
                    <iframe
                      src={embed}
                      title={block.caption ?? 'Video'}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  ) : block.videoUrl ? (
                    <video
                      src={block.videoUrl}
                      controls
                      playsInline
                      className="w-full h-full"
                    />
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
          }

          case 'ArticleQuote':
            return (
              <blockquote key={i} className="py-4 text-center">
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
