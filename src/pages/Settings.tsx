import { Card } from '../components/ui'
import { playCue, useSettings, type Settings as S } from '../lib/settings'

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-2">
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="block text-xs text-ink-2">{hint}</span>
      </span>
      <input type="checkbox" className="mt-1 size-5 shrink-0 accent-[var(--accent)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <fieldset className="py-2">
      <legend className="text-sm font-semibold text-ink">{label}</legend>
      <div className="mt-1 flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={`min-h-10 rounded-full border px-4 text-sm ${value === o.value ? 'border-accent bg-accent text-accent-ink' : 'border-line text-ink'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export function Settings() {
  const [s, set] = useSettings()
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold text-ink">Configurações</h1>
      <Card title="Leitura e acessibilidade">
        <Choice<S['textSize']>
          label="Tamanho do texto"
          value={s.textSize}
          onChange={(v) => set({ textSize: v })}
          options={[
            { value: 'normal', label: 'Normal' },
            { value: 'grande', label: 'Grande' },
            { value: 'maior', label: 'Maior' },
          ]}
        />
        <Toggle label="Alto contraste" hint="Textos secundários e bordas com a cor principal, para ler melhor." checked={s.contrast === 'alto'} onChange={(v) => set({ contrast: v ? 'alto' : 'normal' })} />
        <Toggle label="Leitura fácil" hint="Fonte de alta legibilidade (Atkinson Hyperlegible) e mais espaço entre linhas e letras." checked={s.easyReading} onChange={(v) => set({ easyReading: v })} />
        <Toggle label="Menos animações" hint="Desliga animações e transições, como o plenário acendendo e os carimbos." checked={s.reduceMotion} onChange={(v) => set({ reduceMotion: v })} />
      </Card>
      <Card title="Sons e vibração">
        <Toggle
          label="Sons"
          hint="Sons curtos ao decidir, ganhar conquistas e em resultados de eleição."
          checked={s.sound}
          onChange={(v) => {
            set({ sound: v })
            if (v) setTimeout(() => playCue('success'), 50)
          }}
        />
        <Toggle label="Vibração (celular)" hint="Vibra levemente ao decidir e em momentos importantes." checked={s.vibration} onChange={(v) => set({ vibration: v })} />
      </Card>
      <Card title="Privacidade">
        <Toggle
          label="Enviar estatísticas anônimas"
          hint="Contagens diárias sem identificação (por exemplo, quantas propostas ilícitas foram recusadas) e erros de página, para melhorar o jogo. Os totais são públicos na página “Como as pessoas jogam”."
          checked={s.analytics}
          onChange={(v) => set({ analytics: v })}
        />
      </Card>
      <p className="text-xs text-muted">As preferências ficam salvas só neste navegador. O tema claro ou escuro muda pelo botão no topo.</p>
    </div>
  )
}
