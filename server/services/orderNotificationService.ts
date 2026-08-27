export interface OrderSummaryData {
  orderId?: string;
  invoiceNo?: string;
  customerName: string;
  contactNumber: string;
  eventDate: string;
  eventTime: string;
  pax: number;
  mealType: string;
  totalAmount?: number;
  selectedDishes?: Array<{ name?: string; category?: string; [key: string]: any }>;
  specialNotes?: string;
  deliveryAddress?: string;
  deliveryType?: string;
}

export function formatOrderWhatsAppMessage(order: OrderSummaryData): string {
  const dishesList = Array.isArray(order.selectedDishes)
    ? order.selectedDishes.map((d: any) => `• ${d.name || d.dishName || 'Hidangan'}`).join('\n')
    : 'Tiada menu tersenarai';

  const invoiceStr = order.invoiceNo ? `*No. Invois:* ${order.invoiceNo}\n` : '';
  const totalStr = order.totalAmount ? `*Jumlah Anggaran:* RM ${order.totalAmount.toFixed(2)}\n` : '';
  const deliveryStr = order.deliveryAddress ? `*Lokasi Penghantaran:* ${order.deliveryAddress}\n` : '';

  return (
    `🍽️ *TEMPAHAN KATERING - RESTORAN WAWASAN PAK USOP*\n\n` +
    `${invoiceStr}` +
    `*Nama:* ${order.customerName}\n` +
    `*Telefon:* ${order.contactNumber}\n` +
    `*Tarikh:* ${order.eventDate}\n` +
    `*Masa:* ${order.eventTime}\n` +
    `*Bilangan Tetamu (Pax):* ${order.pax} orang\n` +
    `*Jenis Jamuan:* ${order.mealType.toUpperCase()}\n` +
    `${deliveryStr}` +
    `${totalStr}\n` +
    `*Pilihan Menu:*\n${dishesList}\n\n` +
    (order.specialNotes ? `*Nota Tambahan:* ${order.specialNotes}\n\n` : '') +
    `Terima kasih kerana memilih Restoran Wawasan Pak Usop!`
  );
}

export function formatCustomerNotificationEmail(order: OrderSummaryData): { subject: string; text: string } {
  const subject = `Pengesahan Tempahan Katering ${order.invoiceNo || ''} - Restoran Wawasan Pak Usop`;
  const text = 
    `Hai ${order.customerName},\n\n` +
    `Terima kasih atas tempahan katering anda dengan Restoran Wawasan Pak Usop.\n\n` +
    `Ringkasan Tempahan:\n` +
    `- Tarikh: ${order.eventDate}\n` +
    `- Masa: ${order.eventTime}\n` +
    `- Bilangan Pax: ${order.pax}\n` +
    `- Jenis Jamuan: ${order.mealType}\n` +
    (order.totalAmount ? `- Jumlah: RM ${order.totalAmount.toFixed(2)}\n` : '') +
    `\nPihak kami akan memproses tempahan anda dengan segera.`;

  return { subject, text };
}
