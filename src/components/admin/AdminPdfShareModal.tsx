import { createPortal } from 'react-dom';
import { useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { X, FileDown, Share2 } from 'lucide-react';
import AdminPdfCanvasPreview from './AdminPdfCanvasPreview';
import { Button } from '@/components/ui/button';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import WawasanLoader from '@/components/brand/WawasanLoader';
import { useOverlayAccessibility } from '@/hooks/ui/useOverlayAccessibility';

interface AdminPdfShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  previewFileName: string;
  previewPdfUrl: string;
  t: (key: string) => string;
  language: string;
  toast: (args: { title: string; description: string; variant?: 'success' | 'error' | 'warning' | 'info' }) => void;
}

export function AdminPdfShareModal({
  isOpen,
  onClose,
  previewFileName,
  previewPdfUrl,
  t,
  language,
  toast,
}: AdminPdfShareModalProps) {
  const reduceMotion = useReducedMotion();
  const modalRef = useRef<HTMLDivElement>(null);
  useOverlayAccessibility({ isOpen, onClose, containerRef: modalRef });

  if (!isOpen) return null;

  const safeFileName = (previewFileName || 'Invoice.pdf').replace(/[\\/:*?"<>|]/g, '_');

  const readPdfBase64 = async (): Promise<string> => {
    if (previewPdfUrl.startsWith('data:')) return previewPdfUrl.split(',')[1];
    const response = await fetch(previewPdfUrl);
    if (!response.ok) throw new Error(`PDF request failed (${response.status})`);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleDownload = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        // Documents is persistent, unlike Cache which Android may clear.
        // Android 11+ allows the app to create and access its own documents.
        await Filesystem.writeFile({
          path: safeFileName,
          data: await readPdfBase64(),
          directory: Directory.Documents,
        });
        toast({
          title: language === 'bm' ? 'PDF Disimpan' : 'PDF Saved',
          description: language === 'bm'
            ? 'Invois disimpan dalam folder Documents.'
            : 'Invoice saved in the Documents folder.',
          variant: 'success',
        });
      } else {
        const link = document.createElement('a');
        link.href = previewPdfUrl;
        link.download = safeFileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (error) {
      console.error('Unable to save invoice PDF:', error);
      toast({
        title: language === 'bm' ? 'Gagal menyimpan PDF' : 'PDF save failed',
        description: String(error),
        variant: 'error',
      });
    }
  };

  const handleShare = async () => {
    try {
      const savedFile = await Filesystem.writeFile({
        path: safeFileName,
        data: await readPdfBase64(),
        directory: Directory.Cache,
      });
      await Share.share({ title: safeFileName, url: savedFile.uri });
    } catch (error) {
      // Closing the system sharing sheet is not an application failure.
      if (/cancel/i.test(String(error))) return;
      console.error('Unable to share invoice PDF:', error);
      toast({
        title: language === 'bm' ? 'Gagal berkongsi' : 'Share failed',
        description: String(error),
        variant: 'error',
      });
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-preview-title"
      className="fixed inset-0 z-[2000] flex items-center justify-center p-2 sm:p-6"
      id="pdf-preview-dialog-overlay"
    >
      <motion.div 
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.16 }}
        className="absolute inset-0 bg-deep-forest/90 backdrop-blur-md" 
        onClick={onClose}
      />
      
      <motion.div
        ref={modalRef}
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="w-full h-full max-w-6xl bg-white dark:bg-stone-900 border border-white/20 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden relative z-[2001]"
        onClick={(e) => e.stopPropagation()}
        id="pdf-preview-dialog-container"
      >
        {/* Header */}
        <div className="px-4 sm:px-8 py-3 sm:py-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/80 dark:bg-stone-900/80 backdrop-blur-md flex-shrink-0" id="pdf-preview-header">
          <div className="flex-1 min-w-0">
            <h2 id="pdf-preview-title" className="text-xl md:text-2xl font-display font-bold text-deep-forest dark:text-white truncate">
              {previewFileName || 'PDF Invoice Preview'}
            </h2>
            <p className="text-xs md:text-sm text-stone-500 mt-0.5">
              {t('pdf_preview_desc')}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="ml-4 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800"
            aria-label="Close"
            id="pdf-preview-close-btn"
          >
            <X className="w-6 h-6 text-stone-400" />
          </Button>
        </div>

        {/* PDF View Container */}
        <div className="flex-1 min-h-0 bg-stone-100 dark:bg-black/20 overflow-hidden relative" id="pdf-preview-viewport">
          {previewPdfUrl ? (
            <AdminPdfCanvasPreview pdfUrl={previewPdfUrl} language={language} />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 text-stone-400">
              <WawasanLoader size={64} />
              <p className="font-bold tracking-widest uppercase text-xs text-stone-500 dark:text-stone-400 animate-pulse">{t('loading') || 'Generating Document'}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-8 py-3 sm:py-5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 backdrop-blur-md flex flex-wrap gap-2 sm:gap-4 items-center justify-end flex-shrink-0" id="pdf-preview-footer">
          <Button
            id="btn-pdf-download"
            onClick={handleDownload}
            className="bg-[var(--color-sunshine-cta)] text-[var(--ui-on-action)] hover:brightness-110 rounded-2xl px-5 sm:px-10 py-3 sm:py-5 h-auto font-black shadow-xl shadow-[var(--color-sunshine-cta)]/20 transition-all active:scale-95 flex-1 md:flex-none uppercase tracking-widest"
          >
            <FileDown className="w-6 h-6 mr-3" />
            {t('download')}
          </Button>
          {Capacitor.isNativePlatform() && (
            <Button
              id="btn-pdf-share"
              variant="outline"
              onClick={handleShare}
              className="rounded-2xl px-5 sm:px-8 py-3 sm:py-5 h-auto font-bold flex-1 sm:flex-none uppercase tracking-wide border-stone-300 dark:border-stone-700"
            >
              <Share2 className="w-5 h-5 mr-2" />
              {language === 'bm' ? 'Kongsi' : 'Share'}
            </Button>
          )}
          <Button
            id="btn-pdf-preview-close"
            variant="ghost"
            onClick={onClose}
            className="hidden sm:inline-flex text-stone-500 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 rounded-2xl px-5 sm:px-10 py-3 sm:py-5 h-auto font-black uppercase tracking-widest transition-all"
          >
            {t('close')}
          </Button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
