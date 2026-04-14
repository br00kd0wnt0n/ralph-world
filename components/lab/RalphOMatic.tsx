'use client'

import { motion } from 'framer-motion'
import {
  leverVariants,
  lightsVariants,
  bellJarVariants,
} from '@/lib/animation/lab'
import type { RalphOMaticProps } from './RalphOMatic.types'

export default function RalphOMatic({
  items,
  state,
  onLeverPull,
  onItemSelect,
  settledItemId,
  machineIllustration: MachineIllustration,
  conveyorIllustration: ConveyorIllustration,
}: RalphOMaticProps) {
  // Show 3 items on the belt; center item is the "target"
  const beltItems = items.length > 0 ? items.slice(0, Math.max(3, items.length)) : []
  const centerItem = settledItemId
    ? items.find((i) => i.id === settledItemId)
    : beltItems[Math.floor(beltItems.length / 2)]

  const leverAnimate: 'pulled' | 'idle' =
    state === 'lever-pulled' || state === 'spinning' ? 'pulled' : 'idle'
  const lightsAnimate =
    state === 'idle' ? 'idle' : state === 'settled' ? 'settled' : 'active'

  return (
    <div className="w-full flex flex-col lg:flex-row items-stretch gap-4">
      {/* ── Machine (left) ── */}
      <div className="relative flex-1 bg-surface border-4 border-black rounded-2xl p-6 min-h-[320px]">
        {MachineIllustration ? (
          <MachineIllustration state={state} />
        ) : (
          <>
            {/* Ralph-O-Matic sign */}
            <div className="text-center mb-4">
              <div className="inline-block bg-ralph-yellow text-black px-4 py-1 rounded-md font-bold text-sm tracking-wider border-2 border-black">
                RALPH-O-MATIC
              </div>
            </div>

            {/* Lights + Clock */}
            <div className="flex items-center justify-between mb-6">
              <motion.div
                variants={lightsVariants}
                animate={lightsAnimate}
                className="flex gap-2"
              >
                <div className="w-3 h-3 rounded-full bg-ralph-pink" />
                <div className="w-3 h-3 rounded-full bg-ralph-yellow" />
                <div className="w-3 h-3 rounded-full bg-ralph-teal" />
              </motion.div>

              <div className="w-12 h-12 rounded-full border-2 border-black bg-white flex items-center justify-center text-[10px] font-mono">
                <span className="text-black">12:00</span>
              </div>
            </div>

            {/* Rollers decorative */}
            <div className="flex gap-1 mb-6 opacity-40">
              <div className="w-4 h-4 rounded-full bg-black" />
              <div className="w-4 h-4 rounded-full bg-black" />
              <div className="w-4 h-4 rounded-full bg-black" />
            </div>

            {/* Lever */}
            <div className="absolute bottom-6 right-6 flex flex-col items-center">
              <button
                onClick={onLeverPull}
                disabled={state === 'spinning'}
                className="group"
                aria-label="Pull lever"
              >
                <motion.div
                  variants={leverVariants}
                  animate={leverAnimate}
                  className="origin-top"
                  style={{ transformOrigin: '50% 0%' }}
                >
                  <div className="w-2 h-20 bg-gray-500 group-hover:bg-ralph-pink transition-colors" />
                  <div className="w-6 h-6 rounded-full bg-ralph-pink -mt-1 -ml-2 shadow-lg" />
                </motion.div>
              </button>
              <p className="text-[10px] text-muted mt-2 uppercase tracking-wide">
                {state === 'idle' ? 'Pull me' : state === 'settled' ? 'Again?' : '…'}
              </p>
            </div>

            {/* State label for dev */}
            <div className="absolute top-3 right-3 text-[9px] font-mono text-muted uppercase tracking-wider">
              {state}
            </div>
          </>
        )}
      </div>

      {/* ── Conveyor with bell jars (right) ── */}
      <div className="relative flex-1 bg-surface border-4 border-black rounded-2xl p-6 min-h-[320px] overflow-hidden">
        {ConveyorIllustration ? (
          <ConveyorIllustration state={state} />
        ) : (
          <>
            {/* Three bell jars */}
            <div className="relative flex items-end justify-around h-full pt-8">
              {[0, 1, 2].map((pos) => {
                const isCenter = pos === 1
                const item = isCenter ? centerItem : beltItems[pos]
                const showItem = state === 'settled' && isCenter
                return (
                  <motion.button
                    key={pos}
                    variants={bellJarVariants}
                    animate={showItem ? 'highlighted' : 'idle'}
                    onClick={() => {
                      if (showItem && item) onItemSelect(item.id)
                    }}
                    className="relative flex flex-col items-center w-24 md:w-32"
                    disabled={!showItem}
                  >
                    {/* Bell jar dome */}
                    <div
                      className="w-full aspect-[3/4] relative"
                      style={{
                        background:
                          'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                        borderRadius: '50% 50% 12% 12% / 60% 60% 12% 12%',
                        border: '2px solid rgba(255,255,255,0.3)',
                      }}
                    >
                      {/* Item under jar */}
                      {showItem && item && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="absolute inset-4 flex flex-col items-center justify-center text-center"
                        >
                          {item.thumbnailUrl ? (
                            <img
                              src={item.thumbnailUrl}
                              alt={item.title ?? ''}
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <>
                              <div className="w-8 h-8 rounded-full bg-ralph-yellow mb-1" />
                              <p className="text-[10px] text-white font-bold line-clamp-2">
                                {item.title}
                              </p>
                            </>
                          )}
                        </motion.div>
                      )}

                      {/* Placeholder dots during spin */}
                      {state === 'spinning' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: 'linear',
                            }}
                            className="w-4 h-4 border-2 border-ralph-yellow border-t-transparent rounded-full"
                          />
                        </div>
                      )}
                    </div>

                    {/* Base */}
                    <div className="w-full h-2 bg-black rounded-sm" />
                  </motion.button>
                )
              })}
            </div>

            {/* Conveyor belt line */}
            <div className="absolute bottom-4 left-0 right-0 h-3 bg-black/50 border-y-2 border-black" />
          </>
        )}

        {state === 'settled' && centerItem && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-muted uppercase tracking-wider"
          >
            Tap jar to explore
          </motion.div>
        )}
      </div>
    </div>
  )
}
