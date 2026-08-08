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
    <div className="bg-card dark:bg-card/40 border border-stone/15 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-stone/15 dark:border-white/10">
        <div>
          <h3 className="text-base sm:text-lg font-bold font-display text-deep-forest dark:text-white">
            {t('Saved Delivery Locations', 'Lokasi Penghantaran Tersimpan')}
          </h3>
          <p className="microcopy-12 text-stone/80 dark:text-stone-400 font-normal">
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
            className="rounded-xl bg-crisp-carrot hover:bg-crisp-carrot/90 text-white font-bold text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('Add Location', 'Tambah Lokasi')}</span>
          </Button>
        )}
      </div>

      {/* Form: Add or Edit location */}
      {isAddingLocation && (
        <div className="bg-muted/50 p-4 rounded-2xl border border-crisp-carrot/30 space-y-4">
          <h4 className="text-sm font-bold text-deep-forest dark:text-white">
            {editingLocationId ? t('Edit Saved Location', 'Kemaskini Lokasi') : t('Add New Delivery Location', 'Tambah Lokasi Baru')}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-stone">{t('Location Label / Name', 'Label Lokasi *')}</Label>
              <Input
                value={newLocationLabel}
                onChange={(e) => setNewLocationLabel(e.target.value)}
                placeholder={t('e.g. Main HQ Boardroom, Bilik Mesyuarat Utama', 'Cth: Bilik Mesyuarat Utama')}
                className="rounded-xl bg-card border-stone/20 text-sm font-semibold"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs font-bold text-stone">{t('Full Address', 'Alamat Penuh *')}</Label>
              <Textarea
                value={newLocationAddress}
                onChange={(e) => setNewLocationAddress(e.target.value)}
                rows={2}
                placeholder={t('Enter building name, floor, street & postcode', 'Masukkan nama bangunan, tingkat, jalan & poskod')}
                className="rounded-xl bg-card border-stone/20 text-sm font-semibold"
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
              className="rounded-xl text-stone hover:bg-stone/10 font-bold text-xs"
            >
              {t('Cancel', 'Batal')}
            </Button>
            <Button
              onClick={handleSaveLocation}
              size="sm"
              className="rounded-xl bg-crisp-carrot hover:bg-crisp-carrot/90 text-white font-bold text-xs"
            >
              {t('Save Location', 'Simpan Lokasi')}
            </Button>
          </div>
        </div>
      )}

      {/* List of saved locations */}
      {savedLocations.length === 0 ? (
        <div className="text-center py-8 bg-muted/20 rounded-2xl border border-dashed border-stone/20">
          <MapPin className="w-8 h-8 text-stone/40 mx-auto mb-2" />
          <p className="text-sm font-bold text-deep-forest dark:text-white">
            {t('No Saved Locations Yet', 'Tiada Lokasi Tersimpan')}
          </p>
          <p className="microcopy-12 text-stone/80 mt-1">
            {t('Add your office address to quickly select it when creating future catering orders.', 'Tambah alamat pejabat anda untuk kemudahan tempahan katering akan datang.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {savedLocations.map((loc) => (
            <div
              key={loc.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                loc.isDefault
                  ? 'bg-crisp-carrot/5 border-crisp-carrot/40 shadow-sm'
                  : 'bg-muted/30 border-stone/15 dark:border-white/10 hover:border-stone/30'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-crisp-carrot shrink-0" />
                    <span className="text-sm font-bold text-deep-forest dark:text-white">{loc.label}</span>
                  </div>
                  {loc.isDefault && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-crisp-carrot text-white">
                      <CheckCircle2 className="w-3 h-3" />
                      {t('Default', 'Utama')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone/90 dark:text-stone-300 font-normal leading-relaxed pl-6">
                  {loc.address}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone/10 text-xs">
                {!loc.isDefault ? (
                  <button
                    type="button"
                    onClick={() => handleSetDefaultLocation(loc.id)}
                    className="text-crisp-carrot hover:underline font-bold"
                  >
                    {t('Set as Default', 'Jadikan Utama')}
                  </button>
                ) : (
                  <span className="text-stone text-[11px]">{t('Primary Address', 'Alamat Utama')}</span>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLocationId(loc.id);
                      setNewLocationLabel(loc.label);
                      setNewLocationAddress(loc.address);
                      setIsAddingLocation(true);
                    }}
                    className="p-1.5 text-stone hover:text-deep-forest dark:hover:text-white rounded-lg hover:bg-stone/10"
                    title={t('Edit', 'Kemaskini')}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteLocation(loc.id)}
                    className="p-1.5 text-red-500 hover:text-red-600 rounded-lg hover:bg-red-500/10"
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
