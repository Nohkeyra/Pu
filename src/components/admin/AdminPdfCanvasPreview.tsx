import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import type { RenderTask } from 'pdfjs-dist/types/src/display/api';
import { Minus, Plus, Scan } from 'lucide-react';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import WawasanLoader from '@/components/brand/WawasanLoader';
import { fitPdfPage, pdfPageSizeLabel } from '@/lib/pdfPreviewGeometry';

interface PdfPageDimensions {
  number: number;
  width: number;
  height: number;
}

interface AdminPdfCanvasPreviewProps {
  pdfUrl: string;
  language: string;
}

const PAGE_GAP = 16;
const MIN_ZOOM = 0.75;
const MAX_ZOOM = 3;
const MAX_CANVAS_PIXELS = 6_000_000;

/** Canvas output is limited on high-DPI phones to avoid WebView GPU/memory exhaustion. */
function canvasPixelRatio(width: number, height: number): number {
  return Math.max(
    0.1,
    Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(MAX_CANVAS_PIXELS / (width * height)))
  );
}

function PdfCanvasPage({
  document,
  page,
  scale,
  scrollRoot,
  language,
}: {
  document: PDFDocumentProxy;
  page: PdfPageDimensions;
  scale: number;
  scrollRoot: RefObject<HTMLDivElement>;
  language: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const displayWidth = Math.max(1, page.width * scale);
  const displayHeight = Math.max(1, page.height * scale);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { root: scrollRoot.current, rootMargin: '160px 0px' }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [scrollRoot]);

  useEffect(() => {
    if (!visible || !canvasRef.current) return;
    let cancelled = false;
    let task: RenderTask | undefined;
    const canvas = canvasRef.current;
    setStatus('loading');

    const render = async () => {
      try {
        const pdfPage = await document.getPage(page.number);
        if (cancelled) return;
        // The viewport honors the PDF MediaBox/CropBox and rotation; no A4
        // approximation, stretching or image replacement is involved.
        const viewport = pdfPage.getViewport({ scale });
        const pixelRatio = canvasPixelRatio(viewport.width, viewport.height);
        canvas.width = Math.ceil(viewport.width * pixelRatio);
        canvas.height = Math.ceil(viewport.height * pixelRatio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) throw new Error('Canvas 2D is unavailable');

        task = pdfPage.render({
          canvas,
          canvasContext: context,
          viewport,
          transform: [pixelRatio, 0, 0, pixelRatio, 0, 0],
        });
        await task.promise;
        if (!cancelled) setStatus('ready');
      } catch (error) {
        // Cancelling renders during close, scroll or zoom is expected.
        if (!cancelled) {
          console.error('Unable to render invoice PDF page', error);
          setStatus('error');
        }
      }
    };
    void render();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [document, page.number, scale, visible]);

  return (
    <div
      ref={wrapperRef}
      className="relative shrink-0 bg-white shadow-lg ring-1 ring-black/10"
      style={{ width: displayWidth, height: displayHeight }}
      aria-label={`${language === 'bm' ? 'Halaman' : 'Page'} ${page.number}`}
    >
      <canvas ref={canvasRef} className="block" aria-hidden="true" />
      {status !== 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 text-center text-xs text-stone-500">
          {status === 'error'
            ? (language === 'bm' ? 'Gagal memaparkan halaman PDF.' : 'Unable to display PDF page.')
            : <WawasanLoader size={40} />}
        </div>
      )}
    </div>
  );
}

/** A true PDF render, fitted inside the available modal space at its original aspect ratio. */
export default function AdminPdfCanvasPreview({ pdfUrl, language }: AdminPdfCanvasPreviewProps) {
  const scrollRoot = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<PdfPageDimensions[]>([]);
  const [zoom, setZoom] = useState(1);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    const root = scrollRoot.current;
    if (!root) return;
    const measure = () => {
      const width = root.clientWidth;
      const height = root.clientHeight;
      setSize((previous) => previous.width === width && previous.height === height
        ? previous : { width, height });
    };
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(measure);
      observer.observe(root);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | undefined;
    setStatus('loading');
    setDocument(null);
    setPages([]);
    setZoom(1);

    const load = async () => {
      try {
        // Only loaded on demand: the admin modal is itself a lazy React chunk.
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        if (cancelled) return;
        pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        const response = await fetch(pdfUrl);
        if (!response.ok) throw new Error(`PDF request failed (${response.status})`);
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (cancelled) return;
        loadingTask = pdfjs.getDocument({ data: bytes, isEvalSupported: false });
        const loaded = await loadingTask.promise;
        if (cancelled) return;
        const sizes: PdfPageDimensions[] = [];
        for (let number = 1; number <= loaded.numPages; number += 1) {
          const pdfPage = await loaded.getPage(number);
          if (cancelled) return;
          const viewport = pdfPage.getViewport({ scale: 1 });
          sizes.push({ number, width: viewport.width, height: viewport.height });
        }
        setDocument(loaded);
        setPages(sizes);
        setStatus('ready');
      } catch (error) {
        if (!cancelled) {
          console.error('Unable to load invoice PDF preview', error);
          setStatus('error');
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
      // Destroy the worker as well as the PDF when this modal closes/changes.
      void loadingTask?.destroy();
    };
  }, [pdfUrl]);

  const resetZoom = () => {
    setZoom(1);
    scrollRoot.current?.scrollTo({ left: 0, top: 0 });
  };
  const pageCount = pages.length;
  const firstPage = pages[0];

  return (
    <div className="flex h-full min-h-0 flex-col" id="pdf-true-preview">
      {status === 'ready' && firstPage && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200">
          <div className="min-w-0 truncate" aria-label="PDF document dimensions">
            {pageCount} {language === 'bm' ? 'halaman' : 'pages'}
            {' · '}{pdfPageSizeLabel(firstPage.width, firstPage.height)}
          </div>
          <div className="flex shrink-0 items-center gap-1" aria-label={language === 'bm' ? 'Kawalan zum PDF' : 'PDF zoom controls'}>
            <button type="button" onClick={() => setZoom((z) => Math.max(MIN_ZOOM, Number((z - 0.25).toFixed(2))))}
              disabled={zoom <= MIN_ZOOM}
              className="rounded-lg p-2 hover:bg-stone-100 disabled:opacity-30 dark:hover:bg-stone-800"
              aria-label={language === 'bm' ? 'Zum keluar' : 'Zoom out'}>
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-11 text-center tabular-nums" aria-label="Zoom relative to fit">
              {Math.round(zoom * 100)}%
            </span>
            <button type="button" onClick={() => setZoom((z) => Math.min(MAX_ZOOM, Number((z + 0.25).toFixed(2))))}
              disabled={zoom >= MAX_ZOOM}
              className="rounded-lg p-2 hover:bg-stone-100 disabled:opacity-30 dark:hover:bg-stone-800"
              aria-label={language === 'bm' ? 'Zum masuk' : 'Zoom in'}>
              <Plus className="h-4 w-4" />
            </button>
            <button type="button" onClick={resetZoom}
              className="ml-1 flex items-center gap-1 rounded-lg px-2 py-2 font-semibold hover:bg-stone-100 dark:hover:bg-stone-800"
              aria-label={language === 'bm' ? 'Muatkan seluruh halaman' : 'Fit entire page'}>
              <Scan className="h-4 w-4" />
              <span>{language === 'bm' ? 'Muat' : 'Fit'}</span>
            </button>
          </div>
        </div>
      )}
      <div
        ref={scrollRoot}
        className="min-h-0 flex-1 overflow-auto overscroll-contain bg-stone-200/80 dark:bg-stone-950"
        aria-label={language === 'bm' ? 'Pratonton PDF asal' : 'Original PDF preview'}
      >
        {status === 'loading' && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-stone-600 dark:text-stone-300" role="status">
            <WawasanLoader size={56} />
            {language === 'bm' ? 'Memuatkan dokumen sebenar…' : 'Loading original document…'}
          </div>
        )}
        {status === 'error' && (
          <div role="alert" className="flex h-full items-center justify-center p-6 text-center text-sm text-stone-600 dark:text-stone-300">
            {language === 'bm'
              ? 'Pratonton PDF tidak dapat dibuka. Anda masih boleh muat turun atau berkongsi fail asal.'
              : 'PDF preview could not open. You can still download or share the original file.'}
          </div>
        )}
        {status === 'ready' && document && size.width > 0 && size.height > 0 && (
          <div className="flex min-h-full w-max min-w-full flex-col items-center justify-center"
            style={{ padding: PAGE_GAP, gap: PAGE_GAP }}>
            {pages.map((page) => (
              <PdfCanvasPage key={`${page.number}-${zoom}-${size.width}-${size.height}`} document={document} page={page} language={language} scrollRoot={scrollRoot}
                scale={fitPdfPage(page.width, page.height, Math.max(1, size.width - 2 * PAGE_GAP), Math.max(1, size.height - 2 * PAGE_GAP)) * zoom} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
