class MockDocRef {
  constructor(public id: string, public path: string) {}
}

class MockCollectionRef {
  constructor(public path: string) {}
}

class MockQuery {
  constructor(public collectionRef: MockCollectionRef, public constraints: any[]) {}
}

export function getFirestore(app: any, databaseId?: string) {
  return { name: '[MockFirestore]' };
}

export function collection(db: any, path: string) {
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

// REST helper to call backend database mock API
async function apiCall(endpoint: string, body: any) {
  try {
    const res = await fetch(`/api/mock-db/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      throw new Error(`API error: ${res.statusText}`);
    }
    return await res.json();
  } catch (e) {
    console.error(`Mock DB call failed: ${endpoint}`, e);
    return { success: false, data: [] };
  }
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

  const res = await apiCall('query', { collectionPath, constraints });
  const items = res.data || [];

  return {
    docs: items.map((item: any) => ({
      id: item.id,
      ref: new MockDocRef(item.id, `${collectionPath}/${item.id}`),
      data: () => item
    })),
    empty: items.length === 0
  };
}

export async function getDoc(docRef: MockDocRef) {
  const parts = docRef.path.split('/');
  const collectionPath = parts[0];
  
  const res = await apiCall('get-doc', { collectionPath, id: docRef.id });
  const item = res.data;

  return {
    exists: () => !!item,
    data: () => item
  };
}

export async function addDoc(collectionRef: MockCollectionRef, data: any) {
  const collectionPath = collectionRef.path;
  const res = await apiCall('add-doc', { collectionPath, data });
  const newItem = res.data;
  return new MockDocRef(newItem.id, `${collectionPath}/${newItem.id}`);
}

export async function updateDoc(docRef: MockDocRef, data: any) {
  const parts = docRef.path.split('/');
  const collectionPath = parts[0];
  await apiCall('update-doc', { collectionPath, id: docRef.id, data });
}

export async function setDoc(docRef: MockDocRef, data: any) {
  const parts = docRef.path.split('/');
  const collectionPath = parts[0];
  await apiCall('update-doc', { collectionPath, id: docRef.id, data });
}

export async function deleteDoc(docRef: MockDocRef) {
  const parts = docRef.path.split('/');
  const collectionPath = parts[0];
  await apiCall('delete-doc', { collectionPath, id: docRef.id });
}

// Simple onSnapshot implementation using polling
export function onSnapshot(queryOrRef: MockQuery | MockCollectionRef, callback: (snapshot: any) => void) {
  const runQuery = async () => {
    const snap = await getDocs(queryOrRef);
    callback(snap);
  };

  // Run immediately
  runQuery();

  // Poll every 2 seconds for updates
  const intervalId = setInterval(runQuery, 2000);

  return () => {
    clearInterval(intervalId);
  };
}
