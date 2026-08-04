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
  CupSoda
} from 'lucide-react';
import type { ToastMessage } from '../ui/Toast';

export interface MenuItem {
  id: string;
  nameEn: string;
  nameBm: string;
  descEn: string;
  descBm: string;
  price: number;
  category: 'breakfast' | 'lunch' | 'hi tea' | 'drinks';
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
  
  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formState, setFormState] = useState<Omit<MenuItem, 'id'>>({
    nameEn: '',
    nameBm: '',
    descEn: '',
    descBm: '',
    price: 0,
    category: 'lunch'
  });
  const [isSaving, setIsSaving] = useState(false);

  const tText = (en: string, bm: string) => (language === 'bm' ? bm : en);

  const fetchMenuItems = async () => {
    setLoading(true);
    try {
      const response = await fetch(getApiUrl('/api/menu'));
      if (!response.ok) throw new Error('Failed to fetch menu items');
      const data = await response.json();
      setMenuItems(data.menuItems || []);
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
      category: 'lunch'
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
      category: item.category
    });
    setIsModalOpen(true);
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

  // Filtered list
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesSearch = 
        item.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.nameBm.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.descEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.descBm.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [menuItems, searchTerm, selectedCategory]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-card p-4 rounded-2xl border border-stone/10 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-deep-forest font-display flex items-center gap-2">
            <Utensils className="w-5 h-5 text-[var(--color-sunshine-cta)]" />
            {tText('Catering Menu Manager', 'Pengurus Menu Katering')}
          </h2>
          <p className="text-xs text-stone font-light mt-0.5">
            {tText('Customize food packages and prices dynamically for clients.', 'Sesuaikan hidangan pakej makanan dan harga secara dinamik untuk klien.')}
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 bg-[#A8E10C] hover:bg-[#96cc0a] text-deep-forest px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          {tText('Add Menu Item', 'Tambah Hidangan')}
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-3 items-center">
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone/60" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={tText('Search menu item name or desc...', 'Cari nama atau deskripsi hidangan...')}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-card border border-stone/15 rounded-xl text-xs text-deep-forest focus:outline-none focus:ring-1 focus:ring-[var(--color-sunshine-cta)]"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone/50 hover:text-stone"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Filters */}
        <div className="flex bg-muted/60 p-1 rounded-xl border border-stone/5 w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              selectedCategory === 'all' 
                ? 'bg-white dark:bg-card shadow text-deep-forest' 
                : 'text-stone hover:text-deep-forest'
            }`}
          >
            {tText('All', 'Semua')}
          </button>
          <button
            onClick={() => setSelectedCategory('breakfast')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
              selectedCategory === 'breakfast' 
                ? 'bg-white dark:bg-card shadow text-deep-forest' 
                : 'text-stone hover:text-deep-forest'
            }`}
          >
            <Coffee className="w-3.5 h-3.5 text-amber-500" />
            {tText('Breakfast', 'Sarapan')}
          </button>
          <button
            onClick={() => setSelectedCategory('lunch')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
              selectedCategory === 'lunch' 
                ? 'bg-white dark:bg-card shadow text-deep-forest' 
                : 'text-stone hover:text-deep-forest'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-orange-500" />
            {tText('Lunch', 'Tengahari')}
          </button>
          <button
            onClick={() => setSelectedCategory('hi tea')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
              selectedCategory === 'hi tea' 
                ? 'bg-white dark:bg-card shadow text-deep-forest' 
                : 'text-stone hover:text-deep-forest'
            }`}
          >
            <Cake className="w-3.5 h-3.5 text-pink-500" />
            {tText('Hi Tea', 'Hi-Tea')}
          </button>
          <button
            onClick={() => setSelectedCategory('drinks')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
              selectedCategory === 'drinks' 
                ? 'bg-white dark:bg-card shadow text-deep-forest' 
                : 'text-stone hover:text-deep-forest'
            }`}
          >
            <CupSoda className="w-3.5 h-3.5 text-blue-500" />
            {tText('Drinks', 'Minuman')}
          </button>
        </div>
      </div>

      {/* Menu Cards List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw className="w-8 h-8 text-[var(--color-sunshine-cta)] animate-spin" />
          <p className="text-xs text-stone font-light">
            {tText('Syncing menu items with Firestore...', 'Menyelaraskan hidangan menu bersama Firestore...')}
          </p>
        </div>
      ) : filteredMenuItems.length === 0 ? (
        <div className="bg-white dark:bg-card border border-dashed border-stone/25 rounded-2xl p-12 text-center">
          <Info className="w-8 h-8 text-stone/50 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-deep-forest">
            {tText('No Menu Items Found', 'Tiada Hidangan Menu Ditemui')}
          </h3>
          <p className="text-xs text-stone font-light max-w-sm mx-auto mt-1">
            {tText('You can add custom breakfast, lunch or hi tea dishes and prices directly using the Add button.', 'Anda boleh menambah hidangan sarapan, makan tengah hari atau hi tea serta harganya terus menggunakan butang Tambah.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMenuItems.map(item => (
            <div 
              key={item.id}
              className="bg-white dark:bg-card border border-stone/10 p-4 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <div>
                {/* Header with Category Badge */}
                <div className="flex justify-between items-start mb-2.5">
                  <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full ${
                    item.category === 'breakfast'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      : item.category === 'lunch'
                      ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20'
                      : item.category === 'hi tea'
                      ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20'
                      : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                  }`}>
                    {item.category === 'breakfast' 
                      ? tText('🍳 Breakfast', '🍳 Sarapan') 
                      : item.category === 'lunch' 
                      ? tText('🍛 Lunch', '🍛 Tengahari') 
                      : item.category === 'hi tea'
                      ? tText('🍰 Hi-Tea', '🍰 Hi-Tea')
                      : tText('🥤 Drinks', '🥤 Minuman')}
                  </span>
                  <span className="text-sm font-black text-crisp-carrot">
                    RM {item.price.toFixed(2)}
                  </span>
                </div>

                {/* Name */}
                <h4 className="text-sm font-bold text-deep-forest block">
                  {tText(item.nameEn, item.nameBm)}
                </h4>

                {/* Subtitle / Description */}
                <p className="text-xs text-stone font-light mt-1 line-clamp-2">
                  {tText(item.descEn || '-', item.descBm || '-')}
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 border-t border-stone/5 pt-3 mt-4">
                <button
                  onClick={() => handleOpenEditModal(item)}
                  className="p-2 bg-muted hover:bg-muted/80 text-stone hover:text-deep-forest border border-stone/10 rounded-lg transition-colors"
                  title={tText('Edit Item', 'Kemas kini Hidangan')}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteItem(item.id, tText(item.nameEn, item.nameBm))}
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg border border-red-500/10 transition-colors"
                  title={tText('Delete Item', 'Padam Hidangan')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Dialog/Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-card border border-stone/10 max-w-md w-full rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-stone/10 flex justify-between items-center bg-muted/35">
              <h3 className="text-sm font-black uppercase tracking-wider text-deep-forest">
                {editingItem ? tText('Update Menu Item', 'Kemas kini Sajian Menu') : tText('Add New Menu Item', 'Tambah Sajian Menu Baru')}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-stone/70 hover:text-deep-forest"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-5 space-y-4">
              {/* Category */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-stone block mb-1">
                  {tText('Meal Category', 'Kategori Hidangan')}
                </label>
                <select
                  value={formState.category}
                  onChange={(e) => setFormState(prev => ({ ...prev, category: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-stone/15 rounded-xl text-xs bg-white dark:bg-card text-deep-forest focus:outline-none focus:ring-1 focus:ring-[var(--color-sunshine-cta)]"
                >
                  <option value="breakfast">{tText('Breakfast (Sarapan)', 'Sarapan (Breakfast)')}</option>
                  <option value="lunch">{tText('Lunch (Tengahari)', 'Tengahari (Lunch)')}</option>
                  <option value="hi tea">{tText('Hi Tea', 'Hi Tea')}</option>
                  <option value="drinks">{tText('Drinks (Minuman)', 'Minuman (Drinks)')}</option>
                </select>
              </div>

              {/* Name (EN) */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-stone block mb-1">
                  {tText('Name (English)', 'Nama (Inggeris)')}
                </label>
                <input
                  type="text"
                  required
                  value={formState.nameEn}
                  onChange={(e) => setFormState(prev => ({ ...prev, nameEn: e.target.value }))}
                  placeholder="e.g. Classic Beef Lasagna"
                  className="w-full px-3 py-2 border border-stone/15 rounded-xl text-xs bg-white dark:bg-card text-deep-forest focus:outline-none focus:ring-1 focus:ring-[var(--color-sunshine-cta)]"
                />
              </div>

              {/* Name (BM) */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-stone block mb-1">
                  {tText('Name (Bahasa Melayu)', 'Nama (Bahasa Melayu)')}
                </label>
                <input
                  type="text"
                  required
                  value={formState.nameBm}
                  onChange={(e) => setFormState(prev => ({ ...prev, nameBm: e.target.value }))}
                  placeholder="Contoh: Lasagna Daging Klasik"
                  className="w-full px-3 py-2 border border-stone/15 rounded-xl text-xs bg-white dark:bg-card text-deep-forest focus:outline-none focus:ring-1 focus:ring-[var(--color-sunshine-cta)]"
                />
              </div>

              {/* Price */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-stone block mb-1">
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
                  className="w-full px-3 py-2 border border-stone/15 rounded-xl text-xs bg-white dark:bg-card text-deep-forest focus:outline-none focus:ring-1 focus:ring-[var(--color-sunshine-cta)]"
                />
              </div>

              {/* Description (EN) */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-stone block mb-1">
                  {tText('Description (English)', 'Deskripsi (Inggeris)')}
                </label>
                <textarea
                  value={formState.descEn}
                  onChange={(e) => setFormState(prev => ({ ...prev, descEn: e.target.value }))}
                  placeholder="Briefly describe the dish options..."
                  className="w-full px-3 py-2 border border-stone/15 rounded-xl text-xs bg-white dark:bg-card text-deep-forest focus:outline-none focus:ring-1 focus:ring-[var(--color-sunshine-cta)] min-h-[60px]"
                />
              </div>

              {/* Description (BM) */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-stone block mb-1">
                  {tText('Description (Bahasa Melayu)', 'Deskripsi (Bahasa Melayu)')}
                </label>
                <textarea
                  value={formState.descBm}
                  onChange={(e) => setFormState(prev => ({ ...prev, descBm: e.target.value }))}
                  placeholder="Terangkan secara ringkas bahan atau butiran hidangan..."
                  className="w-full px-3 py-2 border border-stone/15 rounded-xl text-xs bg-white dark:bg-card text-deep-forest focus:outline-none focus:ring-1 focus:ring-[var(--color-sunshine-cta)] min-h-[60px]"
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-stone/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-stone/15 hover:bg-muted text-stone font-bold text-xs rounded-xl transition-all"
                >
                  {tText('Cancel', 'Batal')}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 bg-[#A8E10C] hover:bg-[#96cc0a] disabled:bg-muted text-deep-forest px-5 py-2 font-black uppercase tracking-wider text-xs rounded-xl shadow-sm transition-all"
                >
                  {isSaving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  {tText('Save', 'Simpan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
