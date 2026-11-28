import { useState } from 'react';
import { LayoutList, Search, SlidersHorizontal, Table2, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { adminOrderFilterOptions } from '@/lib/adminOrderFilters';

export type AdminOrderLayout = 'list' | 'table';

export interface AdminOrderSearchState {
  search: string;
  status: string;
  client: string;
  from: string;
  to: string;
}

interface AdminOrderSearchProps {
  filters: AdminOrderSearchState;
  onChange: (filters: Partial<AdminOrderSearchState>) => void;
  clients: string[];
  resultCount: number;
  layout: AdminOrderLayout;
  onLayoutChange: (layout: AdminOrderLayout) => void;
}

export function AdminOrderSearch({ filters, onChange, clients, resultCount, layout, onLayoutChange }: AdminOrderSearchProps) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const { search, status, client, from, to } = filters;
  const activeFilters = [
    status !== 'all' && { label: t(`admin_filter_${status}`), clear: () => onChange({ status: 'all' }) },
    client !== 'all' && { label: client, clear: () => onChange({ client: 'all' }) },
    (from || to) && { label: `${from || '…'} – ${to || '…'}`, clear: () => onChange({ from: '', to: '' }) },
  ];

  return (
    <section className="admin-order-search" aria-label={t('admin_filters')}>
      <div className="admin-search-row">
        <div className="admin-search-input">
          <Search size={16} aria-hidden="true" />
          <input id="admin-order-search" type="search" value={search} onChange={(event) => onChange({ search: event.target.value })}
            aria-label={t('admin_search')} placeholder={t('admin_search_placeholder')} />
        </div>
        <button id="admin-filter-dropdown-toggle" type="button" className="admin-control" aria-expanded={expanded}
          aria-controls="admin-filter-dropdown-panel" onClick={() => setExpanded(!expanded)}>
          <SlidersHorizontal size={16} aria-hidden="true" /> {t('admin_filters')}
        </button>
        <div role="group" aria-label={t('admin_layout')} className="admin-range admin-layout">
          {([{ value: 'list', icon: LayoutList }, { value: 'table', icon: Table2 }] as const).map(({ value, icon: Icon }) => (
            <button key={value} type="button" aria-pressed={layout === value} onClick={() => onLayoutChange(value)}
              aria-label={t(`admin_${value}`)} title={t(`admin_${value}`)}>
              <Icon size={17} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
      <div id="admin-filter-dropdown-panel" hidden={!expanded} className="admin-order-filters">
        <label>{t('admin_filter_status')}
          <select value={status} onChange={(event) => onChange({ status: event.target.value })}>
            {adminOrderFilterOptions.map((option) => <option key={option} value={option}>{t(`admin_filter_${option}`)}</option>)}
          </select>
        </label>
        <label>{t('admin_client')}
          <select value={client} onChange={(event) => onChange({ client: event.target.value })}>
            <option value="all">{t('admin_all_clients')}</option>
            {clients.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label>{t('admin_date_from')}<input id="admin-date-from" type="date" value={from} onChange={(event) => onChange({ from: event.target.value })} /></label>
        <label>{t('admin_date_to')}<input id="admin-date-to" type="date" value={to} onChange={(event) => onChange({ to: event.target.value })} /></label>
      </div>
      <div className="admin-results-strip">
        <p role="status">{resultCount} {t(resultCount === 1 ? 'admin_result_single' : 'admin_results')}</p>
        {activeFilters.map((filter) => filter && (
          <button key={filter.label} type="button" className="admin-control admin-filter-chip" onClick={filter.clear}
            aria-label={`${t('admin_clear_filter')} ${filter.label}`}>
            {filter.label}<X size={14} aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}
