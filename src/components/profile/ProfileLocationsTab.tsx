import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Plus, Trash2, Edit3, CheckCircle2, Building } from 'lucide-react';
import type { SavedLocation } from '@/types';

interface ProfileLocationsTabProps {
  savedLocations: SavedLocation[];
  isAddingLocation: boolean;
  setIsAddingLocation: (val: boolean) => void;
  newLocationLabel: string;
  setNewLocationLabel: (val: string) => void;
  newLocationAddress: string;
  setNewLocationAddress: (val: string) => void;
  editingLocationId: string | null;
  setEditingLocationId: (val: string | null) => void;
  handleSaveLocation?: () => void;
  handleAddLocation?: (e?: React.FormEvent) => void | Promise<void>;
  handleEditLocationClick?: (loc: SavedLocation) => void;
  handleDeleteLocation: (id: string) => void;
  handleSetDefaultLocation?: (id: string) => void;
  t: (en: string, bm: string) => string;
  tGlobal?: (key: string | number) => string;
}

export function ProfileLocationsTab({
  savedLocations,
  isAddingLocation,
  setIsAddingLocation,
  newLocationLabel,
  setNewLocationLabel,
  newLocationAddress,
  setNewLocationAddress,
  editingLocationId,
  setEditingLocationId,
  handleSaveLocation,
  handleDeleteLocation,
  handleSetDefaultLocation,
  t,
}: ProfileLocationsTabProps) {
  return (
    <div className="bg-card dark:bg-card/40 border border-stone-200/80 dark:border-white/10 rounded-xl p-5 sm:p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between pb-4 border-b border-stone-200/80 dark:border-white/10">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-deep-forest dark:text-white">
            {t('Saved Delivery Locations', 'Lokasi Penghantaran Tersimpan')}
          </h3>
          <p className="microcopy-12 text-stone-500 dark:text-stone-400 font-normal mt-0.5">
            {t('Save frequently used office halls or event addresses for 1-click catering checkout.', 'Simpan alamat pejabat/dewan untuk tempahan pantas.')}
          </p>
        </div>
        {!isAddingLocation && (
          <Button
            onClick={() => {
              setIsAddingLocation(true);
              setEditingLocationId(null);
              setNewLocationLabel('');
              setNewLocationAddress('');
            }}
            size="sm"
            className="rounded-lg bg-crisp-carrot hover:bg-crisp-carrot/90 text-white font-bold text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('Add Location', 'Tambah Lokasi')}</span>
          </Button>
        )}
      </div>

      {/* Form: Add or Edit location */}
      {isAddingLocation && (
        <div className="bg-stone-50 dark:bg-stone-900/40 p-4 rounded-xl border border-stone-200 dark:border-stone-800 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-deep-forest dark:text-white">
            {editingLocationId ? t('Edit Saved Location', 'Kemaskini Lokasi') : t('Add New Delivery Location', 'Tambah Lokasi Baru')}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-sans">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-stone-500 dark:text-stone-400">{t('Location Label / Name', 'Label Lokasi *')}</Label>
              <Input
                value={newLocationLabel}
                onChange={(e) => setNewLocationLabel(e.target.value)}
                placeholder={t('e.g. Main HQ Boardroom, Bilik Mesyuarat Utama', 'Cth: Bilik Mesyuarat Utama')}
                className="rounded-lg bg-white dark:bg-card border-stone-200 dark:border-stone-800 text-sm font-semibold h-9 focus:ring-1 focus:ring-[var(--color-sunshine-cta)]"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs font-bold text-stone-500 dark:text-stone-400">{t('Full Address', 'Alamat Penuh *')}</Label>
              <Textarea
                value={newLocationAddress}
                onChange={(e) => setNewLocationAddress(e.target.value)}
                rows={2}
                placeholder={t('Enter building name, floor, street & postcode', 'Masukkan nama bangunan, tingkat, jalan & poskod')}
                className="rounded-lg bg-white dark:bg-card border-stone-200 dark:border-stone-800 text-sm font-semibold resize-none focus:ring-1 focus:ring-[var(--color-sunshine-cta)]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              onClick={() => {
                setIsAddingLocation(false);
                setEditingLocationId(null);
              }}
              variant="ghost"
              size="sm"
              className="rounded-lg text-stone hover:bg-stone-100 dark:hover:bg-stone-800 font-bold text-xs"
            >
              {t('Cancel', 'Batal')}
            </Button>
            <Button
              onClick={handleSaveLocation}
              size="sm"
              className="rounded-lg bg-crisp-carrot hover:bg-crisp-carrot/90 text-white font-bold text-xs"
            >
              {t('Save Location', 'Simpan Lokasi')}
            </Button>
          </div>
        </div>
      )}

      {/* List of saved locations */}
      {savedLocations.length === 0 ? (
        <div className="text-center py-12 bg-stone-50/50 dark:bg-stone-900/10 rounded-xl border border-dashed border-stone-200 dark:border-stone-800">
          <MapPin className="w-6 h-6 text-stone-400 mx-auto mb-2" />
          <p className="text-xs font-bold text-deep-forest dark:text-stone-300">
            {t('No Saved Locations Yet', 'Tiada Lokasi Tersimpan')}
          </p>
          <p className="microcopy-12 text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto leading-relaxed">
            {t('Add your office address to quickly select it when creating future catering orders.', 'Tambah alamat pejabat anda untuk kemudahan tempahan katering akan datang.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedLocations.map((loc) => (
            <div
              key={loc.id}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                loc.isDefault
                  ? 'bg-stone-50/50 dark:bg-stone-900/30 border-stone-300 dark:border-stone-700 shadow-sm'
                  : 'bg-white dark:bg-card border-stone-200/80 dark:border-white/10 hover:border-stone-300 dark:hover:border-stone-800'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span className="text-xs font-bold text-deep-forest dark:text-white leading-none">{loc.label}</span>
                  </div>
                  {loc.isDefault && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200/50 dark:border-stone-700">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                      {t('Default', 'Utama')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-normal leading-relaxed pl-5">
                  {loc.address}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-white/5 text-xs">
                {!loc.isDefault ? (
                  <button
                    type="button"
                    onClick={() => handleSetDefaultLocation && handleSetDefaultLocation(loc.id)}
                    className="text-stone-500 hover:text-deep-forest dark:hover:text-stone-200 font-bold"
                  >
                    {t('Set as Default', 'Jadikan Utama')}
                  </button>
                ) : (
                  <span className="text-stone-400 dark:text-stone-500 text-[10px] font-semibold">{t('Primary Address', 'Alamat Utama')}</span>
                )}

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLocationId(loc.id);
                      setNewLocationLabel(loc.label);
                      setNewLocationAddress(loc.address);
                      setIsAddingLocation(true);
                    }}
                    className="p-1.5 text-stone-400 hover:text-deep-forest dark:hover:text-white rounded transition-colors"
                    title={t('Edit', 'Kemaskini')}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteLocation(loc.id)}
                    className="p-1.5 text-rose-400 hover:text-rose-600 rounded transition-colors"
                    title={t('Delete', 'Padam')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
