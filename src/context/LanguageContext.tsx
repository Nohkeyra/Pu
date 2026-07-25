/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from 'react';

type Language = 'en' | 'bm';

interface Translation {
  [key: string]: {
    en: string;
    bm: string;
  };
}

// Comprehensive dictionary for Restoran Wawasan
const translations: Translation = {
  // Common
  submit: { en: 'Submit', bm: 'Hantar' },
  back: { en: 'Back', bm: 'Kembali' },
  contact_us: { en: 'Contact Us', bm: 'Hubungi Kami' },
  order_now: { en: 'Order Now', bm: 'Tempah Sekarang' },
  cancel: { en: 'Cancel', bm: 'Batal' },
  save: { en: 'Save', bm: 'Simpan' },
  edit: { en: 'Edit', bm: 'Sunting' },
  close: { en: 'Close', bm: 'Tutup' },
  loading: { en: 'Loading...', bm: 'Memuat...' },
  success: { en: 'Success', bm: 'Berjaya' },
  error: { en: 'Error', bm: 'Ralat' },
  
  // Navigation
  story: { en: 'Story', bm: 'Kisah' },
  menu: { en: 'Menu', bm: 'Menu' },
  experience: { en: 'Experience', bm: 'Pengalaman' },
  reviews: { en: 'Reviews', bm: 'Ulasan' },
  visit: { en: 'Visit', bm: 'Lawatan' },
  our_story: { en: 'Our Story', bm: 'Kisah Kami' },
  our_menu: { en: 'Our Menu', bm: 'Menu Kami' },
  visit_us: { en: 'Visit Us', bm: 'Layari Kami' },
  
  // Order Form
  catering_order: { en: 'Catering Order', bm: 'Tempahan Katering' },
  order_subtitle: { en: 'Fill in the details below to place your order.', bm: 'Isikan butiran di bawah untuk membuat tempahan.' },
  to: { en: 'To', bm: 'Kepada' },
  attn: { en: 'Attn', bm: 'U.P.' },
  name: { en: 'Name', bm: 'Nama' },
  contact: { en: 'Contact Number', bm: 'No. Telefon' },
  email: { en: 'Email', bm: 'Emel' },
  confirm_email: { en: 'Confirm Email', bm: 'Sahkan Emel' },
  email_mismatch: { en: 'Emails do not match.', bm: 'Alamat emel tidak sepadan.' },
  datetime: { en: 'Date & Time', bm: 'Tarikh & Masa' },
  location: { en: 'Event Location', bm: 'Lokasi Majlis' },
  quantity: { en: 'Quantity (Pax)', bm: 'Kuantiti (Pax)' },
  meals: { en: 'Meal Type', bm: 'Jenis Hidangan' },
  notes: { en: 'Notes', bm: 'Nota' },
  optional: { en: 'Optional', bm: 'Pilihan' },
  select_meal: { en: 'Select meal type', bm: 'Pilih jenis hidangan' },
  breakfast: { en: 'Breakfast', bm: 'Sarapan' },
  lunch: { en: 'Lunch', bm: 'Makan Tengah Hari' },
  dinner: { en: 'Dinner', bm: 'Makan Malam' },
  tea_break: { en: 'Tea Break', bm: 'Minum Petang' },
  order_success: { en: 'Order submitted successfully!', bm: 'Tempahan berjaya dihantar!' },
  order_error: { en: 'Failed to submit order. Please try again.', bm: 'Gagal menghantar tempahan. Sila cuba lagi.' },
  
  // Admin
  admin_login: { en: 'Admin Login', bm: 'Log Masuk Admin' },
  password: { en: 'Password', bm: 'Kata Laluan' },
  login: { en: 'Login', bm: 'Log Masuk' },
  wrong_password: { en: 'Wrong Password!', bm: 'Kata Laluan Salah!' },
  orders: { en: 'Orders', bm: 'Pesanan' },
  approve: { en: 'Approve', bm: 'Luluskan' },
  delete: { en: 'Delete', bm: 'Padam' },
  price_pax: { en: 'Price / Pax (RM)', bm: 'Harga / Pax (RM)' },
  grand_total: { en: 'Grand Total', bm: 'Jumlah Besar' },
  status: { en: 'Status', bm: 'Status' },
  pending: { en: 'Pending', bm: 'Menunggu' },
  approved: { en: 'Approved', bm: 'Diluluskan' },
  billed: { en: 'Billed', bm: 'Diinvois' },
  cancelled: { en: 'Cancelled', bm: 'Dibatalkan' },
  rejected: { en: 'Rejected', bm: 'Ditolak' },
  cancel_requested: { en: 'Cancel Requested', bm: 'Minta Batal' },
  cancellation_requests: { en: 'Cancellation Requests', bm: 'Permintaan Batal' },
  cancellation_approved: { en: 'Cancellation approved', bm: 'Permintaan batal diluluskan' },
  cancellation_rejected: { en: 'Cancellation rejected', bm: 'Permintaan batal ditolak' },
  generate_invoice: { en: 'Generate Invoice', bm: 'Jana Invois' },
  invoice_generated: { en: 'Invoice Generated', bm: 'Invois Dijana' },
  no_orders: { en: 'No orders found', bm: 'Tiada pesanan dijumpai' },
  order_details: { en: 'Order Details', bm: 'Butiran Pesanan' },
  customer_info: { en: 'Customer Information', bm: 'Maklumat Pelanggan' },
  event_details: { en: 'Event Details', bm: 'Butiran Majlis' },
  
  // PDF/Invoice
  invoice_no: { en: 'Invoice No', bm: 'No. Invois' },
  date: { en: 'Date', bm: 'Tarikh' },
  meal_type: { en: 'Meal Type', bm: 'Jenis Hidangan' },
  price: { en: 'Price', bm: 'Harga' },
  amount: { en: 'Amount', bm: 'Jumlah' },
  subtotal: { en: 'Subtotal', bm: 'Jumlah Kecil' },
  total: { en: 'Total', bm: 'Jumlah' },
  ringgit_only: { en: 'Ringgit Malaysia Only', bm: 'Ringgit Malaysia Sahaja' },
  bank_info: { en: 'Bank Info', bm: 'Maklumat Bank' },
  bank_muamalat: { en: 'Bank Muamalat', bm: 'Bank Muamalat' },
  account_no: { en: 'Account No', bm: 'No. Akaun' },
  customer_signature: { en: 'Customer Signature', bm: 'Tandatangan Pelanggan' },
  restaurant_signature: { en: 'Restaurant Signature', bm: 'Tandatangan Restoran' },
  thank_you: { en: 'Thank You!', bm: 'Terima Kasih!' },
  preliminary_invoice: { en: 'Preliminary Invoice', bm: 'Invois Awal' },
  final_invoice: { en: 'Final Invoice', bm: 'Invois Muktamad' },
  
  // Menu Section
  signature_dishes: { en: 'Signature Dishes', bm: 'Hidangan Istimewa' },
  menu_title: { en: 'Signature Dishes', bm: 'Hidangan Istimewa' },
  menu_subtitle: {
    en: 'From our legendary Asam Pedas to our famous Friday Rojak Singapore — each dish is crafted with fresh, locally sourced ingredients and decades of culinary expertise.',
    bm: 'Daripada Asam Pedas legenda kami kepada Rojak Singapore hari Jumaat yang terkenal — setiap hidangan disediakan dengan bahan-bahan tempatan yang segar dan kepakaran kulinari berdekad-dekad lamanya.'
  },
  
  // Story Section
  story_title: { en: 'A Legacy of Flavor Since 1986', bm: 'Warisan Rasa Sejak 1986' },
  story_p1: {
    en: 'A culinary legacy from Singapore since 1986, now in Putrajaya with beloved breakfast classics, Nusantara comfort dishes, and catering. For nearly four decades, we have been serving beloved dishes with diverse flavors spanning Thai, Indian, Chinese, Western, and authentic Malay cuisine.',
    bm: 'Satu warisan kulinari dari Singapura sejak 1986, kini di Putrajaya dengan hidangan sarapan klasik kegemaran ramai, hidangan selesa Nusantara, dan katering. Selama hampir empat dekad, kami telah menyajikan hidangan kegemaran ramai dengan pelbagai cita rasa merangkumi masakan Thai, India, Cina, Barat dan masakan Melayu asli.'
  },
  story_p2: {
    en: 'By maintaining our core principles — cleanliness, excellent service, lasting taste, and affordable pricing — Restoran Wawasan has endured through the years, becoming a beloved destination for ministers, VIPs, artists, foreign tourists, civil servants, and families alike.',
    bm: 'Dengan mengekalkan prinsip teras kami — kebersihan, perkhidmatan cemerlang, rasa yang bertahan lama, dan harga yang berpatutan — Restoran Wawasan telah bertahan selama bertahun-tahun, menjadi destinasi kegemaran para menteri, VIP, artis, pelancong asing, penjawat awam, dan keluarga.'
  },
  story_p3: {
    en: 'Since relocating to Putrajaya under the Ministry of Federal Territories, our restaurant has welcomed diners from all walks of life who come specifically to savor our authentic, multi-flavor culinary experience.',
    bm: 'Sejak berpindah ke Putrajaya di bawah Kementerian Wilayah Persekutuan, restoran kami telah menyambut pelanggan dari segenap lapisan masyarakat yang datang khusus untuk menikmati pengalaman kulinari pelbagai rasa kami yang asli.'
  },
  explore_menu: { en: 'Explore Our Menu', bm: 'Terokai Menu Kami' },
  established: { en: 'Established', bm: 'Ditubuhkan' },
  years_service: { en: 'Years of Service', bm: 'Tahun Berkhidmat' },
  star_rating: { en: 'Star Rating', bm: 'Penarafan Bintang' },
  
  // Hero Section
  hero_title: { en: 'Restoran Wawasan', bm: 'Restoran Wawasan' },
  hero_subtitle: { en: 'Est. 1986', bm: 'Ditubuh 1986' },
  hero_tagline: { en: 'Where Heritage Meets Flavor in the Heart of Putrajaya', bm: 'Tempat Warisan Bertemu Rasa di Tengah-Tengah Putrajaya' },
  hero_description: { en: 'Experience authentic Malaysian cuisine crafted with passion and tradition since 1986.', bm: 'Nikmati masakan Malaysia autentik yang disediakan dengan minat dan tradisi sejak 1986.' },
  view_our_menu: { en: 'View Our Menu', bm: 'Lihat Menu Kami' },
  halal_certified: { en: 'Halal Certified', bm: 'Disahkan Halal' },
  
  // Visit Section
  come_dine: { en: 'Come Dine With Us', bm: 'Mari Menjamu Selera' },
  visit_subtitle: { en: 'Located in the heart of Putrajaya with a stunning lake view', bm: 'Terletak di tengah-tengah Putrajaya dengan pemandangan tasik yang indah' },
  location_detail: { en: 'Basement level with outdoor seating overlooking Putrajaya Lake', bm: 'Aras bawah tanah dengan tempat duduk luar menghadap Tasik Putrajaya' },
  get_directions: { en: 'Get Directions', bm: 'Dapatkan Arah' },
  call_now: { en: 'Call Now', bm: 'Hubungi Sekarang' },
  cta_title: { en: 'Ready to taste our legendary dishes?', bm: 'Sedia untuk merasai hidangan legenda kami?' },
  cta_subtitle: { en: "Walk in or call ahead — we're ready to welcome you.", bm: 'Datang terus atau hubungi kami — kami sedia menyambut anda.' },
  contact_pak_usop: { en: 'Contact Pak Usop', bm: 'Hubungi Pak Usop' },
  
  // Footer
  address: { en: 'Address', bm: 'Alamat' },
  phone: { en: 'Phone', bm: 'Telefon' },
  hours: { en: 'Opening Hours', bm: 'Waktu Buka' },
  follow_us: { en: 'Follow Us', bm: 'Ikuti Kami' },
  all_rights_reserved: { en: 'All Rights Reserved', bm: 'Hak Cipta Terpelihara' },
  
  // Testimonials
  testimonials: { en: 'Testimonials', bm: 'Testimoni' },
  guest_reviews: { en: 'What Our Guests Say', bm: 'Apa Kata Tetamu Kami' },
  what_they_say: { en: 'What They Say', bm: 'Apa Kata Mereka' },
  based_on: { en: 'Based on 35+ reviews', bm: 'Berdasarkan 35+ ulasan' },
  out_of: { en: 'out of 5', bm: 'daripada 5' },
  
  // Experience
  experience_title: { en: 'The Experience', bm: 'Pengalaman' },
  more_than_meal: { en: 'More Than a Meal', bm: 'Lebih Dari Sekadar Hidangan' },
  experience_p1: {
    en: "Dine with a view of Putrajaya's iconic lake and mosque. Feel the warmth of nearly 40 years of tradition in every detail.",
    bm: 'Menjamu selera dengan pemandangan tasik dan masjid ikonik Putrajaya. Rasai kehangatan tradisi hampir 40 tahun dalam setiap butiran.'
  },
  update_invoice: { en: 'Update Invoice', bm: 'Kemas Kini Invois' },
  order_deleted: { en: 'Order deleted successfully', bm: 'Pesanan berjaya dipadam' },
  order_approved: { en: 'Order approved and invoice generated', bm: 'Pesanan diluluskan dan invois dijana' },
  error_approving: { en: 'Error approving order', bm: 'Ralat meluluskan pesanan' },
  delete_order_confirm: { en: 'Are you sure you want to delete this order?', bm: 'Adakah anda pasti mahu memadam pesanan ini?' },
  billing_info: { en: 'Company / Billing Information', bm: 'Maklumat Syarikat / Pengebilan' },
  select_company: { en: 'Select Company / Organization', bm: 'Pilih Syarikat / Organisasi' },
  other_company: { en: 'Other (Custom entry)...', bm: 'Lain-lain (Kemasukan tersuai)...' },
  specify_company: { en: 'Specify Company/Organization', bm: 'Nyatakan Syarikat/Organisasi' },
  dept_attn: { en: 'Department or attention to', bm: 'Jabatan atau untuk perhatian' },
  preferred_menu: { en: 'Preferred Menu / Dishes', bm: 'Pilihan Menu / Hidangan' },
  enter_preferred_menu: { en: 'Enter preferred menu or dishes', bm: 'Masukkan pilihan menu atau hidangan' },
  menu_hint: { 
    en: 'If you do not have specific dishes in mind, keep "Set box Makanan & Minuman".', 
    bm: 'Jika anda tiada hidangan tertentu, biarkan "Set box Makanan & Minuman".' 
  },
  meal_for: { en: 'Meal For (Select all that apply)', bm: 'Hidangan Untuk (Pilih semua yang berkenaan)' },
  venue_address: { en: 'Full event venue address', bm: 'Alamat lengkap lokasi majlis' },
  special_reqs: { 
    en: 'Any special requirements, dietary restrictions, or menu details...', 
    bm: 'Sebarang keperluan khas, sekatan diet, atau butiran menu...' 
  },
  contact_person: { en: 'Contact Person Information', bm: 'Maklumat Orang Untuk Dihubungi' },
  pic_label: { en: 'Person In Charge', bm: 'Orang Dipertanggungjawabkan' },
  officer_info: { en: 'Person in charge', bm: 'Orang dipertanggungjawabkan' },
  full_name: { en: 'Full Name', bm: 'Nama Penuh' },
  submit_order_download: { en: 'Submit Order & Download Invoice', bm: 'Hantar Pesanan & Muat Tunun Invois' },
  share_form: { en: 'Share Form', bm: 'Kongsi Borang' },
  terms_agree: { en: 'By submitting, you agree to our terms and conditions.', bm: 'Dengan menghantar, anda bersetuju dengan terma dan syarat kami.' },
  live_preview: { en: 'Live Document Preview (A4-Style)', bm: 'Pratonton Dokumen Langsung (Gaya A4)' },
  tarikh_acara: { en: 'EVENT DATE', bm: 'TARIKH ACARA' },
  kepada: { en: 'TO', bm: 'KEPADA' },
  lokasi_acara: { en: 'EVENT LOCATION', bm: 'LOKASI ACARA' },
  jenis_hidangan: { en: 'MEAL FOR', bm: 'JENIS HIDANGAN' },
  bilangan_pax: { en: 'QUANTITY', bm: 'BILANGAN PAX' },
  draft_preliminary: { en: 'PRELIMINARY', bm: 'AWAL' },
  invoice_status: { en: 'Invoice & Email Status', bm: 'Status Invois & Emel' },
  pdf_generated: { 
    en: 'Your preliminary invoice PDF was generated and downloaded successfully!', 
    bm: 'Invois awal PDF anda telah berjaya dijana dan dimuat turun!' 
  },
  sending_email: { 
    en: 'Sending email copy to your inbox...', 
    bm: 'Menghantar salinan emel ke peti masuk anda...' 
  },
  email_sent_to: { 
    en: 'An invoice email was sent to {email}. Please check your Inbox and Spam/Junk folder!', 
    bm: 'Satu emel invois telah dihantar ke {email}. Sila semak Inbox dan folder Spam/Junk anda!' 
  },
  email_failed: { 
    en: "We couldn't send an email to {email}. Please verify SMTP settings.", 
    bm: "Kami tidak dapat menghantar emel ke {email}. Sila sahkan tetapan SMTP." 
  },
  create_another: { en: 'Create Another Booking', bm: 'Buat Tempahan Baru' },
  share_link: { en: 'Share Form Link', bm: 'Kongsi Pautan Borang' },
  link_copied: { en: 'Link Copied!', bm: 'Pautan Disalin!' },
  link_copied_desc: { 
    en: 'The form link has been copied to your clipboard.', 
    bm: 'Pautan borang telah disalin ke papan klip anda.' 
  },
  missing_details: { en: 'Missing Details', bm: 'Maklumat Kurang' },
  invalid_quantity: { en: 'Invalid Quantity', bm: 'Kuantiti Tidak Sah' },
  select_event_date: { en: 'Select Event Date', bm: 'Pilih Tarikh Majlis' },
  missing_location: { en: 'Missing Location', bm: 'Lokasi Kurang' },
  pic_name_required: { en: 'Name Required', bm: 'Nama Diperlukan' },
  contact_required: { en: 'Contact Number Required', bm: 'Nombor Telefon Diperlukan' },
  email_required: { en: 'Email Required', bm: 'Emel Diperlukan' },
  email_mismatch_title: { en: 'Email Mismatch', bm: 'Emel Tidak Sepadan' },
  invoice_emailed: { en: 'Invoice Emailed!', bm: 'Invois Dihantar!' },
  order_submitted_title: { en: 'Order Submitted!', bm: 'Pesanan Dihantar!' },
  order_submitted_desc: { 
    en: 'Your booking has been received and your invoice is downloaded.', 
    bm: 'Tempahan anda telah diterima dan invois anda telah dimuat turun.' 
  },
  logout: { en: 'Logout', bm: 'Log Keluar' },
  orders_subtitle: { en: 'Manage catering orders and generate invoices', bm: 'Urus pesanan katering dan jana invois' },
  whatsapp_opened: { en: 'WhatsApp Chat Opened', bm: 'Sembang WhatsApp Dibuka' },
  whatsapp_opened_desc: { 
    en: 'Pre-filled message loaded. You can attach the PDF copy in the chat if needed.', 
    bm: 'Mesej pra-isi dimuatkan. Anda boleh melampirkan salinan PDF di sembang jika perlu.' 
  },
  send_invoice_pdf: { en: 'Send Invoice PDF', bm: 'Hantar Invois PDF' },
  invoice_no_label: { en: 'Invoice No:', bm: 'No. Invois:' },
  customer_label: { en: 'Customer:', bm: 'Pelanggan:' },
  grand_total_label: { en: 'Grand Total:', bm: 'Jumlah Keseluruhan:' },
  option_email: { en: 'Option 1: Send via Email', bm: 'Pilihan 1: Hantar via Emel' },
  email_desc: { 
    en: 'This will email the official invoice PDF attachment directly to the customer.', 
    bm: 'Ini akan menghantar lampiran PDF invois rasmi terus ke emel pelanggan.' 
  },
  recipient_email: { en: 'Recipient Email Address', bm: 'Alamat Emel Penerima' },
  sending: { en: 'Sending...', bm: 'Menghantar...' },
  send_invoice_email: { en: 'Send Invoice Email', bm: 'Hantar Emel Invois' },
  option_whatsapp: { en: 'Option 2: Share via WhatsApp', bm: 'Pilihan 2: Kongsi via WhatsApp' },
  whatsapp_desc: { 
    en: 'Opens WhatsApp with a professional pre-filled message detailing the booking and total amount.', 
    bm: 'Membuka WhatsApp dengan mesej pra-isi profesional yang memperincikan tempahan dan jumlah bayaran.' 
  },
  recipient_phone: { en: 'Recipient WhatsApp/Phone Number', bm: 'Nombor WhatsApp/Telefon Penerima' },
  open_whatsapp: { en: 'Open WhatsApp Chat', bm: 'Buka Sembang WhatsApp' },
  download: { en: 'Download', bm: 'Muat Turun' },
  delete_order: { en: 'Delete Order', bm: 'Padam Pesanan' },
  view_edit_details: { en: 'View/Edit Details', bm: 'Lihat/Kemas Kini Butiran' },
  preview_pdf: { en: 'Preview PDF', bm: 'Pratonton PDF' },
  download_pdf: { en: 'Download PDF', bm: 'Muat Turun PDF' },
  send_pdf: { en: 'Send PDF (Email/WhatsApp)', bm: 'Hantar PDF (Emel/WhatsApp)' },
  invoice_emailed_desc: { 
    en: 'Successfully sent PDF invoice to {email}', 
    bm: 'Berjaya menghantar PDF invois ke {email}' 
  },
  sending_failed: { en: 'Sending Failed', bm: 'Penghantaran Gagal' },
  sending_failed_desc: { 
    en: 'Failed to email invoice. Check SMTP.', 
    bm: 'Gagal menghantar invois. Periksa SMTP.' 
  },
  other: { en: 'Other', bm: 'Lain-lain' },
  no_meals: { en: 'No meals selected', bm: 'Tiada hidangan dipilih' },
  mon_thu: { en: 'Mon — Thu', bm: 'Isnin — Khamis' },
  friday: { en: 'Friday', bm: 'Jumaat' },
  saturday: { en: 'Saturday', bm: 'Sabtu' },
  sunday: { en: 'Sunday', bm: 'Ahad' },
  rojak_note: { en: 'Rojak Singapore available', bm: 'Rojak Singapore disediakan' },
  closed: { en: 'Closed', bm: 'Tutup' },
  call_label: { en: 'Call:', bm: 'Telefon:' },
  whatsapp_label: { en: 'WhatsApp:', bm: 'WhatsApp:' },
  search_placeholder: { en: 'Search by company, name, or email...', bm: 'Cari mengikut syarikat, nama, atau emel...' },
  actions: { en: 'Actions', bm: 'Tindakan' },
  time_730_400: { en: '7:30 AM — 4:00 PM', bm: '7:30 PG — 4:00 PTG' },
  pick_a_date: { en: 'Pick a date', bm: 'Pilih tarikh' },
  quote_pending: { en: 'Quote Pending', bm: 'Sebut Harga' },
  grand_total_preview: { en: 'GRAND TOTAL', bm: 'JUMLAH KESELURUHAN' },
  amount_rm: { en: 'Amount (RM)', bm: 'Jumlah (RM)' },
  hi_tea: { en: 'Hi-Tea', bm: 'Hi-Tea' },
  order_details_desc: { en: 'Review and manage order details, pricing, and status.', bm: 'Semak dan urus butiran pesanan, harga, dan status.' },
  send_invoice_desc: { en: 'Choose how you want to send the invoice to the customer.', bm: 'Pilih cara anda mahu menghantar invois kepada pelanggan.' },
  pdf_preview_desc: { en: 'Preview the generated invoice document.', bm: 'Pratonton dokumen invois yang dijana.' },
  // Notification Settings
  notification_settings: { en: 'Push Notification Preferences', bm: 'Pilihan Notifikasi Push' },
  order_status_updates: { en: 'Order Status Updates', bm: 'Kemaskini Status Tempahan' },
  order_status_desc: { en: 'Receive alerts when your order is approved or updated.', bm: 'Terima makluman apabila tempahan anda diluluskan atau dikemaskini.' },
  billed_updates: { en: 'Billed & Invoice Updates', bm: 'Kemaskini Bil & Invois' },
  billed_updates_desc: { en: 'Get notified when your official invoice is generated.', bm: 'Terima makluman apabila invois rasmi anda dijana.' },
  cancel_approval: { en: 'Cancellation Approvals', bm: 'Kelulusan Pembatalan' },
  cancel_approval_desc: { en: 'Notifications for your cancellation request status.', bm: 'Notifikasi untuk status permintaan pembatalan anda.' },
  update_notifications: { en: 'Update Notification Preferences', bm: 'Kemaskini Pilihan Notifikasi' },
  // Navigation Bar
  nav_home: { en: 'Home', bm: 'Utama' },
  nav_order: { en: 'Order', bm: 'Tempah' },
  nav_bookings: { en: 'Bookings', bm: 'Rekod' },
  nav_admin: { en: 'Admin', bm: 'Admin' },
  nav_contact: { en: 'Contact', bm: 'Hubungi' },
  nav_profile: { en: 'Profile', bm: 'Profil' },
  nav_settings: { en: 'Settings', bm: 'Tetapan' },
  // Saved Locations & Help
  saved_locations: { en: 'Saved Locations', bm: 'Lokasi Disimpan' },
  manage_locations: { en: 'Manage Saved Locations', bm: 'Urus Lokasi Disimpan' },
  add_location: { en: 'Add Location', bm: 'Tambah Lokasi' },
  edit_location: { en: 'Edit Location', bm: 'Edit Lokasi' },
  delete_location: { en: 'Delete Location', bm: 'Padam Lokasi' },
  location_label: { en: 'Label (e.g. Office, Home)', bm: 'Label (cth. Pejabat, Rumah)' },
  location_address: { en: 'Venue Address', bm: 'Alamat Lokasi' },
  choose_saved_location: { en: 'Choose from Saved Locations', bm: 'Pilih dari Lokasi Disimpan' },
  help_support: { en: 'Help & FAQ Support', bm: 'Bantuan & FAQ Sokongan' },
  frequently_asked_questions: { en: 'Frequently Asked Questions', bm: 'Soalan Lazim (FAQ)' },
  contact_support_whatsapp: { en: 'Contact Support on WhatsApp', bm: 'Hubungi Sokongan via WhatsApp' },
  location_saved_success: { en: 'Location saved successfully!', bm: 'Lokasi berjaya disimpan!' },
  location_deleted_success: { en: 'Location deleted successfully!', bm: 'Lokasi berjaya dipadam!' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: keyof typeof translations): string => {
    return translations[key]?.[language] ?? String(key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
