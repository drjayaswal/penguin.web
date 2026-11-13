import * as React from 'react'

export type ButtonVariant =
  | 'default'
  | 'solid'
  | 'danger'
  | 'normal'
  | 'destructive'

export type ButtonSize = 'sm' | 'md' | 'lg'

export const buttonVariants = ({
  variant = 'default',
  size = 'md',
  className = '',
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
} = {}) => {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium leading-none select-none cursor-pointer transition-all duration-100 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30'

  const sizes: Record<ButtonSize, string> = {
    sm:  'h-8  px-3 text-xs rounded-2xl',
    md:  'h-9  px-4 text-sm rounded-2xl',
    lg:  'h-10 px-5 text-sm rounded-2xl',
  }

  const variants: Record<ButtonVariant, string> = {
    default:
      'bg-white border border-neutral-200 text-neutral-800 shadow-xs hover:bg-neutral-50 hover:border-neutral-300 active:bg-neutral-100',
    solid:
      'bg-neutral-900 text-white border border-neutral-900 hover:bg-black active:bg-neutral-800',
    danger:
      'bg-white border border-neutral-200 text-red-600 shadow-xs hover:bg-red-50 hover:border-red-200 active:bg-red-100',
    normal:
      '!bg-transparent backdrop-blur-xs text-white transition-all duration-200 bg-white !border-0 !outline-0 !ring-0',
    destructive:
      'text-black hover:text-red-600 bg-white border border-gray-200/75 outline-0 ring-0 shadow-md',
  }

  return [base, sizes[size], variants[variant], className].filter(Boolean).join(' ')
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  badge?: React.ReactNode
  badgeColor?: 'blue' | 'orange' | 'green' | 'neutral'
}

const badgeColors = {
  blue:    'bg-blue-600  text-white',
  orange:  'bg-orange-500 text-white',
  green:   'bg-emerald-600 text-white',
  neutral: 'bg-neutral-200 text-neutral-700',
}

export function ButtonBadge({
  children,
  color = 'neutral',
}: {
  children: React.ReactNode
  color?: 'blue' | 'orange' | 'green' | 'neutral'
}) {
  return (
    <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[11px] font-semibold leading-none ${badgeColors[color]}`}>
      {children}
    </span>
  )
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'default',
      size = 'md',
      type = 'button',
      badge,
      badgeColor = 'neutral',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={buttonVariants({ variant, size, className })}
        {...props}
      >
        {children}
        {badge !== undefined && (
          <ButtonBadge color={badgeColor}>{badge}</ButtonBadge>
        )}
      </button>
    )
  }
)
Button.displayName = 'Button'

export type ButtonVariantLegacy = ButtonVariant
export type ButtonSizeLegacy = ButtonSize
