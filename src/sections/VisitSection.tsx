import { motion } from 'motion/react';
import { MapPin, Phone, Mail, Clock, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function VisitSection() {
  const { language } = useLanguage();
  const isBm = language === 'bm';

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
    }
  };

  return (
    <section id="visit" className="py-24 bg-white dark:bg-zinc-950 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-sunshine/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-deep-forest/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid lg:grid-cols-2 gap-16 items-center"
        >
          {/* Left Column: Info */}
          <div className="space-y-12">
            <motion.div variants={itemVariants} className="space-y-6">
              <div className="space-y-4">
                <h2 className="text-deep-forest dark:text-sunshine font-display text-4xl md:text-5xl font-bold tracking-tight">
                  {isBm ? 'Jemput Datang' : 'Visit Us'}
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 text-lg max-w-md leading-relaxed">
                  {isBm 
                    ? 'Nikmati hidangan asli Malaysia dengan pemandangan tasik yang tenang di tengah-tengah Putrajaya.' 
                    : 'Experience authentic Malaysian flavors with a serene lakeside view in the heart of Putrajaya.'}
                </p>
              </div>
              
              <div className="relative rounded-3xl overflow-hidden aspect-[16/10] shadow-xl border border-zinc-200 dark:border-zinc-800">
                <img 
                  src="/assets/restoran-exterior.jpg" 
                  alt="Restoran Wawasan Exterior" 
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-8">
              <motion.div variants={itemVariants} className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-sunshine/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-6 h-6 text-sunshine" />
                </div>
                <div>
                  <h3 className="font-bold text-deep-forest dark:text-white mb-1">
                    {isBm ? 'Lokasi' : 'Location'}
                  </h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                    Unit 3, Level B3, Menara PjH, Jalan P2a, Presint 2, 62100 Putrajaya
                  </p>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-sunshine/10 flex items-center justify-center shrink-0">
                  <Phone className="w-6 h-6 text-sunshine" />
                </div>
                <div>
                  <h3 className="font-bold text-deep-forest dark:text-white mb-1">
                    {isBm ? 'Hubungi' : 'Contact'}
                  </h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                    {isBm ? 'Telefon' : 'Call'}: +60 17-858 2642<br />
                    WhatsApp: +60 17-315 7721
                  </p>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-sunshine/10 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6 text-sunshine" />
                </div>
                <div>
                  <h3 className="font-bold text-deep-forest dark:text-white mb-1">
                    {isBm ? 'Waktu Operasi' : 'Hours'}
                  </h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                    {isBm ? 'Isnin - Jumaat' : 'Mon - Fri'}: 7:30 AM - 5:30 PM<br />
                    {isBm ? 'Sabtu - Ahad' : 'Sat - Sun'}: {isBm ? 'Tutup (Kecuali Tempahan)' : 'Closed (Except Catering)'}
                  </p>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-sunshine/10 flex items-center justify-center shrink-0">
                  <Mail className="w-6 h-6 text-sunshine" />
                </div>
                <div>
                  <h3 className="font-bold text-deep-forest dark:text-white mb-1">
                    {isBm ? 'E-mel' : 'Email'}
                  </h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                    wawasan.orders@gmail.com
                  </p>
                </div>
              </motion.div>
            </div>

            <motion.div variants={itemVariants}>
              <a 
                href="https://maps.app.goo.gl/F1aswiA657kzhf298" 
                target="_blank" 
                rel="noreferrer"
                style={{ backgroundColor: '#287407', color: '#ffc701', fontFamily: 'Verdana, sans-serif' }}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-deep-forest/20"
              >
                {isBm ? 'Dapatkan Arah' : 'Get Directions'}
                <ExternalLink className="w-4 h-4" />
              </a>
            </motion.div>
          </div>

          {/* Right Column: Map */}
          <motion.div 
            variants={itemVariants}
            className="relative aspect-square md:aspect-video lg:aspect-auto lg:h-[600px] rounded-[32px] overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-2xl"
          >
            <iframe 
              src="https://maps.google.com/maps?q=Unit%203,%20Level%20B3,%20Restoran%20Wawasan%20Pak%20Usop,%20Menara%20PjH,%20Jalan%20P2a,%20Presint%202,%2062100%20Putrajaya&t=&z=16&ie=UTF8&iwloc=&output=embed" 
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              allowFullScreen={false} 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
              className="grayscale-[0.2] contrast-[1.1] hover:grayscale-0 transition-all duration-700"
              title="Restoran Wawasan Map Location"
            />
            
            {/* Map Overlay Card */}
            <div className="absolute bottom-6 left-6 right-6 p-6 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl hidden sm:block">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-sunshine rounded-xl">
                  <MapPin className="w-5 h-5 text-deep-forest" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-sunshine mb-0.5">Found us at</p>
                  <p className="text-sm font-bold text-deep-forest dark:text-white">Unit 3, Level B3, Menara PjH, Putrajaya</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
