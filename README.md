# ETDS Client Project Portal

ETDS is a Firebase + Next.js client/project portal for architecture and interior projects.

## Included features

- Construction progress timeline with project completion percentage
- Interactive 3D building viewer with floor selector and drag-to-rotate controls
- 360° presentation mode for the demo building viewer
- Payment milestone tracker
- **Online payment checkout disabled**
- Manual payment submission with UPI / bank transfer / cash / cheque, reference number and proof upload
- Accounts/Admin verification of manual payments
- Payment receipts and invoices
- Construction/site photo updates
- WhatsApp-ready site update sharing (opens WhatsApp with a pre-filled message)
- Floor plan module
- Customer document vault with version uploads
- Material selection and approval tracking
- Site visit scheduling and calendar export
- Requests and snag/service tracking
- Project expense tracker for Admin / PM / Accounts
- Digital completion and handover checklist
- Notifications, reports and audit trail

## Payment safety change

This version does not create or process online payment transactions. The payment API only supports:

1. `submit-manual` — records a payment that the customer says was already made externally.
2. `record` — Admin/Accounts verifies the submitted manual payment.

The payment webhook endpoint returns HTTP 410 and explicitly reports that online transactions are disabled.

## Run locally

```bash
npm install
npm run dev
```

Then open the local Next.js URL.

## Firebase

Copy `.env.example` to `.env.local` and configure the Firebase client/admin credentials required by the project. Firestore and Storage rules are included.

## Demo accounts

See `src/lib/data.ts` for the demo account emails. Passwords are managed by Firebase Authentication in the configured Firebase project.

## Production notes

- Replace demo floor-plan artwork with the actual PDF/image floor plans in Documents & Designs.
- Replace the CSS 3D demo house with project-specific GLB/GLTF models if true architectural 3D models are available.
- Automatic WhatsApp messaging requires a WhatsApp Business/API provider; the current button intentionally uses a user-confirmed WhatsApp handoff rather than silently sending messages.

## Feature fixes included in this build

- Admin user management: create, edit (including email), enable/disable, password reset, and permanent delete (self-delete blocked).
- Admin client management: existing create/edit/delete flows retained.
- Admin project management: existing create/edit/delete flows retained.
- Record API now supports authorized permanent delete in addition to create/update.
- Documents: staff can upload new files, upload revisions, open/download files, and delete the record plus stored file.
- Payment proof uploads now use the server upload API correctly and can be opened by authorized users.
- Payment-proof storage paths are authorized for client/account/admin roles.
- File deletion is server-authorized and audited.
- Module create actions now await server operations before reporting success, preventing false-success toasts.
- Record reads now use project-scoped Firestore queries in batches of 30, matching the security rules and Firestore `in` limits.
- Generic record create/update now uses module field/status allow-lists; request and variation numbers are allocated server-side with Firestore transactions.
- Uploads enforce a server-side MIME/extension allow-list, use `nosniff`/download responses, and failed record writes clean up newly uploaded files.
- Payment proof uses `proofUrl` consistently; milestone APIs use explicit name/status/date fields.

### Dependency installation

The project ZIP intentionally does not include `node_modules`. Run:

```bash
npm ci
npm run typecheck
npm run lint
npm run build
```

If your environment cannot access the npm registry, install dependencies on a machine with registry access before running the build commands.

## CRUD + cross-module sync

The workspace modules are backed by Firestore and should be treated as one project record system rather than isolated demo pages.

### Functional modules

- Scope of Work: create, edit, delete and status tracking.
- Quotations: create, edit, delete, amount tracking, attachments and client approval.
- Variations: create, edit, delete, amount tracking and client approval/change requests.
- Payments: manual payment submission, proof upload, verification/rejection, GST invoices, receipts, payment-stage create/edit/delete and reminder email.
- Progress Timeline: create, edit, delete and automatic project-progress recalculation.
- Floor Plans: create, edit, delete and protected plan uploads.
- Material Selection: create, edit, delete and client/team selection state.
- Project Expenses: create, edit, delete and paid/pending state.
- Tasks: create, edit, delete, progress increments and completion.
- Approvals: create, edit, delete and client approval/change requests.
- Documents & Designs: upload, version, download and delete.
- Site Updates: post, edit, photo upload/replace/remove and delete.
- Site Visits: create, edit, delete and calendar export.
- Requests: create, edit, delete and resolve workflow for staff.
- Snags: create, edit, delete, attachment support and open → in progress → rectified → closed workflow.
- Agreements: create, version, acknowledge, edit and delete with protected files.
- Completion: create, edit, delete and client acknowledgement.
- Feedback: client rating submission plus staff CRUD.
- Reports, Dashboard and Audit Trail read the same live Firestore data.

### Data flow

All mutations go through authenticated server APIs. Firestore listeners in `src/lib/store.tsx` keep the dashboard and module screens synchronized after a successful mutation. Role checks are enforced in the API layer as well as the UI.

### First-time data setup

If a Firebase project has no data, configure the existing `.env.local` values and run:

```bash
npm install
npm run seed
npm run dev
```

The seed script creates the demo users, projects and sample module records. Existing production data is not automatically overwritten by the UI.

## Production CRUD / sync notes

- All project modules use Firestore as the source of truth; the UI subscribes to live snapshots.
- Create/edit/delete forms are module-specific rather than sharing one generic five-field form.
- Payments use the protected payment API for milestones, manual submissions, verification, invoices and receipts.
- Agreements use the protected agreement API for create/edit/delete and acknowledgement.
- Timeline changes recalculate project progress on the server.
- Client/project-scoped record listeners avoid unsupported compound `in` queries by querying project IDs and filtering module access in the client.
- Never commit `.env.local`; copy `.env.example` to `.env.local` and provide production secrets through your deployment secret manager.

### First production run

1. `npm install`
2. Configure `.env.local` from `.env.example`.
3. Deploy Firestore indexes, rules and Storage rules with `firebase deploy --only firestore:indexes,firestore:rules,storage`. The paginated module lists need the `records (p, m, ts desc)` composite index; until it finishes building, lists fall back to paging the in-memory set.
4. Run the seed only when initializing a fresh/demo database: `npm run seed`.
5. Run `npm run typecheck`, `npm run lint`, and `npm run build` before deployment.

## Rate limiting & security headers

- `src/lib/rate-limit.ts` — Firestore-backed fixed-window limiter (`rateLimits/*`). Limits: **uploads 40 / 10 min / user**. Over the limit → HTTP 429 with `Retry-After`. Fails open if Firestore errors.
- **One-time setup:** in Firebase console → Firestore → TTL, add a policy on collection `rateLimits`, field `expireAt` so old counters are deleted automatically.
- **Login:** Firebase Auth throttles brute force itself (`auth/too-many-requests`); the login form adds a client-side cooldown (5 failures → growing lockout). For stronger protection enable Firebase App Check / Identity Platform.
- Security headers (CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, COOP) are set in `next.config.ts`. If you add a new third-party script/API/image host, add it to the CSP there.

## Tests

```bash
npm test          # run once (vitest)
npm run test:watch
```

Tests live in `tests/` and run against an in-memory fake of Firebase Admin (`tests/helpers/fake-admin.ts`), so no credentials or emulator are needed. They cover: auth/disabled users and project scoping, role × module permissions on records, the payment workflow (clients can only *submit*, only admin/accounts verify), upload validation (type allow-list, 15 MB limit, role × kind matrix, download/delete rules), rate limiting, and money/progress calculations. CI (`.github/workflows/ci.yml`) runs typecheck, lint and tests on every push/PR.
#   e a r t h - t o n e - d e s i g n - s t u d i o  
 #   e a r t h - t o n e - d e s i g n - s t u d i o  
 