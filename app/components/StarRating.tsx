'use client'

import * as React from 'react'

type StarRatingProps = {
  value: number
  onChange?: (value: number) => void
  max?: number
  readOnly?: boolean
  size?: number
  className?: string
  label?: string
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export default function StarRating({
  value,
  onChange,
  max = 5,
  readOnly = false,
  size = 24,
  className = '',
  label,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null)
  const displayValue = hoverValue ?? value

  const handleSelect = (v: number) => {
    if (readOnly) return
    onChange?.(clamp(v, 1, max))
  }

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      {label ? <span className="text-sm text-gray-600">{label}</span> : null}

      <div className="inline-flex items-center gap-1" role="radiogroup" aria-label={label ?? 'Rating'}>
        {Array.from({ length: max }).map((_, i) => {
          const starValue = i + 1
          const filled = starValue <= displayValue

          return (
            <button
              key={starValue}
              type="button"
              role="radio"
              aria-checked={value === starValue}
              aria-label={`${starValue} star${starValue === 1 ? '' : 's'}`}
              disabled={readOnly}
              onClick={() => handleSelect(starValue)}
              onMouseEnter={() => !readOnly && setHoverValue(starValue)}
              onMouseLeave={() => !readOnly && setHoverValue(null)}
              className={`p-0.5 rounded transition ${
                readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-105'
              }`}
            >
              <svg
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill={filled ? 'currentColor' : 'none'}
                className={filled ? 'text-yellow-500' : 'text-gray-300'}
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.48 3.499a.6.6 0 0 1 1.04 0l2.53 4.46a.6.6 0 0 0 .4.29l5.05.86a.6.6 0 0 1 .33 1.02l-3.58 3.69a.6.6 0 0 0-.16.51l.72 4.98a.6.6 0 0 1-.87.63l-4.53-2.61a.6.6 0 0 0-.6 0l-4.53 2.61a.6.6 0 0 1-.87-.63l.72-4.98a.6.6 0 0 0-.16-.51L3.09 10.14a.6.6 0 0 1 .33-1.02l5.05-.86a.6.6 0 0 0 .4-.29l2.53-4.46Z"
                />
              </svg>
            </button>
          )
        })}
      </div>
    </div>
  )
}