import { redactSecret } from '@/lib/crypto'
import { AdapterCallParams, AiProviderAdapter, AiProviderError, SummarizeResult } from '@/lib/ai/types'

function extractAnthropicText(content: unknown): string {
  if (!Array.isArray(content)) return ''
  return content
    .filter((block) => block && typeof block === 'object' && (block as { type?: unknown }).type === 'text')
    .map((block) => (typeof (block as { text?: unknown }).text === 'string' ? (block as { text: string }).text : ''))
    .join('\n')
    .trim()
}

export const anthropicAdapter: AiProviderAdapter = {
  async summarize({ baseUrl, system, prompt, model, apiKey }: AdapterCallParams): Promise<SummarizeResult> {
    const url = `${baseUrl.replace(/\/$/, '')}/messages`

    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          system,
          messages: [{ role: 'user', content: prompt }],
        }),
        cache: 'no-store',
      })
    } catch (err) {
      const msg = err instanceof Error ? redactSecret(err.message, apiKey) : 'Network failure'
      throw new AiProviderError(502, `AI provider request failed (${msg}). Please retry.`, null, true)
    }

    if (res.status === 401 || res.status === 403) {
      throw new AiProviderError(400, 'AI provider rejected the key', res.status, false)
    }

    if (res.status === 429 || res.status >= 500) {
      throw new AiProviderError(
        502,
        'AI provider is temporarily rate-limited or unavailable. Please retry.',
        res.status,
        true,
      )
    }

    if (!res.ok) {
      const bodyText = await res.text().catch(() => '')
      let detail = ''
      try {
        const parsed = JSON.parse(bodyText)
        if (typeof parsed?.error?.message === 'string') {
          detail = parsed.error.message
        }
      } catch {
        detail = bodyText.slice(0, 200)
      }
      const safeDetail = redactSecret(detail || `HTTP ${res.status}`, apiKey)
      throw new AiProviderError(400, `AI provider error: ${safeDetail}`, res.status, false)
    }

    let data: any
    try {
      data = await res.json()
    } catch {
      throw new AiProviderError(502, 'AI provider returned an unreadable response. Please retry.', 502, true)
    }

    const text = extractAnthropicText(data?.content)
    if (!text) {
      throw new AiProviderError(502, 'AI provider returned an empty summary. Please retry.', 502, true)
    }

    const inputTokens = Number(data?.usage?.input_tokens ?? 0) || 0
    const outputTokens = Number(data?.usage?.output_tokens ?? 0) || 0

    return {
      text,
      inputTokens,
      outputTokens,
    }
  },
}

