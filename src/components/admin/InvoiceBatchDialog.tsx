import { useState } from 'react';
import type { Order } from '@/types';
import { invoiceRecipient, validateInvoiceGroup, type InvoicePage } from '@/lib/invoiceBatch';
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
interface Props {
  orders: Order[];
  invoiceNo: string;
  language: 'bm' | 'en';
  busy: boolean;
  onClose: () => void;
  onConfirm: (withNotes: boolean, address: string) => Promise<void>;
}
export function InvoiceBatchDialog({
  orders,
  invoiceNo,
  language,
  busy,
  onClose,
  onConfirm,
}: Props) {
  const bm = language === 'bm',
    existing = Boolean(orders[0]?.invoiceBatchNo || orders[0]?.consolidatedInvoiceNo),
    recipient = orders[0] ? invoiceRecipient(orders[0]) : null;
  const [address, setAddress] = useState(recipient?.address || ''),
    [includeNotes, setIncludeNotes] = useState(false),
    [pages, setPages] = useState<Array<Omit<InvoicePage, 'invoiceNo'>> | null>(null),
    [error, setError] = useState(''),
    [planning, setPlanning] = useState(false);
  const review = async () => {
    setPlanning(true);
    setError('');
    try {
      const recipient = validateInvoiceGroup(orders, address),
        { planInvoicePages } = await import('@/services/invoiceBatchPdf');
      setPages(
        planInvoicePages(orders, {
          recipient,
          includeNotes,
          lang: language,
          issuedAt: new Date().toISOString(),
        })
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setPlanning(false);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{bm ? 'Invois pelanggan' : 'Customer invoices'}</DialogTitle>
          <DialogDescription>
            {existing
              ? bm
                ? 'Buka PDF tersimpan dengan nombor dan jumlah asal.'
                : 'Reopen the saved PDF with its original numbers and totals.'
              : bm
                ? 'Setiap halaman mempunyai nombor invois dan jumlah sendiri. Semua halaman dihimpun dalam satu fail PDF.'
                : 'Each page has its own invoice number and total. All pages share one PDF file.'}
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm break-words">
          <strong>{recipient?.company}</strong>
          <br />
          {recipient?.email}
          <br />
          {orders.length} {bm ? 'pesanan dipilih' : 'selected orders'}
        </p>
        {!existing && (
          <>
            <div className="space-y-2">
              <Label htmlFor="batch-billing-address">
                {bm ? 'Sahkan alamat bil syarikat' : 'Confirm company billing address'}
              </Label>
              <Input
                id="batch-billing-address"
                maxLength={1000}
                value={address}
                onChange={(event) => {
                  setAddress(event.target.value);
                  setPages(null);
                }}
              />
              <p className="text-xs text-muted-foreground">
                {bm
                  ? 'Alamat ini juga digunakan untuk pesanan lama yang belum mempunyai alamat bil.'
                  : 'This address also applies to older selected orders without a billing address.'}
              </p>
            </div>
            <Label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeNotes}
                onChange={(event) => {
                  setIncludeNotes(event.target.checked);
                  setPages(null);
                }}
              />
              {bm ? 'Sertakan catatan' : 'Include notes'}
            </Label>
            <Button variant="outline" onClick={review} disabled={busy || planning}>
              {planning
                ? bm
                  ? 'Menyemak…'
                  : 'Reviewing…'
                : bm
                  ? 'Semak pembahagian halaman'
                  : 'Review page breakdown'}
            </Button>
            {pages && (
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-3 text-left">{bm ? 'Halaman' : 'Page'}</th>
                      <th>{bm ? 'Pesanan' : 'Orders'}</th>
                      <th className="p-3 text-right">RM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pages.map((page, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="p-3">{i + 1}</td>
                        <td className="text-center">{page.orderIds.length}</td>
                        <td className="p-3 text-right">{(page.totalCents / 100).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        <p className="text-xs text-muted-foreground">
          {existing
            ? invoiceNo
            : `${bm ? 'Nombor halaman pertama' : 'First page number'}: ${invoiceNo}`}
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button
          disabled={busy || planning || (!existing && !pages)}
          onClick={() => {
            void onConfirm(includeNotes, address);
          }}
        >
          {busy
            ? bm
              ? 'Menjana…'
              : 'Generating…'
            : existing
              ? bm
                ? 'Buka PDF tersimpan'
                : 'Open saved PDF'
              : bm
                ? 'Sahkan & hasilkan PDF'
                : 'Confirm & generate PDF'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
