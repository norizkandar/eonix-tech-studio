# Smart Academy V2

Smart Academy — Beyond The Grade.

## Included

- Supabase authentication
- Student / Teacher / Parent roles
- Class marketplace UI
- Class Replay page
- Secure replay access architecture
- Private Supabase Storage bucket
- Enrollment-based replay access
- Wallet + verified payment architecture
- Payment webhook placeholder
- Responsive mobile/tablet UI
- Futuristic blue / emerald / dark navy design

## Important

This package does NOT fake payment success or fake video recordings.

For real production use, configure:
1. Supabase project.
2. SQL migration.
3. Supabase Edge Functions.
4. Private class-replays storage.
5. TNG/FPX payment provider and webhook.
6. Video recording provider / LIVE infrastructure.

The frontend only contains a Supabase publishable key. Never put a Supabase service-role key, payment secret, webhook secret, or other server secret in GitHub Pages frontend code.

## GitHub Pages

Upload:
- index.html
- styles.css
- app.js

to your repository root.

Then run `supabase/migrations/001_smart_academy_v2.sql` in Supabase SQL Editor.

## Replay

Teacher publishes a row in `class_replays` with:
- class_id
- title
- subject
- teacher_name
- storage_path
- published = true

The frontend calls the `create-replay-access` Edge Function. The function verifies authentication and enrollment and returns a short-lived signed URL from the private storage bucket.

## Payment

The frontend never changes wallet balance after a button click. Payment status must be verified by the payment provider webhook on the backend.
