BBMS Test Login — Microsoft Edge Extension (Manifest V3)

Overview
This is a minimal, test Microsoft Edge (Chromium) extension that shows a placeholder BBMS login form in the action popup. It does not connect to any backend. No credentials are transmitted.

Contents
- manifest.json — Manifest V3 configuration (Edge/Chromium compatible)
- popup.html — Popup UI with a BBMS-styled placeholder login form
- popup.css — Styling for the popup
- popup.js — Simple client-side behavior (validation, fake submit, optional remember username)

How to Load in Microsoft Edge (Unpacked)
1) Open Edge and navigate to edge://extensions
2) Enable Developer mode (toggle in the left pane/top right depending on Edge version)
3) Click “Load unpacked”
4) Select the folder:
   F:\Backup\Angular Projects\BBMS 2023-04-15\browser_extension
5) The extension named “BBMS Test Login (Placeholder)” should appear in your list.
6) Click the puzzle-piece/extension icon in the Edge toolbar (or pin the extension), then click “BBMS Login” to open the popup.

Notes
- This is a placeholder only. It does not send or store passwords. If you tick “Remember me”, only the username is stored in localStorage within the extension context.
- No permissions are requested in the manifest to keep the example minimal.
- You can edit popup.html/.css/.js and then click the Reload button on the extension card in edge://extensions to see changes.

Troubleshooting
- If the popup does not open, ensure Developer mode is on and the folder you selected contains the manifest.json file at its root.
- If Edge reports a manifest error, verify that the manifest.json remains valid JSON and references popup.html correctly.

Customization
- To adapt the form fields or branding, edit popup.html and popup.css.
- For functionality (e.g., calling real BBMS APIs), you would add background/service worker scripts and request appropriate permissions in manifest.json.


---

Firebase Authentication (New)

What’s included
- The popup now performs real sign-in with Firebase Authentication using the Google Identity Toolkit REST API.
- On success, the popup switches to an authenticated view and shows the user’s email.
- Session is stored in chrome.storage.local under key bbms_auth (idToken, refreshToken, expiresAt, email, userId).
- The session is restored automatically on popup open. If the ID token is near expiration, it is refreshed using the Secure Token endpoint.
- “Sign out” clears the stored session and returns to the login form.

Manifest updates
- permissions: ["storage"]
- host_permissions: [
  "https://identitytoolkit.googleapis.com/*",
  "https://securetoken.googleapis.com/*",
  "https://firestore.googleapis.com/*"
]

How to test
1) Reload the extension in edge://extensions (click Reload on the extension card).
2) Click the BBMS Login toolbar button to open the popup.
3) Sign in with an email/password account that exists in your Firebase project (bbms-1283c). If you don’t have one yet, create it in Firebase Console → Authentication → Users → Add user.
4) On success you’ll see a Welcome screen with your email and a Sign out button.
5) Close and reopen the popup; it should auto-restore your session. If the token is near expiry, it will refresh silently.
6) Click Sign out to clear the session and return to the login view.

Troubleshooting
- Invalid email or password: Ensure the user exists under Firebase Authentication and the password is correct.
- Too many attempts: Wait a few minutes and try again.
- Network error: Confirm internet connectivity and that edge://extensions shows the extension loaded without errors.

Security notes
- Tokens are stored only in the extension’s local storage (chrome.storage.local) and are not accessible to web pages.
- Consider restricting your Firebase Web API key in Google Cloud Console.



Firestore: “Today’s Logins” in members collection (New)

What it does
- After a successful sign-in, the popup’s authenticated view shows a table of members who have logged in today.
- It reads from Firestore collection: members and uses the field lastLogin (stored as a string like "Fri, 15 Aug 2025 13:54:22 GMT").
- The list is filtered client-side for “today” using your local date and time, then sorted by the time of login (newest first).

How it works
- The extension authenticates with Firebase Authentication (Identity Toolkit REST) to obtain idToken and refreshToken.
- For Firestore, it uses the Secure Token endpoint to obtain an OAuth access token, then calls the Firestore REST List Documents API:
  GET https://firestore.googleapis.com/v1/projects/bbms-1283c/databases/(default)/documents/members
- If the access token is missing/expired, it is refreshed automatically.
- The Refresh button in the authed view re-loads the list on demand.

Requirements
- Your Firebase project must allow the signed-in user to read the members collection (Firestore security rules).
- The lastLogin field must be a string in the stated format for accurate parsing.

Notes
- “Today” is evaluated in the user’s local timezone.
- If no members logged in today, the table will be empty and a friendly message will be shown.
- If a permissions/network error occurs, the popup will show an error and you can try Refresh.


---

Live updates, notifications, and badge (New)

What’s included
- A background service worker polls Firestore every ~60 seconds for members whose lastLogin is today.
- When a new login is detected, the extension:
  - Updates the popup’s list (if it is open) in real-time.
  - Shows a desktop notification: “New login: fName lName”.
  - Plays a short chime.
  - Updates the toolbar badge with today’s total login count.

How it works
- background.js authenticates via your existing Firebase session (bbms_auth). If needed, it refreshes the token via the Secure Token endpoint.
- It calls Firestore REST (members collection), filters entries whose lastLogin parses to today in your local timezone, and sorts them newest first.
- New logins are detected by comparing “docId|lastLogin” combinations against a persisted seen set for the current day.
- The first poll of each day initializes the seen set silently to avoid spamming old entries with notifications.
- The background sends a membersUpdated message; popup.js listens and re-renders immediately.

Permissions/Manifest
- Required permissions added: notifications, alarms, offscreen (plus existing storage).
- A small offscreen document (offscreen.html/offscreen.js) is used to play a short WebAudio chime, as service workers can’t output audio directly.

Usage
1) Reload the extension in edge://extensions (click Reload) after these changes.
2) Sign in via the popup.
3) The badge will show the number of people who have logged in today.
4) When a member’s lastLogin is updated to today in Firestore, you should see a desktop notification with their name and hear a short chime. The popup will refresh if open.

Troubleshooting
- If you don’t hear audio, Edge may restrict auto-play in some environments; the offscreen page uses WebAudio with a short sine beep and should work once the extension is active.
- If you don’t see notifications, verify Windows notification settings and that Edge is allowed to show notifications.
- Ensure your Firestore security rules allow the signed-in user to read the members collection.
