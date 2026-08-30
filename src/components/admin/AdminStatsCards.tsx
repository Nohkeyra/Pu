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
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/20'
    },
    {
      title: t('pending_orders'),
      value: orders.filter(o => o.status === 'pending').length,
      icon: AlertTriangle,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/20'
    },
    {
      title: t('approved_orders'),
      value: orders.filter(o => o.status === 'approved' || o.status === 'billed').length,
      icon: CheckCircle,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20'
    },
    {
      title: language === 'en' ? 'Cancelled/Rejected' : 'Dibatalkan/Ditolak',
      value: orders.filter(o => o.status === 'cancelled' || o.status === 'rejected').length,
      icon: XCircle,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/20'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-card/90 dark:bg-card/95 border border-stone-200/80 dark:border-stone-800 p-4 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center gap-3">
            <div className={`${stat.bg} border p-2 rounded-xl shrink-0 flex items-center justify-center`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider truncate whitespace-nowrap">{stat.title}</p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-deep-forest dark:text-white leading-tight mt-0.5">{stat.value}</h3>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
