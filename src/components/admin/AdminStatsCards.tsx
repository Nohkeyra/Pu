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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-white dark:bg-card border border-stone/15 dark:border-white/10 p-6 rounded-2xl shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`${stat.bg} p-2 rounded-xl`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-stone dark:text-stone/70 mb-1">{stat.title}</p>
            <h3 className="text-2xl font-bold text-deep-forest dark:text-white">{stat.value}</h3>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
