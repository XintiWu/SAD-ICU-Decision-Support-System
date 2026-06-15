import { useState } from 'react'

type Props = {
  onClose?: () => void
  forceOpen?: boolean
}

export function AllocationTutorial({ onClose, forceOpen = false }: Props) {
  const [isOpen, setIsOpen] = useState(() => {
    if (forceOpen) return true
    return !localStorage.getItem('sad_has_seen_tutorial_v1')
  })
  const [step, setStep] = useState(1)

  const [prevForceOpen, setPrevForceOpen] = useState(forceOpen)
  if (forceOpen !== prevForceOpen) {
    setPrevForceOpen(forceOpen)
    if (forceOpen) {
      setIsOpen(true)
      setStep(1)
    }
  }

  const handleClose = () => {
    localStorage.setItem('sad_has_seen_tutorial_v1', 'true')
    setIsOpen(false)
    if (onClose) onClose()
  }

  if (!isOpen) return null

  const totalSteps = 4

  const nextStep = () => {
    if (step < totalSteps) setStep(step + 1)
    else handleClose()
  }

  const prevStep = () => {
    if (step > 1) setStep(step - 1)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      {/* CSS stylesheet block for exact pseudo-element rendering and animations */}
      <style>{`
        /* Pseudo-element content mapping to support animating standard text */
        .s2-count-lin::after { content: "0床"; color: #64748b; animation: s2LaneCount 4s infinite step-end; }
        .s2-val-lin::after { content: "0分"; animation: s2LaneLoadVal 4s infinite step-end; }

        .s3-count-lin::after { content: "0床"; color: #64748b; animation: s3CountA 4s infinite step-end; }
        .s3-val-lin::after { content: "0分"; animation: s3ScoreA 4s infinite step-end; }

        .s3-count-hsu::after { content: "0床"; color: #64748b; animation: s3CountB 4s infinite step-end; }
        .s3-val-hsu::after { content: "0分"; animation: s3ScoreB 4s infinite step-end; }

        .s3-count-chen::after { content: "0床"; color: #64748b; animation: s3CountC 4s infinite step-end; }
        .s3-val-chen::after { content: "0分"; animation: s3ScoreC 4s infinite step-end; }

        /* Step 2: Hand Drag and Drop Animation */
        @keyframes s2Cursor {
          0% { transform: translate(280px, 220px); opacity: 1; }
          15% { transform: translate(178px, 87px) scale(1); opacity: 1; }
          20%, 25% { transform: translate(178px, 87px) scale(0.85); opacity: 1; }
          55% { transform: translate(97px, 197px) scale(0.85); opacity: 1; }
          60%, 80% { transform: translate(97px, 197px) scale(1); opacity: 1; }
          85% { transform: translate(97px, 197px) scale(1); opacity: 0; }
          100% { transform: translate(280px, 220px) scale(1); opacity: 0; }
        }

        @keyframes s2Chip {
          0%, 25% { transform: translate(124px, 64px); opacity: 1; }
          55%, 59% { transform: translate(43px, 174px); opacity: 1; }
          60%, 80% { transform: translate(43px, 174px); opacity: 0; }
          85%, 100% { transform: translate(124px, 64px); opacity: 1; }
        }

        @keyframes s2LanePlaceholder {
          0%, 59% { opacity: 1; }
          60%, 80% { opacity: 0; }
          85%, 100% { opacity: 1; }
        }

        @keyframes s2LaneChip {
          0%, 59% { opacity: 0; transform: scale(0.8); }
          60%, 80% { opacity: 1; transform: scale(1); }
          85%, 100% { opacity: 0; }
        }

        @keyframes s2LaneCount {
          0%, 59% { content: "0床"; color: #64748b; }
          60%, 80% { content: "1床"; color: #0284c7; }
          85%, 100% { content: "0床"; color: #64748b; }
        }

        @keyframes s2LaneLoadVal {
          0%, 59% { content: "0分"; }
          60%, 80% { content: "3分"; }
          85%, 100% { content: "0分"; }
        }

        @keyframes s2LaneLoadBar {
          0%, 59% { width: 0%; }
          60%, 80% { width: 30%; }
          85%, 100% { width: 0%; }
        }

        /* Step 3: Auto Suggest Click Animation */
        @keyframes s3Cursor {
          0% { transform: translate(280px, 220px); opacity: 1; }
          15% { transform: translate(453px, 44px) scale(1); opacity: 1; }
          20%, 25% { transform: translate(453px, 44px) scale(0.85); opacity: 1; }
          30%, 80% { transform: translate(453px, 44px) scale(1); opacity: 1; }
          85% { transform: translate(453px, 44px) scale(1); opacity: 0; }
          100% { transform: translate(280px, 220px) scale(1); opacity: 0; }
        }

        @keyframes s3Btn {
          0%, 19%, 26%, 100% { transform: scale(1); filter: brightness(1); }
          20%, 25% { transform: scale(0.96); filter: brightness(0.95); }
        }

        @keyframes s3FlyChipA {
          0%, 25% { transform: translate(124px, 64px); opacity: 1; }
          55%, 59% { transform: translate(43px, 174px); opacity: 1; }
          60%, 75% { transform: translate(43px, 174px); opacity: 0; }
          80%, 100% { transform: translate(124px, 64px); opacity: 1; }
        }

        @keyframes s3FlyChipB {
          0%, 25% { transform: translate(238px, 64px); opacity: 1; }
          55%, 59% { transform: translate(225px, 174px); opacity: 1; }
          60%, 75% { transform: translate(225px, 174px); opacity: 0; }
          80%, 100% { transform: translate(238px, 64px); opacity: 1; }
        }

        @keyframes s3FlyChipC {
          0%, 25% { transform: translate(352px, 64px); opacity: 1; }
          55%, 59% { transform: translate(407px, 174px); opacity: 1; }
          60%, 75% { transform: translate(407px, 174px); opacity: 0; }
          80%, 100% { transform: translate(352px, 64px); opacity: 1; }
        }

        @keyframes s3LanePlaceholder {
          0%, 59% { opacity: 1; }
          60%, 75% { opacity: 0; }
          80%, 100% { opacity: 1; }
        }

        @keyframes s3LaneChip {
          0%, 59% { opacity: 0; transform: scale(0.8); }
          60%, 75% { opacity: 1; transform: scale(1); }
          80%, 100% { opacity: 0; }
        }

        @keyframes s3CountA {
          0%, 59% { content: "0床"; color: #64748b; }
          60%, 75% { content: "1床"; color: #0284c7; }
          80%, 100% { content: "0床"; color: #64748b; }
        }
        @keyframes s3ScoreA {
          0%, 59% { content: "0分"; }
          60%, 75% { content: "3分"; }
          80%, 100% { content: "0分"; }
        }
        @keyframes s3BarA {
          0%, 59% { width: 0%; }
          60%, 75% { width: 30%; }
          80%, 100% { width: 0%; }
        }

        @keyframes s3CountB {
          0%, 59% { content: "0床"; color: #64748b; }
          60%, 75% { content: "1床"; color: #0284c7; }
          80%, 100% { content: "0床"; color: #64748b; }
        }
        @keyframes s3ScoreB {
          0%, 59% { content: "0分"; }
          60%, 75% { content: "8分"; }
          80%, 100% { content: "0分"; }
        }
        @keyframes s3BarB {
          0%, 59% { width: 0%; }
          60%, 75% { width: 80%; }
          80%, 100% { width: 0%; }
        }

        @keyframes s3CountC {
          0%, 59% { content: "0床"; color: #64748b; }
          60%, 75% { content: "1床"; color: #0284c7; }
          80%, 100% { content: "0床"; color: #64748b; }
        }
        @keyframes s3ScoreC {
          0%, 59% { content: "0分"; }
          60%, 75% { content: "5分"; }
          80%, 100% { content: "0分"; }
        }
        @keyframes s3BarC {
          0%, 59% { width: 0%; }
          60%, 75% { width: 50%; }
          80%, 100% { width: 0%; }
        }
      `}</style>

      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/15 transition-all duration-300">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-100">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition cursor-pointer z-10 text-sm font-bold"
          aria-label="關閉引導"
        >
          ✕
        </button>

        {/* Slide Contents */}
        <div className="p-6 md:p-8 pt-10">
          {step === 1 && (
            <div className="space-y-6 text-center animate-fadeIn">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-5xl">
                👋
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold text-slate-900">歡迎使用分床指派系統</h3>
                <p className="text-sm leading-relaxed text-slate-500 max-w-md mx-auto">
                  本系統協助護理小組長（Leader）快速合理地分配下一班的護理人員與病患床位。請花 1 分鐘了解如何進行操作。
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-extrabold text-slate-900 text-center">操作方式一：手動拖曳分床</h3>
              
              {/* Mockup Panel */}
              <div className="flex justify-center items-center py-6">
                <div 
                  className="origin-center select-none relative w-[560px] h-[280px] bg-[#f8fafc] border border-slate-200 rounded-3xl overflow-hidden shadow-sm shrink-0"
                  style={{ transform: 'scale(1.15)' }}
                >
                
                {/* A. Unassigned Patient Strip */}
                <div className="absolute left-4 top-4 w-[528px] h-[86px] bg-white rounded-2xl ring-1 ring-black/5 p-3">
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="grid h-6 w-6 place-items-center rounded bg-slate-100 text-[10px]" aria-hidden>🛏</span>
                      <span className="text-[11px] font-bold text-slate-800">待分配病患</span>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500">
                      1 床
                    </span>
                  </div>
                  <div className="flex gap-2 min-h-[46px] items-center border border-dashed border-[#fecdd3] bg-[#fffafa] rounded-xl p-1.5">
                    <span className="text-[9px] font-bold text-[#b3341f] shrink-0">未分配病患：</span>
                    {/* Ghost placeholder matching EXACT MockChip size */}
                    <div className="w-[108px] h-[46px] rounded-lg border border-dashed border-slate-300" />
                  </div>
                </div>

                {/* B. Three Lanes */}
                {/* Lane 1 (Lin) */}
                <div className="absolute left-4 top-[116px] w-[162px] h-[148px] bg-white rounded-2xl ring-1 ring-black/5 flex flex-col">
                  <header className="border-b border-black/5 px-2.5 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-[#f1f5f9] text-[9px] font-bold text-slate-700">林</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[10px] font-bold text-slate-900">林O新</div>
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-black/5 relative">
                          <div
                            className="h-full rounded-full bg-[#3d9b5f] transition-all duration-300"
                            style={{ animation: 's2LaneLoadBar 4s infinite step-end' }}
                          />
                        </div>
                      </div>
                      <div className="shrink-0 text-right text-[9px] font-bold text-slate-500">
                        <span className="s2-count-lin" />
                        <span className="mx-0.5 text-slate-400">·</span>
                        <span className="s2-val-lin" />
                      </div>
                    </div>
                  </header>
                  <div className="p-2 relative flex-1">
                    <div
                      className="h-full rounded-lg border border-dashed border-black/15 bg-slate-50 flex items-center justify-center text-[9px] text-slate-400 font-medium"
                      style={{ animation: 's2LanePlaceholder 4s infinite step-end' }}
                    >
                      拖入病患
                    </div>
                    {/* Placed Chip inside Lane 1 (Centered, w-[108px]) */}
                    <div
                      className="absolute inset-y-2 left-1/2 -translate-x-1/2"
                      style={{ animation: 's2LaneChip 4s infinite step-end' }}
                    >
                      <MockChip bedShort="201A" score={3} tone="low" diagnosis="Pneumonia" />
                    </div>
                  </div>
                </div>

                {/* Lane 2 (Hsu) */}
                <div className="absolute left-[198px] top-[116px] w-[162px] h-[148px] bg-white rounded-2xl ring-1 ring-black/5 flex flex-col opacity-60">
                  <header className="border-b border-black/5 px-2.5 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-[#f1f5f9] text-[9px] font-bold text-slate-700">許</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[10px] font-bold text-slate-900">許O文</div>
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#3d9b5f] w-0" />
                      </div>
                      <div className="shrink-0 text-right text-[9px] font-bold text-slate-500">
                        <span>0床 · 0分</span>
                      </div>
                    </div>
                  </header>
                  <div className="p-2 flex-1">
                    <div className="h-full rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-[9px] text-slate-400 font-medium">
                      拖入病患
                    </div>
                  </div>
                </div>

                {/* Lane 3 (Chen) */}
                <div className="absolute left-[380px] top-[116px] w-[162px] h-[148px] bg-white rounded-2xl ring-1 ring-black/5 flex flex-col opacity-60">
                  <header className="border-b border-black/5 px-2.5 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-[#f1f5f9] text-[9px] font-bold text-slate-700">陳</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[10px] font-bold text-slate-900">陳O琪</div>
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#3d9b5f] w-0" />
                      </div>
                      <div className="shrink-0 text-right text-[9px] font-bold text-slate-500">
                        <span>0床 · 0分</span>
                      </div>
                    </div>
                  </header>
                  <div className="p-2 flex-1">
                    <div className="h-full rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-[9px] text-slate-400 font-medium">
                      拖入病患
                    </div>
                  </div>
                </div>

                {/* C. Absolute Flying Chip */}
                <div
                  className="absolute z-20 pointer-events-none"
                  style={{
                    top: '0px',
                    left: '0px',
                    animation: 's2Chip 4s infinite cubic-bezier(0.25, 1, 0.5, 1)',
                  }}
                >
                  <MockChip bedShort="201A" score={3} tone="low" diagnosis="Pneumonia" />
                </div>

                {/* D. Mouse cursor arrow pointer */}
                <div
                  className="absolute pointer-events-none z-30 w-6 h-6 text-slate-900"
                  style={{
                    top: '0px',
                    left: '0px',
                    animation: 's2Cursor 4s infinite cubic-bezier(0.25, 1, 0.5, 1)',
                  }}
                >
                  <svg fill="currentColor" viewBox="0 0 24 24" className="w-6 h-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]">
                    <path d="M4 2v18l5-5h7.5L4 2z" />
                  </svg>
                </div>
              </div>
            </div>

              <p className="text-xs leading-relaxed text-slate-500 text-center">
                按住<strong>「待分配病患」</strong>中的床位，直接拖曳到下方對應的<strong>護理師</strong>中，即可完成手動分床。
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-extrabold text-slate-900 text-center">操作方式二：一鍵系統建議</h3>
              
              {/* Mockup Panel */}
              <div className="flex justify-center items-center py-6">
                <div 
                  className="origin-center select-none relative w-[560px] h-[280px] bg-[#f8fafc] border border-slate-200 rounded-3xl overflow-hidden shadow-sm shrink-0"
                  style={{ transform: 'scale(1.15)' }}
                >
                
                {/* A. Unassigned Patient Strip */}
                <div className="absolute left-4 top-4 w-[528px] h-[86px] bg-white rounded-2xl ring-1 ring-black/5 p-3">
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="grid h-6 w-6 place-items-center rounded bg-slate-100 text-[10px]" aria-hidden>🛏</span>
                      <span className="text-[11px] font-bold text-slate-800">待分配病患</span>
                    </div>
                    {/* Suggest Button */}
                    <button
                      type="button"
                      className="rounded-xl bg-[#2563eb] px-3 py-1.5 text-[10px] font-extrabold text-white shadow-sm ring-1 ring-black/10 transition-all"
                      style={{ animation: 's3Btn 4s infinite ease-in-out' }}
                    >
                      套用系統建議分床
                    </button>
                  </div>
                  <div className="flex gap-2 min-h-[46px] items-center border border-dashed border-[#fecdd3] bg-[#fffafa] rounded-xl p-1.5">
                    <span className="text-[9px] font-bold text-[#b3341f] shrink-0">未分配病患：</span>
                    {/* Ghost placeholders where chips are shown initially */}
                    <div className="flex gap-2">
                      <div className="w-[108px] h-[46px] rounded-lg border border-dashed border-slate-200" />
                      <div className="w-[108px] h-[46px] rounded-lg border border-dashed border-slate-200" />
                      <div className="w-[108px] h-[46px] rounded-lg border border-dashed border-slate-200" />
                    </div>
                  </div>
                </div>

                {/* B. Three Lanes */}
                {/* Lane 1 (Lin) */}
                <div className="absolute left-4 top-[116px] w-[162px] h-[148px] bg-white rounded-2xl ring-1 ring-black/5 flex flex-col">
                  <header className="border-b border-black/5 px-2.5 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-[#f1f5f9] text-[9px] font-bold text-slate-700">林</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[10px] font-bold text-slate-900">林O新</div>
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-black/5 relative">
                          <div
                            className="h-full rounded-full bg-[#3d9b5f]"
                            style={{ animation: 's3BarA 4s infinite step-end' }}
                          />
                        </div>
                      </div>
                      <div className="shrink-0 text-right text-[9px] font-bold text-slate-500">
                        <span className="s3-count-lin" />
                        <span className="mx-0.5 text-slate-400">·</span>
                        <span className="s3-val-lin" />
                      </div>
                    </div>
                  </header>
                  <div className="p-2 relative flex-1">
                    <div
                      className="h-full rounded-lg border border-dashed border-black/15 bg-slate-50 flex items-center justify-center text-[9px] text-slate-400 font-medium"
                      style={{ animation: 's3LanePlaceholder 4s infinite step-end' }}
                    >
                      拖入病患
                    </div>
                    {/* Lane A chip */}
                    <div
                      className="absolute inset-y-2 left-1/2 -translate-x-1/2"
                      style={{ animation: 's3LaneChip 4s infinite step-end' }}
                    >
                      <MockChip bedShort="201A" score={3} tone="low" diagnosis="Pneumonia" />
                    </div>
                  </div>
                </div>

                {/* Lane 2 (Hsu) */}
                <div className="absolute left-[198px] top-[116px] w-[162px] h-[148px] bg-white rounded-2xl ring-1 ring-black/5 flex flex-col">
                  <header className="border-b border-black/5 px-2.5 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-[#f1f5f9] text-[9px] font-bold text-slate-700">許</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[10px] font-bold text-slate-900">許O文</div>
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-black/5 relative">
                          <div
                            className="h-full rounded-full bg-[#e85d4a]"
                            style={{ animation: 's3BarB 4s infinite step-end' }}
                          />
                        </div>
                      </div>
                      <div className="shrink-0 text-right text-[9px] font-bold text-slate-500">
                        <span className="s3-count-hsu" />
                        <span className="mx-0.5 text-slate-400">·</span>
                        <span className="s3-val-hsu" />
                      </div>
                    </div>
                  </header>
                  <div className="p-2 relative flex-1">
                    <div
                      className="h-full rounded-lg border border-dashed border-black/15 bg-slate-50 flex items-center justify-center text-[9px] text-slate-400 font-medium"
                      style={{ animation: 's3LanePlaceholder 4s infinite step-end' }}
                    >
                      拖入病患
                    </div>
                    {/* Lane B chip */}
                    <div
                      className="absolute inset-y-2 left-1/2 -translate-x-1/2"
                      style={{ animation: 's3LaneChip 4s infinite step-end' }}
                    >
                      <MockChip bedShort="202B" score={8} tone="high" diagnosis="AMI" />
                    </div>
                  </div>
                </div>

                {/* Lane 3 (Chen) */}
                <div className="absolute left-[380px] top-[116px] w-[162px] h-[148px] bg-white rounded-2xl ring-1 ring-black/5 flex flex-col">
                  <header className="border-b border-black/5 px-2.5 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-[#f1f5f9] text-[9px] font-bold text-slate-700">陳</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[10px] font-bold text-slate-900">陳O琪</div>
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-black/5 relative">
                          <div
                            className="h-full rounded-full bg-[#e8a43a]"
                            style={{ animation: 's3BarC 4s infinite step-end' }}
                          />
                        </div>
                      </div>
                      <div className="shrink-0 text-right text-[9px] font-bold text-slate-500">
                        <span className="s3-count-chen" />
                        <span className="mx-0.5 text-slate-400">·</span>
                        <span className="s3-val-chen" />
                      </div>
                    </div>
                  </header>
                  <div className="p-2 relative flex-1">
                    <div
                      className="h-full rounded-lg border border-dashed border-black/15 bg-slate-50 flex items-center justify-center text-[9px] text-slate-400 font-medium"
                      style={{ animation: 's3LanePlaceholder 4s infinite step-end' }}
                    >
                      拖入病患
                    </div>
                    {/* Lane C chip */}
                    <div
                      className="absolute inset-y-2 left-1/2 -translate-x-1/2"
                      style={{ animation: 's3LaneChip 4s infinite step-end' }}
                    >
                      <MockChip bedShort="203A" score={5} tone="mid" diagnosis="Stroke" />
                    </div>
                  </div>
                </div>

                {/* C. Absolute Flying Chips */}
                <div
                  className="absolute z-20 pointer-events-none"
                  style={{
                    top: '0px',
                    left: '0px',
                    animation: 's3FlyChipA 4s infinite cubic-bezier(0.25, 1, 0.5, 1)',
                  }}
                >
                  <MockChip bedShort="201A" score={3} tone="low" diagnosis="Pneumonia" />
                </div>
                <div
                  className="absolute z-20 pointer-events-none"
                  style={{
                    top: '0px',
                    left: '0px',
                    animation: 's3FlyChipB 4s infinite cubic-bezier(0.25, 1, 0.5, 1)',
                  }}
                >
                  <MockChip bedShort="202B" score={8} tone="high" diagnosis="AMI" />
                </div>
                <div
                  className="absolute z-20 pointer-events-none"
                  style={{
                    top: '0px',
                    left: '0px',
                    animation: 's3FlyChipC 4s infinite cubic-bezier(0.25, 1, 0.5, 1)',
                  }}
                >
                  <MockChip bedShort="203A" score={5} tone="mid" diagnosis="Stroke" />
                </div>

                {/* D. Mouse cursor arrow pointer */}
                <div
                  className="absolute pointer-events-none z-30 w-6 h-6 text-slate-900"
                  style={{
                    top: '0px',
                    left: '0px',
                    animation: 's3Cursor 4s infinite cubic-bezier(0.25, 1, 0.5, 1)',
                  }}
                >
                  <svg fill="currentColor" viewBox="0 0 24 24" className="w-6 h-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]">
                    <path d="M4 2v18l5-5h7.5L4 2z" />
                  </svg>
                </div>
              </div>
            </div>

              <p className="text-xs leading-relaxed text-slate-500 text-center">
                若想節省時間，可以直接點選<strong>「套用系統建議分床」</strong>。系統將根據患者嚴重度、護理負荷與排班狀況，呼叫決策演算法在數秒內自動完成最佳化分床。
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 text-center animate-fadeIn">
              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-slate-900">萬事俱備！</h3>
                <p className="text-sm leading-relaxed text-slate-500 max-w-md mx-auto">
                  分床完成後，請點選右側面板的<strong>「確認送出分床」</strong>。
                  資料將寫入資料庫並同步至戰情室與查看分床結果頁面！
                </p>
                <div className="pt-2 text-xs text-slate-400">
                  提示：如需重溫引導，可以點擊分床畫面上方的「💡 說明引導」按鈕。
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={prevStep}
            disabled={step === 1}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-200 disabled:opacity-0 transition cursor-pointer"
          >
            上一步
          </button>
          
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                  step === i + 1 ? 'w-4 bg-blue-600' : 'bg-slate-300'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={nextStep}
            className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition cursor-pointer"
          >
            {step === totalSteps ? '開始體驗' : '下一步'}
          </button>
        </div>
      </div>
    </div>
  )
}

const MockChip = ({
  bedShort,
  score,
  tone,
  diagnosis,
  fill = false,
}: {
  bedShort: string
  score: number
  tone: 'high' | 'mid' | 'low'
  diagnosis: string
  fill?: boolean
}) => {
  const railClass = {
    high: 'bg-[#e85d4a]',
    mid: 'bg-[#e8a43a]',
    low: 'bg-[#3d9b5f]',
  }
  const chipBg = {
    high: 'bg-[#fff8f6]',
    mid: 'bg-[#fffbf5]',
    low: 'bg-[#f6fbf7]',
  }
  return (
    <div
      className={`group relative flex flex-col overflow-visible rounded-lg ring-1 ring-black/8 ${
        fill ? 'w-full' : 'w-[108px] shrink-0'
      } ${chipBg[tone]}`}
    >
      <span className={`h-1 w-full shrink-0 rounded-t-lg ${railClass[tone]}`} aria-hidden />
      <div className="flex min-w-0 flex-col gap-0.5 px-1.5 py-1">
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          <span className="shrink-0 rounded bg-white/85 px-1 py-px text-[7.5px] font-bold text-slate-700 ring-1 ring-black/8 scale-90 origin-left">
            麻煩度 {score}
          </span>
        </div>
        <div className="text-[10px] font-extrabold leading-none text-slate-900 mt-0.5">{bedShort}</div>
        <div className="truncate text-[8px] font-medium leading-normal text-slate-500">
          {diagnosis}
        </div>
      </div>
    </div>
  )
}
