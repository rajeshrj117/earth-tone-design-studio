import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { DELETE, GET, POST } from '@/app/api/files/route';
import { auth, bucketFiles, reset, seedUsers, store } from './helpers/fake-admin';

const PNG: Uint8Array<ArrayBuffer> = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
const mk = (name: string, type: string, bytes: Uint8Array<ArrayBuffer> | number = PNG) => new File([typeof bytes === 'number' ? new Uint8Array(bytes) : bytes], name, { type });
const upload = (uid: string | null, file: File | null, kind = 'documents', projectId = 'P1') => {
  const fd = new FormData();
  if (file) fd.append('file', file);
  fd.append('projectId', projectId); fd.append('kind', kind);
  return POST(new NextRequest('http://localhost/api/files', { method: 'POST', headers: uid ? auth(uid) : {}, body: fd }));
};
const get = (uid: string | null, path: string) => GET(new NextRequest('http://localhost/api/files?path=' + encodeURIComponent(path), { headers: uid ? auth(uid) : {} }));
const del = (uid: string | null, path: string) => DELETE(new NextRequest('http://localhost/api/files?path=' + encodeURIComponent(path), { method: 'DELETE', headers: uid ? auth(uid) : {} }));
const put = (path: string, uploadedBy = 'admin') => bucketFiles.set(path, { buf: Buffer.from('x'), contentType: 'image/png', metadata: { uploadedBy } });

beforeEach(() => { reset(); seedUsers(); });

describe('upload: authentication & validation', () => {
  it('401 without a token', async () => expect((await upload(null, mk('a.png', 'image/png'))).status).toBe(401));
  it('403 when no file is attached', async () => expect((await upload('admin', null)).status).toBe(403));
  it('403 for a project the user cannot access', async () => expect((await upload('pm', mk('a.png', 'image/png'), 'documents', 'P2')).status).toBe(403));
  it('403 for an unknown kind', async () => expect((await upload('admin', mk('a.png', 'image/png'), '../../etc')).status).toBe(403));

  it.each([
    ['png', 'a.png', 'image/png'], ['jpg', 'a.jpg', 'image/jpeg'], ['jpeg', 'a.jpeg', 'image/jpeg'], ['webp', 'a.webp', 'image/webp'],
    ['pdf', 'a.pdf', 'application/pdf'], ['doc', 'a.doc', 'application/msword'],
    ['docx', 'a.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ])('accepts %s', async (_e, name, type) => expect((await upload('admin', mk(name, type))).status).toBe(200));

  it.each([
    ['executable', 'virus.exe', 'application/x-msdownload'], ['html', 'x.html', 'text/html'], ['svg (script risk)', 'x.svg', 'image/svg+xml'],
    ['js', 'x.js', 'text/javascript'], ['no extension', 'README', 'text/plain'],
  ])('rejects %s with 415', async (_n, name, type) => expect((await upload('admin', mk(name, type))).status).toBe(415));

  it('rejects an extension/MIME mismatch (pdf named .png etc.)', async () => {
    expect((await upload('admin', mk('evil.png', 'application/pdf'))).status).toBe(415);
    expect((await upload('admin', mk('evil.pdf', 'text/html'))).status).toBe(415);
  });
  it('infers the MIME type from the extension when the browser sends none', async () => {
    expect((await upload('admin', mk('photo.jpg', ''))).status).toBe(200);
    expect([...bucketFiles.values()][0].contentType).toBe('image/jpeg');
  });
  it('enforces the 15 MB limit', async () => {
    expect((await upload('admin', mk('big.pdf', 'application/pdf', 15 * 1024 * 1024 + 1))).status).toBe(413);
    expect((await upload('admin', mk('ok.pdf', 'application/pdf', 15 * 1024 * 1024))).status).toBe(200);
  });
  it('sanitises the stored file name and scopes the path to the project/kind', async () => {
    const r = await upload('admin', mk('../../my plan (1).png', 'image/png'));
    const { path } = await r.json();
    expect(path).toMatch(/^projects\/P1\/documents\/\d+-[a-zA-Z0-9._-]+$/);
    expect(path.split('/')).toHaveLength(4); // no extra path segments smuggled in via the file name
    expect(path.split('/')).not.toContain('..');
  });
  it('records uploader and writes an audit line', async () => {
    await upload('pm', mk('a.png', 'image/png'));
    expect([...bucketFiles.values()][0].metadata).toMatchObject({ uploadedBy: 'pm', projectId: 'P1', kind: 'documents' });
    expect([...store.keys()].some(k => k.startsWith('audit/'))).toBe(true);
  });
});

describe('upload: role × kind matrix', () => {
  const allow: Record<string, string[]> = {
    documents: ['admin', 'pm', 'designer'], updates: ['admin', 'pm', 'designer'], snags: ['admin', 'pm', 'client'],
    agreements: ['admin', 'accounts'], 'payment-proof': ['admin', 'accounts', 'client'], 'expense-receipts': ['admin', 'pm', 'accounts'],
    'quotation-attachments': ['admin', 'pm', 'accounts'], 'variation-attachments': ['admin', 'pm', 'accounts'], 'floor-plans': ['admin', 'pm', 'designer'],
    'approval-images': ['admin', 'pm', 'designer'], 'material-samples': ['admin', 'pm', 'designer'], 'project-cover': ['admin', 'pm', 'designer'],
    avatars: ['admin', 'pm', 'designer', 'accounts', 'client'],
  };
  const roles = ['admin', 'pm', 'designer', 'accounts', 'client'];
  for (const [kind, okRoles] of Object.entries(allow)) {
    for (const role of roles) {
      const ok = okRoles.includes(role);
      it(`${role} → ${kind}: ${ok ? 'allowed' : 'forbidden'}`, async () => {
        expect((await upload(role, mk('a.png', 'image/png'), kind)).status).toBe(ok ? 200 : 403);
        expect(bucketFiles.size).toBe(ok ? 1 : 0);
      });
    }
  }
  it('regression: pm/designer can NOT upload agreement files', async () => {
    expect((await upload('pm', mk('a.pdf', 'application/pdf'), 'agreements')).status).toBe(403);
    expect((await upload('designer', mk('a.pdf', 'application/pdf'), 'agreements')).status).toBe(403);
  });
});

describe('upload: rate limit', () => {
  it('429 after 40 uploads in the window, with Retry-After', async () => {
    for (let i = 0; i < 40; i++) expect((await upload('admin', mk('a.png', 'image/png'))).status).toBe(200);
    const r = await upload('admin', mk('a.png', 'image/png'));
    expect(r.status).toBe(429);
    expect(Number(r.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect((await upload('pm', mk('a.png', 'image/png'))).status).toBe(200); // other users unaffected
  });
});

describe('download (GET)', () => {
  it('401 without a token; 403 for paths outside projects/', async () => {
    put('projects/P1/documents/1-a.png');
    expect((await get(null, 'projects/P1/documents/1-a.png')).status).toBe(401);
    expect((await get('admin', 'secrets/service-account.json')).status).toBe(403);
    expect((await get('admin', '')).status).toBe(403);
  });
  it('serves bytes with nosniff + attachment + no-store headers', async () => {
    put('projects/P1/documents/1-a.png');
    const r = await get('client', 'projects/P1/documents/1-a.png');
    expect(r.status).toBe(200);
    expect(r.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(r.headers.get('Content-Disposition')).toMatch(/^attachment/);
    expect(r.headers.get('Cache-Control')).toContain('no-store');
  });
  it('blocks users from other projects', async () => {
    put('projects/P1/documents/1-a.png');
    expect((await get('client2', 'projects/P1/documents/1-a.png')).status).toBe(403);
  });
  it('enforces per-kind read roles', async () => {
    put('projects/P1/payment-proof/1-p.png'); put('projects/P1/expense-receipts/1-e.png'); put('projects/P1/agreements/1-g.pdf');
    expect((await get('client', 'projects/P1/payment-proof/1-p.png')).status).toBe(200);
    expect((await get('pm', 'projects/P1/payment-proof/1-p.png')).status).toBe(403);
    expect((await get('designer', 'projects/P1/payment-proof/1-p.png')).status).toBe(403);
    expect((await get('client', 'projects/P1/expense-receipts/1-e.png')).status).toBe(403); // internal costs hidden from clients
    expect((await get('accounts', 'projects/P1/expense-receipts/1-e.png')).status).toBe(200);
    expect((await get('designer', 'projects/P1/agreements/1-g.pdf')).status).toBe(403);
    expect((await get('accounts', 'projects/P1/agreements/1-g.pdf')).status).toBe(200);
  });
  it('disabled users are blocked', async () => {
    put('projects/P1/documents/1-a.png');
    expect((await get('banned', 'projects/P1/documents/1-a.png')).status).toBe(403);
  });
});

describe('delete', () => {
  it('only the right roles can delete; clients cannot delete documents', async () => {
    put('projects/P1/documents/1-a.png');
    expect((await del('client', 'projects/P1/documents/1-a.png')).status).toBe(403);
    expect(bucketFiles.size).toBe(1);
    expect((await del('designer', 'projects/P1/documents/1-a.png')).status).toBe(200);
    expect(bucketFiles.size).toBe(0);
  });
  it('cross-project delete is blocked', async () => {
    put('projects/P1/documents/1-a.png');
    expect((await del('client2', 'projects/P1/documents/1-a.png')).status).toBe(403);
    expect((await del('pm', 'projects/P2/documents/1-a.png')).status).toBe(403);
  });
  it('a client may delete only THEIR OWN payment proof', async () => {
    put('projects/P1/payment-proof/1-mine.png', 'client'); put('projects/P1/payment-proof/2-other.png', 'someone-else');
    expect((await del('client', 'projects/P1/payment-proof/2-other.png')).status).toBe(403);
    expect((await del('client', 'projects/P1/payment-proof/1-mine.png')).status).toBe(200);
  });
  it('rejects non-project paths', async () => expect((await del('admin', 'other/file.png')).status).toBe(403));
});
