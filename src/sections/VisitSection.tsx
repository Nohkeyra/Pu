import { MapPin, Clock, Phone, ArrowRight, Navigation } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { getAssetUrl } from '@/lib/utils';
import { motion } from 'motion/react';
import { Batik3DMotion } from '@/components/Batik3DMotion';

export default function VisitSection() {
  const { t, language } = useLanguage();

  const HOURS = [
    { day: t('mon_thu'), time: t('time_730_400') },
    { day: t('friday'), time: t('time_730_400'), note: t('rojak_note') },
    { day: t('saturday'), time: t('closed') },
    { day: t('sunday'), time: t('closed') },
  ];

  const headerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.12,
      },
    },
  };

  const headerItemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
    },
  };

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
    },
  };

  const ctaVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
    },
  };

  return (
    <section id="visit" className="section-padding bg-cream relative overflow-hidden paper-texture kp-songkok">
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-sunshine/10 to-transparent pointer-events-none" />
      <div className="content-container relative">
        <motion.div 
          variants={headerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="mb-12"
        >
          <motion.div variants={headerItemVariants} className="visit-animate mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <span className="text-xs font-semibold text-deep-forest/80 uppercase tracking-[0.2em]">
                {t('visit_us')}
              </span>
            </div>
          </motion.div>
          <motion.h2 variants={headerItemVariants} className="visit-animate font-display font-semibold text-[36px] md:text-[52px] text-deep-forest leading-[1.05] mb-4">
            {t('come_dine')}
          </motion.h2>
          <motion.p variants={headerItemVariants} className="visit-animate font-body text-lg text-deep-forest/70 max-w-[620px] leading-relaxed font-light">
            {language === 'bm'
              ? 'Lokasi di Menara PjH menjadikan Restoran Wawasan Pak Usop pilihan mudah untuk sarapan, makan tengah hari, mesyuarat, dan singgah selepas urusan di Putrajaya.'
              : 'Located in Menara PjH, Restoran Wawasan Pak Usop is an easy stop for breakfast, lunch, meetings, and day-to-day dining in Putrajaya.'}
          </motion.p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          <div className="lg:col-span-5">
            <div className="relative rounded-[28px] overflow-hidden aspect-[4/5] mb-6 group border border-white/[0.08] shadow-2xl">
              <img
                src={getAssetUrl("/assets/restoran-exterior.jpg")}
                alt="Restoran Wawasan"
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = getAssetUrl('/assets/wawasan_logo.jpg');
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-cream via-cream/20 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <div className="bg-cream-dark/95 backdrop-blur-md rounded-2xl p-5 border border-white/10 shadow-xl group-hover:border-sunshine/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                      <MapPin className="w-6 h-6 text-sunshine" />
                    </div>
                    <div>
                      <p className="text-deep-forest font-medium">Menara PjH, Presint 2</p>
                      <p className="text-deep-forest/70 text-sm">Unit 3, Level B3, Putrajaya</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <a
                href="https://www.google.com/maps/search/?api=1&query=Restoran+Wawasan+Pak+Usop+Menara+PjH+Putrajaya"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-sunshine to-crisp-carrot text-white rounded-full font-semibold text-sm hover:shadow-[0_8px_30px_rgba(232,144,37,0.2)] hover:scale-105 transition-all"
              >
                <Navigation className="w-4 h-4" />
                {t('get_directions')}
              </a>
              <a
                href="tel:+60178582642"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-white/5 text-deep-forest rounded-full font-semibold text-sm hover:bg-white/10 transition-all border border-white/10"
              >
                <Phone className="w-4 h-4 text-sunshine" />
                {t('call_now')}
              </a>
            </div>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            className="lg:col-span-7 flex flex-col gap-6"
          >
            <motion.div variants={cardVariants} className="info-card bg-cream-dark/60 backdrop-blur-md rounded-[2.5rem] p-6 md:p-8 border border-white/[0.06] hover:border-sunshine/20 hover:shadow-xl transition-all duration-500">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-sunshine" />
                </div>
                <h3 className="font-display font-bold text-deep-forest text-2xl">{t('hours')}</h3>
              </div>
              
              <div className="space-y-4">
                {HOURS.map((h) => (
                  <div key={h.day} className="flex justify-between items-center py-4 border-b border-white/5 last:border-0 group gap-6">
                    <span className="text-deep-forest/70 font-medium group-hover:text-deep-forest transition-colors">{h.day}</span>
                    <div className="text-right">
                      <span className={`font-bold ${h.time === 'Closed' || h.time === 'Tutup' ? 'text-crisp-carrot' : 'text-deep-forest'}`}>
                        {h.time}
                      </span>
                      {h.note && <span className="block text-[11px] text-sunshine/90 font-medium uppercase tracking-[0.14em] mt-1">{h.note}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div variants={cardVariants} className="info-card bg-cream-dark/60 backdrop-blur-md rounded-[2.5rem] p-6 md:p-8 border border-white/[0.06] hover:border-sunshine/20 hover:shadow-xl transition-all duration-500">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Phone className="w-6 h-6 text-sunshine" />
                </div>
                <h3 className="font-display font-bold text-deep-forest text-2xl">Contact</h3>
              </div>
              
              <div className="space-y-5 text-base">
                <a href="tel:+60178582642" className="flex items-center gap-4 text-deep-forest hover:text-sunshine transition-colors group">
                  <span className="text-deep-forest/70 w-24 font-medium group-hover:text-sunshine transition-colors">Call</span>
                  <span className="font-bold">+60 17-858 2642</span>
                  <span className="text-sm text-deep-forest/50 font-medium">(Pak Usop)</span>
                </a>
                <a href="https://wa.me/60173157721" className="flex items-center gap-4 text-deep-forest hover:text-sunshine transition-colors group">
                  <span className="text-deep-forest/70 w-24 font-medium group-hover:text-sunshine transition-colors">WhatsApp</span>
                  <span className="font-bold">+60 17-315 7721</span>
                  <span className="text-sm text-deep-forest/50 font-medium">(Mad)</span>
                </a>
                <div className="flex items-center gap-4 text-deep-forest/70">
                  <span className="w-24 font-medium">Email</span>
                  <span className="font-medium text-deep-forest">wawasan.orders@gmail.com</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <motion.div 
          variants={ctaVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="mt-16 relative rounded-[32px] p-8 md:p-12 overflow-hidden group border border-deep-forest/10 shadow-2xl bg-sunshine"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-sunshine via-honey to-sunshine animate-gradient-shift bg-[length:200%_auto]" />
          <Batik3DMotion
            mode="background"
            opacity={0.25}
            mixBlendMode="overlay"
            maxRotation={18}
          />
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 text-white">
            <div className="text-center md:text-left">
              <h3 className="font-display font-bold text-3xl md:text-4xl">
                {t('cta_title')}
              </h3>
              <p className="mt-3 text-white/90 text-lg font-medium max-w-xl">
                {t('cta_subtitle')}
              </p>
            </div>
            <a
              href="tel:+60178582642"
              className="inline-flex shrink-0 items-center gap-2 px-8 py-4 bg-white text-sunshine rounded-full font-bold hover:scale-105 transition-all shadow-xl"
            >
              {t('contact_pak_usop')}
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
