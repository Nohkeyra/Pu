import { Router } from 'express';
import { getFirestore } from '../firebaseAdmin.js';
import { verifyAdminToken } from '../adminAuth.js';

const router = Router();

const DEFAULT_MENU_ITEMS = [
  { id: 'nasi_lemak_biasa', nameEn: 'Nasi Lemak Biasa', nameBm: 'Nasi Lemak Biasa', descEn: 'Aromatic coconut rice with spicy sambal, egg, and peanuts', descBm: 'Nasi lemak harum dengan sambal tumis bilis, telur, timun dan kacang', price: 4, category: 'breakfast' },
  { id: 'nasi_lemak_ayam', nameEn: 'Nasi Lemak Ayam', nameBm: 'Nasi Lemak Ayam Goreng', descEn: 'Coconut rice served with spiced golden fried chicken', descBm: 'Nasi lemak dengan ayam goreng berempah panas', price: 8, category: 'breakfast' },
  { id: 'mee_goreng', nameEn: 'Mee Goreng Mamak', nameBm: 'Mee Goreng Mamak', descEn: 'Wok-fried yellow noodles with traditional spices', descBm: 'Mee goreng mamak dengan cucur, taukua dan telur', price: 5, category: 'breakfast' },
  { id: 'roti_canai', nameEn: 'Roti Canai', nameBm: 'Roti Canai', descEn: 'Flaky flatbread served with savory dhal curry', descBm: 'Roti canai lembut dan garing bersama kuah dhal', price: 2, category: 'breakfast' },
  { id: 'kuih_muih', nameEn: 'Assorted Malay Kuih', nameBm: 'Kuih-Muih Campur', descEn: 'Sweet and savory traditional hand-crafted delicacies', descBm: 'Aneka pilihan kuih-muih tradisional melayu', price: 3, category: 'breakfast' },
  { id: 'nasi_campur', nameEn: 'Nasi Campur (Standard)', nameBm: 'Nasi Campur Standard', descEn: 'Steamed rice with 1 meat dish, 1 vegetable, and gravy', descBm: 'Nasi putih bersama 1 lauk ayam/daging, 1 sayur dan kuah campur', price: 10, category: 'lunch' },
  { id: 'nasi_kerabu', nameEn: 'Nasi Kerabu Ayam Percik', nameBm: 'Nasi Kerabu Ayam Percik', descEn: 'Blue pea flower rice with grilled percik chicken & herbs', descBm: 'Nasi kerabu biru ulam-ulaman segar dengan ayam percik bakar', price: 12, category: 'lunch' },
  { id: 'nasi_minyak', nameEn: 'Nasi Minyak Rendang Daging', nameBm: 'Nasi Minyak Rendang Daging', descEn: 'Fragrant butter rice with slow-cooked beef rendang & jelatah', descBm: 'Nasi minyak wangi dengan rendang daging tok dan acar jelatah', price: 14, category: 'lunch' },
  { id: 'teh_tarik', nameEn: 'Teh Tarik (Hot)', nameBm: 'Teh Tarik Panas', descEn: 'Frothy, freshly pulled milk tea', descBm: 'Teh tarik buih meleleh wangi', price: 2.5, category: 'drink' },
  { id: 'kopi_o', nameEn: 'Kopi O (Hot)', nameBm: 'Kopi O Panas', descEn: 'Traditional Malaysian dark roasted black coffee', descBm: 'Kopi kaw hitam aroma pekat', price: 2, category: 'drink' },
  { id: 'sirap_bandung', nameEn: 'Sirap Bandung Ais', nameBm: 'Sirap Bandung Ais', descEn: 'Iced rose syrup with condensed milk & basil seeds', descBm: 'Sirap bandung ais berkrim dengan biji selasih', price: 3, category: 'drink' }
];

router.get('/', async (_req, res) => {
  try {
    const db = getFirestore();
    const snap = await db.collection('menu').get();
    if (snap.empty) {
      return res.json({ success: true, items: DEFAULT_MENU_ITEMS, isDefault: true });
    }
    const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.json({ success: true, items, isDefault: false });
  } catch {
    return res.json({ success: true, items: DEFAULT_MENU_ITEMS, isDefault: true });
  }
});

router.post('/', verifyAdminToken, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items must be an array' });
    }

    const db = getFirestore();
    const batch = db.batch();

    const oldSnap = await db.collection('menu').get();
    oldSnap.docs.forEach(doc => batch.delete(doc.ref));

    items.forEach((item: any) => {
      const docRef = item.id ? db.collection('menu').doc(String(item.id)) : db.collection('menu').doc();
      batch.set(docRef, { ...item, updatedAt: new Date().toISOString() });
    });

    await batch.commit();
    return res.json({ success: true, count: items.length });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.post('/reset', verifyAdminToken, async (_req, res) => {
  try {
    const db = getFirestore();
    const batch = db.batch();

    const oldSnap = await db.collection('menu').get();
    oldSnap.docs.forEach(doc => batch.delete(doc.ref));

    DEFAULT_MENU_ITEMS.forEach((item) => {
      const docRef = db.collection('menu').doc(item.id);
      batch.set(docRef, item);
    });

    await batch.commit();
    return res.json({ success: true, items: DEFAULT_MENU_ITEMS });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
