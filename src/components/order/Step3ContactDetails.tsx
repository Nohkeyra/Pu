import { useState, type Dispatch, type SetStateAction } from 'react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { 
  Loader2, 
  MapPin, 
  Truck, 
  Store, 
  ArrowLeft, 
  ArrowRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/FormError';
import { ResponsiveButtonGroup } from '@/components/ui/ResponsiveButtonGroup';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/Skeleton';
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from '@/components/ui/select';
import { SAVED_COMPANIES } from '@/constants/companies';
import { cn, getAssetUrl } from '@/lib/utils';
import type { OrderState } from '@/hooks/useOrderWizard';

interface SavedLocation {
  id: string;
  label: string;
  address: string;
}

interface Step3ContactDetailsProps {
  orderState: OrderState;
  setOrderState: Dispatch<SetStateAction<OrderState>>;
  isProfileLoading: boolean;
  savedLocations: SavedLocation[];
  isDetectingLocation: boolean;
  handleDetectLocation: () => Promise<void> | void;
  handleStepNext: (step: number) => Promise<void> | void;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  triggerLightImpact: () => Promise<void> | void;
  tText: (en: string, bm: string) => string;
  t: (key: string) => string;
}

export function Step3ContactDetails({
  orderState,
  setOrderState,
  isProfileLoading,
  savedLocations,
  isDetectingLocation,
  handleDetectLocation,
  handleStepNext,
  setCurrentStep,
  triggerLightImpact,
  tText,
  t,
}: Step3ContactDetailsProps) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateAndNext = async () => {
    const next: Record<string, string> = {};
    if (orderState.eventType === 'pejabat') {
      if (!orderState.companyName) {
        next.companyName = tText('Please select or enter a company/department.', 'Sila pilih atau masukkan syarikat/jabatan.');
      } else if (orderState.companyName === 'other' && !orderState.customCompany?.trim()) {
        next.customCompany = tText('Please enter the company/department name.', 'Sila masukkan nama syarikat/jabatan.');
      }
    }
    if (!orderState.name?.trim()) {
      next.name = tText('Please enter your full name.', 'Sila masukkan nama penuh anda.');
    }
    if (!orderState.contact?.trim() || orderState.contact.trim().length < 8) {
      next.contact = tText('Please enter a valid phone number.', 'Sila masukkan nombor telefon yang sah.');
    }
    if (!orderState.email?.trim()) {
      next.email = tText('Please enter your email for invoices.', 'Sila masukkan emel untuk invois.');
    } else if ((orderState.email || '').trim().toLowerCase() !== (orderState.confirmEmail || '').trim().toLowerCase()) {
      next.confirmEmail = tText('Email confirmation does not match.', 'Pengesahan emel tidak sepadan.');
    }
    if (!orderState.date) {
      next.date = tText('Please select the event date.', 'Sila pilih tarikh majlis.');
    }
    if (!orderState.time) {
      next.time = tText('Please select the event time.', 'Sila pilih masa majlis.');
    }
    if (!orderState.location?.trim()) {
      next.location = tText('Please enter the delivery/pickup location.', 'Sila masukkan lokasi.');
    }
    if (!orderState.delivery) {
      next.delivery = tText('Please choose delivery or pickup.', 'Sila pilih hantar atau ambil sendiri.');
    }
    setFieldErrors(next);
    if (Object.keys(next).length > 0) return;
    await handleStepNext(3);
  };

  return (
    <motion.div
      key="step3"
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-5 text-left"
    >
      <div className="bg-charcoal text-white p-5 rounded-2xl border border-charcoal/80 relative overflow-hidden shadow-md">
        {/* Background Batik Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.22] pointer-events-none"
          style={{
            backgroundImage: `url(${getAssetUrl('/assets/batik_pattern.jpg')})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 pattern-dots opacity-15 pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-base sm:text-lg font-bold tracking-wide font-display text-white">
            {tText('Enter Booking Details', 'Butiran Tempahan')}
          </h2>
          <p className="text-xs text-stone-300 font-light mt-1">
            {tText('Fill in event details, billing and delivery method.', 'Isi maklumat majlis, pembayar, dan kaedah penghantaran.')}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        
        {/* Conditionally Render Company/Department selection for Office event */}
        {orderState.eventType === 'pejabat' && (
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-stone uppercase tracking-wider">
              {tText('Syarikat / Kementerian / Jabatan', 'Syarikat / Kementerian / Jabatan *')}
            </Label>
            {isProfileLoading ? (
              <Skeleton className="h-11 w-full rounded-2xl" />
            ) : (
              <>
                <Select
                  value={orderState.companyName}
                  onValueChange={(val) => setOrderState(prev => ({ ...prev, companyName: val }))}
                  required
                >
                  <SelectTrigger className="w-full h-11 rounded-2xl border-stone/20 bg-muted focus:ring-crisp-carrot/20">
                    <SelectValue placeholder={`-- ${tText('Select Organization', 'Pilih Jabatan')} --`} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-stone/10">
                    {SAVED_COMPANIES.map((company, idx) => (
                      <SelectItem key={idx} value={company} className="text-deep-forest focus:bg-crisp-carrot/10">
                        {company}
                      </SelectItem>
                    ))}
                    <SelectItem value="other" className="text-crisp-carrot font-bold">
                      {tText('Other Organization / Syarikat Lain', 'Syarikat Lain (Taip Manual)')}
                    </SelectItem>
                  </SelectContent>
                </Select>

                {orderState.companyName === 'other' && (
                  <>
                    <Label htmlFor="custom-company-input" className="sr-only">
                      {tText('Custom Organization Name', 'Nama Organisasi Custom')}
                    </Label>
                    <Input
                      id="custom-company-input"
                      value={orderState.customCompany}
                      onChange={(e) => setOrderState(prev => ({ ...prev, customCompany: e.target.value }))}
                      placeholder={tText('Type Company/Department Name', 'Taip nama syarikat atau kementerian')}
                      required
                      className="mt-2 h-11 rounded-2xl font-sans"
                    />
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Name Input */}
        <div className="space-y-1.5">
          <Label htmlFor="contact-name" className="text-xs font-bold text-stone uppercase tracking-wider">{tText('Full Name', 'Nama Penuh *')}</Label>
          <Input
            id="contact-name"
            value={orderState.name}
            onChange={(e) => setOrderState(prev => ({ ...prev, name: e.target.value }))}
            placeholder={tText('e.g. Ahmad bin Abdullah', 'Contoh: Ahmad bin Abdullah')}
            className="h-11 rounded-2xl font-sans"
          />
        </div>

        {/* Phone Input */}
        <div className="space-y-1.5">
          <Label htmlFor="contact-phone" className="text-xs font-bold text-stone uppercase tracking-wider">{tText('Contact Phone', 'Nombor Telefon *')}</Label>
          <Input
            id="contact-phone"
            type="tel"
            value={orderState.contact}
            onChange={(e) => setOrderState(prev => ({ ...prev, contact: e.target.value }))}
            placeholder={tText('e.g. 012-345 6789', 'Contoh: 012-345 6789')}
            className="h-11 rounded-2xl font-sans"
          />
        </div>

        {/* Email & Confirm Email Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="contact-email" className="text-xs font-bold text-stone uppercase tracking-wider">{tText('Email Address', 'Alamat E-mel *')}</Label>
            <Input
              id="contact-email"
              type="email"
              value={orderState.email}
              onChange={(e) => setOrderState(prev => ({ ...prev, email: e.target.value }))}
              placeholder={tText('e.g. ahmad@gmail.com', 'Contoh: ahmad@gmail.com')}
              className="h-11 rounded-2xl font-sans"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-confirm-email" className="text-xs font-bold text-stone uppercase tracking-wider">{tText('Confirm Email', 'Sahkan E-mel *')}</Label>
            <Input
              id="contact-confirm-email"
              type="email"
              value={orderState.confirmEmail}
              onChange={(e) => setOrderState(prev => ({ ...prev, confirmEmail: e.target.value }))}
              placeholder={tText('Re-type email address', 'Ulang alamat e-mel')}
              className="h-11 rounded-2xl font-sans"
            />
          </div>
        </div>

        {/* Date & Time Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="event-date" className="text-xs font-bold text-stone uppercase tracking-wider">{tText('Event Date', 'Tarikh Majlis *')}</Label>
            <input
              id="event-date"
              type="date"
              value={orderState.date}
              min={format(new Date(), 'yyyy-MM-dd')}
              onChange={(e) => setOrderState(prev => ({ ...prev, date: e.target.value }))}
              className="w-full h-11 px-4 border border-stone/10 bg-card text-deep-forest rounded-2xl font-sans text-sm focus:outline-none focus:border-crisp-carrot focus:ring-2 focus:ring-crisp-carrot/10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event-time" className="text-xs font-bold text-stone uppercase tracking-wider">{tText('Serving Time', 'Masa Majlis *')}</Label>
            <input
              id="event-time"
              type="time"
              value={orderState.time}
              onChange={(e) => setOrderState(prev => ({ ...prev, time: e.target.value }))}
              className="w-full h-11 px-4 border border-stone/10 bg-card text-deep-forest rounded-2xl font-sans text-sm focus:outline-none focus:border-crisp-carrot focus:ring-2 focus:ring-crisp-carrot/10"
            />
          </div>
        </div>

        {/* Geolocation Autocomplete Venue Location */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <Label htmlFor="contact-location" className="text-xs font-bold text-stone uppercase tracking-wider">
              {tText('Event Venue Address', 'Lokasi / Alamat Majlis *')}
            </Label>
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={isDetectingLocation}
              className="inline-flex items-center gap-1 microcopy-12 font-bold text-crisp-carrot hover:text-crisp-carrot/80 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isDetectingLocation ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{tText('Detecting...', 'Mengesan...')}</span>
                </>
              ) : (
                <>
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{tText('Autofill Location', 'Kesan Lokasi')}</span>
                </>
              )}
            </button>
          </div>

          {savedLocations.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1 pb-1">
              <span className="microcopy-12-upper text-stone font-bold uppercase tracking-wider block w-full">
                {tText('Choose from Saved Locations:', 'Pilih dari Lokasi Disimpan:')}
              </span>
              {savedLocations.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => setOrderState(prev => ({ ...prev, location: loc.address }))}
                  className={cn(
                    "px-3 py-1.5 bg-cream/30 dark:bg-card border border-stone/10 hover:border-[var(--color-sunshine-cta)] microcopy-12 font-medium rounded-xl text-deep-forest transition-all cursor-pointer",
                    orderState.location === loc.address && "border-[var(--color-sunshine-cta)] bg-[var(--color-sunshine-cta)]/5 ring-1 ring-[var(--color-sunshine-cta)]"
                  )}
                >
                  {loc.label}
                </button>
              ))}
            </div>
          )}

          <Textarea
            id="contact-location"
            value={orderState.location}
            onChange={(e) => setOrderState(prev => ({ ...prev, location: e.target.value }))}
            placeholder={tText('e.g. No 10, Jalan Presint 8, Putrajaya', 'Contoh: No 10, Jalan Presint 8, Putrajaya')}
            className="rounded-2xl min-h-[70px] font-sans"
          />
        </div>

        {/* Delivery vs Pickup Method Cards */}
        <div className="space-y-2 pt-1">
          <Label className="text-xs font-bold text-stone uppercase tracking-wider">{tText('Delivery Method', 'Kaedah Penghantaran')}</Label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label={tText('Delivery method', 'Kaedah Penghantaran')}>
            <button
              type="button"
              role="radio"
              aria-checked={orderState.delivery === 'delivery'}
              onClick={() => setOrderState(prev => ({ ...prev, delivery: 'delivery' }))}
              className={cn(
                "p-5 rounded-2xl border text-center transition-all duration-300 flex flex-col items-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-crisp-carrot/40",
                orderState.delivery === 'delivery'
                  ? "bg-crisp-carrot/15 border-crisp-carrot text-crisp-carrot shadow-sm"
                  : "bg-muted border-stone/15 text-stone"
              )}
            >
              <Truck className="w-5 h-5 text-crisp-carrot" />
              <span className="text-xs font-bold block">{tText('Delivery to Location', 'Hantar ke Lokasi')}</span>
              <span className="microcopy-12 text-stone leading-tight font-light">{tText('Delivered to your event address.', 'Dihantar terus ke tapak majlis.')}</span>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={orderState.delivery === 'pickup'}
              onClick={() => setOrderState(prev => ({ ...prev, delivery: 'pickup' }))}
              className={cn(
                "p-5 rounded-2xl border text-center transition-all duration-300 flex flex-col items-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-crisp-carrot/40",
                orderState.delivery === 'pickup'
                  ? "bg-crisp-carrot/15 border-crisp-carrot text-crisp-carrot shadow-sm"
                  : "bg-muted border-stone/15 text-stone"
              )}
            >
              <Store className="w-5 h-5 text-crisp-carrot" />
              <span className="text-xs font-bold block">{tText('Pickup at Restaurant', 'Ambil di Restoran')}</span>
              <span className="microcopy-12 text-stone leading-tight font-light">{tText('Collect directly from Pak Usop.', 'Ambil sendiri di Restoran Wawasan.')}</span>
            </button>
          </div>
        </div>

        {/* Notes input */}
        <div className="space-y-1.5 pt-1">
          <Label htmlFor="contact-notes" className="text-xs font-bold text-stone uppercase tracking-wider">{tText('Additional Notes (Optional)', 'Nota Tambahan (pilihan)')}</Label>
          <Textarea
            id="contact-notes"
            value={orderState.notes}
            onChange={(e) => setOrderState(prev => ({ ...prev, notes: e.target.value }))}
            placeholder={tText('e.g. Vegetarian attendees, buffer tables needed, etc.', 'Contoh: Ada tetamu yang vegetarian, perlu meja buffet, dll.')}
            className="rounded-2xl min-h-[70px] font-sans"
          />
        </div>

      </div>

      {Object.keys(fieldErrors).length > 0 && (
        <FormError
          message={tText(
            'Please fix the highlighted fields before continuing.',
            'Sila lengkapkan medan yang diperlukan sebelum teruskan.'
          )}
        />
      )}

      {/* Buttons Navigation */}
      <ResponsiveButtonGroup stackOnMobile={false} className="pt-2">
        <Button
          onClick={async () => { await triggerLightImpact(); setCurrentStep(2); }}
          variant="outline"
          className="flex-1 border-stone/20 h-12 rounded-2xl font-bold text-sm text-stone cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          {t('back')}
        </Button>
        <Button
          onClick={validateAndNext}
          className="flex-1 bg-crisp-carrot hover:bg-crisp-carrot/95 text-white h-12 rounded-2xl font-bold text-sm shadow-crisp"
        >
          {tText('Next: Review', 'Seterusnya: Semak')}
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </ResponsiveButtonGroup>
    </motion.div>
  );
}
