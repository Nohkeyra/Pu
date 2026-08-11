import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User as UserIcon, Phone, Building, Briefcase, Edit3, Check, Loader2 } from 'lucide-react';
import type { UserProfile } from '@/types';
import { SAVED_COMPANIES } from '@/constants/companies';

interface ProfileInfoTabProps {
  profile: UserProfile | null;
  isLoadingProfile?: boolean;
  editName: string;
  setEditName: (val: string) => void;
  editContact: string;
  setEditContact: (val: string) => void;
  editTo: string;
  setEditTo: (val: string) => void;
  selectedCompany: string;
  setSelectedCompany: (val: string) => void;
  editAttn: string;
  setEditAttn: (val: string) => void;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  isSaving: boolean;
  handleSaveProfile: () => void;
  t: (en: string, bm: string) => string;
}

export function ProfileInfoTab({
  profile,
  editName,
  setEditName,
  editContact,
  setEditContact,
  editTo,
  setEditTo,
  selectedCompany,
  setSelectedCompany,
  editAttn,
  setEditAttn,
  isEditing,
  setIsEditing,
  isSaving,
  handleSaveProfile,
  t,
}: ProfileInfoTabProps) {
  return (
    <div className="bg-card dark:bg-card/40 border border-stone-200/80 dark:border-white/10 rounded-xl p-5 sm:p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between pb-4 border-b border-stone-200/80 dark:border-white/10">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-deep-forest dark:text-white">
            {t('Personal & Organization Profile', 'Profil Peribadi & Organisasi')}
          </h3>
          <p className="microcopy-12 text-stone-500 dark:text-stone-400 font-normal mt-0.5">
            {t('Default contact details used for quick catering invoice generation.', 'Maklumat perhubungan utama untuk penjanaan invois katering.')}
          </p>
        </div>
        {!isEditing ? (
          <Button
            onClick={() => setIsEditing(true)}
            variant="outline"
            size="sm"
            className="rounded-lg border-stone-200 dark:border-stone-800 text-deep-forest dark:text-white hover:bg-stone-50 dark:hover:bg-stone-850 font-bold text-xs gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{t('Edit Profile', 'Kemaskini')}</span>
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsEditing(false)}
              variant="ghost"
              size="sm"
              className="rounded-lg text-stone hover:bg-stone-105 dark:hover:bg-stone-800 font-bold text-xs"
            >
              {t('Cancel', 'Batal')}
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={isSaving}
              size="sm"
              className="rounded-lg bg-crisp-carrot hover:bg-crisp-carrot/90 text-white font-bold text-xs gap-1.5"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>{t('Save', 'Simpan')}</span>
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 font-sans">
        {/* Full Name */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-stone dark:text-stone-300 flex items-center gap-1.5">
            <UserIcon className="w-3.5 h-3.5 text-crisp-carrot" />
            <span>{t('Full Name / Nama Penuh', 'Nama Penuh *')}</span>
          </Label>
          {isEditing ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder={t('Enter your full name', 'Masukkan nama penuh')}
              className="rounded-lg bg-white dark:bg-card border-stone-200 dark:border-stone-800 text-sm font-semibold h-9 focus:ring-1 focus:ring-[var(--color-sunshine-cta)]"
            />
          ) : (
            <p className="text-sm font-bold text-deep-forest dark:text-white bg-stone-50 dark:bg-stone-900/40 p-3 rounded-lg border border-stone-200/60 dark:border-white/5">
              {profile?.name || '—'}
            </p>
          )}
        </div>

        {/* Contact Phone */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-stone dark:text-stone-300 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-crisp-carrot" />
            <span>{t('Phone Number / Nombor Telefon', 'Nombor Telefon *')}</span>
          </Label>
          {isEditing ? (
            <Input
              value={editContact}
              onChange={(e) => setEditContact(e.target.value)}
              placeholder="e.g. 012-3456789"
              className="rounded-lg bg-white dark:bg-card border-stone-200 dark:border-stone-800 text-sm font-semibold h-9 focus:ring-1 focus:ring-[var(--color-sunshine-cta)]"
            />
          ) : (
            <p className="text-sm font-bold text-deep-forest dark:text-white bg-stone-50 dark:bg-stone-900/40 p-3 rounded-lg border border-stone-200/60 dark:border-white/5">
              {profile?.contact || '—'}
            </p>
          )}
        </div>

        {/* Company / Ministry */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-stone dark:text-stone-300 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-crisp-carrot" />
            <span>{t('Company / Ministry / Organisasi', 'Syarikat / Kementerian')}</span>
          </Label>
          {isEditing ? (
            <div className="space-y-2">
              <Select
                value={selectedCompany}
                onValueChange={(val) => {
                  setSelectedCompany(val);
                  if (val !== 'other') setEditTo(val);
                  else setEditTo('');
                }}
              >
                <SelectTrigger className="rounded-lg bg-white dark:bg-card border-stone-200 dark:border-stone-800 text-sm font-semibold h-9 focus:ring-1 focus:ring-[var(--color-sunshine-cta)]">
                  <SelectValue placeholder={t('Select organization', 'Pilih organisasi')} />
                </SelectTrigger>
                <SelectContent>
                  {SAVED_COMPANIES.map((comp) => (
                    <SelectItem key={comp} value={comp}>
                      {comp}
                    </SelectItem>
                  ))}
                  <SelectItem value="other">{t('Other (Custom Entry)', 'Lain-lain (Taip Sendiri)')}</SelectItem>
                </SelectContent>
              </Select>

              {selectedCompany === 'other' && (
                <Input
                  value={editTo}
                  onChange={(e) => setEditTo(e.target.value)}
                  placeholder={t('Type company or agency name', 'Taip nama syarikat/agensi')}
                  className="rounded-lg bg-white dark:bg-card border-stone-200 dark:border-stone-800 text-sm font-semibold mt-2 h-9 focus:ring-1 focus:ring-[var(--color-sunshine-cta)]"
                />
              )}
            </div>
          ) : (
            <p className="text-sm font-bold text-deep-forest dark:text-white bg-stone-50 dark:bg-stone-900/40 p-3 rounded-lg border border-stone-200/60 dark:border-white/5">
              {profile?.to || '—'}
            </p>
          )}
        </div>

        {/* Attn / Department */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-stone dark:text-stone-300 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-crisp-carrot" />
            <span>{t('Attention / Unit / Jabatan', 'Untuk Perhatian (Attn) / Unit')}</span>
          </Label>
          {isEditing ? (
            <Input
              value={editAttn}
              onChange={(e) => setEditAttn(e.target.value)}
              placeholder={t('e.g. Unit Latihan, Tingkat 4', 'Cth: Jabatan Sumber Manusia')}
              className="rounded-lg bg-white dark:bg-card border-stone-200 dark:border-stone-800 text-sm font-semibold h-9 focus:ring-1 focus:ring-[var(--color-sunshine-cta)]"
            />
          ) : (
            <p className="text-sm font-bold text-deep-forest dark:text-white bg-stone-50 dark:bg-stone-900/40 p-3 rounded-lg border border-stone-200/60 dark:border-white/5">
              {profile?.attn || '—'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
