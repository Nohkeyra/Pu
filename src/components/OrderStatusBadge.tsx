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
    <Badge variant="outline" data-status={presentation.key} className={cn('text-xs font-semibold', presentation.className, className)}>
      {presentation.label}
    </Badge>
  );
}
