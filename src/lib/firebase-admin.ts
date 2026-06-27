import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), '.mock-db.json');

function readDb() {
  if (!fs.existsSync(DB_FILE)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading mock DB file, resetting:', e);
    return {};
  }
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing mock DB file:', e);
  }
}

// Public API matching mock DB for endpoints
export function getCollectionData(collectionPath: string) {
  const db = readDb();
  return db[collectionPath] || [];
}

export function saveCollectionData(collectionPath: string, items: any[]) {
  const db = readDb();
  db[collectionPath] = items;
  writeDb(db);
}

class MockAdminAuth {
  async verifyIdToken(token: string) {
    if (token === 'mock-token-xyz-123') {
      return {
        uid: 'dev-user-123',
        email: 'developer@creatiwise.local',
        email_verified: true,
        auth_time: Math.floor(Date.now() / 1000),
        iss: '',
        sub: 'dev-user-123',
        aud: '',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        firebase: {
          identities: {},
          sign_in_provider: 'custom'
        }
      };
    } else if (token === 'mock-token-guest-999') {
      return {
        uid: 'guest-user-999',
        email: 'guest@creatiwise.local',
        email_verified: true,
        auth_time: Math.floor(Date.now() / 1000),
        iss: '',
        sub: 'guest-user-999',
        aud: '',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        firebase: {
          identities: {},
          sign_in_provider: 'anonymous'
        }
      };
    }
    throw new Error('Invalid mock token');
  }
}

class MockAdminDocRef {
  constructor(public collectionPath: string, public id: string) {}

  async get() {
    const db = readDb();
    const items = db[this.collectionPath] || [];
    const doc = items.find((i: any) => i.id === this.id);
    return {
      exists: !!doc,
      id: this.id,
      data: () => doc
    };
  }

  async create(data: any) {
    const db = readDb();
    if (!db[this.collectionPath]) db[this.collectionPath] = [];
    const exists = db[this.collectionPath].some((i: any) => i.id === this.id);
    if (exists) {
      const err: any = new Error(`Document already exists at ${this.collectionPath}/${this.id}`);
      err.code = 6; // ALREADY_EXISTS
      throw err;
    }
    const newItem = { ...data, id: this.id, createdAt: new Date().toISOString() };
    db[this.collectionPath].push(newItem);
    writeDb(db);
  }

  async update(data: any) {
    const db = readDb();
    const items = db[this.collectionPath] || [];
    const index = items.findIndex((i: any) => i.id === this.id);
    if (index !== -1) {
      items[index] = { ...items[index], ...data, updatedAt: new Date().toISOString() };
      db[this.collectionPath] = items;
      writeDb(db);
    }
  }
}

class MockAdminQuery {
  private queryConstraints: { field: string; op: string; value: any }[] = [];
  private queryLimit: number | null = null;

  constructor(public collectionPath: string) {}

  where(field: string, op: string, value: any) {
    this.queryConstraints.push({ field, op, value });
    return this;
  }

  limit(n: number) {
    this.queryLimit = n;
    return this;
  }

  async get() {
    const db = readDb();
    let items = db[this.collectionPath] || [];

    // Filter
    for (const c of this.queryConstraints) {
      items = items.filter((item: any) => {
        if (c.op === '==') {
          if (c.field === 'invoiceIdStr') {
            return item.invoiceIdStr === c.value || item.id === c.value;
          }
          return item[c.field] === c.value;
        }
        return true;
      });
    }

    // Limit
    if (this.queryLimit !== null) {
      items = items.slice(0, this.queryLimit);
    }

    const docs = items.map((item: any) => {
      const id = item.id;
      return {
        id,
        ref: new MockAdminDocRef(this.collectionPath, id),
        data: () => item
      };
    });

    return {
      docs,
      empty: docs.length === 0
    };
  }
}

class MockAdminCollection {
  constructor(public path: string) {}

  doc(id: string) {
    return new MockAdminDocRef(this.path, id);
  }

  async add(data: any) {
    const db = readDb();
    if (!db[this.path]) db[this.path] = [];
    const id = Math.random().toString(36).substring(2, 15);
    const newItem = { ...data, id, createdAt: data.createdAt || new Date().toISOString() };
    db[this.path].push(newItem);
    writeDb(db);
    return new MockAdminDocRef(this.path, id);
  }

  where(field: string, op: string, value: any) {
    const q = new MockAdminQuery(this.path);
    return q.where(field, op, value);
  }
}

class MockAdminDb {
  collection(path: string) {
    return new MockAdminCollection(path);
  }
}

import { initializeApp as initAdminApp, getApps as getAdminApps, getApp as getAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import config from '../../firebase-applet-config.json';

export let adminAuth: any;
export let adminDb: any;

const useRealFirebase = process.env.VITE_USE_REAL_FIREBASE === 'true';

if (useRealFirebase) {
  console.log('Initializing REAL Firebase Admin...');
  try {
    const app = getAdminApps().length === 0 
      ? initAdminApp({ projectId: config.projectId }) 
      : getAdminApp();
    adminAuth = getAdminAuth(app);
    adminDb = config.firestoreDatabaseId 
      ? getAdminFirestore(app, config.firestoreDatabaseId) 
      : getAdminFirestore(app);
  } catch (error) {
    console.error('Failed to initialize REAL Firebase Admin, falling back to mock:', error);
    adminAuth = new MockAdminAuth();
    adminDb = new MockAdminDb();
  }
} else {
  console.log('Initializing MOCK Firebase Admin (set VITE_USE_REAL_FIREBASE=true to use real Firebase)...');
  adminAuth = new MockAdminAuth();
  adminDb = new MockAdminDb();
}
