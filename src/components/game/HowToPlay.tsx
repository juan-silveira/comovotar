import { lowerFirst } from '../../lib/format'
import { useEffect, useRef, useState } from 'react'
import { ROLES } from '../../model/roles'
import type { Office } from '../../model/bills'

const KEY = 'sdr.howto.seen'

export function howToSeen(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return true
  }
}

/** Guia de 4 passos, mostrado na primeira partida e reaberto pelo botão "Como jogar". */
export function HowToPlay({ open, office, onClose }: { open: boolean; office: Office | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [step, setStep] = useState(0)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      setStep(0)
      d.showModal()
    }
    if (!open && d.open) d.close()
  }, [open])
  const role = office ? ROLES[office] : null
  const steps = [
    {
      icon: '🎯',
      title: role ? `Você é ${lowerFirst(role.title)}` : 'Seu papel',
      text: role
        ? `Você atua no ${role.body}. ${role.can[0]} Mas há limites: ${lowerFirst(role.cannot[0])}`
        : 'Cada cargo tem poderes e limites definidos pela Constituição.',
    },
    {
      icon: '🗓',
      title: 'Cada turno é um ano',
      text: 'No início de cada ano chegam cartas com decisões: votações, crises, propostas do governo, perguntas. Escolha uma opção em cada carta; depois toque em “Próximo turno” para ver o que aconteceu.',
    },
    {
      icon: '📊',
      title: 'Acompanhe o país',
      text: 'Na aba País, cada indicador mostra se está bom, em atenção ou ruim. Toque nele para entender o que é, o que ele afeta e do que depende. O mapa mostra as diferenças entre os estados.',
    },
    {
      icon: '⚖',
      title: 'Querer não basta',
      text: 'Para mudar algo, proponha um projeto de lei: ele passa por comissões, plenário, outra casa, sanção ou veto e pode ser barrado no STF. Adversários podem votar contra uma boa ideia só por estratégia. Sua popularidade e seu capital político decidem até onde você chega, e a reeleição.',
    },
  ]
  const s = steps[step]
  const close = () => {
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      // ignorado
    }
    onClose()
  }
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      aria-labelledby="howto-title"
      className="m-auto w-[min(480px,calc(100vw-24px))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/60"
    >
      <div className="p-6 text-center">
        <div className="text-5xl" aria-hidden>
          {s.icon}
        </div>
        <h2 id="howto-title" className="mt-3 text-lg font-bold">
          {s.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">{s.text}</p>
        <div className="mt-4 flex justify-center gap-1.5" aria-hidden>
          {steps.map((_, i) => (
            <span key={i} className={`h-1.5 w-6 rounded-full ${i === step ? 'bg-accent' : 'bg-surface-2'}`} />
          ))}
        </div>
        <div className="mt-5 flex justify-between gap-2">
          <button type="button" onClick={close} className="min-h-11 px-3 text-sm text-ink-2 underline">
            Pular
          </button>
          <button
            type="button"
            onClick={() => (step < steps.length - 1 ? setStep(step + 1) : close())}
            className="min-h-11 rounded-xl bg-accent px-6 text-sm font-bold text-accent-ink"
          >
            {step < steps.length - 1 ? 'Próximo' : 'Começar'}
          </button>
        </div>
        <p className="mt-4 text-[11px] text-muted">Exercício hipotético e educacional. A Constituição define a federação como indissolúvel.</p>
      </div>
    </dialog>
  )
}
