import { Router } from 'express';
import { getFirestore } from '../firebaseAdmin.js';
import { verifyAdminToken } from '../adminAuth.js';
import { DEFAULT_MENU_ITEMS } from '../../src/constants/menu.ts';
import { correctDefaultMenuImage } from '../../src/constants/menuImages.ts';
import { invalidateMenuHealthCache } from './imageRoutes.js';

const router = Router();

export { correctDefaultMenuImage } from '../../src/constants/menuImages.ts';

const ALLOWED_CATEGORIES = new Set(['breakfast', 'lunch', 'hi tea', 'drinks']);
const ALLOWED_SUITABILITY = new Set(['breakfast_hitea', 'lunch', undefined]);

const NAME_REGEX = /^[a-zA-Z0-9\s\-'&/().]{1,100}$/;
const MENU_ID_RE = /^[A-Za-z0-9_-]{1,100}$/;
const BATCH_CHUNK_SIZE = 450;

function isValidMenuId(id: unknown): id is string {
  return typeof id === 'string' && MENU_ID_RE.test(id);
}

async function commitBatchedOps(db: any, ops: Array<(batch: any) => void>) {
  for (let i = 0; i < ops.length; i += BATCH_CHUNK_SIZE) {
    const batch = db.batch();
    const chunk = ops.slice(i, i + BATCH_CHUNK_SIZE);
    for (const apply of chunk) {
      apply(batch);
    }
    await batch.commit();
  }
}

function sanitizeString(val: unknown, maxLen = 500): string {
  if (typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (trimmed.length > maxLen) return trimmed.slice(0, maxLen);
  return trimmed;
}

function validateMenuItem(body: any): { valid: false; error: string } | { valid: true; data: any } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Menu item must be an object.' };
  }
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
      ...(suitability !== undefined ? { suitability } : {}),
      available: body.available !== undefined ? Boolean(body.available) : true,
    }
  };
}

async function seedMenuIfEmpty(db: any) {
  const snap = await db.collection('menu').limit(1).get();
  if (snap.empty) {
    const batch = db.batch();
    DEFAULT_MENU_ITEMS.forEach(item => {
      const docRef = db.collection('menu').doc(item.id);
      batch.set(docRef, {
        ...item,
        available: item.available !== undefined ? item.available : true,
        updatedAt: new Date().toISOString()
      });
    });
    await batch.commit();
  }
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
      return correctDefaultMenuImage({
        id: doc.id,
        available: data.available !== undefined ? Boolean(data.available) : true,
        ...data
      });
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
    await seedMenuIfEmpty(db);

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

      const ops: Array<(batch: any) => void> = [];
      const oldSnap = await db.collection('menu').get();
      oldSnap.docs.forEach((doc: any) => {
        ops.push((batch) => batch.delete(doc.ref));
      });

      const preparedIds: Array<string | undefined> = [];
      for (let index = 0; index < req.body.items.length; index++) {
        const rawId = req.body.items[index]?.id;
        if (rawId !== undefined && rawId !== null && rawId !== '') {
          const coercedId = String(rawId);
          if (!isValidMenuId(coercedId)) {
            return res.status(400).json({ error: 'Invalid menu item ID.' });
          }
          preparedIds.push(coercedId);
        } else {
          preparedIds.push(undefined);
        }
      }

      validatedItems.forEach((item: any, index: number) => {
        const targetId = preparedIds[index];
        const docRef = targetId ? db.collection('menu').doc(targetId) : db.collection('menu').doc();
        const payload = {
          ...item,
          updatedAt: new Date().toISOString()
        };
        ops.push((batch) => batch.set(docRef, payload));
      });

      await commitBatchedOps(db, ops);
      invalidateMenuHealthCache();
      return res.json({ success: true, count: validatedItems.length });
    }

    // Single item add mode
    const validation = validateMenuItem(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    if (req.body.id !== undefined && req.body.id !== null && req.body.id !== '') {
      if (!isValidMenuId(String(req.body.id))) {
        return res.status(400).json({ error: 'Invalid menu item ID.' });
      }
    }

    const docRef = req.body.id ? db.collection('menu').doc(String(req.body.id)) : db.collection('menu').doc();
    const newItem: any = {
      id: docRef.id,
      ...validation.data,
      updatedAt: new Date().toISOString()
    };
    
    // Remove undefined values to avoid Firestore errors
    Object.keys(newItem).forEach(key => newItem[key] === undefined && delete newItem[key]);

    await docRef.set(newItem, { merge: true });
    invalidateMenuHealthCache();
    return res.json({ success: true, item: newItem });
  } catch (err) {
    console.error('[MenuRoutes] Failed to save menu item:', err);
    return res.status(500).json({ error: 'Failed to save menu items.' });
  }
});

// Single item PUT handler
router.put('/admin/menu/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidMenuId(id)) {
      return res.status(400).json({ error: 'Invalid menu item ID.' });
    }
    const db = getFirestore();
    await seedMenuIfEmpty(db);
    const docRef = db.collection('menu').doc(id);
    const existing = await docRef.get();

    const validation = validateMenuItem(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const updatedData: any = {
      ...validation.data,
      updatedAt: new Date().toISOString()
    };
    
    // Remove undefined values to avoid Firestore errors
    Object.keys(updatedData).forEach(key => updatedData[key] === undefined && delete updatedData[key]);

    if (!existing.exists) {
      const defaultItem = DEFAULT_MENU_ITEMS.find(i => i.id === id);
      if (!defaultItem) {
        return res.status(404).json({ error: 'Menu item not found' });
      }
      await docRef.set({
        ...defaultItem,
        ...updatedData
      });
    } else {
      await docRef.update(updatedData);
    }

    invalidateMenuHealthCache();
    return res.json({ success: true, item: { id, ...updatedData } });
  } catch (err) {
    console.error('[MenuRoutes] Failed to update menu item:', err);
    return res.status(500).json({ error: 'Failed to update menu item.' });
  }
});

// Single item PATCH toggle handler
router.patch('/admin/menu/:id/toggle', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidMenuId(id)) {
      return res.status(400).json({ error: 'Invalid menu item ID.' });
    }
    const { available } = req.body;

    const db = getFirestore();
    await seedMenuIfEmpty(db);
    const docRef = db.collection('menu').doc(id);
    const existing = await docRef.get();

    if (!existing.exists) {
      const defaultItem = DEFAULT_MENU_ITEMS.find(i => i.id === id);
      if (!defaultItem) {
        return res.status(404).json({ error: 'Menu item not found' });
      }
      const newAvailable = available !== undefined ? Boolean(available) : !(defaultItem.available ?? true);
      await docRef.set({
        ...defaultItem,
        available: newAvailable,
        updatedAt: new Date().toISOString()
      });
      invalidateMenuHealthCache();
      return res.json({ success: true, id, available: newAvailable });
    }

    const newAvailable = available !== undefined ? Boolean(available) : !existing.data()?.available;
    await docRef.update({
      available: newAvailable,
      updatedAt: new Date().toISOString()
    });

    invalidateMenuHealthCache();
    return res.json({ success: true, id, available: newAvailable });
  } catch (err) {
    console.error('[MenuRoutes] Failed to toggle menu item:', err);
    return res.status(500).json({ error: 'Failed to toggle menu item.' });
  }
});

// Single item DELETE handler
router.delete('/admin/menu/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidMenuId(id)) {
      return res.status(400).json({ error: 'Invalid menu item ID.' });
    }
    const db = getFirestore();
    await seedMenuIfEmpty(db);
    await db.collection('menu').doc(id).delete();
    invalidateMenuHealthCache();
    return res.json({ success: true, id });
  } catch (err) {
    console.error('[MenuRoutes] Failed to delete menu item:', err);
    return res.status(500).json({ error: 'Failed to delete menu item.' });
  }
});

router.post('/admin/menu/reset', verifyAdminToken, async (_req, res) => {
  try {
    const db = getFirestore();
    const ops: Array<(batch: any) => void> = [];

    const oldSnap = await db.collection('menu').get();
    oldSnap.docs.forEach((doc: any) => {
      ops.push((batch) => batch.delete(doc.ref));
    });

    DEFAULT_MENU_ITEMS.forEach((item) => {
      const docRef = db.collection('menu').doc(item.id);
      ops.push((batch) => batch.set(docRef, item));
    });

    await commitBatchedOps(db, ops);
    invalidateMenuHealthCache();
    return res.json({ success: true, items: DEFAULT_MENU_ITEMS });
  } catch (err) {
    console.error('[MenuRoutes] Failed to reset menu items:', err);
    return res.status(500).json({ error: 'Failed to reset menu items.' });
  }
});

export default router;

