# RateConRisk — Codex Development Handoff

## Current product
RateConRisk is now two connected products:

1. Public Rate Con checker:
   - `/`
   - PDF/image upload
   - Netlify Background Function
   - CodexCN Responses API
   - structured JSON analysis
   - "Save as Load"

2. Authenticated owner-operator business app:
   - `/app/`
   - `/app/loads/`
   - `/app/receivables/`
   - `/app/expenses/`
   - `/app/trucks/`
   - `/app/brokers/`
   - `/app/documents/`
   - `/app/login/`

## Stack
- Static HTML/CSS/vanilla JS
- Netlify
- Netlify Functions + Background Function + Blobs
- Supabase Auth + PostgreSQL + RLS
- CodexCN Responses API
- GA4

## Required environment variables
- `CODEXCN_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

Optional:
- `CODEXCN_BASE_URL`
- `CODEXCN_MODEL`

Never commit secret keys.

## Important architectural rules
1. Do not change Rate Con analysis back to a synchronous Netlify Function.
   The relay can exceed the 60-second synchronous limit.
2. Keep financial math deterministic in JavaScript/SQL.
   AI may explain numbers but must not calculate accounting totals.
3. Escape all user/model strings before writing them via `innerHTML`.
4. Supabase RLS must remain enabled on every user-business table.
5. Do not use the Supabase service-role key in browser code.
6. Linked Expense truck assignment must follow its linked Load.
7. Receivables means invoiced-but-not-fully-paid, not every non-Paid load.
8. Historical load profit calculations must use the load's own month, not the current month.
9. Run `npm test` before deployment.

## Known MVP limitations
- Truck fixed-cost values have no historical effective-date table yet.
  Historical loads use the truck's current configured monthly fixed amounts.
- Documents are checklist status only; actual BOL/POD/receipt cloud file storage is not implemented.
- No ELD/GPS integration.
- No driver payroll.
- No accounting integration.
- No automated tests against a real Supabase test project yet.

## Recommended next engineering phase
Before adding large new features:
1. Move inline page scripts into modules.
2. Add a proper build/test pipeline.
3. Add Playwright browser E2E tests.
4. Add Supabase migrations rather than one monolithic schema.sql.
5. Add server-side validation or database constraints for business invariants.
6. Add error UI/toasts instead of `alert()`.
7. Add real document uploads with private Supabase Storage buckets and signed URLs.

## Product priority
Do not chase FleetChart feature-for-feature yet.
The differentiator should remain:

Rate Con risk before pickup
→ operational protection during the load
→ true profit and payment after delivery.
