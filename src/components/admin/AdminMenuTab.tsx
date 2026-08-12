import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Coffee, 
  Sun, 
  Cake, 
  Save, 
  X, 
  Utensils, 
  RefreshCw,
  Info,
  CupSoda,
  Eye,
  EyeOff
} from 'lucide-react';
import type { ToastMessage } from '../ui/Toast';
import { invalidateFetchCache } from '@/lib/api';

export interface MenuItem {
  id: string;
  nameEn: string;
  nameBm: string;
  descEn: string;
  descBm: string;
  price: number;
  category: 'breakfast' | 'lunch' | 'hi tea' | 'drinks';
  available?: boolean;
}

interface AdminMenuTabProps {
  language: 'en' | 'bm';
  authHeaders: () => HeadersInit;
  getApiUrl: (endpoint: string) => string;
  toast: (options: Omit<ToastMessage, 'id'>) => void;
}

export default function AdminMenuTab({
  language,
  authHeaders,
  getApiUrl,
  toast
}: AdminMenuTabProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'breakfast' | 'lunch' | 'hi tea' | 'drinks'>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  
  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formState, setFormState] = useState<Omit<MenuItem, 'id'>>({
    nameEn: '',
    nameBm: '',
    descEn: '',
    descBm: '',
    price: 0,
    category: 'lunch',
    available: true
  });
  const [isSaving, setIsSaving] = useState(false);

  const tText = (en: string, bm: string) => (language === 'bm' ? bm : en);

  const fetchMenuItems = async () => {
    setLoading(true);
    try {
      const response = await fetch(getApiUrl('/api/menu'));
      if (!response.ok) throw new Error('Failed to fetch menu items');
      const data = await response.json();
      const rawList: MenuItem[] = data.menuItems || data.items || [];
      const listWithDefaults = rawList.map(item => ({
        ...item,
        available: item.available !== undefined ? Boolean(item.available) : true
      }));
      setMenuItems(listWithDefaults);
    } catch (err) {
      console.error(err);
      toast({
        title: tText('Failed to load menu', 'Gagal memuatkan menu'),
        description: String(err),
        variant: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormState({
      nameEn: '',
      nameBm: '',
      descEn: '',
      descBm: '',
      price: 0,
      category: 'lunch',
      available: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormState({
      nameEn: item.nameEn,
      nameBm: item.nameBm,
      descEn: item.descEn,
      descBm: item.descBm,
      price: item.price,
      category: item.category,
      available: item.available !== false
    });
    setIsModalOpen(true);
  };

  const handleToggleAvailable = async (item: MenuItem) => {
    const newStatus = item.available === false ? true : false;
    
    // Optimistic update
    setMenuItems(prev => prev.map(i => i.id === item.id ? { ...i, available: newStatus } : i));

    try {
      const response = await fetch(getApiUrl(`/api/admin/menu/${item.id}/toggle`), {
        method: 'PATCH',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ available: newStatus })
      });

      if (!response.ok) {
        // Fallback PUT if PATCH isn't available
        await fetch(getApiUrl(`/api/admin/menu/${item.id}`), {
          method: 'PUT',
          headers: {
            ...authHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ...item, available: newStatus })
        });
      }

      toast({
        title: newStatus 
          ? tText('Menu Item Visible', 'Menu Ditayangkan') 
          : tText('Menu Item Hidden', 'Menu Disembunyikan'),
        description: newStatus 
          ? tText(`"${tText(item.nameEn, item.nameBm)}" is now shown in the order form.`, `"${tText(item.nameEn, item.nameBm)}" kini dipaparkan dalam borang tempahan.`)
          : tText(`"${tText(item.nameEn, item.nameBm)}" is hidden from the order form.`, `"${tText(item.nameEn, item.nameBm)}" telah disembunyikan daripada borang tempahan.`),
        variant: 'success'
      });

      invalidateFetchCache('/api/menu');
    } catch (err) {
      console.error(err);
      // Revert optimistic update
      setMenuItems(prev => prev.map(i => i.id === item.id ? { ...i, available: item.available !== false } : i));
      toast({
        title: tText('Toggle Failed', 'Gagal Menukar Status'),
        description: String(err),
        variant: 'error'
      });
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.nameEn || !formState.nameBm || formState.price <= 0) {
      toast({
        title: tText('Validation Error', 'Ralat Pengesahan'),
        description: tText('Please fill in both name fields and set a valid price.', 'Sila isi kedua-dua medan nama dan tetapkan harga yang sah.'),
        variant: 'warning'
      });
      return;
    }

    setIsSaving(true);
    try {
      const url = editingItem 
        ? getApiUrl(`/api/admin/menu/${editingItem.id}`)
        : getApiUrl('/api/admin/menu');
      
      const method = editingItem ? 'PUT' : 'POST';
      
      const payload = {
        ...formState,
        id: editingItem ? editingItem.id : undefined
      };

      const response = await fetch(url, {
        method,
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to save menu item');
      }

      toast({
        title: editingItem 
          ? tText('Menu Item Updated', 'Menu Berjaya Dikemas kini')
          : tText('Menu Item Added', 'Menu Berjaya Ditambah'),
        description: editingItem 
          ? tText('The menu item has been successfully updated.', 'Sajian menu telah berjaya dikemas kini.')
          : tText('The menu item has been successfully added to the system.', 'Sajian menu baru telah berjaya disimpan ke dalam sistem.'),
        variant: 'success'
      });

      invalidateFetchCache('/api/menu');
      setIsModalOpen(false);
      fetchMenuItems();
    } catch (err) {
      console.error(err);
      toast({
        title: tText('Failed to save item', 'Gagal menyimpan menu'),
        description: String(err),
        variant: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!window.confirm(tText(`Are you sure you want to delete ${name}?`, `Adakah anda pasti mahu memadam hidangan ${name}?`))) {
      return;
    }

    try {
      const response = await fetch(getApiUrl(`/api/admin/menu/${id}`), {
        method: 'DELETE',
        headers: authHeaders()
      });

      if (!response.ok) throw new Error('Failed to delete item');

      toast({
        title: tText('Item Deleted', 'Hidangan Dipadam'),
        description: tText('The item has been deleted successfully.', 'Hidangan telah berjaya dipadam.'),
        variant: 'success'
      });

      invalidateFetchCache('/api/menu');
      fetchMenuItems();
    } catch (err) {
      console.error(err);
      toast({
        title: tText('Delete Failed', 'Gagal Memadam'),
        description: String(err),
        variant: 'error'
      });
    }
  };

  // Counts
  const totalCount = menuItems.length;
  const visibleCount = useMemo(() => menuItems.filter(i => i.available !== false).length, [menuItems]);
  const hiddenCount = totalCount - visibleCount;

  // Filtered list
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesSearch = 
        item.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.nameBm.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.descEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.descBm.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

      const isVisible = item.available !== false;
      const matchesVisibility = 
        visibilityFilter === 'all' ||
        (visibilityFilter === 'visible' && isVisible) ||
        (visibilityFilter === 'hidden' && !isVisible);
      
      return matchesSearch && matchesCategory && matchesVisibility;
    });
  }, [menuItems, searchTerm, selectedCategory, visibilityFilter]);

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-card p-5 rounded-xl border border-stone-200/60 dark:border-white/10 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-deep-forest dark:text-stone-100 flex items-center gap-2">
            <Utensils className="w-4 h-4 text-[var(--color-sunshine-cta)]" />
            {tText('Catering Menu Manager', 'Pengurus Menu Katering')}
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 font-normal mt-0.5">
            {tText('Manage, add, delete, and toggle show/hide items for customer order form.', 'Urus, tambah, padam, dan tetapkan paparan menu untuk borang tempahan pelanggan.')}
          </p>
        </div>

        {/* Stats Badges + Add Button */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-500 dark:text-stone-400">
            <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {visibleCount} {tText('Shown', 'Dipapar')}
            </span>
            <span className="bg-stone-500/10 text-stone-700 dark:text-stone-400 border border-stone-200/50 px-2.5 py-1 rounded-lg flex items-center gap-1">
              <EyeOff className="w-3 h-3" />
              {hiddenCount} {tText('Hidden', 'Disorot')}
            </span>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 bg-[#A8E10C] hover:bg-[#96cc0a] text-deep-forest px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{tText('Add Menu Item', 'Tambah Hidangan')}</span>
          </button>
        </div>
      </div>

      {/* Filters and Search Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={tText('Search menu item name or desc...', 'Cari nama atau deskripsi hidangan...')}
            className="w-full pl-9 pr-8 h-9 bg-white dark:bg-card border border-stone-200 dark:border-stone-800 rounded-lg text-xs text-deep-forest dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[var(--color-sunshine-cta)]"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Unified Filter Area */}
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          {/* Show/Hide Filter Tabs */}
          <div className="flex bg-stone-100 dark:bg-stone-800/80 p-1 rounded-lg border border-stone-200 dark:border-stone-800 shrink-0">
            <button
              onClick={() => setVisibilityFilter('all')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                visibilityFilter === 'all'
                  ? 'bg-white dark:bg-card shadow-sm text-deep-forest dark:text-stone-100'
                  : 'text-stone-500 dark:text-stone-400 hover:text-deep-forest'
              }`}
            >
              {tText('All', 'Semua')}
            </button>
            <button
              onClick={() => setVisibilityFilter('visible')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${
                visibilityFilter === 'visible'
                  ? 'bg-white dark:bg-card shadow-sm text-emerald-600 dark:text-emerald-400'
                  : 'text-stone-500 dark:text-stone-400 hover:text-deep-forest'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>{tText('Shown', 'Papar')}</span>
            </button>
            <button
              onClick={() => setVisibilityFilter('hidden')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${
                visibilityFilter === 'hidden'
                  ? 'bg-white dark:bg-card shadow-sm text-stone-600 dark:text-stone-400'
                  : 'text-stone-500 dark:text-stone-400 hover:text-deep-forest'
              }`}
            >
              <EyeOff className="w-3 h-3" />
              <span>{tText('Hidden', 'Sorot')}</span>
            </button>
          </div>

          {/* Category Filters */}
          <div className="flex bg-stone-100 dark:bg-stone-800/80 p-1 rounded-lg border border-stone-200 dark:border-stone-800 overflow-x-auto max-w-full shrink-0 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all whitespace-nowrap ${
                selectedCategory === 'all' 
                  ? 'bg-white dark:bg-card shadow-sm text-deep-forest dark:text-stone-100' 
                  : 'text-stone-500 dark:text-stone-400 hover:text-deep-forest'
              }`}
            >
              {tText('All Categories', 'Semua Kategori')}
            </button>
            <button
              onClick={() => setSelectedCategory('breakfast')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all whitespace-nowrap ${
                selectedCategory === 'breakfast' 
                  ? 'bg-white dark:bg-card shadow-sm text-deep-forest dark:text-stone-100' 
                  : 'text-stone-500 dark:text-stone-400 hover:text-deep-forest'
              }`}
            >
              <Coffee className="w-3 h-3 text-amber-500" />
              <span>{tText('Breakfast', 'Sarapan')}</span>
            </button>
            <button
              onClick={() => setSelectedCategory('lunch')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all whitespace-nowrap ${
                selectedCategory === 'lunch' 
                  ? 'bg-white dark:bg-card shadow-sm text-deep-forest dark:text-stone-100' 
                  : 'text-stone-500 dark:text-stone-400 hover:text-deep-forest'
              }`}
            >
              <Sun className="w-3 h-3 text-orange-500" />
              <span>{tText('Lunch', 'Tengahari')}</span>
            </button>
            <button
              onClick={() => setSelectedCategory('hi tea')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all whitespace-nowrap ${
                selectedCategory === 'hi tea' 
                  ? 'bg-white dark:bg-card shadow-sm text-deep-forest dark:text-stone-100' 
                  : 'text-stone-500 dark:text-stone-400 hover:text-deep-forest'
              }`}
            >
              <Cake className="w-3 h-3 text-pink-500" />
              <span>{tText('Hi Tea', 'Hi-Tea')}</span>
            </button>
            <button
              onClick={() => setSelectedCategory('drinks')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all whitespace-nowrap ${
                selectedCategory === 'drinks' 
                  ? 'bg-white dark:bg-card shadow-sm text-deep-forest dark:text-stone-100' 
                  : 'text-stone-500 dark:text-stone-400 hover:text-deep-forest'
              }`}
            >
              <CupSoda className="w-3 h-3 text-blue-500" />
              <span>{tText('Drinks', 'Minuman')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Menu Cards List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 bg-white dark:bg-card rounded-xl border border-stone-200/60 dark:border-white/10 shadow-sm">
          <RefreshCw className="w-6 h-6 text-stone-400 animate-spin" />
          <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
            {tText('Syncing menu items with Firestore...', 'Menyelaraskan hidangan menu bersama Firestore...')}
          </p>
        </div>
      ) : filteredMenuItems.length === 0 ? (
        <div className="bg-white dark:bg-card border border-dashed border-stone-300 dark:border-stone-800 rounded-xl p-16 text-center shadow-sm">
          <Info className="w-6 h-6 text-stone-400 mx-auto mb-2" />
          <h3 className="text-xs font-bold text-deep-forest dark:text-stone-100">
            {tText('No Menu Items Found', 'Tiada Hidangan Menu Ditemui')}
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 font-light max-w-sm mx-auto mt-1">
            {tText('Try clearing search terms or changing your filters to see items.', 'Cuba padamkan carian atau ubah penapis untuk melihat hidangan.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMenuItems.map(item => {
            const isVisible = item.available !== false;
            return (
              <div 
                key={item.id}
                className={`bg-white dark:bg-card border rounded-xl p-4 flex flex-col justify-between shadow-sm transition-all duration-150 ${
                  isVisible 
                    ? 'border-stone-200/80 dark:border-white/10 hover:border-stone-300 dark:hover:border-stone-700' 
                    : 'border-amber-500/20 bg-amber-500/[0.02] dark:bg-amber-950/[0.04]'
                }`}
              >
                <div>
                  {/* Header Category & Price */}
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200/50 dark:border-white/5">
                      {item.category === 'breakfast' 
                        ? tText('🍳 Breakfast', '🍳 Sarapan') 
                        : item.category === 'lunch' 
                        ? tText('🍛 Lunch', '🍛 Tengahari') 
                        : item.category === 'hi tea'
                        ? tText('🍰 Hi-Tea', '🍰 Hi-Tea')
                        : tText('🥤 Drinks', '🥤 Minuman')}
                    </span>
                    
                    <span className="text-sm font-bold text-deep-forest dark:text-stone-200 font-mono">
                      RM {item.price.toFixed(2)}
                    </span>
                  </div>

                  {/* Name */}
                  <h4 className="text-sm font-bold text-deep-forest dark:text-white block leading-snug">
                    {tText(item.nameEn, item.nameBm)}
                  </h4>

                  {/* Description */}
                  <p className="text-xs text-stone-500 dark:text-stone-400 font-normal mt-1.5 line-clamp-2 leading-relaxed min-h-[2.5rem]">
                    {tText(item.descEn || '-', item.descBm || '-')}
                  </p>
                </div>

                {/* Visibility Toggle & Actions Bar */}
                <div className="flex items-center justify-between border-t border-stone-100 dark:border-white/5 pt-3.5 mt-4 gap-3">
                  {/* Visibility Quick Toggle Button */}
                  <button
                    onClick={() => handleToggleAvailable(item)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors min-h-[32px] ${
                      isVisible
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                        : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:bg-stone-200/50'
                    }`}
                    title={isVisible ? tText('Click to hide from order form', 'Klik untuk sembunyikan daripada borang tempahan') : tText('Click to show in order form', 'Klik untuk paparkan dalam borang tempahan')}
                  >
                    {isVisible ? (
                      <>
                        <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{tText('Shown', 'Dipapar')}</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                        <span>{tText('Hidden', 'Disorot')}</span>
                      </>
                    )}
                  </button>

                  {/* Card Controls */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 hover:text-deep-forest dark:text-stone-400 dark:hover:text-stone-200 rounded-lg transition-colors"
                      title={tText('Edit Item', 'Kemas kini Hidangan')}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id, tText(item.nameEn, item.nameBm))}
                      className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 hover:text-rose-600 rounded-lg transition-colors"
                      title={tText('Delete Item', 'Padam Hidangan')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Dialog/Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[2000]">
          <div className="bg-white dark:bg-card border border-stone-200 dark:border-stone-800 max-w-md w-full rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex justify-between items-center bg-stone-50 dark:bg-stone-900/50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-deep-forest dark:text-white">
                {editingItem ? tText('Update Menu Item', 'Kemas kini Sajian Menu') : tText('Add New Menu Item', 'Tambah Sajian Menu Baru')}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-stone-500 hover:text-deep-forest dark:hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto font-sans">
              {/* Show / Hide Toggle Control */}
              <div className="bg-stone-50 dark:bg-stone-900/40 p-3.5 rounded-lg border border-stone-200 dark:border-stone-800 flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-deep-forest dark:text-white block">
                    {tText('Show in Order Form', 'Papar dalam Borang Tempahan')}
                  </label>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400 font-light mt-0.5">
                    {tText('Controls if customers can select this dish.', 'Mengawal sama ada pelanggan boleh memilih hidangan ini.')}
                  </p>
                </div>
                <Switch
                  checked={formState.available}
                  onCheckedChange={(checked) => setFormState(prev => ({ ...prev, available: checked }))}
                  aria-label={tText('Show in Order Form', 'Papar dalam Borang Tempahan')}
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block mb-1">
                  {tText('Meal Category', 'Kategori Hidangan')}
                </label>
                <select
                  value={formState.category}
                  onChange={(e) => setFormState(prev => ({ ...prev, category: e.target.value as any }))}
                  className="w-full px-3 h-9 border border-stone-200 dark:border-stone-800 rounded-lg text-xs bg-white dark:bg-card text-deep-forest dark:text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-sunshine-cta)]"
                >
                  <option value="breakfast">{tText('Breakfast (Sarapan)', 'Sarapan (Breakfast)')}</option>
                  <option value="lunch">{tText('Lunch (Tengahari)', 'Tengahari (Lunch)')}</option>
                  <option value="hi tea">{tText('Hi Tea', 'Hi Tea')}</option>
                  <option value="drinks">{tText('Drinks (Minuman)', 'Minuman (Drinks)')}</option>
                </select>
              </div>

              {/* Name (EN) */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block mb-1">
                  {tText('Name (English)', 'Nama (Inggeris)')}
                </label>
                <input
                  type="text"
                  required
                  value={formState.nameEn}
                  onChange={(e) => setFormState(prev => ({ ...prev, nameEn: e.target.value }))}
                  placeholder="e.g. Classic Beef Lasagna"
                  className="w-full px-3 h-9 border border-stone-200 dark:border-stone-800 rounded-lg text-xs bg-white dark:bg-card text-deep-forest dark:text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-sunshine-cta)]"
                />
              </div>

              {/* Name (BM) */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block mb-1">
                  {tText('Name (Bahasa Melayu)', 'Nama (Bahasa Melayu)')}
                </label>
                <input
                  type="text"
                  required
                  value={formState.nameBm}
                  onChange={(e) => setFormState(prev => ({ ...prev, nameBm: e.target.value }))}
                  placeholder="Contoh: Lasagna Daging Klasik"
                  className="w-full px-3 h-9 border border-stone-200 dark:border-stone-800 rounded-lg text-xs bg-white dark:bg-card text-deep-forest dark:text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-sunshine-cta)]"
                />
              </div>

              {/* Price */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block mb-1">
                  {tText('Price (RM)', 'Harga Seunit (RM)')}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  value={formState.price || ''}
                  onChange={(e) => setFormState(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  placeholder="12.00"
                  className="w-full px-3 h-9 border border-stone-200 dark:border-stone-800 rounded-lg text-xs bg-white dark:bg-card text-deep-forest dark:text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-sunshine-cta)] font-mono"
                />
              </div>

              {/* Description (EN) */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block mb-1">
                  {tText('Description (English)', 'Deskripsi (Inggeris)')}
                </label>
                <textarea
                  value={formState.descEn}
                  onChange={(e) => setFormState(prev => ({ ...prev, descEn: e.target.value }))}
                  placeholder="Briefly describe the dish options..."
                  className="w-full px-3 py-2 border border-stone-200 dark:border-stone-800 rounded-lg text-xs bg-white dark:bg-card text-deep-forest dark:text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-sunshine-cta)] min-h-[60px] resize-none"
                />
              </div>

              {/* Description (BM) */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block mb-1">
                  {tText('Description (Bahasa Melayu)', 'Deskripsi (Bahasa Melayu)')}
                </label>
                <textarea
                  value={formState.descBm}
                  onChange={(e) => setFormState(prev => ({ ...prev, descBm: e.target.value }))}
                  placeholder="Terangkan secara ringkas bahan atau butiran hidangan..."
                  className="w-full px-3 py-2 border border-stone-200 dark:border-stone-800 rounded-lg text-xs bg-white dark:bg-card text-deep-forest dark:text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-sunshine-cta)] min-h-[60px] resize-none"
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 h-9 border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400 font-semibold text-xs rounded-lg transition-colors"
                >
                  {tText('Cancel', 'Batal')}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 bg-[#A8E10C] hover:bg-[#96cc0a] disabled:opacity-50 text-deep-forest px-4 h-9 font-bold text-xs rounded-lg shadow-sm transition-all"
                >
                  {isSaving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{tText('Save', 'Simpan')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
