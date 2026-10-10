# Connecting the app to Firebase

This guide takes you from "the app runs on the emulators" to "the app runs on a real Firebase
project, locally and on Netlify". It takes about 20 minutes, and you don't need to have used
Firebase before.

The app signs people in with **Firebase Authentication** (email and password) and keeps every
user's data in **Cloud Firestore**. There's no server of our own: the browser talks to Firebase
directly, and the security rules in `firestore.rules` are what keep each user's data theirs
alone. The settings that point the app at a project are `VITE_FIREBASE_*` variables in `.env`
(locally) and in Netlify's environment variables (deployed).

> **Is it safe to put these values in the app?** Yes. A web app's Firebase config is public by
> design: anyone can read it from the built app. What protects the data is the security rules
> and, optionally, App Check (step 8). Never paste in anything from a _service account_ file:
> that one is a real secret, and this app never needs it.

You'll need the Firebase CLI for step 6: `npm install -g firebase-tools`.

---

## Step 1: Create a Firebase project

1. Go to <https://console.firebase.google.com> and sign in with a Google account.
2. Click **Create a project**.
3. Give it a name, for example `expensify-dev`. Firebase turns it into a **project ID** like
   `expensify-dev-1a2b3`. Note that ID; you'll need it in step 6.
4. When asked about Google Analytics, turn it **off**. The app doesn't use it.
5. Click **Create project** and wait for it to finish.

The free Spark plan is enough: the app uses only Authentication and Firestore.

## Step 2: Turn on email and password sign-in

1. In the left menu open **Build → Authentication** and click **Get started**.
2. On the **Sign-in method** tab, click **Email/Password**, switch **Enable** on, and save.
   Leave "Email link (passwordless sign-in)" off.

The app never sends sign-up verification emails. The only email Firebase sends is the link that
confirms a new address when someone changes their email in Settings. Its wording is under
**Authentication → Templates → Email address change** if you want to adjust it.

## Step 3: Create the Firestore database

1. In the left menu open **Build → Firestore Database** and click **Create database**.
2. Pick the **Standard** edition and a location close to your users (for example
   `asia-south1` for South Asia). The location can't be changed later.
3. When asked about rules, choose **production mode**. Don't pick test mode: it leaves the
   whole database open to anyone for 30 days. You'll deploy the app's own rules in step 6.
4. Click **Create**.

## Step 4: Register the web app and copy its settings

1. Click the **gear icon** next to _Project Overview_ → **Project settings**.
2. Under **Your apps**, click the web icon `</>`, give the app a nickname (for example `web`),
   and leave "Also set up Firebase Hosting" unticked: Netlify hosts the app.
3. Click **Register app**. Firebase shows a block like this:

   ```js
   const firebaseConfig = {
     apiKey: 'AIzaSyB1234567890abcdefghijklmnopqrstuv',
     authDomain: 'expensify-dev-1a2b3.firebaseapp.com',
     projectId: 'expensify-dev-1a2b3',
     storageBucket: 'expensify-dev-1a2b3.firebasestorage.app',
     messagingSenderId: '123456789012',
     appId: '1:123456789012:web:abcdef1234567890abcdef',
   }
   ```

You can find it again any time under _Project settings → Your apps → SDK setup and
configuration_.

## Step 5: Put the values in `.env`

Copy each value into `.env` (start from `.env.example` if you don't have one yet), and turn
the emulators off:

| Firebase shows      | Goes into                           |
| ------------------- | ----------------------------------- |
| `apiKey`            | `VITE_FIREBASE_API_KEY`             |
| `authDomain`        | `VITE_FIREBASE_AUTH_DOMAIN`         |
| `projectId`         | `VITE_FIREBASE_PROJECT_ID`          |
| `appId`             | `VITE_FIREBASE_APP_ID`              |
| `messagingSenderId` | `VITE_FIREBASE_MESSAGING_SENDER_ID` |

```bash
VITE_FIREBASE_API_KEY=AIzaSyB1234567890abcdefghijklmnopqrstuv
VITE_FIREBASE_AUTH_DOMAIN=expensify-dev-1a2b3.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=expensify-dev-1a2b3
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890abcdef
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_USE_EMULATORS=false
```

`storageBucket` isn't needed: the app doesn't use Cloud Storage. If a required value is
missing, the app stops at startup and the browser console names it.

## Step 6: Deploy the security rules

The rules in `firestore.rules` are what stop one user from reading another user's money. Until
they're deployed, a database created in production mode refuses everything, and the app shows
"The server refused this change" (the console says `permission-denied`).

1. Sign the CLI in with the same Google account as the console:

   ```bash
   firebase login
   ```

2. Point this repository at your project. This writes `.firebaserc`, which you can commit:

   ```bash
   firebase use --add expensify-dev-1a2b3
   ```

   Give it the alias `default` when asked.

3. Deploy the rules and the index list:

   ```bash
   npm run deploy:rules
   ```

Run `npm run deploy:rules` again whenever `firestore.rules` or `firestore.indexes.json`
changes. Test rule changes on the emulators first (`npm run test:rules`, see the README).

**No command line?** Paste the contents of `firestore.rules` into **Firestore Database →
Rules** in the console and click **Publish**. The app needs no composite indexes today, so
there's nothing else to create.

## Step 7: Start the app and sign up

```bash
npm run dev
```

Open <http://localhost:5173>, click **Create an account** and sign up. You land on the
dashboard with the default categories in place. In the console you'll see your login under
**Authentication → Users**, and `users/{your uid}` and `usernames/{your username}` under
**Firestore Database → Data**.

To deploy, set the same `VITE_FIREBASE_*` values in Netlify (README, "Deploying the web app"),
without `VITE_FIREBASE_USE_EMULATORS`. Use a separate Firebase project for production once
real people use the site, so testing never touches their data: repeat steps 1 to 6 for it,
and give Netlify that project's values.

## Step 8 (recommended before going public): App Check

App Check makes Firebase reject requests that don't come from your site, which stops someone
using the project's public config from their own script.

1. In the console open **Build → App Check**, pick the web app, and choose
   **reCAPTCHA Enterprise**.
2. Create a reCAPTCHA Enterprise key in Google Cloud for your domains: the Netlify site
   (`<name>.netlify.app`, plus any custom domain) and `localhost`.
3. Put the **site key** in `VITE_APP_CHECK_SITE_KEY`, in `.env` and in Netlify.
4. For local development, set `VITE_APP_CHECK_DEBUG=true` in `.env` only. The browser console
   then prints a **debug token** the first time the app starts. Add it under **App Check →
   Apps → your app → ⋮ → Manage debug tokens**.
5. Once the site and local development both work, click **Enforce** for Firestore and
   Authentication on the App Check page.

Leaving `VITE_APP_CHECK_SITE_KEY` empty skips App Check, which is fine while you're testing.

## The emulators

`npm run emulators` runs Authentication and Firestore on your own machine under the project ID
`demo-expensify`: no internet, no quota, and the data is yours to wipe. They need Java 11 or
newer. `.env.example` points the app at them (`VITE_FIREBASE_USE_EMULATORS=true`), and any
values work for a `demo-` project.

- The emulator UI at <http://localhost:4000> shows the logins and documents, and lets you
  delete them.
- Data is saved to `.emulator-data/` when you stop the emulators with Ctrl+C, and loaded next
  time. Delete the folder to start over.
- An email change doesn't send real mail on the emulators: the terminal running them prints
  "To verify and change the email address … follow this link". Open it to finish the change.
- The emulators use the rules from `firestore.rules` and reload them when the file changes.

## When something goes wrong

| What you see                                              | Why, and what to do                                                              |
| --------------------------------------------------------- | -------------------------------------------------------------------------------- |
| A blank page; the console says "Invalid environment configuration" | A `VITE_FIREBASE_*` value is missing or empty in `.env` (or in Netlify). Fill it in and restart `npm run dev` (or redeploy). |
| "The server refused this change", `permission-denied`     | The rules aren't deployed (step 6), or a write doesn't match them. On the emulators, `firestore-debug.log` names the rule. |
| "Email and password login isn't turned on in Firebase yet" | Step 2 wasn't done in this project.                                             |
| "Can't reach the server"                                  | No connection, or `VITE_FIREBASE_USE_EMULATORS=true` while the emulators aren't running. |
| The App Check console errors, or every request fails after enforcing | The domain isn't on the reCAPTCHA key, or the debug token isn't registered (step 8). |
