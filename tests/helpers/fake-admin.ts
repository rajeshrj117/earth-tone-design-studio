// In-memory stand-ins for firebase-admin (Auth, Firestore, Storage) so API routes can be tested without Firebase.
type Data = Record<string, unknown>;
export const store = new Map<string, Data>();
export const bucketFiles = new Map<string, { buf: Buffer; contentType: string; metadata: Data }>();
export const flags = { failTransactions: false };
let auto = 0;

export function reset() { store.clear(); bucketFiles.clear(); flags.failTransactions = false; auto = 0; }

const snap = (path: string) => { const d = store.get(path); return { exists: d !== undefined, id: path.split('/').pop()!, data: () => (d ? { ...d } : undefined), ref: docRef(path) }; };
function docRef(path: string): any {
  return {
    id: path.split('/').pop()!, path,
    get: async () => snap(path),
    set: async (data: Data, opts?: { merge?: boolean }) => { store.set(path, opts?.merge ? { ...(store.get(path) || {}), ...data } : { ...data }); },
    update: async (data: Data) => { if (!store.has(path)) throw new Error('NOT_FOUND'); store.set(path, { ...store.get(path)!, ...data }); },
    delete: async () => { store.delete(path); },
  };
}
function query(col: string, filters: [string, unknown][] = []): any {
  const run = () => [...store.entries()].filter(([k, v]) => k.startsWith(col + '/') && !k.slice(col.length + 1).includes('/') && filters.every(([f, val]) => v[f] === val)).map(([k]) => snap(k));
  return {
    where: (f: string, _op: string, val: unknown) => query(col, [...filters, [f, val]]),
    get: async () => { const docs = run(); return { docs, size: docs.length, empty: !docs.length }; },
  };
}
export const adminDb = () => ({
  doc: (path: string) => docRef(path),
  collection: (col: string) => ({
    doc: (id?: string) => docRef(`${col}/${id ?? 'auto' + ++auto}`),
    add: async (data: Data) => { const id = 'auto' + ++auto; store.set(`${col}/${id}`, { ...data }); return docRef(`${col}/${id}`); },
    ...query(col),
  }),
  runTransaction: async (fn: (tx: any) => Promise<unknown>) => {
    if (flags.failTransactions) throw new Error('firestore unavailable');
    return fn({ get: async (ref: any) => ref.get(), set: (ref: any, d: Data, o?: any) => { void ref.set(d, o); } });
  },
});

// Tokens look like "tok-<uid>"; anything else is rejected like an invalid Firebase ID token.
export const adminAuth = () => ({
  verifyIdToken: async (t: string) => { if (!t?.startsWith('tok-')) throw new Error('invalid token'); return { uid: t.slice(4) }; },
});

export const storageMock = {
  getStorage: () => ({
    bucket: () => ({
      file: (path: string) => ({
        save: async (buf: Buffer, o: any) => { bucketFiles.set(path, { buf, contentType: o.metadata.contentType, metadata: o.metadata.metadata }); },
        download: async () => [bucketFiles.get(path)!.buf],
        getMetadata: async () => [{ contentType: bucketFiles.get(path)?.contentType, metadata: bucketFiles.get(path)?.metadata }],
        delete: async () => { bucketFiles.delete(path); },
      }),
    }),
  }),
};

// ---- seed helpers ----
export type Seed = { role: string; projects: string[] | 'all'; disabled?: boolean; name?: string };
export const USERS: Record<string, Seed> = {
  admin: { role: 'admin', projects: 'all' },
  pm: { role: 'pm', projects: ['P1'] },
  designer: { role: 'designer', projects: ['P1'] },
  accounts: { role: 'accounts', projects: ['P1'] },
  client: { role: 'client', projects: ['P1'] },
  client2: { role: 'client', projects: ['P2'] },
  banned: { role: 'client', projects: ['P1'], disabled: true },
};
export function seedUsers() {
  for (const [uid, u] of Object.entries(USERS)) store.set(`users/${uid}`, { name: uid, email: `${uid}@x.in`, title: u.role, ...u });
}
export const auth = (uid: string) => ({ Authorization: `Bearer tok-${uid}` });
