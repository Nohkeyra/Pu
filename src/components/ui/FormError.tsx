import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface FormErrorProps {
  message: string
  className?: string
  id?: string
}

/**
 * Inline field-level error. Pair with aria-describedby / aria-invalid on the input.
 */
export function FormError({ message, className, id }: FormErrorProps) {
  if (!message) return null
  return (
    <p
      id={id}
      role="alert"
      className={cn(
        "text-rose-600 dark:text-rose-400 text-xs mt-1.5 flex items-start gap-1.5 animate-in fade-in slide-in-from-top-1 leading-snug",
        className
      )}
    >
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden />
      <span>{message}</span>
    </p>
  )
}
