import { Router } from 'express';
import { getFirestore } from '../firebaseAdmin.js';
import { verifyAdminToken } from '../adminAuth.js';
import { DEFAULT_MENU_ITEMS } from '../../src/constants/menu.js';

const router = Router();

const ALLOWED_CATEGORIES = new Set(['breakfast', 'lunch', 'hi tea', 'drinks']);
const ALLOWED_SUITABILITY = new Set(['breakfast_hitea', 'lunch', undefined]);

const NAME_REGEX = /^[a-zA-Z0-9\s\-'&/().]{1,100}$/;

function sanitizeString(val: unknown, maxLen = 500): string {
  if (typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (trimmed.length > maxLen) return trimmed.slice(0, maxLen);
  return trimmed;
}

function validateMenuItem(body: any): { valid: false; error: string } | { valid: true; data: any } {
  const nameEn = sanitizeString(body.nameEn, 100);
  const nameBm = sanitizeString(body.nameBm, 100);

  if (!nameEn || !nameBm) {
    return { valid: false, error: 'Missing required menu item fields (nameEn, nameBm)' };
  }
  if (!NAME_REGEX.test(nameEn) || !NAME_REGEX.test(nameBm)) {
    return { valid: false, error: 'Name fields contain invalid characters.' };
  }

  const price = Number(body.price);
  if (isNaN(price) || price < 0 || price > 9999) {
    return { valid: false, error: 'Price must be a number between 0 and 9999.' };
  }

  const category = sanitizeString(body.category, 20) || 'lunch';
  if (!ALLOWED_CATEGORIES.has(category)) {
    return { valid: false, error: `Invalid category. Allowed: ${Array.from(ALLOWED_CATEGORIES).join(', ')}` };
  }

  const descEn = sanitizeString(body.descEn, 500);
  const descBm = sanitizeString(body.descBm, 500);
  const suitability = body.suitability !== undefined ? sanitizeString(body.suitability, 30) : undefined;

  if (suitability !== undefined && !ALLOWED_SUITABILITY.has(suitability)) {
    return { valid: false, error: 'Invalid suitability value.' };
  }

  return {
    valid: true,
    data: {
      nameEn,
      nameBm,
      descEn,
      descBm,
      price,
      category,
      suitability,
      available: body.available !== undefined ? Boolean(body.available) : true,
    }
  };
}

router.get('/menu', async (_req, res) => {
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
router.post('/admin/menu', verifyAdminToken, async (req, res) => {
  try {
    const db = getFirestore();

    // Bulk replace mode
    if (Array.isArray(req.body.items)) {
      if (req.body.items.length > 200) {
        return res.status(400).json({ error: 'Maximum 200 items allowed in bulk replace.' });
      }

      const validatedItems = [];
      for (const item of req.body.items) {
        const validation = validateMenuItem(item);
        if (!validation.valid) {
          return res.status(400).json({ error: validation.error });
        }
        validatedItems.push(validation.data);
      }

      const batch = db.batch();
      const oldSnap = await db.collection('menu').get();
      oldSnap.docs.forEach(doc => batch.delete(doc.ref));

      validatedItems.forEach((item: any, index: number) => {
        const rawItem = req.body.items[index];
        const docRef = rawItem.id ? db.collection('menu').doc(String(rawItem.id)) : db.collection('menu').doc();
        batch.set(docRef, {
          ...item,
          updatedAt: new Date().toISOString()
        });
      });

      await batch.commit();
      return res.json({ success: true, count: validatedItems.length });
    }

    // Single item add mode
    const validation = validateMenuItem(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const docRef = req.body.id ? db.collection('menu').doc(String(req.body.id)) : db.collection('menu').doc();
    const newItem = {
      id: docRef.id,
      ...validation.data,
      updatedAt: new Date().toISOString()
    };

    await docRef.set(newItem, { merge: true });
    return res.json({ success: true, item: newItem });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Single item PUT handler
router.put('/admin/menu/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getFirestore();
    const docRef = db.collection('menu').doc(id);
    const existing = await docRef.get();

    if (!existing.exists) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const validation = validateMenuItem(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const updatedData = {
      ...validation.data,
      updatedAt: new Date().toISOString()
    };

    await docRef.update(updatedData);
    return res.json({ success: true, item: { id, ...updatedData } });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Single item PATCH toggle handler
router.patch('/admin/menu/:id/toggle', verifyAdminToken, async (req, res) => {
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
router.delete('/admin/menu/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getFirestore();
    await db.collection('menu').doc(id).delete();
    return res.json({ success: true, id });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.post('/admin/menu/reset', verifyAdminToken, async (_req, res) => {
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
