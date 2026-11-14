'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ChevronDownIcon,
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  RefreshCwIcon,
  SparklesIcon,
  Trash2Icon,
  XIcon,
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

interface AiSettingsSheetProps {
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

  const otherOptions = SUPPORTED_AI_PROVIDER_IDS.filter((optionId) => optionId !== value)

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={`h-9 w-full flex items-center justify-between bg-white/10 backdrop-blur-sm px-3 text-xs text-white transition-all duration-300 cursor-pointer border border-white/15 ${open ? 'rounded-t-xl' : 'rounded-xl'}`}
      >
        <span className="truncate">{AI_PROVIDERS[value].label}</span>
        <ChevronDownIcon
          className={`w-3.5 h-3.5 text-white/70 transition-transform duration-200 ${open ? 'rotate-180 text-white' : ''}`}
        />
      </button>

      {open && otherOptions.length > 0 && (
        <ul
          role="listbox"
          aria-labelledby={id}
          className="absolute left-0 w-full top-full z-[100] overflow-y-auto max-h-24 rounded-b-xl bg-white shadow-2xl py-1"
        >
          {otherOptions.map((optionId) => (
            <li key={optionId} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => {
                  onChange(optionId)
                  setOpen(false)
                }}
                className="w-full flex items-center px-3 py-1.5 text-xs text-left text-black hover:bg-blue-600 hover:text-white cursor-pointer transition-colors"
              >
                <span>{AI_PROVIDERS[optionId].label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function AiSettingsSheet({
  initialSettings,
  usage,
  defaultProviderId,
  defaultProviderLabel,
  defaultModel,
  onSettingsChange,
}: AiSettingsSheetProps) {
  const [settings, setSettings] = useState<AiSettingsState>(initialSettings)
  const initialProvider =
    (initialSettings.provider as AiProviderId | null) ?? defaultProviderId
  const initialModelValue =
    initialSettings.model ??
    (initialProvider === defaultProviderId
      ? defaultModel
      : AI_PROVIDERS[initialProvider]?.defaultModel ?? defaultModel)

  const [provider, setProvider] = useState<AiProviderId>(initialProvider)
  const [model, setModel] = useState<string>(initialModelValue)
  const [apiKey, setApiKey] = useState<string>('')
  const [showKey, setShowKey] = useState<boolean>(false)
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [mounted, setMounted] = useState<boolean>(false)
  const [animating, setAnimating] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  useEffect(() => {
    if (!statusMessage) return
    const timer = setTimeout(() => {
      setStatusMessage(null)
    }, 4000)
    return () => clearTimeout(timer)
  }, [statusMessage])

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      const timer = setTimeout(() => setAnimating(true), 10)
      return () => clearTimeout(timer)
    } else {
      setAnimating(false)
      const timer = setTimeout(() => setMounted(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  function handleProviderChange(nextProvider: AiProviderId) {
    setProvider(nextProvider)
    setModel(AI_PROVIDERS[nextProvider]?.defaultModel ?? '')
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

    const finalModel = model.trim() || AI_PROVIDERS[provider]?.defaultModel || defaultModel

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
      setModel(data.model)
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
      setModel(defaultModel)
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
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 backdrop-blur-md text-white transition-all duration-200 cursor-pointer shadow-sm text-sm font-medium"
      >
        <span className="text-white">Configurations</span>
        {settings.configured && (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
        )}
      </button>

      {mounted && (
        <div
          onClick={() => setIsOpen(false)}
          className={`fixed inset-0 z-50 flex justify-end items-end sm:items-stretch bg-black/50 backdrop-blur-md transition-opacity duration-300 ${animating ? 'opacity-100' : 'opacity-0'
            }`}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-settings-sheet-title"
            onClick={(e) => e.stopPropagation()}
            className={`w-full sm:w-[420px] max-h-[85vh] sm:max-h-full sm:h-full bg-white/5 backdrop-blur-2xl rounded-t-4xl sm:rounded-none shadow-2xl p-5 sm:p-6 flex flex-col gap-5 transform transition-all duration-300 ease-out overflow-y-auto ${animating
                ? 'translate-y-0 sm:translate-x-0'
                : 'translate-y-full sm:translate-y-0 sm:translate-x-full'
              }`}
          >
            <div className="flex items-start justify-between gap-3 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <SparklesIcon className="w-4 h-4 text-transparent fill-white" />
                </div>
                <div>
                  <h2 id="ai-settings-sheet-title" className="text-sm font-semibold text-white leading-tight">
                    AI Configurations
                  </h2>
                  <p className="text-xs text-white/70 mt-0.5">
                    Customize your AI provider & models
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl p-3 bg-white/5 flex items-center justify-between gap-3 text-xs text-white/80">
              <div className="min-w-0">
                <p className="font-medium text-white">
                  {settings.configured
                    ? `${getProviderLabel(settings.provider, 'Custom')} (Active)`
                    : `Penguin`}
                </p>
                <p className="text-[11px] text-white/60 truncate mt-0.5">
                  {settings.configured
                    ? `••••••••••••••••${settings.last4}`
                    : `${usage.used} of ${usage.limit} daily summaries used`}
                </p>
              </div>
              {settings.configured && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-white/60 hover:text-white disabled:opacity-50 transition-colors cursor-pointer px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 shrink-0"
                >
                  <Trash2Icon className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'Removing...' : 'Remove'}</span>
                </button>
              )}
            </div>

            <form onSubmit={handleSave} autoComplete="off" className="flex flex-col gap-4 flex-1">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ai-sheet-provider" className="text-xs font-medium text-white/80">
                  Provider
                </label>
                <ProviderDropdown
                  id="ai-sheet-provider"
                  value={provider}
                  onChange={handleProviderChange}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="ai-sheet-model" className="text-xs font-medium text-white/80">
                  Model
                </label>
                <input
                  id="ai-sheet-model"
                  name="ai-model-field-x7"
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={AI_PROVIDERS[provider]?.defaultModel}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-form-type="other"
                  data-lpignore="true"
                  className="h-9 rounded-xl bg-white/10 backdrop-blur-sm px-3 text-xs  text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/30 border border-white/15 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="ai-sheet-api-key" className="text-xs font-medium text-white/80">
                  API Key
                </label>
                <div className="relative flex items-center">
                  <input
                    id="ai-sheet-api-key"
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
                    aria-describedby="ai-sheet-key-help"
                    className="h-9 w-full rounded-xl bg-white/10 backdrop-blur-sm pl-3 pr-9 text-xs  text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/30 border border-white/15 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((prev) => !prev)}
                    aria-pressed={showKey}
                    aria-label={showKey ? 'Hide API key' : 'Show API key'}
                    className="absolute right-2.5 p-1 text-white/60 hover:text-white cursor-pointer"
                  >
                    {showKey ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 mt-auto flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer shadow-md"
                >
                  {isSaving ? (
                    <RefreshCwIcon className="w-4 h-4 animate-spin" />
                  ) : (
                    <KeyRoundIcon className="w-4 h-4" />
                  )}
                  <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
                </button>

                {statusMessage && (
                  <p
                    role="status"
                    aria-live="polite"
                    className={`text-xs px-3 py-2 rounded-xl border backdrop-blur-sm ${statusMessage.type === 'error'
                        ? 'border-red-400/40 bg-red-500/20 text-red-200'
                        : 'border-white/20 bg-white/15 text-white'
                      }`}
                  >
                    {statusMessage.text}
                  </p>
                )}
              </div>
            </form>
          </aside>
        </div>
      )}
    </>
  )
}
