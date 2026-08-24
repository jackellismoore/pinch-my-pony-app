# Pinch My Pony

Horse-sharing marketplace built with Next.js, Supabase, Stripe and Capacitor iOS.

## Local development

```bash
npm ci
npm run dev
```

Quality checks:

```bash
npm run check
npm run build
```

## Launch controls

Paid borrowing and Stripe Identity are deliberately disabled during launch access.

- `STRIPE_MEMBERSHIP_CHECKOUT_ENABLED=false`
- `STRIPE_IDENTITY_ENABLED=false`
- `platform_settings.borrowing_membership_required=false`
- `platform_settings.borrowing_identity_required=false`

Do not enable only the visual checkout flag. At paid go-live, validate Stripe test mode and webhook delivery, then deliberately enable the corresponding database requirements. Complimentary testers use `profiles.complimentary_access_until` and are never auto-enrolled or auto-charged.

## Database

Apply migrations in order from `supabase/migrations`. Release security and entitlement controls are contained in `202608240002_release_security_and_entitlements.sql`.

## iOS

The `ios-testflight` workflow builds the web bundle, synchronises Capacitor, installs signing assets and uploads the archive to TestFlight for bundle ID `com.pinchmypony.app`.
