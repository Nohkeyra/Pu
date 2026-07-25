import React from 'react';
import type { Order } from '@/types';
import { PDFPreviewModal } from './PDFPreviewModal';

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  onDownload: () => void;
  language: 'en' | 'bm';
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  isOpen,
  onClose,
  order,
  onDownload,
  language
}) => {
  return (
    <PDFPreviewModal
      isOpen={isOpen}
      onClose={onClose}
      order={order}
      onDownload={onDownload}
      language={language}
      isFinal={order.status === 'approved'}
    />
  );
};

export default InvoicePreviewModal;

