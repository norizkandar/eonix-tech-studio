# Smart Tuisyen

Modern responsive tuition platform frontend by **Eonix Tech Studio**.

## Run locally
Open `index.html` in a browser.

## GitHub Pages
Upload:
- `index.html`
- `styles.css`
- `app.js`

Then enable **Settings → Pages → Deploy from branch**.

## Supabase
`supabase.sql` contains a starter relational schema for authentication profiles, classes, live classes, replays, notes, homework, quizzes, chat, notifications, attendance, progress and subscriptions.

The current frontend uses localStorage as a demo data layer so it can run immediately on GitHub Pages. To make it a real multi-user application, connect Supabase Auth + Database + Storage + Realtime in `app.js`.

### Important security
Never put a Supabase `service_role` secret in browser JavaScript or GitHub. Browser code should use the public/publishable key with Row Level Security enabled.

## Suggested production integrations
- Supabase Auth + Realtime + Storage
- A video/live provider for actual live classes
- A payment provider for subscriptions
- Email provider for verification/reset emails
- Push notifications for mobile/PWA
