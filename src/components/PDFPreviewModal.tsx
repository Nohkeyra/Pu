import React from 'react';
import type { Order } from '@/types';

export interface PDFPreviewModalProps {
  isOpen: boolean; 
  onClose?: () => void;
  order?: Order;
  onDownload?: () => void;
  language?: 'en' | 'bm';
  isFinal?: boolean;
}

export function PDFPreviewModal({ isOpen, onClose }: PDFPreviewModalProps) { 
  return isOpen ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-card p-6 rounded-xl shadow-xl w-full max-w-lg">
        <h2 className="text-lg font-bold mb-4">PDF Preview</h2>
        <p className="text-sm text-stone-500 mb-6">PDF Generation is currently simplified.</p>
        <button 
          onClick={onClose}
          className="px-4 py-2 bg-stone-900 text-white rounded-lg w-full"
        >
          Close
        </button>
      </div>
    </div>
  ) : null; 
}
