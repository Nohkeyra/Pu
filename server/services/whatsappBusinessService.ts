/**
 * WhatsApp Direct Messaging Integration Service
 * 
 * Generates formatted direct wa.me chat links and messages for:
 * 1. Customer invoice sharing with Bank Muamalat payment details
 * 2. Automated catering order summaries to Pak Usop / Restaurant Admin
 * 
 * Configured for Restoran Wawasan Pak Usop: +60 17-315 7731
 */

export interface WhatsAppConfig {
  defaultAdminPhone: string;
}

export interface SendWhatsAppMessageOptions {
  recipientPhone: string;
  text: string;
}

export interface WhatsAppInvoicePayload {
  recipientPhone: string;
  customerName: string;
  invoiceNo: string;
  eventDate: string;
  pax: number | string;
  totalAmount: number;
  pdfDownloadUrl?: string;
  lang?: 'bm' | 'en';
}

export interface WhatsAppOrderForwardPayload {
  adminPhone?: string;
  orderId?: string;
  customerName: string;
  contactNumber: string;
  eventDate: string;
  eventTime: string;
  pax: number | string;
  mealType: string;
  totalAmount?: number;
  selectedDishes?: Array<{ name?: string; category?: string; [key: string]: any }>;
  deliveryAddress?: string;
  specialNotes?: string;
}

export interface WhatsAppServiceResponse {
  success: boolean;
  mode: 'wa_link_generated';
  whatsappUrl: string;
}

function formatServerDateDisplay(val: unknown): string {
  if (!val) return '-';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return `${day}/${month}/${year}`;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      return trimmed;
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return trimmed;
  }
  if (val instanceof Date && !isNaN(val.getTime())) {
    const day = String(val.getDate()).padStart(2, '0');
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const year = val.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return String(val);
}

export class WhatsAppBusinessService {
  private config: WhatsAppConfig;

  constructor(customConfig?: Partial<WhatsAppConfig>) {
    this.config = {
      defaultAdminPhone: customConfig?.defaultAdminPhone || '60173157731'
    };
  }

  /**
   * Normalize any Malaysian/International phone number into standard international format without '+'.
   * Example: '017-315 7731' -> '60173157731'
   */
  public normalizePhoneNumber(phone: string): string {
    if (!phone) return this.config.defaultAdminPhone;
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.startsWith('0')) {
      return `60${digitsOnly.slice(1)}`;
    }
    if (digitsOnly.startsWith('60')) {
      return digitsOnly;
    }
    return digitsOnly;
  }

  /**
   * Generates a direct wa.me link with encoded message.
   */
  public generateWhatsAppUrl(recipientPhone: string, text: string): string {
    const formattedPhone = this.normalizePhoneNumber(recipientPhone);
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
  }

  /**
   * Formats a professional WhatsApp message for customer invoice sharing with Bank Muamalat payment details.
   */
  public formatInvoiceMessage(payload: WhatsAppInvoicePayload): string {
    const isBm = payload.lang !== 'en';
    const totalFormatted = payload.totalAmount ? payload.totalAmount.toFixed(2) : '0.00';
    const formattedDate = formatServerDateDisplay(payload.eventDate);

    if (isBm) {
      return (
        `Salam *${payload.customerName}*,\n\n` +
        `Terima kasih kerana memilih *Restoran Wawasan Pak Usop*.\n\n` +
        `Berikut adalah butiran invois tempahan katering anda:\n` +
        `• *No. Invois:* ${payload.invoiceNo}\n` +
        `• *Tarikh Majlis:* ${formattedDate}\n` +
        `• *Bilangan Pax:* ${payload.pax} orang\n` +
        `• *Jumlah Bayaran:* RM ${totalFormatted}\n\n` +
        `*Maklumat Pembayaran (Bank Transfer):*\n` +
        `• Bank: *Bank Muamalat*\n` +
        `• Nama Akaun: *RESTORAN WAWASAN*\n` +
        `• No. Akaun: *16010000-405710*\n\n` +
        (payload.pdfDownloadUrl ? `📄 *Pautan Invois PDF:* ${payload.pdfDownloadUrl}\n\n` : '') +
        `Sila hantarkan resit bayaran di sini setelah pembayaran dibuat. Sekiranya ada sebarang pertanyaan, sila hubungi kami di talian *017-3157731*.\n\n` +
        `Terima kasih!`
      );
    }

    return (
      `Hello *${payload.customerName}*,\n\n` +
      `Thank you for choosing *Restoran Wawasan Pak Usop*.\n\n` +
      `Here are your catering invoice details:\n` +
      `• *Invoice No:* ${payload.invoiceNo}\n` +
      `• *Event Date:* ${formattedDate}\n` +
      `• *Guest Count:* ${payload.pax} pax\n` +
      `• *Total Amount:* RM ${totalFormatted}\n\n` +
      `*Bank Payment Details:*\n` +
      `• Bank: *Bank Muamalat*\n` +
      `• Account Name: *RESTORAN WAWASAN*\n` +
      `• Account No: *16010000-405710*\n\n` +
      (payload.pdfDownloadUrl ? `📄 *PDF Invoice Link:* ${payload.pdfDownloadUrl}\n\n` : '') +
      `Please share your payment transfer receipt once completed. For any inquiries, feel free to reach us at *017-3157731*.\n\n` +
      `Thank you!`
    );
  }

  /**
   * Formats an automated catering order forward message directed to Pak Usop / Catering Team.
   */
  public formatOrderForwardMessage(payload: WhatsAppOrderForwardPayload): string {
    const dishesList = Array.isArray(payload.selectedDishes) && payload.selectedDishes.length > 0
      ? payload.selectedDishes.map((d: any) => `  - ${d.name || d.dishName || 'Hidangan'}`).join('\n')
      : '  - Mengikut pakej tempahan';

    const formattedDate = formatServerDateDisplay(payload.eventDate);
    const orderRef = payload.orderId ? `*No. Rujukan:* ${payload.orderId}\n` : '';
    const totalStr = payload.totalAmount ? `*Jumlah Anggaran:* RM ${payload.totalAmount.toFixed(2)}\n` : '';
    const deliveryStr = payload.deliveryAddress ? `*Lokasi Penghantaran:* ${payload.deliveryAddress}\n` : '';
    const notesStr = payload.specialNotes ? `*Nota Tambahan:* ${payload.specialNotes}\n` : '';

    return (
      `🍽️ *TEMPAHAN KATERING BARU - RESTORAN WAWASAN PAK USOP*\n\n` +
      `${orderRef}` +
      `*Nama Pelanggan:* ${payload.customerName}\n` +
      `*No. Telefon:* ${payload.contactNumber}\n` +
      `*Tarikh Majlis:* ${formattedDate}\n` +
      `*Masa Majlis:* ${payload.eventTime}\n` +
      `*Bilangan Tetamu:* ${payload.pax} pax\n` +
      `*Jenis Jamuan:* ${payload.mealType.toUpperCase()}\n` +
      `${deliveryStr}` +
      `${totalStr}` +
      `*Senarai Menu Pilihan:*\n${dishesList}\n\n` +
      `${notesStr}` +
      `Pesanan ini dihantar secara automatik melalui sistem tempahan Restoran Wawasan.`
    );
  }

  /**
   * Generates a direct WhatsApp url response.
   */
  public sendTextMessage(options: SendWhatsAppMessageOptions): WhatsAppServiceResponse {
    const normalizedTo = this.normalizePhoneNumber(options.recipientPhone);
    const waUrl = this.generateWhatsAppUrl(normalizedTo, options.text);

    return {
      success: true,
      mode: 'wa_link_generated',
      whatsappUrl: waUrl
    };
  }

  /**
   * Forward an incoming order directly to the restaurant's WhatsApp number (017-3157731).
   */
  public forwardOrderToAdmin(payload: WhatsAppOrderForwardPayload): WhatsAppServiceResponse {
    const targetAdminPhone = payload.adminPhone || this.config.defaultAdminPhone;
    const message = this.formatOrderForwardMessage(payload);

    return this.sendTextMessage({
      recipientPhone: targetAdminPhone,
      text: message
    });
  }

  /**
   * Share an invoice directly to the customer's phone number.
   */
  public shareInvoiceToCustomer(payload: WhatsAppInvoicePayload): WhatsAppServiceResponse {
    const message = this.formatInvoiceMessage(payload);

    return this.sendTextMessage({
      recipientPhone: payload.recipientPhone,
      text: message
    });
  }
}

// Export singleton instance configured for Restoran Wawasan Pak Usop
export const whatsappBusinessService = new WhatsAppBusinessService();

