import { motion } from 'motion/react';
import { FileText, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { Order } from '@/types';

interface AdminStatsCardsProps {
  orders: Order[];
  t: (key: string) => string;
  language: string;
}

export function AdminStatsCards({ orders, t, language }: AdminStatsCardsProps) {
  const stats = [
    {
      title: t('total_orders'),
      value: orders.length,
      icon: FileText,
      color: 'text-blue-600',
      bg: 'bg-blue-500/10'
    },
    {
      title: t('pending_orders'),
      value: orders.filter(o => o.status === 'pending').length,
      icon: AlertTriangle,
      color: 'text-amber-600',
      bg: 'bg-amber-500/10'
    },
    {
      title: t('approved_orders'),
      value: orders.filter(o => o.status === 'approved' || o.status === 'billed').length,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-500/10'
    },
    {
      title: language === 'en' ? 'Cancelled/Rejected' : 'Dibatalkan/Ditolak',
      value: orders.filter(o => o.status === 'cancelled' || o.status === 'rejected').length,
      icon: XCircle,
      color: 'text-rose-600',
      bg: 'bg-rose-500/10'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-white dark:bg-card border border-stone/15 dark:border-white/10 p-4 rounded-xl shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className={`${stat.bg} p-1.5 rounded-lg shrink-0`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-stone/55 dark:text-stone/50 uppercase tracking-wider truncate">{stat.title}</p>
              <h3 className="text-xl font-bold text-deep-forest dark:text-white leading-tight mt-0.5">{stat.value}</h3>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
