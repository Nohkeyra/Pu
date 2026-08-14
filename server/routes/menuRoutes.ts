import { Router } from 'express';
import { getFirestore } from '../firebaseAdmin.js';
import { verifyAdminToken } from '../adminAuth.js';

const router = Router();

const DEFAULT_MENU_ITEMS = [
  { id: 'nasi_lemak_biasa', nameEn: 'Nasi Lemak Biasa', nameBm: 'Nasi Lemak Biasa', descEn: 'Aromatic coconut rice with spicy sambal, egg, and peanuts', descBm: 'Nasi lemak harum dengan sambal tumis bilis, telur, timun dan kacang', price: 4, category: 'breakfast', image: '/assets/images/nasi_lemak_drawn_1786678078469.jpg' },
  { id: 'nasi_lemak_ayam', nameEn: 'Nasi Lemak Ayam', nameBm: 'Nasi Lemak Ayam Goreng', descEn: 'Coconut rice served with spiced golden fried chicken', descBm: 'Nasi lemak dengan ayam goreng berempah panas', price: 8, category: 'breakfast', image: '/assets/images/nasi_lemak_drawn_1786678078469.jpg' },
  { id: 'mee_goreng', nameEn: 'Mee Goreng Mamak', nameBm: 'Mee Goreng Mamak', descEn: 'Wok-fried yellow noodles with traditional spices', descBm: 'Mee goreng mamak dengan cucur, taukua dan telur', price: 5, category: 'breakfast', image: '/assets/images/soto_ayam_drawn_1786678098460.jpg' },
  { id: 'roti_canai', nameEn: 'Roti Canai', nameBm: 'Roti Canai', descEn: 'Flaky flatbread served with savory dhal curry', descBm: 'Roti canai lembut dan garing bersama kuah dhal', price: 2, category: 'breakfast', image: '/assets/images/kuih_muih_drawn_1786678145689.jpg' },
  { id: 'kuih_muih', nameEn: 'Assorted Malay Kuih', nameBm: 'Kuih-Muih Campur', descEn: 'Sweet and savory traditional hand-crafted delicacies', descBm: 'Aneka pilihan kuih-muih tradisional melayu', price: 3, category: 'breakfast', image: '/assets/images/kuih_muih_drawn_1786678145689.jpg' },
  { id: 'nasi_campur', nameEn: 'Nasi Campur (Standard)', nameBm: 'Nasi Campur Standard', descEn: 'Steamed rice with 1 meat dish, 1 vegetable, and gravy', descBm: 'Nasi putih bersama 1 lauk ayam/daging, 1 sayur dan kuah campur', price: 10, category: 'lunch', image: '/assets/nasi-campur.jpg' },
  { id: 'nasi_kerabu', nameEn: 'Nasi Kerabu Ayam Percik', nameBm: 'Nasi Kerabu Ayam Percik', descEn: 'Blue pea flower rice with grilled percik chicken & herbs', descBm: 'Nasi kerabu biru ulam-ulaman segar dengan ayam percik bakar', price: 12, category: 'lunch', image: '/assets/images/ayam_berempah_drawn_1786678122149.jpg' },
  { id: 'nasi_minyak', nameEn: 'Nasi Minyak Rendang Daging', nameBm: 'Nasi Minyak Rendang Daging', descEn: 'Fragrant butter rice with slow-cooked beef rendang & jelatah', descBm: 'Nasi minyak wangi dengan rendang daging tok dan acar jelatah', price: 14, category: 'lunch', image: '/assets/images/rendang_daging_drawn_1786678134956.jpg' },
  { id: 'teh_tarik', nameEn: 'Teh Tarik (Hot)', nameBm: 'Teh Tarik Panas', descEn: 'Frothy, freshly pulled milk tea', descBm: 'Teh tarik buih meleleh wangi', price: 2.5, category: 'drink', image: '/assets/images/teh_tarik_drawn_1786678155597.jpg' },
  { id: 'kopi_o', nameEn: 'Kopi O (Hot)', nameBm: 'Kopi O Panas', descEn: 'Traditional Malaysian dark roasted black coffee', descBm: 'Kopi kaw hitam aroma pekat', price: 2, category: 'drink', image: '/assets/images/kopi_kampung_drawn_1786678168694.jpg' },
  { id: 'sirap_bandung', nameEn: 'Sirap Bandung Ais', nameBm: 'Sirap Bandung Ais', descEn: 'Iced rose syrup with condensed milk & basil seeds', descBm: 'Sirap bandung ais berkrim dengan biji selasih', price: 3, category: 'drink', image: '/assets/images/sirap_bandung_drawn_1786678177483.jpg' }
];

router.get('/', async (_req, res) => {
  try {
    const db = getFirestore();
    const snap = await db.collection('menu').get();
    if (snap.empty) {
      const defaultWithAvail = DEFAULT_MENU_ITEMS.map(i => ({ available: true, ...i }));
      return res.json({ success: true, items: defaultWithAvail, menuItems: defaultWithAvail, isDefault: true });
    }
    const items = snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        available: data.available !== undefined ? Boolean(data.available) : true,
        ...data
      };
    });
    return res.json({ success: true, items, menuItems: items, isDefault: false });
  } catch {
    const defaultWithAvail = DEFAULT_MENU_ITEMS.map(i => ({ available: true, ...i }));
    return res.json({ success: true, items: defaultWithAvail, menuItems: defaultWithAvail, isDefault: true });
  }
});

// Single item or Bulk save POST handler
router.post('/', verifyAdminToken, async (req, res) => {
  try {
    const db = getFirestore();
    
    // Bulk replace mode
    if (Array.isArray(req.body.items)) {
      const batch = db.batch();
      const oldSnap = await db.collection('menu').get();
      oldSnap.docs.forEach(doc => batch.delete(doc.ref));

      req.body.items.forEach((item: any) => {
        const docRef = item.id ? db.collection('menu').doc(String(item.id)) : db.collection('menu').doc();
        batch.set(docRef, {
          available: item.available !== undefined ? Boolean(item.available) : true,
          ...item,
          updatedAt: new Date().toISOString()
        });
      });

      await batch.commit();
      return res.json({ success: true, count: req.body.items.length });
    }

    // Single item add mode
    const { nameEn, nameBm, descEn, descBm, price, category, available, suitability } = req.body;
    if (!nameEn || !nameBm || price === undefined) {
      return res.status(400).json({ error: 'Missing required menu item fields (nameEn, nameBm, price)' });
    }

    const docRef = req.body.id ? db.collection('menu').doc(String(req.body.id)) : db.collection('menu').doc();
    const newItem = {
      id: docRef.id,
      nameEn: String(nameEn).trim(),
      nameBm: String(nameBm).trim(),
      descEn: String(descEn || '').trim(),
      descBm: String(descBm || '').trim(),
      price: Number(price) || 0,
      category: category || 'lunch',
      suitability: suitability || undefined,
      available: available !== undefined ? Boolean(available) : true,
      updatedAt: new Date().toISOString()
    };

    await docRef.set(newItem, { merge: true });
    return res.json({ success: true, item: newItem });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Single item PUT handler
router.put('/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nameEn, nameBm, descEn, descBm, price, category, available, suitability } = req.body;
    
    const db = getFirestore();
    const docRef = db.collection('menu').doc(id);
    const existing = await docRef.get();
    
    if (!existing.exists) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const updatedData = {
      nameEn: nameEn !== undefined ? String(nameEn).trim() : existing.data()?.nameEn,
      nameBm: nameBm !== undefined ? String(nameBm).trim() : existing.data()?.nameBm,
      descEn: descEn !== undefined ? String(descEn).trim() : existing.data()?.descEn,
      descBm: descBm !== undefined ? String(descBm).trim() : existing.data()?.descBm,
      price: price !== undefined ? Number(price) : existing.data()?.price,
      category: category !== undefined ? category : existing.data()?.category,
      suitability: suitability !== undefined ? suitability : existing.data()?.suitability,
      available: available !== undefined ? Boolean(available) : (existing.data()?.available ?? true),
      updatedAt: new Date().toISOString()
    };

    await docRef.update(updatedData);
    return res.json({ success: true, item: { id, ...updatedData } });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Single item PATCH toggle handler
router.patch('/:id/toggle', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { available } = req.body;
    
    const db = getFirestore();
    const docRef = db.collection('menu').doc(id);
    const existing = await docRef.get();

    if (!existing.exists) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const newAvailable = available !== undefined ? Boolean(available) : !existing.data()?.available;
    await docRef.update({
      available: newAvailable,
      updatedAt: new Date().toISOString()
    });

    return res.json({ success: true, id, available: newAvailable });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Single item DELETE handler
router.delete('/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getFirestore();
    await db.collection('menu').doc(id).delete();
    return res.json({ success: true, id });
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
