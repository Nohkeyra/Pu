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
  EyeOff,
  Wrench
} from 'lucide-react';
import type { ToastMessage } from '../ui/Toast';
import { Switch } from '@/components/ui/switch';
import { ResponsiveButtonGroup } from '@/components/ui/ResponsiveButtonGroup';
import { invalidateFetchCache } from '@/lib/api';
import { showConfirm } from '@/lib/nativeService';

export interface MenuItem {
  id: string;
  nameEn: string;
  nameBm: string;
  descEn?: string;
  descBm?: string;
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
  const [isRepairingImages, setIsRepairingImages] = useState(false);

  const tText = (en: string, bm: string) => (language === 'bm' ? bm : en);

  const handleRepairImages = async () => {
    setIsRepairingImages(true);
    try {
      const response = await fetch(getApiUrl('/api/admin/menu/repair-images'), {
        method: 'POST',
        headers: authHeaders()
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: tText('Image Health Check Complete', 'Pemeriksaan Imej Selesai'),
          description: data.message || tText('Menu images checked and repaired.', 'Semua imej menu telah diperiksa dan dibaik pulih.'),
          variant: 'success'
        });
        invalidateFetchCache('/api/menu');
        fetchMenuItems();
      } else {
        throw new Error(data.error || 'Failed to repair images');
      }
    } catch (err) {
      toast({
        title: tText('Repair Failed', 'Gagal Membaiki Imej'),
        description: String(err),
        variant: 'error'
      });
    } finally {
      setIsRepairingImages(false);
    }
  };

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
      category: selectedCategory !== 'all' ? selectedCategory : 'lunch',
      available: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormState({
      nameEn: item.nameEn,
      nameBm: item.nameBm,
      descEn: item.descEn || '',
      descBm: item.descBm || '',
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
    const isConfirmed = await showConfirm({
      title: tText('Confirm Deletion', 'Sahkan Pemadaman'),
      message: tText(`Are you sure you want to delete ${name}?`, `Adakah anda pasti mahu memadam hidangan ${name}?`),
      okButtonTitle: tText('Delete', 'Padam'),
      cancelButtonTitle: tText('Cancel', 'Batal')
    });
    if (!isConfirmed) {
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

  // Counts & Stats
  const totalCount = menuItems.length;
  const visibleCount = useMemo(() => menuItems.filter(i => i.available !== false).length, [menuItems]);
  const hiddenCount = totalCount - visibleCount;

  // Category counts
  const categoryCounts = useMemo(() => {
    return {
      breakfast: menuItems.filter(i => i.category === 'breakfast').length,
      lunch: menuItems.filter(i => i.category === 'lunch').length,
      hiTea: menuItems.filter(i => i.category === 'hi tea' || (i.category as string) === 'hi-tea').length,
      drinks: menuItems.filter(i => i.category === 'drinks').length,
    };
  }, [menuItems]);

  // Filtered list
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesSearch = 
        item.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.nameBm.toLowerCase().includes(searchTerm.toLowerCase());
      
      const normalizedCat = item.category === 'hi tea' || (item.category as string) === 'hi-tea' ? 'hi tea' : item.category;
      const matchesCategory = selectedCategory === 'all' || normalizedCat === selectedCategory;

      const isVisible = item.available !== false;
      const matchesVisibility = 
        visibilityFilter === 'all' ||
        (visibilityFilter === 'visible' && isVisible) ||
        (visibilityFilter === 'hidden' && !isVisible);
      
      return matchesSearch && matchesCategory && matchesVisibility;
    });
  }, [menuItems, searchTerm, selectedCategory, visibilityFilter]);

  // Helpers for category visual cues
  const getCategoryBadge = (cat: string) => {
    const normalized = cat === 'hi-tea' ? 'hi tea' : cat;
    switch (normalized) {
      case 'breakfast':
        return {
          num: '1',
          name: tText('Breakfast', 'Sarapan'),
          shortName: tText('Breakfast', 'Sarapan'),
          icon: <Coffee className="w-3.5 h-3.5" />,
          colorClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
        };
      case 'lunch':
        return {
          num: '2',
          name: tText('Lunch', 'Tengahari'),
          shortName: tText('Lunch', 'Tengahari'),
          icon: <Sun className="w-3.5 h-3.5" />,
          colorClass: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20'
        };
      case 'hi tea':
        return {
          num: '3',
          name: tText('Hi-Tea', 'Hi-Tea'),
          shortName: 'Hi-Tea',
          icon: <Cake className="w-3.5 h-3.5" />,
          colorClass: 'bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20'
        };
      case 'drinks':
      default:
        return {
          num: '4',
          name: tText('Drinks', 'Minuman'),
          shortName: tText('Drinks', 'Minuman'),
          icon: <CupSoda className="w-3.5 h-3.5" />,
          colorClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20'
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 bg-white dark:bg-card p-4 sm:p-5 rounded-xl border border-stone-200/70 dark:border-white/10 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-[var(--color-sunshine-cta)]/15 flex items-center justify-center text-deep-forest dark:text-amber-400">
              <Utensils className="w-3.5 h-3.5" />
            </span>
            <h2 className="text-sm sm:text-base font-bold text-deep-forest dark:text-stone-100">
              {tText('Menu Manager', 'Pengurus Menu')}
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 font-normal mt-1">
            {tText('Manage menu items across the 4 meal categories. Toggle customer visibility and prices.', 'Urus sajian menu mengikut 4 kategori hidangan. Tetapkan status paparan dan harga.')}
          </p>
        </div>

        {/* Stats Badges + Add Button */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold">
            <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>{visibleCount} {tText('Shown', 'Dipapar')}</span>
            </span>
            <span className="bg-stone-500/10 text-stone-600 dark:text-stone-400 border border-stone-200/60 dark:border-stone-700 px-2.5 py-1 rounded-lg flex items-center gap-1">
              <EyeOff className="w-3 h-3" />
              <span>{hiddenCount} {tText('Hidden', 'Disorot')}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleRepairImages}
              disabled={isRepairingImages}
              title={tText('Audit and repair missing menu image references', 'Periksa dan baiki imej menu')}
              className="p-1.5 sm:px-2.5 sm:py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-xs font-semibold transition-all border border-stone-200/60 dark:border-stone-700 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {isRepairingImages ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
              ) : (
                <Wrench className="w-3.5 h-3.5 text-amber-500" />
              )}
              <span className="hidden md:inline text-[11px]">{tText('Audit Images', 'Baiki Imej')}</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 bg-sunshine hover:bg-crisp-carrot text-deep-forest px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{tText('Add Item', 'Tambah Menu')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Navigation Bar */}
      <div className="space-y-2.5">
        {/* Row 1: Search & Visibility Toggle */}
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={tText('Search menu item name...', 'Cari nama hidangan...')}
              className="w-full pl-8 pr-8 h-8 sm:h-9 bg-white dark:bg-card border border-stone-200/80 dark:border-stone-800 rounded-lg text-xs text-deep-forest dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[var(--color-sunshine-cta)]"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Visibility Filter Tabs */}
          <div className="flex bg-stone-100 dark:bg-stone-800/90 p-0.5 rounded-lg border border-stone-200/70 dark:border-stone-800 shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setVisibilityFilter('all')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                visibilityFilter === 'all'
                  ? 'bg-white dark:bg-card shadow-xs text-deep-forest dark:text-stone-100'
                  : 'text-stone-500 dark:text-stone-400 hover:text-deep-forest dark:hover:text-stone-200'
              }`}
            >
              {tText('All', 'Semua')}
            </button>
            <button
              onClick={() => setVisibilityFilter('visible')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                visibilityFilter === 'visible'
                  ? 'bg-white dark:bg-card shadow-xs text-emerald-600 dark:text-emerald-400'
                  : 'text-stone-500 dark:text-stone-400 hover:text-deep-forest dark:hover:text-stone-200'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>{tText('Shown', 'Papar')}</span>
            </button>
            <button
              onClick={() => setVisibilityFilter('hidden')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                visibilityFilter === 'hidden'
                  ? 'bg-white dark:bg-card shadow-xs text-stone-700 dark:text-stone-300'
                  : 'text-stone-500 dark:text-stone-400 hover:text-deep-forest dark:hover:text-stone-200'
              }`}
            >
              <EyeOff className="w-3 h-3" />
              <span>{tText('Hidden', 'Sorot')}</span>
            </button>
          </div>
        </div>

        {/* Row 2: 4 Categories Filter Pills (Breakfast, Lunch, Hi-Tea, Drinks) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border ${
              selectedCategory === 'all' 
                ? 'bg-deep-forest text-white border-deep-forest dark:bg-amber-500 dark:text-stone-950 dark:border-amber-500 shadow-xs' 
                : 'bg-white dark:bg-card text-stone-600 dark:text-stone-300 border-stone-200/70 dark:border-stone-800 hover:border-stone-300'
            }`}
          >
            <span>{tText('All Categories', 'Semua Kategori')}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              selectedCategory === 'all' ? 'bg-white/20 text-white dark:text-stone-950 dark:bg-black/20' : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
            }`}>
              {totalCount}
            </span>
          </button>

          {/* 1 - Breakfast */}
          <button
            onClick={() => setSelectedCategory('breakfast')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border ${
              selectedCategory === 'breakfast' 
                ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-xs' 
                : 'bg-white dark:bg-card text-stone-600 dark:text-stone-300 border-stone-200/70 dark:border-stone-800 hover:border-amber-500/40'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 flex items-center justify-center text-[10px] font-black">1</span>
            <Coffee className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>{tText('Breakfast', 'Sarapan')}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              selectedCategory === 'breakfast' ? 'bg-stone-950/20 text-stone-950' : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
            }`}>
              {categoryCounts.breakfast}
            </span>
          </button>

          {/* 2 - Lunch */}
          <button
            onClick={() => setSelectedCategory('lunch')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border ${
              selectedCategory === 'lunch' 
                ? 'bg-orange-500 text-white border-orange-500 shadow-xs' 
                : 'bg-white dark:bg-card text-stone-600 dark:text-stone-300 border-stone-200/70 dark:border-stone-800 hover:border-orange-500/40'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-orange-500/20 text-orange-800 dark:text-orange-300 flex items-center justify-center text-[10px] font-black">2</span>
            <Sun className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
            <span>{tText('Lunch', 'Tengahari')}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              selectedCategory === 'lunch' ? 'bg-white/20 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
            }`}>
              {categoryCounts.lunch}
            </span>
          </button>

          {/* 3 - Hi-Tea */}
          <button
            onClick={() => setSelectedCategory('hi tea')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border ${
              selectedCategory === 'hi tea' 
                ? 'bg-pink-600 text-white border-pink-600 shadow-xs' 
                : 'bg-white dark:bg-card text-stone-600 dark:text-stone-300 border-stone-200/70 dark:border-stone-800 hover:border-pink-500/40'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-pink-500/20 text-pink-800 dark:text-pink-300 flex items-center justify-center text-[10px] font-black">3</span>
            <Cake className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
            <span>{tText('Hi-Tea', 'Hi-Tea')}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              selectedCategory === 'hi tea' ? 'bg-white/20 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
            }`}>
              {categoryCounts.hiTea}
            </span>
          </button>

          {/* 4 - Drinks */}
          <button
            onClick={() => setSelectedCategory('drinks')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border ${
              selectedCategory === 'drinks' 
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                : 'bg-white dark:bg-card text-stone-600 dark:text-stone-300 border-stone-200/70 dark:border-stone-800 hover:border-blue-500/40'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-800 dark:text-blue-300 flex items-center justify-center text-[10px] font-black">4</span>
            <CupSoda className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{tText('Drinks', 'Minuman')}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              selectedCategory === 'drinks' ? 'bg-white/20 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
            }`}>
              {categoryCounts.drinks}
            </span>
          </button>
        </div>
      </div>

      {/* Menu Cards: Streamlined 2-Parallel Row / Column Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white dark:bg-card rounded-xl border border-stone-200/60 dark:border-white/10 shadow-xs">
          <RefreshCw className="w-5 h-5 text-amber-500 animate-spin" />
          <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
            {tText('Syncing menu items with database...', 'Menyelaraskan hidangan menu bersama pangkalan data...')}
          </p>
        </div>
      ) : filteredMenuItems.length === 0 ? (
        <div className="bg-white dark:bg-card border border-dashed border-stone-300 dark:border-stone-800 rounded-xl p-12 text-center shadow-xs">
          <Info className="w-6 h-6 text-stone-400 mx-auto mb-2" />
          <h3 className="text-xs font-bold text-deep-forest dark:text-stone-100">
            {tText('No Menu Items Found', 'Tiada Hidangan Menu Ditemui')}
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 font-normal max-w-sm mx-auto mt-1">
            {tText('Try clearing your search query or selecting a different category.', 'Cuba padamkan carian atau pilih kategori lain.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
          {filteredMenuItems.map((item) => {
            const isVisible = item.available !== false;
            const badge = getCategoryBadge(item.category);
            const displayName = language === 'bm' ? (item.nameBm || item.nameEn) : (item.nameEn || item.nameBm);
            const altName = language === 'bm' ? item.nameEn : item.nameBm;
            const showAltName = altName && altName.trim().toLowerCase() !== displayName.trim().toLowerCase();

            return (
              <div 
                key={item.id}
                className={`group relative flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all duration-150 ${
                  isVisible 
                    ? 'bg-white dark:bg-card border-stone-200/80 dark:border-white/10 hover:border-amber-500/40 dark:hover:border-amber-500/30 hover:shadow-xs' 
                    : 'bg-stone-50/70 dark:bg-stone-900/40 border-stone-200/50 dark:border-white/5 opacity-70 hover:opacity-100'
                }`}
              >
                {/* Left: Category Icon & Item Name & Price */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                  {/* Category Accent Indicator */}
                  <div 
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border text-[11px] font-bold ${badge.colorClass}`}
                    title={`${badge.num} - ${badge.name}`}
                  >
                    {badge.icon}
                  </div>

                  {/* Name and Price */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <h4 className="text-xs sm:text-[13px] font-bold text-deep-forest dark:text-stone-100 truncate leading-tight">
                        {displayName}
                      </h4>
                      {showAltName && (
                        <span className="text-[10px] text-stone-400 dark:text-stone-500 hidden md:inline truncate max-w-[120px]">
                          ({altName})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-400 font-mono">
                        RM {item.price.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-stone-400 dark:text-stone-500 font-medium">
                        • {badge.shortName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Quick Show/Hide Toggle & Action Icons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Show / Hide Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleAvailable(item)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                      isVisible
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                        : 'bg-stone-200/60 text-stone-600 dark:bg-stone-800 dark:text-stone-400 border-stone-300/60 dark:border-stone-700 hover:bg-stone-200'
                    }`}
                    title={isVisible ? tText('Click to hide from customer order form', 'Klik untuk sembunyikan daripada pelanggan') : tText('Click to show to customers', 'Klik untuk paparkan kepada pelanggan')}
                  >
                    {isVisible ? (
                      <>
                        <Eye className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-[10px]">{tText('Shown', 'Papar')}</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3 text-stone-500 dark:text-stone-400" />
                        <span className="text-[10px]">{tText('Hidden', 'Sorot')}</span>
                      </>
                    )}
                  </button>

                  {/* Edit & Delete Action Buttons */}
                  <div className="flex items-center">
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="p-1.5 text-stone-400 hover:text-deep-forest dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
                      title={tText('Edit Item', 'Kemas kini Hidangan')}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id, displayName)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer"
                      title={tText('Delete Item', 'Padam Hidangan')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-[2000]">
          <div className="bg-white dark:bg-card border border-stone-200 dark:border-stone-800 max-w-md w-full rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 flex justify-between items-center bg-stone-50 dark:bg-stone-900/50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-deep-forest dark:text-white flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5 text-amber-500" />
                {editingItem ? tText('Update Menu Item', 'Kemas kini Sajian Menu') : tText('Add New Menu Item', 'Tambah Sajian Menu Baru')}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-deep-forest dark:hover:text-white transition-colors cursor-pointer p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-4 sm:p-5 space-y-3.5 max-h-[80vh] overflow-y-auto font-sans">
              {/* Show / Hide Toggle Control */}
              <div className="bg-stone-50 dark:bg-stone-900/40 p-3 rounded-lg border border-stone-200/80 dark:border-stone-800 flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-deep-forest dark:text-white block">
                    {tText('Show in Order Form', 'Papar dalam Borang Tempahan')}
                  </label>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400 font-normal mt-0.5">
                    {tText('When enabled, customers can select this item in orders.', 'Pelanggan boleh memilih hidangan ini apabila diaktifkan.')}
                  </p>
                </div>
                <Switch
                  checked={formState.available}
                  onCheckedChange={(checked) => setFormState(prev => ({ ...prev, available: checked }))}
                  aria-label={tText('Show in Order Form', 'Papar dalam Borang Tempahan')}
                />
              </div>

              {/* 4 Categories Selector */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block mb-1">
                  {tText('Meal Category (1-4)', 'Kategori Hidangan (1-4)')}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { key: 'breakfast', num: '1', label: tText('1 - Breakfast', '1 - Sarapan'), icon: <Coffee className="w-3.5 h-3.5 text-amber-500" /> },
                    { key: 'lunch', num: '2', label: tText('2 - Lunch', '2 - Tengahari'), icon: <Sun className="w-3.5 h-3.5 text-orange-500" /> },
                    { key: 'hi tea', num: '3', label: tText('3 - Hi-Tea', '3 - Hi-Tea'), icon: <Cake className="w-3.5 h-3.5 text-pink-500" /> },
                    { key: 'drinks', num: '4', label: tText('4 - Drinks', '4 - Minuman'), icon: <CupSoda className="w-3.5 h-3.5 text-blue-500" /> }
                  ].map((cat) => (
                    <button
                      type="button"
                      key={cat.key}
                      onClick={() => setFormState(prev => ({ ...prev, category: cat.key as any }))}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-bold transition-all cursor-pointer text-left ${
                        formState.category === cat.key
                          ? 'bg-amber-500/10 border-amber-500 text-deep-forest dark:text-stone-100 ring-1 ring-amber-500'
                          : 'bg-white dark:bg-card border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-50'
                      }`}
                    >
                      {cat.icon}
                      <span className="truncate">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Name (English & BM) in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block mb-1">
                    {tText('Name (English)', 'Nama (Inggeris)')}
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.nameEn}
                    onChange={(e) => setFormState(prev => ({ ...prev, nameEn: e.target.value }))}
                    placeholder="e.g. Asam Pedas"
                    className="w-full px-3 h-9 border border-stone-200 dark:border-stone-800 rounded-lg text-xs bg-white dark:bg-card text-deep-forest dark:text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-sunshine-cta)]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block mb-1">
                    {tText('Name (Bahasa Melayu)', 'Nama (Melayu)')}
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.nameBm}
                    onChange={(e) => setFormState(prev => ({ ...prev, nameBm: e.target.value }))}
                    placeholder="Contoh: Asam Pedas"
                    className="w-full px-3 h-9 border border-stone-200 dark:border-stone-800 rounded-lg text-xs bg-white dark:bg-card text-deep-forest dark:text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-sunshine-cta)]"
                  />
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block mb-1">
                  {tText('Price (RM)', 'Harga Seunit (RM)')}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">RM</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={formState.price || ''}
                    onChange={(e) => setFormState(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    placeholder="12.00"
                    className="w-full pl-10 pr-3 h-9 border border-stone-200 dark:border-stone-800 rounded-lg text-xs bg-white dark:bg-card text-deep-forest dark:text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-sunshine-cta)] font-mono font-bold"
                  />
                </div>
              </div>

              {/* Footer Buttons */}
              <ResponsiveButtonGroup stackOnMobile={false} className="justify-end pt-3 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 h-9 border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  {tText('Cancel', 'Batal')}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center justify-center gap-1.5 bg-sunshine hover:bg-crisp-carrot disabled:opacity-50 text-deep-forest px-4 h-9 font-bold text-xs rounded-lg shadow-xs transition-all cursor-pointer"
                >
                  {isSaving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{tText('Save Item', 'Simpan Menu')}</span>
                </button>
              </ResponsiveButtonGroup>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

