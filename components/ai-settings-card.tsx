'use client'

import { useEffect, useRef, useState } from 'react'
import {
  CheckIcon,
  ChevronDownIcon,
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  SparklesIcon,
  Trash2Icon,
} from 'lucide-react'
import { AI_PROVIDERS, AiProviderId, SUPPORTED_AI_PROVIDER_IDS } from '@/lib/ai/providers'

export interface AiSettingsState {
  configured: boolean
  provider: string | null
  model: string | null
  last4: string | null
}

export interface AiUsageState {
  used: number
  limit: number
  resetsAt: string
}

interface AiSettingsCardProps {
  initialSettings: AiSettingsState
  usage: AiUsageState
  defaultProviderId: AiProviderId
  defaultProviderLabel: string
  defaultModel: string
  onSettingsChange?: (next: AiSettingsState) => void
}

function getProviderLabel(providerId: string | null, fallbackLabel: string): string {
  if (!providerId) return fallbackLabel
  const key = providerId.toLowerCase() as AiProviderId
  return AI_PROVIDERS[key]?.label ?? providerId
}

function toUiModel(model: string | null | undefined, defaultModel: string): string {
  if (!model) return 'Penguin'
  if (model === defaultModel || model === 'llama-3.3-70b-versatile' || model.toLowerCase() === 'penguin') {
    return 'Penguin'
  }
  return model
}

function toApiModel(uiModel: string, provider: AiProviderId, defaultModel: string): string {
  const trimmed = uiModel.trim()
  if (!trimmed || trimmed.toLowerCase() === 'penguin') {
    return provider === 'groq' ? defaultModel : AI_PROVIDERS[provider]?.defaultModel ?? defaultModel
  }
  return trimmed
}

interface ProviderDropdownProps {
  id: string
  value: AiProviderId
  onChange: (next: AiProviderId) => void
}

function ProviderDropdown({ id, value, onChange }: ProviderDropdownProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="h-8 w-full flex items-center justify-between rounded-lg bg-neutral-50/70 px-2.5 text-xs text-black hover:bg-white focus:bg-white focus:outline-none transition-colors cursor-pointer"
      >
        <span className="truncate">{AI_PROVIDERS[value].label}</span>
        <ChevronDownIcon
          className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-labelledby={id}
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg bg-white shadow-lg py-1"
        >
          {SUPPORTED_AI_PROVIDER_IDS.map((optionId) => {
            const selected = optionId === value
            return (
              <li key={optionId} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(optionId)
                    setOpen(false)
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-left cursor-pointer transition-colors ${selected ? 'bg-neutral-100 text-black' : 'text-neutral-700 hover:bg-neutral-50'
                    }`}
                >
                  <span>{AI_PROVIDERS[optionId].label}</span>
                  {selected && <CheckIcon className="w-3.5 h-3.5" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function AiSettingsCard({
  initialSettings,
  usage,
  defaultProviderId,
  defaultProviderLabel,
  defaultModel,
  onSettingsChange,
}: AiSettingsCardProps) {
  const [settings, setSettings] = useState<AiSettingsState>(initialSettings)
  const initialProvider =
    (initialSettings.provider as AiProviderId | null) ?? defaultProviderId
  const initialModelValue = toUiModel(
    initialSettings.model ??
    (initialProvider === defaultProviderId
      ? defaultModel
      : AI_PROVIDERS[initialProvider]?.defaultModel ?? defaultModel),
    defaultModel,
  )

  const [provider, setProvider] = useState<AiProviderId>(initialProvider)
  const [model, setModel] = useState<string>(initialModelValue)
  const [apiKey, setApiKey] = useState<string>('')
  const [showKey, setShowKey] = useState<boolean>(false)
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  function handleProviderChange(nextProvider: AiProviderId) {
    setProvider(nextProvider)
    if (nextProvider === 'groq') {
      setModel('Penguin')
    } else {
      setModel(AI_PROVIDERS[nextProvider]?.defaultModel ?? '')
    }
    setStatusMessage(null)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!apiKey.trim()) {
      setStatusMessage({ type: 'error', text: 'API key is required.' })
      return
    }

    setIsSaving(true)
    setStatusMessage(null)

    const finalModel = toApiModel(model, provider, defaultModel)

    try {
      const res = await fetch('/api/me/ai-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          model: finalModel,
          apiKey: apiKey.trim(),
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setStatusMessage({
          type: 'error',
          text: data?.error || 'Failed to save AI settings.',
        })
        return
      }

      const updated: AiSettingsState = {
        configured: true,
        provider: data.provider,
        model: data.model,
        last4: data.last4,
      }
      setSettings(updated)
      setModel(toUiModel(data.model, defaultModel))
      setApiKey('')
      setShowKey(false)
      setStatusMessage({
        type: 'success',
        text: `Saved ${getProviderLabel(data.provider, data.provider)} key ending in ••••${data.last4}.`,
      })
      onSettingsChange?.(updated)
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Network error while saving AI settings.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    setStatusMessage(null)

    try {
      const res = await fetch('/api/me/ai-settings', {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setStatusMessage({
          type: 'error',
          text: data?.error || 'Failed to remove saved API key.',
        })
        return
      }

      const next: AiSettingsState = {
        configured: false,
        provider: null,
        model: null,
        last4: null,
      }
      setSettings(next)
      setProvider(defaultProviderId)
      setModel('Penguin')
      setApiKey('')
      setShowKey(false)
      setStatusMessage({
        type: 'success',
        text: `Removed saved key. Using default (${defaultProviderLabel}).`,
      })
      onSettingsChange?.(next)
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Network error while removing API key.',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="rounded-2xl bg-white overflow-visible transition-all duration-200">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setIsOpen((prev) => !prev)
          }
        }}
        className="flex items-center justify-between p-3.5 px-4 cursor-pointer select-none hover:bg-neutral-50/50 transition-colors rounded-2xl"
      >
        <div className="flex items-center gap-2 min-w-0">
          <SparklesIcon className="w-5 h-5 text-white fill-blue-600 shrink-0" />
          <h2 id="ai-settings-heading" className="text-sm font-semibold text-black shrink-0">
            AI Summaries
          </h2>
          <span className="text-neutral-300 shrink-0">·</span>
          {settings.configured ? (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded-md truncate">
              <KeyRoundIcon className="w-3 h-3 shrink-0" />
              <span>
                {getProviderLabel(settings.provider, 'Custom')} · ••••{settings.last4}
              </span>
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {settings.configured && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleDelete()
              }}
              disabled={isDeleting}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500 hover:text-red-600 disabled:opacity-50 transition-colors cursor-pointer px-1.5 py-0.5 rounded"
            >
              <Trash2Icon className="w-3 h-3" />
              <span>{isDeleting ? 'Removing...' : 'Remove'}</span>
            </button>
          )}
          <span className="text-xs font-medium text-neutral-500 hidden sm:inline">
            {settings.configured ? (isOpen ? 'Done' : 'Edit') : (isOpen ? 'Close' : 'Add')}
          </span>
          <ChevronDownIcon
            className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-black' : ''
              }`}
          />
        </div>
      </div>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-in-out motion-reduce:transition-none ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
          }`}
      >
        <div className="min-h-0">
          <form
            onSubmit={handleSave}
            onClick={(e) => e.stopPropagation()}
            aria-labelledby="ai-settings-heading"
            autoComplete="off"
            className="p-4 pt-3 flex flex-col gap-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
              <div className="flex flex-col gap-1">
                <label htmlFor="ai-provider" className="text-[11px] font-medium text-neutral-600">
                  Provider
                </label>
                <ProviderDropdown
                  id="ai-provider"
                  value={provider}
                  onChange={handleProviderChange}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="ai-model" className="text-[11px] font-medium text-neutral-600">
                  Model
                </label>
                <input
                  id="ai-model"
                  name="ai-model-field-x7"
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={provider === 'groq' ? 'Penguin' : AI_PROVIDERS[provider]?.defaultModel}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-form-type="other"
                  data-lpignore="true"
                  className="h-8 rounded-lg bg-neutral-50/70 px-2.5 text-xs font-mono text-black placeholder:text-neutral-400 focus:bg-white focus:outline-none transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="ai-api-key" className="text-[11px] font-medium text-neutral-600">
                  API Key
                </label>
                <div className="relative flex items-center">
                  <input
                    id="ai-api-key"
                    name="ai-key-field-x7"
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value)
                      if (statusMessage?.type === 'error') setStatusMessage(null)
                    }}
                    placeholder={settings.configured ? `••••${settings.last4}` : 'Enter API key'}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    data-form-type="other"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    aria-invalid={statusMessage?.type === 'error' ? 'true' : undefined}
                    aria-describedby="ai-key-help"
                    className="h-8 w-full rounded-lg bg-neutral-50/70 pl-2.5 pr-8 text-xs font-mono text-black placeholder:text-neutral-400 focus:bg-white focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((prev) => !prev)}
                    aria-pressed={showKey}
                    aria-label={showKey ? 'Hide API key' : 'Show API key'}
                    className="absolute right-2 p-1 text-neutral-400 hover:text-black cursor-pointer"
                  >
                    {showKey ? <EyeOffIcon className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="h-8 w-full px-4 rounded-lg text-xs font-medium bg-black text-white hover:bg-neutral-800 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save AI Key'}
              </button>
            </div>

            {statusMessage && (
              <p
                role="status"
                aria-live="polite"
                className={`text-xs px-2.5 py-1.5 rounded-lg ${statusMessage.type === 'error'
                  ? 'bg-red-50/50 text-red-700'
                  : 'bg-neutral-50 text-neutral-700'
                  }`}
              >
                {statusMessage.text}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}