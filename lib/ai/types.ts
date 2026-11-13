import { AiProviderId } from '@/lib/ai/providers'

export interface SummarizeParams {
  system: string
  prompt: string
  model: string
  apiKey: string
}

export interface SummarizeResult {
  text: string
  inputTokens: number
  outputTokens: number
}

export interface AdapterCallParams extends SummarizeParams {
  provider: AiProviderId
  baseUrl: string
}

export type AiProviderAdapter = {
  summarize(params: AdapterCallParams): Promise<SummarizeResult>
}

export class AiProviderError extends Error {
  httpStatus: number
  upstreamStatus: number | null
  retryable: boolean

  constructor(
    httpStatus: number,
    message: string,
    upstreamStatus: number | null = null,
    retryable = false,
  ) {
    super(message)
    this.httpStatus = httpStatus
    this.upstreamStatus = upstreamStatus
    this.retryable = retryable
    this.name = 'AiProviderError'
  }
}

