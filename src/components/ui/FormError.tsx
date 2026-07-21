import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormErrorProps {
  message: string;
  className?: string;
}

export function FormError({ message, className }: FormErrorProps) {
  return (
    <p className={cn("text-tomato-burst text-xs mt-1.5 flex items-center gap-1 animate-in fade-in slide-in-from-top-1", className)}>
      <AlertTriangle className="w-3 h-3 shrink-0" />
      {message}
    </p>
  );
}
