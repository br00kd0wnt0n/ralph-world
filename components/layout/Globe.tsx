'use client'

import { useEffect, useRef, useState } from 'react'

const GLOBE_ARRAY = [
  { img: 'globe_europe.png', sign: 'globe_sign_london.png' },
  { img: 'globe_america.png', sign: 'globe_sign_america.png' },
  { img: 'globe_asia_east.png', sign: 'globe_sign_tokyo.png' },
  { img: 'globe_asia_west.png', sign: 'globe_sign_mumbai.png' },
]

const ALL_GLOBE_FRAMES = [
  'globe_spin_1.png',
  'globe_spin_2.png',
  'globe_spin_3.png',
  'globe_spin_4.png',
  ...GLOBE_ARRAY.map((g) => g.img),
]

const ALL_SIGN_FRAMES = GLOBE_ARRAY.map((g) => g.sign)

function getSpinFrames(turnIdx: number) {
  return [
    { img: 'globe_spin_1.png', time: 100, cls: '' },
    { img: 'globe_spin_2.png', time: 100, cls: '' },
    { img: 'globe_spin_3.png', time: 100, cls: '' },
    { img: 'globe_spin_4.png', time: 100, cls: '' },
    { img: 'globe_spin_1.png', time: 100, cls: '' },
    { img: 'globe_spin_2.png', time: 100, cls: '' },
    { img: 'globe_spin_3.png', time: 100, cls: '' },
    { img: 'globe_spin_4.png', time: 100, cls: '' },
    { img: GLOBE_ARRAY[turnIdx].img, time: 4000, cls: 'active' },
  ]
}

export default function Globe() {
  const [frameIdx, setFrameIdx] = useState(0)
  const [turnx, setTurnx] = useState(0)
  const [signx, setSignx] = useState(GLOBE_ARRAY.length - 1)
  const turnRef = useRef(0)

  useEffect(() => {
    let idx = 0
    let turn = 0
    let sign = GLOBE_ARRAY.length - 1
    let tId: ReturnType<typeof setTimeout>

    const loop = () => {
      setFrameIdx(idx)
      setTurnx(turn)
      setSignx(sign)
      turnRef.current = turn

      const frames = getSpinFrames(turn)
      tId = setTimeout(loop, frames[idx].time)

      idx = (idx + 1) % frames.length
      if (idx === 0) turn = (turn + 1) % GLOBE_ARRAY.length
      if (idx === 4) sign = (sign + 1) % GLOBE_ARRAY.length
    }

    loop()
    return () => clearTimeout(tId)
  }, [])

  const currentFrame = getSpinFrames(turnx)[frameIdx]
  const currentGlobe = currentFrame.img
  const currentSign = GLOBE_ARRAY[signx].sign

  return (
    <div style={{ position: 'relative', width: 120, height: 120 }}>
      {ALL_GLOBE_FRAMES.map((src, i) => (
        <img
          key={`globe-${i}`}
          src={`/imgs/${src}`}
          alt="Globe"
          style={{
            display: src === currentGlobe ? 'block' : 'none',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: 'auto',
          }}
        />
      ))}

      {ALL_SIGN_FRAMES.map((src, i) => (
        <img
          key={`sign-${i}`}
          src={`/imgs/${src}`}
          alt="Sign"
          style={{
            display: src === currentSign ? 'block' : 'none',
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: 'auto',
            opacity: currentFrame.cls === 'active' ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />
      ))}
    </div>
  )
}
