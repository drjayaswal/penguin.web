import { redactSecret } from '@/lib/crypto'
import { AdapterCallParams, AiProviderAdapter, AiProviderError, SummarizeResult } from '@/lib/ai/types'

function extractOpenAiText(content: unknown): string {
  if (typeof content === 'string') {
    return content.trim()
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part
        if (part && typeof part === 'object' && 'text' in part && typeof (part as { text?: unknown }).text === 'string') {
          return (part as { text: string }).text
        }
        return ''
      })
      .join('\n')
      .trim()
  }
  return ''
}

export const openAiCompatibleAdapter: AiProviderAdapter = {
  async summarize({ provider, baseUrl, system, prompt, model, apiKey }: AdapterCallParams): Promise<SummarizeResult> {
    const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }
    if (provider === 'openrouter') {
      headers['X-Title'] = 'Penguin'
    }

    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
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

    const text = extractOpenAiText(data?.choices?.[0]?.message?.content)
    if (!text) {
      throw new AiProviderError(502, 'AI provider returned an empty summary. Please retry.', 502, true)
    }

    const inputTokens = Number(data?.usage?.prompt_tokens ?? 0) || 0
    const outputTokens = Number(data?.usage?.completion_tokens ?? 0) || 0

    return {
      text,
      inputTokens,
      outputTokens,
    }
  },
}

