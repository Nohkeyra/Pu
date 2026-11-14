import { CalendarCheck2, Calculator, Truck, Receipt } from 'lucide-react';
import type { AdminKpiStats } from '@/lib/adminKpiStats';

interface AdminStatsKpiStripProps {
  stats: AdminKpiStats;
  language: string;
}

export function AdminStatsKpiStrip({ stats, language }: AdminStatsKpiStripProps) {
  const isBm = language === 'bm';

  const cards = [
    {
      id: 'todays-events',
      label: isBm ? 'Acara Hari Ini' : "Today's Events",
      value: String(stats.todaysEventsCount),
      subLabel:
        stats.todaysEventsCount > 0
          ? `${stats.todaysPax} ${isBm ? 'pax dijadualkan' : 'pax scheduled'}`
          : isBm
            ? 'Tiada acara hari ini'
            : 'No events today',
      icon: CalendarCheck2,
      iconClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    },
    {
      id: 'awaiting-pricing',
      label: isBm ? 'Menunggu Harga' : 'Awaiting Pricing',
      value: String(stats.awaitingPricingCount),
      subLabel:
        stats.awaitingPricingCount > 0
          ? isBm
            ? 'Perlu sebut harga / bil'
            : 'Needs pricing review'
          : isBm
            ? 'Semua telah ditetapkan'
            : 'All requests priced',
      icon: Calculator,
      iconClass: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
    },
    {
      id: 'active-in-transit',
      label: isBm ? 'Dalam Penghantaran' : 'Active In-Transit',
      value: String(stats.inTransitCount),
      subLabel:
        stats.inTransitCount > 0
          ? isBm
            ? 'Penghantaran sedang berjalan'
            : 'Out on route now'
          : isBm
            ? 'Tiada penghantaran aktif'
            : 'No active dispatches',
      icon: Truck,
      iconClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
    },
    {
      id: 'monthly-billed',
      label: isBm ? 'Dibilkan Bulan Ini' : 'Monthly Billed',
      value: `RM ${stats.monthlyBilledRevenue.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      subLabel: `${stats.monthlyBilledCount} ${
        isBm ? 'invois bulan ini' : stats.monthlyBilledCount === 1 ? 'billed order' : 'billed orders'
      }`,
      icon: Receipt,
      iconClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    },
  ];

  return (
    <section
      aria-label={isBm ? 'Ringkasan Operasi Pentadbir' : 'Admin Operational Summary'}
      className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5"
    >
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className="min-h-[88px] rounded-xl border border-stone/15 dark:border-white/10 bg-white dark:bg-card p-3.5 sm:p-4 flex flex-col justify-between shadow-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-deep-forest/70 dark:text-stone-300 truncate">
                {card.label}
              </span>
              <span
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${card.iconClass}`}
                aria-hidden="true"
              >
                <Icon className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="mt-2">
              <p className="text-lg sm:text-xl font-display font-bold text-deep-forest dark:text-white leading-tight tabular-nums truncate">
                {card.value}
              </p>
              <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400 truncate">
                {card.subLabel}
              </p>
            </div>
          </div>
        );
      })}
    </section>
  );
}
