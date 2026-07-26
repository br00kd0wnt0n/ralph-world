'use client'

import { useState } from 'react'
import Image from 'next/image'

interface FadeImageProps {
  src: string
  alt: string
  sizes?: string
  /** Extra classes for the <Image> (e.g. object-cover, group-hover:scale-105). */
  className?: string
  /** Extra classes for the skeleton box (defaults to a theme-aware pulse). */
  skeletonClassName?: string
}

/**
 * next/image (fill) with a skeleton loader that fades to the photo once it
 * loads. The parent element must be `relative` (fill positioning).
 */
export default function FadeImage({
  src,
  alt,
  sizes,
  className = '',
  skeletonClassName = 'bg-neutral-200 light:bg-neutral-800',
}: FadeImageProps) {
  const [loaded, setLoaded] = useState(false)
  return (
    <>
      {!loaded && (
        <div
          className={`absolute inset-0 animate-pulse ${skeletonClassName}`}
          aria-hidden="true"
        />
      )}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        onLoad={() => setLoaded(true)}
        className={`transition-[opacity,transform] duration-500 ease-out ${
          loaded ? 'opacity-100' : 'opacity-0'
        } ${className}`}
      />
    </>
  )
}
