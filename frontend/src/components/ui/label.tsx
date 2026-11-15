import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

interface LabelProps extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
  /** Affiche un astérisque rouge pour signaler un champ obligatoire. */
  required?: boolean
}

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  LabelProps
>(({ className, required, children, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn('text-sm font-medium text-brand-dark', className)}
    {...props}
  >
    {children}
    {required && (
      <span data-required-mark className="ml-0.5 font-semibold text-red-600" aria-hidden="true">
        *
      </span>
    )}
  </LabelPrimitive.Root>
))
Label.displayName = 'Label'

export { Label }
