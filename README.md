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
3. Apply the migrations in order with `supabase db push` or the SQL editor. The first migration creates row-level security policies, an atomic booking function, and Monday/Wednesday sessions at 17:30 for the next eight weeks (90 minutes, 20 places). The next migration rotates future, unbooked sessions through Nyagisenyi, Umuganda, Mumena, Mironko, Gatwaro, and Nzove; sessions with confirmed bookings keep their current location.
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
- Expo Go testing: see the steps below.
- Android and iOS Capacitor projects are also included. iOS builds require macOS, Xcode, and CocoaPods.
- After changing the web app, run `npm run cap:sync`, then `npm run cap:android` or `npm run cap:ios` to open the native project.
- Native Google sign-in opens the provider in the system browser and returns through `com.riversidefc.kickoffs://auth/callback`. The iOS URL scheme and Android intent filter are already configured. Add that exact URI to Supabase **Authentication → URL Configuration → Redirect URLs**. If you change `appId`, update the redirect URI in `src/App.tsx`, Supabase, and both native projects together.

### Test with Expo Go

The React Native Expo app lives in `mobile/`; it can be tested independently from the existing browser and Capacitor apps.

1. Install **Expo Go** on your phone.
2. Copy `mobile/.env.example` to `mobile/.env.local` and add your Supabase URL and publishable (or legacy anon) key with the `EXPO_PUBLIC_` names shown in the file.
3. Add the Expo Go callback shown on the Kickoffs sign-in screen to Supabase **Authentication → URL Configuration → Redirect URLs**. It starts with `exp://` and may change when your local network address changes. The Google Cloud authorized redirect URI remains `https://<project-ref>.supabase.co/auth/v1/callback`.
4. Start Metro and scan its QR code from Expo Go:

   ```sh
   cd mobile
   npm install
   npm start
   ```

   Keep your phone and computer on the same Wi-Fi network. If Google sign-in is interrupted, restart Expo after updating the Supabase redirect allowlist.

## GitHub branches

Keep the application in one repository. If the team prefers a branch per component, use short-lived branches such as `feature/member-auth`, `feature/training-booking`, and `feature/confirmation-email`, then merge them into the default branch. The current workspace has no Git installation or GitHub remote, so repository creation and branch publishing still need to be done in a Git-enabled environment.
