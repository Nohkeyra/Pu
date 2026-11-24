import { Badge } from '@/components/ui/badge';
import { getOrderStatus } from '@/lib/orderStatus';
import { cn } from '@/lib/utils';

interface OrderStatusBadgeProps {
  status?: string;
  language: 'en' | 'bm';
  className?: string;
}

export function OrderStatusBadge({ status, language, className }: OrderStatusBadgeProps) {
  const presentation = getOrderStatus(status, language);
  return (
    <Badge
      variant="outline"
      data-status={presentation.key}
      className={cn(
        // Smooth only a genuine Firestore-driven status/color change. No
        // entrance animation, duplicate popup or fabricated progress state.
        'text-xs font-semibold motion-safe:transition-colors motion-safe:duration-200',
        presentation.className,
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-[var(--order-status-accent)]" />
      {presentation.label}
    </Badge>
  );
}
