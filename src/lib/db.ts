// Custom Local Storage Database Engine
class MockDocRef {
  constructor(public id: string, public path: string) {}
}

class MockCollectionRef {
  constructor(public path: string) {}
}

class MockQuery {
  constructor(public collectionRef: MockCollectionRef, public constraints: any[]) {}
}

export const db = { name: 'LocalStorageDB' };

export function collection(database: any, path: string) {
  return new MockCollectionRef(path);
}

export function doc(dbOrCollection: any, ...paths: string[]) {
  let path = '';
  if (dbOrCollection instanceof MockCollectionRef) {
    path = dbOrCollection.path + '/' + paths[0];
  } else {
    path = paths.join('/');
  }
  const parts = path.split('/');
  const id = parts[parts.length - 1];
  return new MockDocRef(id, path);
}

export function where(field: string, op: string, value: any) {
  return { type: 'where', field, op, value };
}

export function query(collectionRef: MockCollectionRef, ...constraints: any[]) {
  return new MockQuery(collectionRef, constraints);
}

const SEED_DATA: Record<string, any[]> = {
  products: [
    { name: "Premium Coffee Beans", price: 18.50, code: "COF-001" },
    { name: "Organic Green Tea", price: 12.00, code: "TEA-002" },
    { name: "Artisanal Chocolate Bar", price: 6.50, code: "CHO-003" },
    { name: "Eco-Friendly Water Bottle", price: 24.99, code: "BOT-004" }
  ],
  customers: [
    { name: "Jane Doe", email: "jane@example.com", phone: "+91 98765 43210", customerCode: "CUST-001" },
    { name: "Alex Smith", email: "alex@example.com", phone: "+91 87654 32109", customerCode: "CUST-002" }
  ],
  users: [
    { id: "dev-user-123", name: "Guest Developer", storeName: "Creatiwise Store", upiId: "merchant@upi" }
  ]
};

function getCollection(path: string): any[] {
  try {
    const raw = localStorage.getItem(`local_db_${path}`);
    if (!raw) {
      const defaults = SEED_DATA[path];
      if (defaults) {
        const seeded = defaults.map((item, idx) => ({
          id: item.id || `${path.slice(0, 3)}-${idx + 1}-${Math.random().toString(36).substring(2, 6)}`,
          userId: item.userId || "dev-user-123",
          ...item,
          createdAt: new Date().toISOString()
        }));
        localStorage.setItem(`local_db_${path}`, JSON.stringify(seeded));
        return seeded;
      }
      return [];
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse collection", path, e);
    return [];
  }
}

function saveCollection(path: string, items: any[]) {
  try {
    localStorage.setItem(`local_db_${path}`, JSON.stringify(items));
    notifyListeners(path);
  } catch (e) {
    console.error("Failed to save collection", path, e);
  }
}

type ListenerCallback = (snapshot: any) => void;
const listenersMap = new Map<string, Set<{ queryOrRef: any, callback: ListenerCallback }>>();

function notifyListeners(path: string) {
  const set = listenersMap.get(path);
  if (set) {
    for (const item of set) {
      triggerListener(item.queryOrRef, item.callback);
    }
  }
  
  for (const [key, listenersSet] of listenersMap.entries()) {
    if (key.startsWith(path + '/')) {
      for (const item of listenersSet) {
        triggerListener(item.queryOrRef, item.callback);
      }
    }
  }
}

async function triggerListener(queryOrRef: any, callback: ListenerCallback) {
  if (queryOrRef instanceof MockDocRef) {
    const snap = await getDoc(queryOrRef);
    callback(snap);
  } else {
    const snap = await getDocs(queryOrRef);
    callback(snap);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('local_db_')) {
      const path = e.key.replace('local_db_', '');
      notifyListeners(path);
    }
  });
}

export async function getDocs(queryOrRef: MockQuery | MockCollectionRef) {
  let collectionPath = '';
  let constraints: any[] = [];

  if (queryOrRef instanceof MockQuery) {
    collectionPath = queryOrRef.collectionRef.path;
    constraints = queryOrRef.constraints;
  } else {
    collectionPath = queryOrRef.path;
  }

  let items = getCollection(collectionPath);

  if (constraints && Array.isArray(constraints)) {
    for (const c of constraints) {
      if (c.type === 'where') {
        const { field, op, value } = c;
        items = items.filter((item: any) => {
          if (op === '==') return item[field] === value;
          return true;
        });
      }
    }
  }

  const docs = items.map((item: any) => ({
    id: item.id,
    ref: new MockDocRef(item.id, `${collectionPath}/${item.id}`),
    data: () => item
  }));

  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach(callback: (doc: any, index: number) => void) {
      docs.forEach(callback);
    }
  };
}

export async function getDoc(docRef: MockDocRef) {
  const parts = docRef.path.split('/');
  const collectionPath = parts[0];
  
  const items = getCollection(collectionPath);
  const item = items.find((i: any) => i.id === docRef.id);

  return {
    exists: () => !!item,
    data: () => item
  };
}

export async function addDoc(collectionRef: MockCollectionRef, data: any) {
  const collectionPath = collectionRef.path;
  const items = getCollection(collectionPath);
  const id = Math.random().toString(36).substring(2, 15);
  const newItem = { ...data, id, createdAt: data.createdAt || new Date().toISOString() };
  items.push(newItem);
  saveCollection(collectionPath, items);
  return new MockDocRef(id, `${collectionPath}/${id}`);
}

export async function updateDoc(docRef: MockDocRef, data: any) {
  const parts = docRef.path.split('/');
  const collectionPath = parts[0];
  const items = getCollection(collectionPath);
  const index = items.findIndex((i: any) => i.id === docRef.id);
  if (index !== -1) {
    items[index] = { ...items[index], ...data, updatedAt: new Date().toISOString() };
  } else {
    items.push({ ...data, id: docRef.id, createdAt: new Date().toISOString() });
  }
  saveCollection(collectionPath, items);
}

export async function setDoc(docRef: MockDocRef, data: any, options?: { merge?: boolean }) {
  const parts = docRef.path.split('/');
  const collectionPath = parts[0];
  const items = getCollection(collectionPath);
  const index = items.findIndex((i: any) => i.id === docRef.id);
  if (index !== -1) {
    if (options?.merge) {
      items[index] = { ...items[index], ...data, updatedAt: new Date().toISOString() };
    } else {
      items[index] = { ...data, id: docRef.id, createdAt: items[index].createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    }
  } else {
    items.push({ ...data, id: docRef.id, createdAt: new Date().toISOString() });
  }
  saveCollection(collectionPath, items);
}

export async function deleteDoc(docRef: MockDocRef) {
  const parts = docRef.path.split('/');
  const collectionPath = parts[0];
  let items = getCollection(collectionPath);
  items = items.filter((i: any) => i.id !== docRef.id);
  saveCollection(collectionPath, items);
}

export function onSnapshot(queryOrRef: any, callback: (snapshot: any) => void) {
  const path = queryOrRef instanceof MockQuery ? queryOrRef.collectionRef.path : queryOrRef.path;
  
  if (!listenersMap.has(path)) {
    listenersMap.set(path, new Set());
  }
  const listenerInfo = { queryOrRef, callback };
  listenersMap.get(path)!.add(listenerInfo);

  // Initial run
  triggerListener(queryOrRef, callback);

  const intervalId = setInterval(() => {
    triggerListener(queryOrRef, callback);
  }, 2000);

  return () => {
    const set = listenersMap.get(path);
    if (set) {
      set.delete(listenerInfo);
      if (set.size === 0) {
        listenersMap.delete(path);
      }
    }
    clearInterval(intervalId);
  };
}
