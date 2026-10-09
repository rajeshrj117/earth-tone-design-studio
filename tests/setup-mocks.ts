import { vi } from 'vitest';
vi.mock('@/lib/firebase-admin', async () => { const h = await import('./helpers/fake-admin'); return { adminAuth: h.adminAuth, adminDb: h.adminDb }; });
vi.mock('firebase-admin/storage', async () => { const h = await import('./helpers/fake-admin'); return h.storageMock; });
