import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Check, 
  Phone, 
  ArrowRight, 
  User as UserIcon
} from 'lucide-react';
import { cn, getAssetUrl } from '@/lib/utils';
import { PDFPreviewModal } from '@/components/PDFPreviewModal';
import { AnimatePresence } from 'motion/react';
import AuthModal from './AuthModal';
import { OrderFormTip } from '@/components/order/OrderFormTip';
import { Step1EventMeal } from './order/Step1EventMeal';
import { Step2DishSelection } from './order/Step2DishSelection';
import { Step3ContactDetails } from './order/Step3ContactDetails';
import { Step4ReviewSubmit } from './order/Step4ReviewSubmit';
import { Step5OrderSuccess } from './order/Step5OrderSuccess';
import { triggerLightImpact } from '@/lib/haptics';
import { useOrderWizard } from '@/hooks/useOrderWizard';

interface OrderFormProps {
  initialData?: Record<string, any> | null;
}

export default function OrderForm({ initialData }: OrderFormProps) {
  const {
    orderState,
    setOrderState,
    currentStep,
    setCurrentStep,
    draftSavedAt,
    isSubmitting,
    referenceNumber,
    submittedOrder,
    showPdfPreviewModal,
    setShowPdfPreviewModal,
    authModalOpen,
    setAuthModalOpen,
    authMode,
    setAuthMode,
    currentUser,
    isProfileLoading,
    isDetectingLocation,
    emailStatus,
    savedLocations,
    dynamicMenu,
    menuLoading,
    handleDiscardDraft,
    handleResetForm,
    handleDetectLocation,
    handleToggleDish,
    handleToggleMeal,
    adjustGuests,
    handleStepNext,
    handleOrderSubmission,
    handleShareReceipt,
    getMealTypesLabel,
    tText,
    t,
    language
  } = useOrderWizard(initialData);

  return (
    <>
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} initialMode={authMode} />

      {/* Main Container with responsive layout: full width header, split 2-column view on desktop */}
      <div className="w-full max-w-6xl mx-auto font-sans space-y-6 pb-24 lg:pb-0">
        
        {/* App Header Bar mirroring Wawasan brand */}
        <div className="bg-charcoal text-white p-5 sm:p-6 rounded-2xl shadow-xl border border-charcoal/80 relative overflow-hidden">
          {/* Background Batik Pattern for Header */}
          <div 
            className="absolute inset-0 opacity-[0.25] pointer-events-none"
            style={{
              backgroundImage: `url(${getAssetUrl('/assets/batik_pattern.jpg')})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="absolute inset-0 pattern-dots opacity-20 pointer-events-none" />
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
            <div>
              <span className="microcopy-12 text-[var(--color-sunshine-cta)] font-bold uppercase tracking-widest block mb-0.5">
                {tText('CATERING BOOKING SYSTEM', 'SISTEM TEMPAHAN KATERING')}
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 font-display">
                Restoran Wawasan Pak Usop
              </h1>
              <p className="text-xs text-stone font-medium tracking-wide mt-1">
                Unit 3, Level B3, Menara PjH, Presint 2, 62100 Putrajaya
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-kiwi/20 text-kiwi text-xs font-bold border border-kiwi/30">
                <span className="w-2 h-2 rounded-full bg-kiwi animate-pulse" />
                {tText('Accepting Bookings', 'Menerima Tempahan')}
              </span>
              <a 
                href="tel:+60178582642" 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors border border-white/10"
              >
                <Phone className="w-3.5 h-3.5 text-[var(--color-sunshine-cta)]" />
                017-858 2642
              </a>
            </div>
          </div>
        </div>

        {/* Sign In / Sign Up banner for unauthenticated guests */}
        {!currentUser && (
          <div className="bg-[var(--color-sunshine-cta)]/10 border border-[var(--color-sunshine-cta)]/25 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3 text-deep-forest dark:text-stone-200">
              <div className="w-9 h-9 rounded-xl bg-[var(--color-sunshine-cta)]/15 flex items-center justify-center shrink-0">
                <UserIcon className="w-5 h-5 text-[var(--color-sunshine-cta)]" />
              </div>
              <p className="text-xs font-medium">
                <span className="font-bold block text-sm text-deep-forest dark:text-white">
                  {tText('Have an account with Restoran Wawasan?', 'Ada akaun dengan Restoran Wawasan?')}
                </span>
                {tText('Sign in or register to auto-fill your saved profile & billing details.', 'Log masuk atau daftar untuk isi automatik maklumat profil & bil anda.')}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => { setAuthMode('signin'); setAuthModalOpen(true); }}
                className="btn-cta px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold flex-1 sm:flex-initial flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>{tText('Sign In', 'Log Masuk')}</span>
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setAuthModalOpen(true); }}
                className="px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold border border-stone/20 hover:border-[var(--color-sunshine-cta)] bg-white dark:bg-card text-deep-forest dark:text-white hover:bg-stone-50 dark:hover:bg-stone-800 transition-all flex-1 sm:flex-initial flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>{tText('Sign Up', 'Daftar')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Responsive Grid: Steps Form on Left + Live Order Summary Sidebar on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Stepper Wizard & Inputs Panel */}
          <div className="lg:col-span-7 xl:col-span-8 bg-card rounded-2xl border border-stone/15 dark:border-white/10 shadow-xl overflow-hidden">
            
            <OrderFormTip language={language} />
            {/* Progress Bar Indicator */}
            {currentStep <= 4 && (
              <div className="px-6 pt-6 pb-4 bg-muted/40 border-b border-stone/10" role="navigation" aria-label={tText('Order progress', 'Kemajuan tempahan')}>
                {draftSavedAt && !initialData && (
                  <div className="flex items-center justify-between mb-3 bg-stone-100/50 dark:bg-stone-800/40 p-2 rounded-lg border border-stone/10" role="status">
                    <p className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {tText('Draft loaded from this device', 'Draf dimuatkan dari peranti ini')}
                    </p>
                    <button
                      type="button"
                      onClick={handleDiscardDraft}
                      className="text-[10.5px] font-bold text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 underline cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform select-none px-1.5 py-0.5 rounded"
                    >
                      {tText('Clear Draft & Start Fresh', 'Padam Draf & Mula Baru')}
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  {[
                    { s: 1, label: tText('Event', 'Jenis') },
                    { s: 2, label: tText('Menu', 'Menu') },
                    { s: 3, label: tText('Billing', 'Butiran') },
                    { s: 4, label: tText('Review', 'Semakan') }
                  ].map((item, idx) => {
                    const isCurrent = currentStep === item.s;
                    const isDone = currentStep > item.s;
                    return (
                      <div key={item.s} className="flex items-center flex-1 last:flex-none">
                        <div className="flex flex-col items-center gap-1 relative z-10">
                          <div
                            aria-current={isCurrent ? 'step' : undefined}
                            className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-300",
                              isCurrent
                                ? "bg-crisp-carrot border-crisp-carrot text-white shadow-crisp scale-105"
                                : isDone
                                  ? "bg-[#A8E10C] border-[#A8E10C] text-[#161618]"
                                  : "bg-muted border-stone/20 text-stone"
                            )}
                          >
                            {isDone ? <Check className="w-4 h-4" /> : item.s}
                          </div>
                          <span className={cn(
                            "microcopy-12-upper font-semibold transition-colors duration-300",
                            isCurrent ? "text-crisp-carrot font-bold" : "text-stone"
                          )}>
                            {item.label}
                          </span>
                        </div>

                        {idx < 3 && (
                          <div className="flex-1 h-[2px] mx-2 bg-stone/10 relative -translate-y-2.5" aria-hidden="true">
                            <div
                              className="absolute inset-y-0 left-0 bg-[#A8E10C] transition-all duration-500"
                              style={{ width: isDone ? '100%' : '0%' }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Form Steps Container */}
            <div className="p-6 sm:p-8">
              <AnimatePresence mode="wait">
                {/* STEP 1: PILIH JENIS MAJLIS & HIDANGAN */}
                {currentStep === 1 && (
                  <Step1EventMeal
                    orderState={orderState}
                    setOrderState={setOrderState}
                    handleToggleMeal={handleToggleMeal}
                    adjustGuests={adjustGuests}
                    handleStepNext={handleStepNext}
                    tText={tText}
                  />
                )}

                {/* STEP 2: PILIH LAUK PAUK & CALCULATE PRICE */}
                {currentStep === 2 && (
                  <Step2DishSelection
                    orderState={orderState}
                    setOrderState={setOrderState}
                    menuLoading={menuLoading}
                    dynamicMenu={dynamicMenu}
                    handleToggleDish={handleToggleDish}
                    handleStepNext={handleStepNext}
                    setCurrentStep={setCurrentStep}
                    triggerLightImpact={triggerLightImpact}
                    tText={tText}
                    t={t}
                  />
                )}

                {/* STEP 3: BUTIRAN TEMPAHAN */}
                {currentStep === 3 && (
                  <Step3ContactDetails
                    orderState={orderState}
                    setOrderState={setOrderState}
                    isProfileLoading={isProfileLoading}
                    savedLocations={savedLocations}
                    isDetectingLocation={isDetectingLocation}
                    handleDetectLocation={handleDetectLocation}
                    handleStepNext={handleStepNext}
                    setCurrentStep={setCurrentStep}
                    triggerLightImpact={triggerLightImpact}
                    tText={tText}
                    t={t}
                  />
                )}

                {/* STEP 4: REVIEW & CONFIRMATION */}
                {currentStep === 4 && (
                  <Step4ReviewSubmit
                    orderState={orderState}
                    getMealTypesLabel={getMealTypesLabel}
                    isSubmitting={isSubmitting}
                    handleOrderSubmission={handleOrderSubmission}
                    setCurrentStep={setCurrentStep}
                    triggerLightImpact={triggerLightImpact}
                    tText={tText}
                    t={t}
                  />
                )}

                {/* STEP 5: KEJAYAAN / SUCCESS */}
                {currentStep === 5 && (
                  <Step5OrderSuccess
                    orderState={orderState}
                    referenceNumber={referenceNumber}
                    getMealTypesLabel={getMealTypesLabel}
                    emailStatus={emailStatus}
                    setShowPdfPreviewModal={setShowPdfPreviewModal}
                    handleResetForm={handleResetForm}
                    handleShareReceipt={handleShareReceipt}
                    tText={tText}
                  />
                )}
              </AnimatePresence>
            </div>

          </div>

          {/* Right Column: Interactive Sticky Live Summary Card */}
          <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-28 space-y-4">
            <div className="bg-card rounded-2xl border border-stone/15 dark:border-white/10 shadow-xl p-5 sm:p-6 overflow-hidden relative">
              {/* Card Title Header */}
              <div className="flex justify-between items-center pb-3 mb-4 border-b border-stone/10">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-crisp-carrot animate-pulse" />
                  <h3 className="text-xs font-extrabold text-deep-forest dark:text-white uppercase tracking-wider font-display">
                    {tText('Live Order Summary', 'Ringkasan Tempahan')}
                  </h3>
                </div>
                <span className="microcopy-12-upper font-extrabold text-crisp-carrot bg-crisp-carrot/10 px-2.5 py-0.5 rounded-full uppercase border border-crisp-carrot/20">
                  Step {currentStep} / 4
                </span>
              </div>

              {/* Event Type & Pax Badge */}
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-stone font-medium">{tText('Event Type:', 'Jenis Majlis:')}</span>
                  <span className="font-bold text-deep-forest dark:text-white">
                    {orderState.eventType === 'pejabat' 
                      ? tText('Office Feast', 'Jamuan Pejabat') 
                      : orderState.eventType === 'lain'
                        ? tText('Private Event', 'Lain-Lain')
                        : tText('Not Selected', 'Belum Dipilih')}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-stone font-medium">{tText('Guest Count:', 'Kuantiti Pax:')}</span>
                  <span className="font-bold text-deep-forest dark:text-white">
                    {orderState.guests} {tText('pax', 'orang')}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-stone font-medium">{tText('Serving Time:', 'Hidangan Untuk:')}</span>
                  <span className="font-bold text-deep-forest dark:text-white text-right">
                    {getMealTypesLabel() || tText('Not Selected', 'Belum Dipilih')}
                  </span>
                </div>

                {orderState.date && (
                  <div className="flex justify-between items-center">
                    <span className="text-stone font-medium">{tText('Date & Time:', 'Tarikh & Masa:')}</span>
                    <span className="font-bold text-deep-forest dark:text-white">
                      {orderState.date} @ {orderState.time}
                    </span>
                  </div>
                )}

                {/* Selected Dishes Badges */}
                <div className="pt-2 border-t border-stone/10 space-y-1.5">
                  <span className="microcopy-12-upper font-extrabold text-stone uppercase tracking-wider block">
                    {tText('Selected Menu Items:', 'Menu Pilihan:')}
                  </span>
                  
                  {orderState.dishes.length > 0 || orderState.veggies.length > 0 ? (
                    <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto pr-1">
                      {orderState.dishes.map(d => (
                        <span key={d.id} className="inline-block bg-crisp-carrot/10 text-crisp-carrot font-bold px-2 py-0.5 rounded microcopy-12-upper border border-crisp-carrot/20">
                          {tText(d.nameEn, d.nameBm)}
                        </span>
                      ))}
                      {orderState.veggies.map(v => (
                        <span key={v.id} className="inline-block bg-[#A8E10C]/20 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded microcopy-12-upper border border-[#A8E10C]/30">
                          {tText(v.nameEn, v.nameBm)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="microcopy-12 text-stone italic block">
                      {tText('Select dishes in Step 2 or auto default to Box Set.', 'Pilih lauk di Langkah 2 atau ditetapkan lalai ke Set Kotak.')}
                    </span>
                  )}
                </div>

                {/* Estimation Total Calculation */}
                <div className="bg-charcoal text-white p-4 rounded-xl border border-charcoal/80 relative overflow-hidden mt-4 space-y-2">
                  <div 
                    className="absolute inset-0 opacity-[0.2] pointer-events-none"
                    style={{
                      backgroundImage: `url(${getAssetUrl('/assets/batik_pattern.jpg')})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  <div className="relative z-10 flex justify-between items-center">
                    <span className="text-stone-300 microcopy-12 font-medium uppercase tracking-wider">
                      {tText('Pricing Basis:', 'Asas Harga:')}
                    </span>
                    <span className="font-bold text-[var(--color-sunshine-cta)] text-xs uppercase tracking-wider">
                      {tText('Inquiry / Custom Quote', 'Pertanyaan / Sebut Harga')}
                    </span>
                  </div>

                  <div className="relative z-10 flex justify-between items-baseline pt-1 border-t border-white/10">
                    <span className="text-xs font-extrabold text-white uppercase tracking-wider">
                      {tText('Catering Price:', 'Harga Katering:')}
                    </span>
                    <span className="text-sm font-bold text-[var(--color-sunshine-cta)] uppercase tracking-wider font-display">
                      {tText('Quotation Pending', 'Menunggu Sebut Harga')}
                    </span>
                  </div>
                </div>

                {/* Fast Contact & Support Button */}
                <div className="pt-2">
                  <a
                    href="https://wa.me/60173157721?text=Hai%20Noh,%20saya%20hendak%20bertanya%20mengenai%20tempahan%20katering"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <Phone className="w-3.5 h-3.5 text-white" />
                    <span>{tText('Direct WhatsApp Inquiry', 'Tanya Direct WhatsApp')}</span>
                  </a>
                </div>

              </div>
            </div>
          </div>

        </div> {/* End of Responsive Grid */}
      </div> {/* End of Outer Wrapper */}

      {/* PDF Preview Modal for submitted order */}
      {submittedOrder && (
        <PDFPreviewModal
          isOpen={showPdfPreviewModal}
          onClose={() => setShowPdfPreviewModal(false)}
          order={submittedOrder}
          language={language}
        />
      )}

      {/* Sticky Mobile Price Bar (< lg breakpoint) */}
      {currentStep <= 4 && (
        <div className="fixed bottom-[calc(84px+env(safe-area-inset-bottom,12px))] left-3 right-3 sm:left-6 sm:right-6 max-w-lg mx-auto z-40 lg:hidden border border-white/20 bg-charcoal/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-all duration-300 flex items-center justify-between gap-3 text-white">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 microcopy-12-upper text-stone-300 font-semibold uppercase tracking-wider truncate">
              <span>{orderState.guests} pax</span>
              <span>•</span>
              <span className="truncate">{getMealTypesLabel() || tText('Not Selected', 'Belum Dipilih')}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-extrabold text-[var(--color-sunshine-cta)] uppercase tracking-wider shrink-0">
                {tText('Quotation Pending', 'Menunggu Sebut Harga')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {currentStep < 4 ? (
              <Button
                onClick={() => handleStepNext(currentStep)}
                className="bg-crisp-carrot hover:bg-crisp-carrot/90 text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-crisp flex items-center gap-1 cursor-pointer"
              >
                <span>{tText('Next', 'Seterusnya')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                onClick={handleOrderSubmission}
                disabled={isSubmitting}
                className="bg-crisp-carrot hover:bg-crisp-carrot/90 text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-crisp flex items-center gap-1 cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <span>{tText('Submit', 'Hantar')}</span>
                    <Check className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
