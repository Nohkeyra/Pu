import type { ToastMessage } from '@/components/ui/Toast';

export const measureDbLatency = async (toast: (props: Omit<ToastMessage, 'id'>) => void) => {
  const start = Date.now();
  try {
    const { getFirestore, collection, limit, getDocs, query } = await import('firebase/firestore');
    const db = getFirestore();
    const q = query(collection(db, 'orders'), limit(1));
    await getDocs(q);
    const end = Date.now();
    const latency = end - start;
    toast({ title: 'Database Ping', description: `Round-trip latency: ${latency}ms` });
    return true;
  } catch (err) {
    console.error('Latency test failed:', err);
    return false;
  }
};
