import { getFirestore } from '../firebaseAdmin.js';
import { createBrevoTransporter } from '../emailService.js';
import { generateServerInvoicePdf } from './serverPdfService.js';
import { telemetry } from '../telemetry.js';
import { FieldValue } from 'firebase-admin/firestore';

export interface InvoiceDeliveryJob {
  orderId: string;
  orderForPdf: Record<string, any>;
  invoiceNo: string;
  recipientEmail: string;
  totalAmount: number;
  companyName: string;
  lang: 'en' | 'bm';
  attempts?: number;
  maxRetries?: number;
}

class InvoiceQueueService {
  private queue: InvoiceDeliveryJob[] = [];
  private isProcessing = false;
  private maxRetries = 3;

  public enqueue(job: Omit<InvoiceDeliveryJob, 'attempts' | 'maxRetries'>): void {
    const fullJob: InvoiceDeliveryJob = {
      ...job,
      attempts: 0,
      maxRetries: this.maxRetries,
    };
    this.queue.push(fullJob);
    telemetry.captureBreadcrumb('Enqueued invoice delivery job', {
      orderId: job.orderId,
      invoiceNo: job.invoiceNo,
      recipient: job.recipientEmail,
    });

    // Fire and forget worker trigger
    setImmediate(() => this.processNext());
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    const job = this.queue.shift();
    if (!job) {
      this.isProcessing = false;
      return;
    }

    const { orderId, orderForPdf, invoiceNo, recipientEmail, totalAmount, companyName, lang } = job;
    job.attempts = (job.attempts || 0) + 1;

    try {
      const db = getFirestore();
      const orderRef = db.collection('orders').doc(orderId);

      await orderRef.update({
        invoiceDeliveryStatus: 'processing',
        invoiceDeliveryAttempt: job.attempts,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // 1. Generate PDF server-side
      const pdfBuffer = await generateServerInvoicePdf(orderForPdf, true);

      // 2. Email PDF to customer
      const transporter = createBrevoTransporter();
      const senderEmail = process.env.SENDER_EMAIL || process.env.SMTP_USER;

      await transporter.sendMail({
        from: `"Restoran Wawasan Pak Usop" <${senderEmail}>`,
        to: recipientEmail.trim(),
        subject: lang === 'bm'
          ? `[Restoran Wawasan] Invois Rasmi ${invoiceNo} - ${companyName}`
          : `[Restoran Wawasan] Official Invoice ${invoiceNo} - ${companyName}`,
        text: lang === 'bm'
          ? `Salam hormat,\n\nSila rujuk invois rasmi kami ${invoiceNo} yang dilampirkan bersama emel ini.\n\nJumlah: RM ${totalAmount.toFixed(2)}\n\nTerima kasih atas kepercayaan anda.\n\nRestoran Wawasan Pak Usop\nUnit 3, Level B3, Menara PjH, Presint 2, 62100 Putrajaya`
          : `Dear ${companyName},\n\nPlease find our official invoice ${invoiceNo} attached to this email.\n\nTotal: RM ${totalAmount.toFixed(2)}\n\nThank you for your continued trust.\n\nRestoran Wawasan Pak Usop\nUnit 3, Level B3, Menara PjH, Presint 2, 62100 Putrajaya`,
        attachments: [{
          filename: `Invoice_${invoiceNo}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        }],
      });

      // 3. Update order record upon delivery success
      await orderRef.update({
        invoiceDeliveryStatus: 'delivered',
        invoiceDeliveredAt: new Date().toISOString(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      telemetry.captureBreadcrumb('Invoice successfully generated and dispatched via email', {
        orderId,
        invoiceNo,
        recipient: recipientEmail,
      });

    } catch (err) {
      telemetry.captureException(err, {
        metadata: {
          component: 'InvoiceQueueService',
          orderId,
          invoiceNo,
          attempt: job.attempts,
        },
      });

      if (job.attempts < (job.maxRetries || this.maxRetries)) {
        const delayMs = Math.pow(2, job.attempts) * 1000;
        console.warn(`[InvoiceQueue] Retry ${job.attempts}/${job.maxRetries} for order ${orderId} in ${delayMs}ms...`);
        setTimeout(() => {
          this.queue.push(job);
          this.processNext();
        }, delayMs);
      } else {
        console.error(`[InvoiceQueue] Max retries reached for order ${orderId}. Marking delivery as failed.`);
        try {
          const db = getFirestore();
          await db.collection('orders').doc(orderId).update({
            invoiceDeliveryStatus: 'failed',
            invoiceDeliveryError: err instanceof Error ? err.message : String(err),
            updatedAt: FieldValue.serverTimestamp(),
          });
        } catch (dbErr) {
          console.error('[InvoiceQueue] Failed to record delivery failure in Firestore:', dbErr);
        }
      }
    } finally {
      this.isProcessing = false;
      if (this.queue.length > 0) {
        setImmediate(() => this.processNext());
      }
    }
  }
}

export const invoiceQueue = new InvoiceQueueService();
