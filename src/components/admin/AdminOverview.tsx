import { useMemo, type ReactNode } from 'react';
import { ArrowRight, CalendarDays, ChevronRight, CirclePlus, FileWarning, MapPin, RefreshCw, Truck, Users, XCircle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import {
  adminSessions, getAdminAgenda, matchesAdminOrderFilter, type AdminScheduleRange,
} from '@/lib/adminOrderFilters';
import { isSelfPickup } from '@/lib/orderCharges';
import { OrderStatusBadge } from '@/components/order/OrderStatusBadge';
import type { Order } from '@/types';

interface AdminOverviewProps {
  orders: Order[];
  today: string;
  range: AdminScheduleRange;
  onRangeChange: (range: AdminScheduleRange) => void;
  conflictIds: ReadonlySet<string>;
  onOpenOrder: (order: Order) => void;
  onOpenOrders: (filter: string) => void;
  onOpenDelivery: (order: Order) => void;
  onOpenSchedule: () => void;
  compact?: boolean;
}

const actionFilters = [
  { filter: 'pending', icon: CirclePlus, tone: 'amber' },
  { filter: 'pricing', icon: FileWarning, tone: 'amber' },
  { filter: 'cancel_requested', icon: XCircle, tone: 'red' },
  { filter: 'conflict', icon: RefreshCw, tone: 'blue' },
] as const;

function OverviewPanel({ className, title, subtitle, action, children }: {
  className: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={`admin-overview-panel ${className}`}>
      <div className="admin-panel-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function AdminOverview({
  orders, today, range, onRangeChange, conflictIds, onOpenOrder, onOpenOrders, onOpenDelivery, onOpenSchedule, compact = false,
}: AdminOverviewProps) {
  const { t, language } = useLanguage();
  const agenda = useMemo(() => getAdminAgenda(orders, today, range), [orders, today, range]);
  const todayAgenda = useMemo(() => getAdminAgenda(orders, today, 'today'), [orders, today]);
  const deliveries = orders.filter((order) => matchesAdminOrderFilter(order, 'in_transit', today));
  const shown = compact ? agenda.events.slice(0, 4) : agenda.events;
  const lead = shown.find(({ order }) => !matchesAdminOrderFilter(order, 'in_transit', today) &&
    !['completed', 'delivered'].includes(order.status || '')) ?? shown[0];

  const locale = language === 'bm' ? 'ms-MY' : 'en-MY';
  const shortDate = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'Asia/Kuala_Lumpur' });
  const fullDate = new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'Asia/Kuala_Lumpur' });
  const todayDate = new Date(`${today}T00:00:00+08:00`);
  const count = (filter: string) => orders.filter((order) => matchesAdminOrderFilter(order, filter, today, conflictIds)).length;
  const rangeControls = (
    <div className="admin-range" role="group" aria-label={t('admin_event_schedule')}>
      {(['today', 'tomorrow', 'week'] as const).map((value) => (
        <button key={value} type="button" aria-pressed={range === value} onClick={() => onRangeChange(value)}>
          {t(`admin_${value}`)}
        </button>
      ))}
    </div>
  );
  const schedule = (
    <OverviewPanel className="admin-agenda" title={t('admin_event_schedule')}
      subtitle={`${agenda.events.length} ${t(agenda.events.length === 1 ? 'admin_event_single' : 'admin_events')} · ${agenda.pax} ${t(agenda.pax === 1 ? 'admin_event_guest_single' : 'admin_event_guests')}`}
      action={rangeControls}>
      <dl className="admin-meal-grid">
        {adminSessions.map((session) => (
          <div key={session}>
            <dt>{t(`admin_${session}`)}</dt>
            <dd>{agenda.sessions[session]} <small>pax</small></dd>
          </div>
        ))}
      </dl>
      {shown.length ? (
        <ul className="admin-event-list">
          {shown.map((event) => (
            <li key={event.order.id || event.order.orderId} className={event === lead ? 'admin-mobile-lead' : undefined}>
              <button type="button" className="admin-event-row" onClick={() => onOpenOrder(event.order)}>
                <span className="admin-event-time">
                  <strong>{event.time || '—'}</strong>
                  <small>{shortDate.format(new Date(`${event.date}T00:00:00+08:00`))}</small>
                </span>
                <span className="admin-event-info">
                  <strong>{event.order.to || event.order.name || t('admin_client_missing')}</strong>
                  <small>{[
                    `${event.pax} pax`,
                    ...event.sessions.map((session) => t(`admin_${session}`)),
                    isSelfPickup(event.order.delivery) ? t('admin_pickup') : '',
                  ].filter(Boolean).join(' · ')}</small>
                </span>
                <span className="admin-event-status"><OrderStatusBadge status={event.order.status} language={language} /></span>
                <ChevronRight size={15} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="admin-overview-empty">{t('admin_no_events')}</p>}
      {compact && <div className="admin-panel-footer"><button type="button" className="admin-text-button" onClick={onOpenSchedule}>{t('admin_open_schedule')} <ArrowRight size={15} /></button></div>}
    </OverviewPanel>
  );

  if (!compact) return schedule;

  return (
    <div className="admin-today">
      <section className="admin-hero">
        <div>
          <p><CalendarDays size={16} aria-hidden="true" /> <time dateTime={today}>{fullDate.format(todayDate)}</time></p>
          <h1>{t('admin_today')}</h1>
        </div>
        <button type="button" className="admin-hero-button" onClick={() => onOpenOrders('all')}>
          {t('admin_open_orders')} <ArrowRight size={16} aria-hidden="true" />
        </button>
      </section>
      <section className="admin-metrics" aria-label={t('admin_overview')}>
        {[
          { value: todayAgenda.events.length, label: 'admin_events_today', icon: CalendarDays, filter: 'scheduled', tone: 'neutral' },
          { value: todayAgenda.pax, label: 'admin_guests_today', icon: Users, filter: 'scheduled', tone: 'amber' },
          { value: deliveries.length, label: 'admin_filter_in_transit', icon: Truck, filter: 'in_transit', tone: 'blue' },
        ].map(({ value, label, icon: Icon, filter, tone }) => (
          <button key={label} type="button" className="admin-metric" onClick={() => onOpenOrders(filter)}>
            <span className="admin-tone-icon" data-tone={tone}><Icon size={19} aria-hidden="true" /></span>
            <span><strong>{value}</strong><small>{t(label)}</small></span>
            <ChevronRight className="admin-metric-arrow" size={16} aria-hidden="true" />
          </button>
        ))}
      </section>
      <div className="admin-workspace">
        <OverviewPanel className="admin-actions" title={t('admin_needs_attention')}>
          <ul className="admin-action-list">
            {actionFilters.map(({ filter, icon: Icon, tone }) => (
              <li key={filter}>
                <button type="button" className="admin-action-row" onClick={() => onOpenOrders(filter)}>
                  <span className="admin-tone-icon" data-tone={tone}><Icon size={18} aria-hidden="true" /></span>
                  <span>{t(`admin_filter_${filter}`)}</span>
                  <strong>{count(filter)}</strong>
                  <ChevronRight className="admin-action-arrow" size={15} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </OverviewPanel>
        {schedule}
        <OverviewPanel className="admin-deliveries" title={t('admin_filter_in_transit')} action={deliveries.length > 1 && (
          <button type="button" className="admin-text-button" onClick={() => onOpenOrders('in_transit')}>{t('admin_view_all')} <ArrowRight size={15} /></button>
        )}>
          {deliveries.length ? (
            <ul className="admin-delivery-list">
              {deliveries.map((order) => (
                <li key={order.id || order.orderId}>
                  <button type="button" className="admin-action-row" onClick={() => onOpenDelivery(order)}>
                    <span className="admin-tone-icon" data-tone="blue"><MapPin size={18} aria-hidden="true" /></span>
                    <span className="admin-event-info">
                      <strong>{order.to || order.name || t('admin_client_missing')}</strong>
                      <small>{order.location?.trim() || t('admin_location_missing')}</small>
                    </span>
                    <ChevronRight size={15} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="admin-overview-empty">{t('admin_no_deliveries')}</p>}
        </OverviewPanel>
      </div>
    </div>
  );
}
