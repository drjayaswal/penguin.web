import * as React from 'react'

interface ButtonGroupProps {
  children: React.ReactNode
  className?: string
}

function ButtonGroupRoot({ children, className = '' }: ButtonGroupProps) {
  return (
    <div
      className={`inline-flex items-stretch rounded-xl bg-white border border-neutral-200 shadow-xs overflow-hidden ${className}`}
    >
      {children}
    </div>
  )
}

interface ButtonGroupItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ComponentType<{ className?: string }>
  active?: boolean
  danger?: boolean
  badge?: React.ReactNode
  badgeColor?: 'blue' | 'orange' | 'green' | 'neutral'
  href?: string
  target?: string
  rel?: string
}

const badgeColors = {
  blue:    'bg-blue-600  text-white',
  orange:  'bg-orange-500 text-white',
  green:   'bg-emerald-600 text-white',
  neutral: 'bg-neutral-200 text-neutral-700',
}

function ButtonGroupItem({
  icon: Icon,
  active = false,
  danger = false,
  badge,
  badgeColor = 'neutral',
  children,
  className = '',
  type = 'button',
  href,
  target,
  rel,
  ...props
}: ButtonGroupItemProps) {
  const base =
    'relative inline-flex items-center justify-center gap-2 px-4 h-9 text-sm font-medium leading-none select-none cursor-pointer transition-all duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/30 disabled:opacity-50 disabled:pointer-events-none not-first:border-l not-first:border-neutral-200'

  const stateClasses = active
    ? 'bg-neutral-900 text-white'
    : danger
      ? 'text-red-600 hover:bg-red-50'
      : 'text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100'

  const inner = (
    <>
      {Icon && <Icon className="w-4 h-4 shrink-0" />}
      {children && <span>{children}</span>}
      {badge !== undefined && (
        <span
          className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[11px] font-semibold leading-none ${badgeColors[badgeColor]}`}
        >
          {badge}
        </span>
      )}
    </>
  )

  const cls = [base, stateClasses, className].filter(Boolean).join(' ')

  if (href) {
    return (
      <a href={href} target={target} rel={rel} className={cls}>
        {inner}
      </a>
    )
  }

  return (
    <button type={type} className={cls} {...props}>
      {inner}
    </button>
  )
}

function ButtonGroupDivider() {
  return <div className="w-px self-stretch bg-neutral-200" />
}

export const ButtonGroup = Object.assign(ButtonGroupRoot, {
  Item: ButtonGroupItem,
  Divider: ButtonGroupDivider,
})
