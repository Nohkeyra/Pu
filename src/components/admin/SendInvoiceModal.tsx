import { Capacitor } from '@capacitor/core';
import {
  Mail,
  Loader2,
  MessageSquare,
  FileText,
  Upload,
  Trash2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
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
import {
  buildPetronasInvoiceSubject,
  getVerifiedOrderCompanyCode,
} from '@/lib/petronasAutofill';
import type { Order } from '@/types';
import type {
  InvoiceEmailPreview,
  SupportingPdfFile,
} from '@/hooks/admin/useAdminMessaging';

interface SendInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sendOrder: Order | null;
  t: (key: string) => string;
  recipientEmail: string;
  setRecipientEmail: (v: string) => void;
  recipientPhone: string;
  setRecipientPhone: (v: string) => void;
  submissionMode: 'standard' | 'petronas_collector';
  setSubmissionMode: (mode: 'standard' | 'petronas_collector') => void;
  collectorEligible: boolean;
  setCollectorEligible: (checked: boolean) => void;
  supportingFiles: SupportingPdfFile[];
  addSupportingFiles: (files: FileList | File[]) => Promise<void>;
  removeSupportingFile: (id: string) => void;
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

const formatByteSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

export function SendInvoiceModal({
  isOpen,
  onClose,
  sendOrder,
  recipientEmail,
  setRecipientEmail,
  recipientPhone,
  setRecipientPhone,
  submissionMode,
  setSubmissionMode,
  collectorEligible,
  setCollectorEligible,
  supportingFiles,
  addSupportingFiles,
  removeSupportingFile,
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
  const isBatchOrder = Boolean(sendOrder?.invoiceBatchNo);
  const rawInvoiceNo = String(
    sendOrder?.officialInvoiceNo || sendOrder?.invoiceNo || ''
  ).trim();
  const hasSingleRwInvoiceNo = /^RW\d{5}$/.test(rawInvoiceNo);
  const verifiedCompanyCode = sendOrder ? getVerifiedOrderCompanyCode(sendOrder) : '';
  const hasVerifiedCompanyCode = /^\d{4}$/.test(verifiedCompanyCode);
  const supportingTotalBytes = supportingFiles.reduce((sum, item) => sum + item.byteLength, 0);
  const collectorSubjectPreview =
    hasVerifiedCompanyCode && hasSingleRwInvoiceNo
      ? buildPetronasInvoiceSubject(verifiedCompanyCode, rawInvoiceNo)
      : '-';
  const mainPdfLabel = hasSingleRwInvoiceNo
    ? `Invoice_${rawInvoiceNo.replace(/[^A-Za-z0-9_-]/g, '_')}.pdf`
    : 'Invoice.pdf';
  const collectorRequirementsMet =
    !isBatchOrder &&
    hasSingleRwInvoiceNo &&
    hasVerifiedCompanyCode &&
    collectorEligible;
  const disablePrepare =
    preparingEmail ||
    sendingEmail ||
    !recipientEmail ||
    (submissionMode === 'petronas_collector' && !collectorRequirementsMet);

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
            <Label>{bm ? 'Mod penghantaran' : 'Submission mode'}</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                disabled={sendingEmail || preparingEmail}
                onClick={() => setSubmissionMode('standard')}
                className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                  submissionMode === 'standard'
                    ? 'border-primary bg-primary/10 font-semibold text-foreground'
                    : 'border-border bg-card/40 text-muted-foreground hover:text-foreground'
                }`}
              >
                <div>{bm ? 'Emel Pelanggan Biasa' : 'Standard Customer Email'}</div>
                <div className="text-xs font-normal opacity-80">
                  {bm
                    ? 'Untuk invois individu atau gabungan.'
                    : 'For individual or consolidated invoices.'}
                </div>
              </button>
              <button
                type="button"
                disabled={sendingEmail || preparingEmail || isBatchOrder}
                onClick={() => setSubmissionMode('petronas_collector')}
                className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  submissionMode === 'petronas_collector'
                    ? 'border-primary bg-primary/10 font-semibold text-foreground'
                    : 'border-border bg-card/40 text-muted-foreground hover:text-foreground'
                }`}
              >
                <div>PETRONAS Email Collector</div>
                <div className="text-xs font-normal opacity-80">
                  {bm
                    ? 'Subjek kod 4 digit + no. invois RWxxxxx + lampiran PDF.'
                    : 'Exact 4-digit code + RWxxxxx subject + ordered PDFs.'}
                </div>
              </button>
            </div>
          </div>

          {submissionMode === 'petronas_collector' && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">
                  {bm ? 'Semakan Kelayakan Collector' : 'Collector Eligibility Checks'}
                </span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-background border border-border">
                  {bm ? 'Subjek' : 'Subject'}: {collectorSubjectPreview}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  {!isBatchOrder ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  )}
                  <span>
                    {bm ? 'Invois tunggal (bukan batch)' : 'Single invoice (non-batch)'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {hasSingleRwInvoiceNo ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  )}
                  <span>
                    {bm ? 'Format RWxxxxx' : 'Format RWxxxxx'} ({rawInvoiceNo || '-'})
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {hasVerifiedCompanyCode ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  )}
                  <span>
                    {bm ? 'Kod Syarikat' : 'Company Code'}: {verifiedCompanyCode || '-'}
                  </span>
                </div>
              </div>

              {sendOrder?.collectorSubmittedAt && (
                <p className="text-xs text-muted-foreground">
                  {bm ? 'Penyerahan collector terdahulu:' : 'Previous collector submission:'}{' '}
                  <span className="font-mono">{sendOrder.collectorSubmittedAt}</span>
                </p>
              )}

              <label
                htmlFor="collector-eligible-checkbox"
                className="flex items-start gap-2.5 cursor-pointer rounded-lg border border-border bg-background/70 p-2.5 text-xs"
              >
                <input
                  id="collector-eligible-checkbox"
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-primary"
                  checked={collectorEligible}
                  disabled={sendingEmail || preparingEmail}
                  onChange={(e) => setCollectorEligible(e.target.checked)}
                />
                <span>
                  {bm
                    ? 'Sahkan pesanan ini layak untuk PETRONAS Email Collector (bukan di bawah SMART by GEP atau SUS PO).'
                    : 'Confirm this order is eligible for PETRONAS Email Collector (not under SMART by GEP or SUS PO).'}
                </span>
              </label>

              <div className="space-y-2 pt-1 border-t border-border/70">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-xs">
                      {bm
                        ? 'Lampiran PDF Sokongan (pilihan, maksimum 10 fail · jumlah emel ≤ 20 MB)'
                        : 'Supporting PDF Attachments (optional, max 10 files · total email ≤ 20 MB)'}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {bm
                        ? 'Fail .pdf sahaja diterima mengikut susunan. Fail ZIP tidak dibenarkan.'
                        : 'Ordered .pdf files only. ZIP archives are rejected.'}
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-muted/60">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{bm ? 'Tambah PDF' : 'Add PDFs'}</span>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      multiple
                      disabled={sendingEmail || preparingEmail || supportingFiles.length >= 10}
                      className="sr-only"
                      onChange={(e) => {
                        if (e.target.files?.length) {
                          void addSupportingFiles(e.target.files);
                        }
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>

                <ol className="space-y-1.5 text-xs">
                  <li className="flex items-center justify-between rounded-lg border border-border bg-background/60 px-2.5 py-1.5">
                    <span className="truncate font-medium">
                      1. {mainPdfLabel}{' '}
                      <span className="text-muted-foreground font-normal">
                        ({bm ? 'Utama · automatik' : 'Main invoice · auto'})
                      </span>
                    </span>
                  </li>
                  {supportingFiles.map((file, idx) => (
                    <li
                      key={file.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5"
                    >
                      <span className="truncate">
                        {idx + 2}. {file.filename}{' '}
                        <span className="text-muted-foreground">
                          ({formatByteSize(file.byteLength)})
                        </span>
                      </span>
                      <button
                        type="button"
                        disabled={sendingEmail || preparingEmail}
                        onClick={() => removeSupportingFile(file.id)}
                        aria-label={bm ? 'Buang fail' : 'Remove file'}
                        className="text-muted-foreground hover:text-destructive p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ol>
                {supportingFiles.length > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    {bm ? 'Saiz fail sokongan:' : 'Supporting files size:'}{' '}
                    {formatByteSize(supportingTotalBytes)} / 20.00 MB
                  </p>
                )}
              </div>
            </div>
          )}

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
                disabled={disablePrepare}
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
                  <dd className="font-mono text-xs sm:text-sm">{emailPreview.subject}</dd>
                </div>
                <div>
                  <dt className="font-semibold">{bm ? 'Lampiran' : 'Attachments'}</dt>
                  <dd className="space-y-1">
                    <div>
                      {emailPreview.filename} · {emailPreview.invoiceNumbers.length}{' '}
                      {bm ? 'invois' : 'invoices'}
                      {typeof emailPreview.totalBytes === 'number'
                        ? ` · ${formatByteSize(emailPreview.totalBytes)}`
                        : ''}
                    </div>
                    {emailPreview.attachments && emailPreview.attachments.length > 0 && (
                      <ol className="text-xs text-muted-foreground space-y-0.5 pt-1">
                        {emailPreview.attachments.map((att, idx) => (
                          <li key={`${att.filename}-${idx}`}>
                            {idx + 1}. {att.filename} ({formatByteSize(att.byteLength)})
                          </li>
                        ))}
                      </ol>
                    )}
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
