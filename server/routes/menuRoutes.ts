import { Router } from 'express';
import { getFirestore } from '../firebaseAdmin.js';
import { verifyAdminToken } from '../adminAuth.js';
import { DEFAULT_MENU_ITEMS } from '../../src/constants/menu.ts';

const router = Router();

// Upgrade only the known default placeholders. Preserve any custom image an
// administrator has chosen, and never change the saved Firestore document.
const MENU_IMAGE_CORRECTIONS: Record<string, { name: string; previous: readonly string[]; replacement: string }> = {
  "mee_siam_sarapan": { name: "Mee Siam", previous: ["/assets/dishes/vector/laksa_johor.jpg"], replacement: "/assets/dishes/vector/mee_siam.webp" },
  "mee_siam_petang": { name: "Mee Siam", previous: ["/assets/dishes/vector/bihun_goreng.jpg"], replacement: "/assets/dishes/vector/mee_siam.webp" },
  "mee_rebus_sarapan": { name: "Mee Rebus", previous: ["/assets/dishes/vector/mee_kari.jpg"], replacement: "/assets/dishes/vector/mee_rebus.webp" },
  "mee_rebus_petang": { name: "Mee Rebus", previous: ["/assets/dishes/vector/mee_kari.jpg"], replacement: "/assets/dishes/vector/mee_rebus.webp" },
  "mee_soto_sarapan": { name: "Mee Soto", previous: ["/assets/dishes/vector/soto_ayam.jpg"], replacement: "/assets/dishes/vector/mee_soto.webp" },
  "mee_soto_petang": { name: "Mee Soto", previous: ["/assets/dishes/vector/soto_ayam.jpg"], replacement: "/assets/dishes/vector/mee_soto.webp" },
  "bubur_ayam": { name: "Bubur Ayam", previous: ["/assets/dishes/vector/soto_ayam.jpg"], replacement: "/assets/dishes/vector/bubur_ayam.webp" },
  "maggi_goreng": { name: "Maggi Goreng", previous: ["/assets/dishes/vector/mee_goreng.jpg"], replacement: "/assets/dishes/vector/maggi_goreng.webp" },
  "roti_sardin": { name: "Roti Sardin", previous: ["/assets/dishes/vector/roti_canai.jpg"], replacement: "/assets/dishes/vector/roti_sardin.webp" },
  "roti_telur": { name: "Roti Telur", previous: ["/assets/dishes/vector/roti_canai.jpg"], replacement: "/assets/dishes/vector/roti_telur.webp" },
  "nasi_lemak_sambal_sotong": { name: "Nasi Lemak Sambal Sotong", previous: ["/assets/dishes/vector/nasi_lemak.jpg"], replacement: "/assets/dishes/vector/nasi_lemak_sotong.webp" },
  "nasi_lemak_ayam_goreng": { name: "Nasi Lemak Ayam Goreng", previous: ["/assets/dishes/vector/nasi_lemak.jpg"], replacement: "/assets/dishes/vector/nasi_lemak_ayam.webp" },
  "udang_goreng_tepung": { name: "Udang Goreng Tepung", previous: ["/assets/dishes/vector/sambal_udang.jpg"], replacement: "/assets/dishes/vector/udang_goreng_tepung.webp" },
  "dendeng": { name: "Dendeng", previous: ["/assets/dishes/vector/rendang_daging.jpg"], replacement: "/assets/dishes/vector/dendeng.webp" },
  "daging_masak_merah": { name: "Daging Masak Merah", previous: ["/assets/dishes/vector/rendang_daging.jpg"], replacement: "/assets/dishes/vector/daging_masak_merah.webp" },
  "sambal_sotong": { name: "Sambal Sotong", previous: ["/assets/dishes/vector/sambal_udang.jpg"], replacement: "/assets/dishes/vector/sambal_sotong.webp" },
  "daging_masak_hitam": { name: "Daging Masak Hitam", previous: ["/assets/dishes/vector/rendang_daging.jpg"], replacement: "/assets/dishes/vector/daging_masak_hitam.webp" },
  "ikan_goreng_berlada": { name: "Ikan Goreng Berlada", previous: ["/assets/dishes/vector/ikan_keli.jpg"], replacement: "/assets/dishes/vector/ikan_goreng_berlada.webp" },
  "ayam_paprik": { name: "Ayam Paprik", previous: ["/assets/dishes/vector/ayam_berempah.jpg"], replacement: "/assets/dishes/vector/ayam_paprik.webp" },
  "rendang_ayam": { name: "Rendang Ayam", previous: ["/assets/dishes/vector/rendang_daging.jpg"], replacement: "/assets/dishes/vector/rendang_ayam.webp" },
  "ayam_kurma": { name: "Ayam Kurma", previous: ["/assets/dishes/vector/ayam_berempah.jpg"], replacement: "/assets/dishes/vector/ayam_kurma.webp" },
  "ayam_masak_kicap": { name: "Ayam Masak Kicap", previous: ["/assets/dishes/vector/ayam_berempah.jpg"], replacement: "/assets/dishes/vector/ayam_masak_kicap.webp" },
  "ayam_masak_merah": { name: "Ayam Masak Merah", previous: ["/assets/dishes/vector/ayam_berempah.jpg"], replacement: "/assets/dishes/vector/ayam_masak_merah.webp" },
  "nasi_goreng_kampung": { name: "Nasi Goreng Kampung", previous: ["/assets/dishes/vector/nasi_lemak.jpg"], replacement: "/assets/dishes/vector/nasi_goreng_kampung.webp" },
  "nasi_goreng_cina": { name: "Nasi Goreng Cina", previous: ["/assets/dishes/vector/nasi_lemak.jpg"], replacement: "/assets/dishes/vector/nasi_goreng_cina.webp" },
  "pucuk_paku_masak_lemak": { name: "Pucuk Paku Masak Lemak", previous: ["/assets/dishes/vector/masak_lemak.jpg"], replacement: "/assets/dishes/vector/pucuk_paku.webp" },
  "kangkung_belacan": { name: "Kangkung Belacan", previous: ["/assets/dishes/vector/masak_lemak.jpg"], replacement: "/assets/dishes/vector/kangkung_belacan.webp" },
  "sayur_campur": { name: "Sayur Campur", previous: ["/assets/dishes/vector/masak_lemak.jpg"], replacement: "/assets/dishes/vector/sayur_campur.webp" },
  "nasi_tomato": { name: "Nasi Tomato", previous: ["/assets/dishes/vector/nasi_briyani.jpg"], replacement: "/assets/dishes/vector/nasi_tomato.webp" },
  "taugeh_goreng": { name: "Taugeh Goreng", previous: ["/assets/dishes/vector/masak_lemak.jpg"], replacement: "/assets/dishes/vector/taugeh_goreng.webp" },
  "bergedil": { name: "Bergedil", previous: ["/assets/dishes/vector/soto_ayam.jpg"], replacement: "/assets/dishes/vector/bergedil.webp" },
  "rojak_buah": { name: "Rojak Buah", previous: ["/assets/dishes/vector/rojak_singapore.jpg"], replacement: "/assets/dishes/vector/rojak_buah.webp" },
  "cucur_goreng_pisang": { name: "Cucur Goreng Pisang", previous: ["/assets/dishes/vector/pisang_goreng.jpg"], replacement: "/assets/dishes/vector/cucur_pisang.webp" },
  "tetra_pak_mineral_water": { name: "Tetra Pak Mineral Water", previous: ["/assets/drinks/mineral_water_vector.jpg"], replacement: "/assets/drinks/tetra_mineral.webp" },
  "popia": { name: "Popia", previous: ["/assets/dishes/vector/pisang_goreng.jpg", "/assets/dishes/vector/popia.png"], replacement: "/assets/dishes/vector/popia.webp" },
  "telur_dadar": { name: "Telur Dadar", previous: ["/assets/dishes/vector/roti_canai.jpg", "/assets/dishes/vector/telur_dadar.png"], replacement: "/assets/dishes/vector/telur_dadar.webp" },
  "samosa_kentang": { name: "Samosa Kentang", previous: ["/assets/dishes/vector/pisang_goreng.jpg", "/assets/dishes/vector/samosa_kentang.png"], replacement: "/assets/dishes/vector/samosa_kentang.webp" },
  "air_kordial": { name: "Air Kordial", previous: ["/assets/drinks/sirap_bandung.jpg", "/assets/drinks/air_kordial.png"], replacement: "/assets/drinks/air_kordial.webp" },
  "telur_mata_sapi_lunch": { name: "Telur Mata Sapi", previous: ["/assets/dishes/vector/nasi_lemak.jpg"], replacement: "/assets/dishes/vector/telur_mata_sapi.jpg" },
};

export function correctDefaultMenuImage<T extends { id: string; nameBm?: unknown; image?: unknown }>(item: T): T {
  const correction = MENU_IMAGE_CORRECTIONS[item.id];
  const hasKnownPlaceholder = item.image == null || item.image === '' || (typeof item.image === 'string' && correction?.previous.includes(item.image));
  if (!correction || item.nameBm !== correction.name || !hasKnownPlaceholder) return item;
  return { ...item, image: correction.replacement };
}
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
    const newItem: any = {
      id: docRef.id,
      ...validation.data,
      updatedAt: new Date().toISOString()
    };
    
    // Remove undefined values to avoid Firestore errors
    Object.keys(newItem).forEach(key => newItem[key] === undefined && delete newItem[key]);

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
      return res.json({ success: true, id, available: newAvailable });
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
    await seedMenuIfEmpty(db);
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

