import { anthropicAdapter } from '@/lib/ai/adapters/anthropic'
import { openAiCompatibleAdapter } from '@/lib/ai/adapters/openai-compatible'
import {
  AI_PROVIDERS,
  AiAdapterType,
  AiProviderDefinition,
  AiProviderId,
  SUPPORTED_AI_PROVIDER_IDS,
} from '@/lib/ai/providers'
import { AiProviderAdapter, SummarizeParams, SummarizeResult } from '@/lib/ai/types'

const ADAPTERS: Record<AiAdapterType, AiProviderAdapter> = {
  'openai-compatible': openAiCompatibleAdapter,
  anthropic: anthropicAdapter,
}

export interface RegisteredAiProvider extends AiProviderDefinition {
  adapter: AiProviderAdapter
}

export function isSupportedAiProvider(provider: string): provider is AiProviderId {
  return Object.prototype.hasOwnProperty.call(AI_PROVIDERS, provider.trim().toLowerCase())
}

export function getAiProvider(providerName: string): RegisteredAiProvider {
  const normalized = (providerName ?? '').trim().toLowerCase()
  if (!isSupportedAiProvider(normalized)) {
    throw new Error(
      `Unknown AI provider "${providerName}". Supported providers: ${SUPPORTED_AI_PROVIDER_IDS.join(', ')}.`,
    )
  }
  const definition = AI_PROVIDERS[normalized]
  return {
    ...definition,
    adapter: ADAPTERS[definition.adapterType],
  }
}

export function getDefaultModelForProvider(providerId: AiProviderId): string {
  const rawDefaultProvider = process.env.DEFAULT_PROVIDER?.trim().toLowerCase() || 'groq'
  const envDefaultModel = process.env.DEFAULT_AI_MODEL?.trim()
  if (envDefaultModel && providerId === rawDefaultProvider) {
    return envDefaultModel
  }
  return AI_PROVIDERS[providerId].defaultModel
}

export async function summarizeWithProvider(
  providerName: string,
  params: SummarizeParams,
): Promise<SummarizeResult> {
  const provider = getAiProvider(providerName)
  return provider.adapter.summarize({
    ...params,
    provider: provider.id,
    baseUrl: provider.baseUrl,
  })
}

