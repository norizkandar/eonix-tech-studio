# SMART ACADEMY

Premium education ecosystem — Beyond The Grade.

## Files

- `index.html` — application shell
- `styles.css` — responsive futuristic UI
- `app.js` — frontend routing, Supabase Auth and integration placeholders
- `supabase.sql` — database foundation + RLS
- `README.md` — setup notes

## Supabase

The frontend uses the Supabase publishable key only.

Do NOT put:
- service_role key
- payment secret
- webhook secret
- private API credentials

in `index.html`, `styles.css`, or `app.js`.

## Current frontend flows

- Splash
- 5-step onboarding
- Email sign up / sign in
- Forgot password
- Student / Teacher / Parent roles
- Admin UI route (admin must be provisioned securely)
- Student class marketplace
- RM45/month default class price
- Smart Wallet UI
- Payment history UI
- Teacher earnings UI
- LIVE classroom UI
- Notes / Quiz / Assignment / Progress / Ranking / Achievements
- Parent monitoring
- Responsive mobile/tablet/desktop navigation
- About / Settings / privacy/account controls

## Production integrations still required

The UI intentionally does NOT fake payment success.

Connect these through trusted backend/integration layers:

1. TNG / FPX payment provider
2. Backend webhook verification
3. Wallet ledger transaction service
4. Subscription service
5. Supabase Storage
6. Supabase Realtime
7. Push notification provider
8. WebRTC/video provider for LIVE, calls and screen sharing
9. Recording/video storage pipeline
10. Email provider
11. Admin moderation and withdrawal functions

## Payment rule

Correct flow:

Create payment
-> payment gateway
-> user completes payment
-> gateway webhook
-> backend verifies webhook
-> wallet/subscription changes
-> transaction record
-> notification

Never trust a browser button as proof of payment.

## Deploy on GitHub Pages

Upload `index.html`, `styles.css`, `app.js` and `supabase.sql`.

GitHub Pages can host the frontend. Supabase remains the backend.

Run `supabase.sql` from Supabase Dashboard -> SQL Editor.

Before production, configure the real payment, realtime/video and notification providers through secure backend functions.
