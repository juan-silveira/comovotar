// Assistente de IA opcional, com vários provedores. A chave do jogador fica
// SOMENTE no navegador (localStorage) e as chamadas vão direto do navegador
// para o provedor escolhido: nada passa por servidor do jogo nem é salvo no
// Firebase. O jogo funciona inteiramente sem IA.

import { z } from 'zod'

export type AiProvider = 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'compat'

export interface AiSettings {
  provider: AiProvider
  apiKey: string
  model: string
  /** Endereço base para provedores compatíveis com a API da OpenAI */
  baseUrl: string
}

export const PROVIDERS: Record<AiProvider, { label: string; model: string; baseUrl: string; keyUrl: string; note: string }> = {
  gemini: {
    label: 'Google Gemini',
    model: 'gemini-2.5-flash',
    baseUrl: '',
    keyUrl: 'https://aistudio.google.com/apikey',
    note: 'Tem plano gratuito no Google AI Studio.',
  },
  openai: {
    label: 'OpenAI',
    model: 'gpt-4.1-mini',
    baseUrl: 'https://api.openai.com/v1',
    keyUrl: 'https://platform.openai.com/api-keys',
    note: 'Confira na sua conta os modelos disponíveis e edite o nome se necessário.',
  },
  anthropic: {
    label: 'Anthropic (Claude)',
    model: 'claude-opus-5',
    baseUrl: '',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    note: 'Usa o SDK oficial da Anthropic, chamado direto do navegador.',
  },
  deepseek: {
    label: 'DeepSeek',
    model: 'deepseek-chat',
    baseUrl: 'https://api.deepseek.com',
    keyUrl: 'https://platform.deepseek.com/api_keys',
    note: 'API compatível com a da OpenAI.',
  },
  compat: {
    label: 'Outro (compatível com OpenAI)',
    model: '',
    baseUrl: 'https://openrouter.ai/api/v1',
    keyUrl: 'https://openrouter.ai/keys',
    note: 'OpenRouter, Groq, Mistral, Ollama local etc. Informe o endereço base e o nome do modelo.',
  },
}

const KEY = 'sdr.ai'

export function loadAi(): AiSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as AiSettings
    // Migração da versão que só tinha Gemini.
    const legacy = localStorage.getItem('sdr.gemini.key')
    if (legacy)
      return { provider: 'gemini', apiKey: legacy, model: localStorage.getItem('sdr.gemini.model') || PROVIDERS.gemini.model, baseUrl: '' }
  } catch {
    // ignorado
  }
  return { provider: 'gemini', apiKey: '', model: PROVIDERS.gemini.model, baseUrl: '' }
}

export function saveAi(s: AiSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
    localStorage.removeItem('sdr.gemini.key')
    localStorage.removeItem('sdr.gemini.model')
  } catch {
    // ignorado
  }
}

export function clearAi() {
  try {
    localStorage.removeItem(KEY)
    localStorage.removeItem('sdr.gemini.key')
  } catch {
    // ignorado
  }
}

export function aiConfigured(): boolean {
  const s = loadAi()
  return !!s.apiKey && !!s.model
}

export interface ChatMessage {
  role: 'user' | 'model'
  text: string
}

class AiError extends Error {}

/** Conversa livre. */
export async function aiChat(history: ChatMessage[], system: string): Promise<string> {
  const s = loadAi()
  if (!s.apiKey) throw new AiError('Configure um provedor de IA e a sua chave na página Assistente.')
  switch (s.provider) {
    case 'gemini':
      return geminiCall(s, system, history, false)
    case 'anthropic':
      return anthropicChat(s, system, history)
    default:
      return openAiCompatCall(s, system, history, false)
  }
}

/** Resposta estruturada, validada contra o schema (uma nova tentativa se vier inválida). */
export async function aiStructured<T extends z.ZodType>(system: string, user: string, schema: T): Promise<z.infer<T>> {
  const s = loadAi()
  if (!s.apiKey) throw new AiError('Configure um provedor de IA e a sua chave na página Assistente.')
  if (s.provider === 'anthropic') return anthropicStructured(s, system, user, schema)
  const jsonSchema = JSON.stringify(z.toJSONSchema(schema))
  const sys = `${system}\n\nResponda APENAS com um objeto JSON válido que siga este JSON Schema:\n${jsonSchema}`
  let prompt = user
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw =
      s.provider === 'gemini'
        ? await geminiCall(s, sys, [{ role: 'user', text: prompt }], true)
        : await openAiCompatCall(s, sys, [{ role: 'user', text: prompt }], true)
    const parsed = safeJson(raw)
    const result = schema.safeParse(parsed)
    if (result.success) return result.data
    prompt = `${user}\n\nSua resposta anterior não seguiu o schema (${result.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ')}). Responda de novo, só com o JSON.`
  }
  throw new AiError('A IA não devolveu uma resposta no formato esperado. Tente de novo ou use o formulário sem IA.')
}

function safeJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  try {
    return JSON.parse(t)
  } catch {
    const m = t.match(/\{[\s\S]*\}/)
    if (m) {
      try {
        return JSON.parse(m[0])
      } catch {
        return null
      }
    }
    return null
  }
}

// Gemini ------------------------------------------------------------------------------

async function geminiCall(s: AiSettings, system: string, history: ChatMessage[], json: boolean): Promise<string> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(s.model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': s.apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
      generationConfig: { temperature: 0.4, maxOutputTokens: 8192, ...(json ? { responseMimeType: 'application/json' } : {}) },
    }),
  })
  if (!res.ok) throw new AiError(httpMessage('Gemini', res.status, await res.text()))
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') || ''
}

// OpenAI e compatíveis (DeepSeek, OpenRouter, Groq, Ollama…) ---------------------------------

async function openAiCompatCall(s: AiSettings, system: string, history: ChatMessage[], json: boolean): Promise<string> {
  const base = (s.baseUrl || PROVIDERS[s.provider].baseUrl).replace(/\/$/, '')
  if (!base) throw new AiError('Informe o endereço base da API.')
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.apiKey}` },
    body: JSON.stringify({
      model: s.model,
      messages: [
        { role: 'system', content: system },
        ...history.map((m) => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.text })),
      ],
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
  })
  if (!res.ok) throw new AiError(httpMessage(PROVIDERS[s.provider].label, res.status, await res.text()))
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  return data.choices?.[0]?.message?.content ?? ''
}

// Anthropic (SDK oficial, carregado só quando usado) ---------------------------------------------

/** Fallback no servidor em caso de recusa, para os modelos que o suportam. */
function fallbackParams(model: string) {
  return model === 'claude-opus-5' || model === 'claude-fable-5-1'
    ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
    : {}
}

async function anthropicClient(s: AiSettings) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  // A chave é do próprio jogador e fica no navegador dele; por isso o uso direto no navegador.
  return { Anthropic, client: new Anthropic({ apiKey: s.apiKey, dangerouslyAllowBrowser: true }) }
}

async function anthropicChat(s: AiSettings, system: string, history: ChatMessage[]): Promise<string> {
  const { Anthropic, client } = await anthropicClient(s)
  try {
    const response = await client.beta.messages.create({
      model: s.model,
      max_tokens: 16000,
      system,
      messages: history.map((m) => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.text })),
      ...fallbackParams(s.model),
    })
    if (response.stop_reason === 'refusal') throw new AiError('O modelo recusou responder a esta pergunta.')
    return response.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
  } catch (e) {
    throw anthropicError(Anthropic, e)
  }
}

async function anthropicStructured<T extends z.ZodType>(s: AiSettings, system: string, user: string, schema: T): Promise<z.infer<T>> {
  const { Anthropic, client } = await anthropicClient(s)
  const { zodOutputFormat } = await import('@anthropic-ai/sdk/helpers/zod')
  try {
    const response = await client.beta.messages.parse({
      model: s.model,
      max_tokens: 16000,
      system,
      messages: [{ role: 'user', content: user }],
      output_config: { format: zodOutputFormat(schema) },
      ...fallbackParams(s.model),
    })
    if (response.stop_reason === 'refusal') throw new AiError('O modelo recusou analisar esta proposta.')
    if (!response.parsed_output) throw new AiError('A resposta não pôde ser interpretada. Tente de novo.')
    return response.parsed_output as z.infer<T>
  } catch (e) {
    throw anthropicError(Anthropic, e)
  }
}

function anthropicError(Anthropic: typeof import('@anthropic-ai/sdk').default, e: unknown): Error {
  if (e instanceof AiError) return e
  if (e instanceof Anthropic.AuthenticationError) return new AiError('Chave da Anthropic inválida.')
  if (e instanceof Anthropic.RateLimitError) return new AiError('Limite de uso da Anthropic atingido. Tente em instantes.')
  if (e instanceof Anthropic.NotFoundError) return new AiError('Modelo não encontrado na sua conta da Anthropic. Confira o nome.')
  if (e instanceof Anthropic.BadRequestError) return new AiError(`Requisição recusada pela Anthropic: ${e.message}`)
  if (e instanceof Anthropic.APIError) return new AiError(`Erro da Anthropic (${e.status}): ${e.message}`)
  return e instanceof Error ? e : new AiError(String(e))
}

function httpMessage(provider: string, status: number, body: string): string {
  if (status === 401 || status === 403 || (status === 400 && /api key/i.test(body))) return `${provider}: chave inválida ou sem permissão.`
  if (status === 404) return `${provider}: modelo ou endereço não encontrado. Confira o nome do modelo.`
  if (status === 429) return `${provider}: limite de uso atingido. Tente em instantes.`
  return `${provider} respondeu ${status}: ${body.slice(0, 160)}`
}
