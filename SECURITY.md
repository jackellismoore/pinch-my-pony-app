# Security

Report security concerns privately to the Pinch My Pony team rather than opening a public issue.

## Launch requirements

- Apply all migrations in `supabase/migrations` before deploying matching application code.
- Keep `SUPABASE_SERVICE_ROLE_KEY`, Stripe secrets, APNs keys, and signing credentials server-side only.
- Require a verified Supabase access token on user-triggered API routes.
- Treat Stripe webhooks as the source of truth for membership status.
- Run `npm run check` and the end-to-end suite before every production or TestFlight release.
- Configure and periodically rotate `CRON_SECRET`; scheduled-job secrets must never appear in URLs or source control.
