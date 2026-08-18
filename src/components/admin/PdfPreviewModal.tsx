import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { 
  X, 
  FileText, 
  Loader2, 
  FileDown 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  previewFileName: string;
  previewPdfUrl: string;
  t: (key: string) => string;
  language: string;
  toast: (args: { title: string; description: string; variant?: 'success' | 'error' | 'warning' | 'info' }) => void;
}

export function PdfPreviewModal({
  isOpen,
  onClose,
  previewFileName,
  previewPdfUrl,
  t,
  language,
  toast,
}: PdfPreviewModalProps) {
  if (!isOpen) return null;

  const handleDownloadOrShare = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        let base64data = '';
        if (previewPdfUrl.startsWith('data:')) {
          base64data = previewPdfUrl.split(',')[1];
        } else {
          const response = await fetch(previewPdfUrl);
          const blob = await response.blob();
          base64data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const res = reader.result as string;
              resolve(res.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }

        const savedFile = await Filesystem.writeFile({
          path: previewFileName,
          data: base64data,
          directory: Directory.Cache
        });

        await Share.share({
          title: previewFileName,
          url: savedFile.uri,
        });

        toast({
          title: language === 'bm' ? 'Sedia untuk Dikongsi' : 'Ready to Share',
          description: language === 'bm' ? 'Invois berjaya dibuka untuk perkongsian.' : 'Invoice shared successfully.',
          variant: 'success'
        });
      } catch (err) {
        console.error('Failed to share PDF:', err);
        toast({
          title: language === 'bm' ? 'Gagal berkongsi' : 'Share failed',
          description: String(err),
          variant: 'error'
        });
      }
    } else {
      const link = document.createElement('a');
      link.href = previewPdfUrl;
      link.download = previewFileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[2000] flex items-center justify-center p-2 sm:p-6"
      id="pdf-preview-dialog-overlay"
    >
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-deep-forest/90 backdrop-blur-md" 
        onClick={onClose}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        className="w-full h-full max-w-6xl bg-white dark:bg-stone-900 border border-white/20 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden relative z-[2001]"
        onClick={(e) => e.stopPropagation()}
        id="pdf-preview-dialog-container"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/80 dark:bg-stone-900/80 backdrop-blur-md flex-shrink-0" id="pdf-preview-header">
          <div className="flex-1">
            <h2 className="text-xl md:text-2xl font-display font-bold text-deep-forest dark:text-white truncate">
              {previewFileName || 'PDF Invoice Preview'}
            </h2>
            <p className="text-xs md:text-sm text-stone-500 mt-0.5">
              {t('pdf_preview_desc')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-all hover:rotate-90"
            aria-label="Close"
            id="pdf-preview-close-btn"
          >
            <X className="w-7 h-7 text-stone-400" />
          </button>
        </div>

        {/* PDF View Container */}
        <div className="flex-1 min-h-0 bg-stone-100 dark:bg-black/20 overflow-hidden relative" id="pdf-preview-viewport">
          {previewPdfUrl ? (
            Capacitor.isNativePlatform() ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center space-y-6">
                <div className="w-24 h-24 bg-[var(--color-sunshine-cta)]/10 dark:bg-[var(--color-sunshine-cta)]/20 rounded-[2rem] flex items-center justify-center">
                  <FileText className="w-12 h-12 text-[var(--color-sunshine-cta)]" />
                </div>
                <div className="space-y-3 max-w-sm">
                  <h3 className="text-2xl font-display font-bold text-deep-forest dark:text-white">Mobile View Restricted</h3>
                  <p className="text-sm text-stone-500 leading-relaxed">
                    In-app PDF preview is restricted by mobile security. Use the button below to download or share the invoice.
                  </p>
                </div>
              </div>
            ) : (
              <iframe
                src={previewPdfUrl}
                title="PDF Preview Frame"
                className="w-full h-full border-0"
              />
            )
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 text-stone-400">
              <Loader2 className="w-12 h-12 animate-spin text-[var(--color-sunshine-cta)]" />
              <p className="font-bold tracking-widest uppercase text-xs">{t('loading') || 'Generating Document'}</p>
            </div>
          )}
        </div>

        {/* Tip Box */}
        {!Capacitor.isNativePlatform() && (
          <div className="px-6 py-4 bg-stone-50 dark:bg-stone-800/40 border-y border-stone-200 dark:border-stone-800 text-xs flex items-center gap-4">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 text-base">💡</span>
            <p className="text-stone-600 dark:text-stone-400 leading-relaxed italic">
              {language === 'bm' 
                ? 'Nota: Jika paparan kosong, klik "Muat Turun PDF" untuk membuka fail secara manual.' 
                : 'Note: If the preview appears blank, click "Download PDF" to open the file manually.'}
            </p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-8 py-6 border-t border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 backdrop-blur-md flex flex-wrap gap-4 items-center justify-end flex-shrink-0" id="pdf-preview-footer">
          <Button
            id="btn-pdf-download"
            onClick={handleDownloadOrShare}
            className="bg-[var(--color-sunshine-cta)] text-white hover:brightness-110 rounded-2xl px-10 py-7 h-auto font-black shadow-xl shadow-[var(--color-sunshine-cta)]/20 transition-all active:scale-95 flex-1 md:flex-none uppercase tracking-widest"
          >
            <FileDown className="w-6 h-6 mr-3" />
            {t('download')}
          </Button>
          <Button
            id="btn-pdf-preview-close"
            variant="ghost"
            onClick={onClose}
            className="text-stone-500 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 rounded-2xl px-10 py-7 h-auto font-black uppercase tracking-widest transition-all"
          >
            {t('close')}
          </Button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
