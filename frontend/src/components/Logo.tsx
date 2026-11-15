import { cn } from '@/lib/utils'

interface LogoProps {
  size?: number
  className?: string
  withLetters?: boolean
}

/**
 * Logo cube isométrique ADC (A / D / C).
 */
export function Logo({ size = 40, className, withLetters = true }: LogoProps) {
  return (
    <svg
      width={size}
      height={size * 1.05}
      viewBox="0 0 100 105"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
    >
      <path d="M50 5 L92 28 L50 50 L8 28 Z" fill="#33B5E5" stroke="#1A1A1A" strokeWidth="2.5" />
      <path d="M8 28 L50 50 L50 98 L8 76 Z" fill="#E51C23" stroke="#1A1A1A" strokeWidth="2.5" />
      <path d="M50 50 L92 28 L92 76 L50 98 Z" fill="#F7941D" stroke="#1A1A1A" strokeWidth="2.5" />
      {withLetters && (
        <>
          <text x="50" y="33" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="26" fill="#1A1A1A" textAnchor="middle">
            A
          </text>
          <text x="29" y="71" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="28" fill="#1A1A1A" textAnchor="middle">
            D
          </text>
          <text x="71" y="71" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="28" fill="#1A1A1A" textAnchor="middle">
            C
          </text>
        </>
      )}
    </svg>
  )
}
