import { Router } from 'express';
import { getFirestore } from '../firebaseAdmin.js';
import { verifyAdminToken } from '../adminAuth.js';
import { DEFAULT_MENU_ITEMS } from '../../src/constants/menu.js';

const router = Router();


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
