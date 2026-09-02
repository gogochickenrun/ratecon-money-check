# V8 Regression Report

Checks performed:
- JavaScript syntax on all JS/MJS and inline scripts
- internal static routes/assets
- duplicate HTML IDs
- local store CRUD
- Truck duplicate cleanup
- load → expense truck consistency
- current-month metrics
- historical load profit month selection
- receivables filtering
- XSS output escaping
- existing background Rate Con architecture retained

Fixes included:
- stored-XSS hardening across business app tables
- period-aware historical True Profit
- robust ISO date month handling
- Receivables excludes Booked/In Transit unless actually invoiced
- linked expenses inherit the load's truck
- local→cloud migration cannot repeat on every page
- login `next` redirect restricted to `/app...`
- AI load dates normalized to YYYY-MM-DD
- obsolete unused old analysis/store scripts removed
- regression smoke test added (`npm test`)
