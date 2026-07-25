import { motion } from "motion/react";
import { CheckCircle2, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuccessStateProps {
  title: string;
  subtitle?: string;
  className?: string;
  showConfetti?: boolean;
}

export function SuccessState({ title, subtitle, className, showConfetti = false }: SuccessStateProps) {
  return (
    <motion.div 
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
      className={cn("bg-moss/20 rounded-2xl p-8 text-center border border-moss/20", className)}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
      >
        <CheckCircle2 className="w-12 h-12 text-kiwi mx-auto mb-3" />
      </motion.div>
      
      <h2 className="font-display text-2xl text-deep-forest mb-2">{title}</h2>
      {subtitle && <p className="text-stone text-sm">{subtitle}</p>}
      
      {showConfetti && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-4"
        >
          <PartyPopper className="w-6 h-6 text-sunshine mx-auto" />
        </motion.div>
      )}
    </motion.div>
  );
}
