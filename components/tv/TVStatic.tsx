'use client'

import { useEffect, useRef } from 'react'

export default function TVStatic() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let frameId: number

    function resize() {
      canvas!.width = canvas!.offsetWidth
      canvas!.height = canvas!.offsetHeight
    }

    function draw() {
      const w = canvas!.width
      const h = canvas!.height
      const imageData = ctx!.createImageData(w, h)
      const data = imageData.data

      for (let i = 0; i < data.length; i += 4) {
        const shade = Math.random() * 255
        data[i] = shade
        data[i + 1] = shade
        data[i + 2] = shade
        data[i + 3] = 255
      }

      ctx!.putImageData(imageData, 0, 0)
      frameId = requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener('resize', resize)
    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(frameId)
    }
  }, [])

  return <canvas ref={canvasRef} className="w-full h-full opacity-60" />
}
