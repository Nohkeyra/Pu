import { Capacitor } from '@capacitor/core';
import { Mail, Loader2, MessageSquare, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Order } from '@/types';
import type { InvoiceEmailPreview } from '@/hooks/admin/useAdminMessaging';
interface SendInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sendOrder: Order | null;
  t: (key: string) => string;
  recipientEmail: string;
  setRecipientEmail: (v: string) => void;
  recipientPhone: string;
  setRecipientPhone: (v: string) => void;
  sendingEmail: boolean;
  handleSendEmail: () => Promise<void> | void;
  handleSendWhatsApp: () => void;
  language?: string;
  emailPreview?: InvoiceEmailPreview | null;
  emailPdfUrl?: string;
  preparingEmail?: boolean;
  prepareEmailPreview: () => Promise<void>;
  openEmailAttachment?: () => Promise<void>;
}
export function SendInvoiceModal({
  isOpen,
  onClose,
  sendOrder,
  recipientEmail,
  setRecipientEmail,
  recipientPhone,
  setRecipientPhone,
  sendingEmail,
  handleSendEmail,
  handleSendWhatsApp,
  language,
  emailPreview,
  emailPdfUrl,
  preparingEmail,
  prepareEmailPreview,
  openEmailAttachment,
}: SendInvoiceModalProps) {
  const bm = language !== 'en';
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !sendingEmail) onClose();
      }}
    >
      <DialogContent className="sm:max-w-4xl max-h-[94dvh] overflow-y-auto bg-background text-foreground">
        <DialogHeader>
          <DialogTitle>{bm ? 'Semak & hantar invois' : 'Review & send invoice'}</DialogTitle>
          <DialogDescription>
            {sendOrder?.to || sendOrder?.name}
            {sendOrder?.invoiceBatchNo
              ? ` · ${bm ? 'Semua invois dalam PDF tersimpan' : 'All saved invoices in one PDF'}`
              : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="send-email-input">{bm ? 'Emel penerima' : 'Recipient email'}</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                id="send-email-input"
                type="email"
                maxLength={254}
                value={recipientEmail}
                disabled={sendingEmail}
                onChange={(event) => setRecipientEmail(event.target.value)}
              />
              <Button
                id="prepare-invoice-email"
                onClick={prepareEmailPreview}
                disabled={preparingEmail || sendingEmail || !recipientEmail}
                className="shrink-0"
              >
                {preparingEmail ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                {bm ? 'Sediakan pratonton' : 'Prepare preview'}
              </Button>
            </div>
          </div>
          {emailPreview && emailPdfUrl ? (
            <div className="space-y-4" aria-live="polite">
              <dl className="rounded-xl border border-border p-4 text-sm space-y-2 break-words">
                <div>
                  <dt className="font-semibold">{bm ? 'Kepada' : 'To'}</dt>
                  <dd>{emailPreview.email}</dd>
                </div>
                <div>
                  <dt className="font-semibold">{bm ? 'Subjek' : 'Subject'}</dt>
                  <dd>{emailPreview.subject}</dd>
                </div>
                <div>
                  <dt className="font-semibold">{bm ? 'Lampiran' : 'Attachment'}</dt>
                  <dd>
                    {emailPreview.filename} · {emailPreview.invoiceNumbers.length}{' '}
                    {bm ? 'invois' : 'invoices'}
                  </dd>
                </div>
              </dl>
              <iframe
                title={bm ? 'Pratonton emel' : 'Email preview'}
                sandbox=""
                srcDoc={emailPreview.html}
                className="w-full h-[32rem] rounded-xl border border-border bg-white"
              />
              <details className="rounded-xl border border-border p-3">
                <summary>{bm ? 'Versi teks emel' : 'Plain text email'}</summary>
                <p className="whitespace-pre-wrap text-sm pt-3">{emailPreview.text}</p>
              </details>
              <div className="space-y-2">
                <a
                  href={emailPdfUrl}
                  download={emailPreview.filename}
                  onClick={(event) => {
                    if (Capacitor.isNativePlatform() && openEmailAttachment) {
                      event.preventDefault();
                      void openEmailAttachment();
                    }
                  }}
                  className="underline text-sm font-semibold"
                >
                  {bm ? 'Buka / muat turun lampiran PDF' : 'Open / download PDF attachment'}
                </a>
                <object
                  data={emailPdfUrl}
                  type="application/pdf"
                  title="Invoice PDF"
                  className="w-full h-[55dvh] border border-border rounded-xl"
                >
                  <p className="p-4 text-sm">
                    {bm
                      ? 'Gunakan pautan di atas untuk menyemak lampiran PDF pada peranti ini.'
                      : 'Use the link above to review the PDF attachment on this device.'}
                  </p>
                </object>
              </div>
              <Button
                id="btn-send-email-confirm"
                onClick={handleSendEmail}
                disabled={sendingEmail || preparingEmail}
                aria-busy={sendingEmail}
                className="w-full"
              >
                {sendingEmail ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                {bm ? 'Sahkan & hantar emel ini' : 'Confirm & send this email'}
              </Button>
            </div>
          ) : (
            <p role="status" className="text-sm text-muted-foreground">
              {bm
                ? 'Semak penerima, kandungan emel dan PDF sebelum mengesahkan penghantaran.'
                : 'Review the recipient, email and PDF before confirming delivery.'}
            </p>
          )}
          {!sendOrder?.invoiceBatchNo && (
            <details className="border-t border-border pt-4">
              <summary className="text-sm font-semibold">WhatsApp</summary>
              <div className="pt-3 flex flex-col sm:flex-row gap-2">
                <Label htmlFor="send-phone-input" className="sr-only">
                  {bm ? 'Telefon penerima' : 'Recipient phone'}
                </Label>
                <Input
                  id="send-phone-input"
                  type="tel"
                  value={recipientPhone}
                  onChange={(event) => setRecipientPhone(event.target.value)}
                />
                <Button
                  onClick={handleSendWhatsApp}
                  disabled={!recipientPhone || sendingEmail}
                  variant="outline"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
              </div>
            </details>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
