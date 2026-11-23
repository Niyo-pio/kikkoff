# Kickoffs

Kickoffs is a responsive React app for club members to sign in with Google, find training sessions, and reserve a place. It runs in a browser and can be packaged for iOS and Android with Capacitor.

## Run locally

1. Install Node.js 20.19+ and npm.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env.local` and add your Supabase project URL and publishable (or legacy anon) key.
4. Start the app with `npm run dev`.

Without Supabase environment variables, the app shows its setup screen rather than pretending sign-in or booking worked.

## Supabase setup

1. In Supabase, enable Google under **Authentication → Providers**. Add the Google OAuth client details and configure the provider callback URL shown by Supabase.
2. Add your local and production app URLs to **Authentication → URL Configuration → Redirect URLs**.
3. Apply `supabase/migrations/20261122000000_create_training_bookings.sql` with `supabase db push` or the SQL editor. It creates row-level security policies, an atomic booking function, and Monday/Wednesday sessions at 17:30 for the next eight weeks (90 minutes, 20 places, Amahoro Training Ground). Update these generated schedule values if your club changes its timetable.
4. Deploy the confirmation-email function:

   ```sh
   supabase functions deploy book-training
   supabase secrets set RESEND_API_KEY=re_... EMAIL_FROM="Your Club <bookings@your-verified-domain.com>"
   ```

   Supabase supplies `SUPABASE_URL` and `SUPABASE_ANON_KEY` to Edge Functions. For the dashboard editor, add `RESEND_API_KEY` and `EMAIL_FROM` under **Edge Functions → Secrets**. Verify the sender domain with Resend before using real member addresses. The function uses custom Supabase user-token verification, so **Verify JWT with legacy secret** should remain off. The database booking is confirmed even if the email provider is unavailable; the app tells the member when an email could not be sent.
5. Add `.env.local` values:

   ```dotenv
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
   ```

Never put the Supabase service-role key or Resend API key in a `VITE_` variable or browser code.

## Browser and mobile builds

- Browser development: `npm run dev`
- Production web build: `npm run build`
- Android and iOS native projects are included. iOS builds require macOS, Xcode, and CocoaPods.
- After changing the web app, run `npm run cap:sync`, then `npm run cap:android` or `npm run cap:ios` to open the native project.
- Native Google sign-in opens the provider in the system browser and returns through `com.riversidefc.kickoffs://auth/callback`. The iOS URL scheme and Android intent filter are already configured. Add that exact URI to Supabase **Authentication → URL Configuration → Redirect URLs**. If you change `appId`, update the redirect URI in `src/App.tsx`, Supabase, and both native projects together.

## GitHub branches

Keep the application in one repository. If the team prefers a branch per component, use short-lived branches such as `feature/member-auth`, `feature/training-booking`, and `feature/confirmation-email`, then merge them into the default branch. The current workspace has no Git installation or GitHub remote, so repository creation and branch publishing still need to be done in a Git-enabled environment.
