# Lingo — Privacy Policy & Data Safety Summary (Draft)

> **Status:** Draft template for review by legal/product owner prior to publishing on the website footer and Google Play Console Data Safety form.

## 1. Who We Are
Lingo ("Play & Learn") is an English-learning web and Android mobile application operated at `https://lingo-ruby-three.vercel.app`.

## 2. Information We Collect
- **Account Identifiers**: Username (`3–20` alphanumeric/underscore characters), salted & `scrypt`-hashed password, optional display name, selected avatar/color, and system-derived Friend ID (`LNG-...`). We do **not** collect government IDs, contacts lists, SMS, or precise GPS location.
- **Learning Progress & Gameplay**: Completed lessons, quiz scores, XP, streaks, daily word counts (localized via browser timezone `X-Timezone`), saved vocabulary words, badges, rewards/gems ledger, and multiplayer match scores/codes.
- **Social Graph & Notifications**: Friends list, friend requests, user blocks, private community memberships/invitations, game invitations, and opt-in device notification preferences stored locally on your device.
- **Voice & AI Practice**:
  - Speech-to-text transcripts in Speaking/Pronunciation exercises use your device/browser Web Speech / microphone APIs and send text transcripts to Lingo's server for comparison. Raw audio files are **not** archived by Lingo servers.
  - AI Conversation messages (`<= 500` chars) and custom game topics are forwarded (without user account credentials) to our configured AI provider (Google Gemini or OpenAI) strictly to generate replies and quiz questions.
- **Diagnostics (Server Only)**: Minimal request status & error summaries (with credentials, tokens, and PII stripped).

## 3. How We Use Data
We use data solely to:
1. Authenticate accounts and sync learning progress across Web and Android.
2. Compute lessons, streaks, achievements, rewards, and multiplayer matches.
3. Deliver friend challenges, community invitations, and user-configured local study reminders.
4. Enforce abuse prevention, block lists, and rate limits.

We **never** sell personal data or serve third-party ad-tracking SDKs.

## 4. Children's Privacy & Age Rating
Lingo is not targeted to children under 13 (or the minimum digital consent age in your jurisdiction) without verifiable parental consent. Prior to Google Play distribution:
- Add an age-confirmation gate during signup or clearly declare the Play Store target age group (`13+` / `16+` unless family-program compliance is implemented).

## 5. Data Retention & Account Deletion (Google Play Compliant)
- Active accounts retain progress until the user deletes their account.
- **Instant In-App Deletion**: Signed-in users can permanently delete their account and associated learning progress, sessions, friendships, notifications, and communities at any time via **Profile → Delete account** (backed by `DELETE /api/me`).
- **Web Deletion Path**: Users who uninstalled the Android app can sign in on `https://lingo-ruby-three.vercel.app` and use **Profile → Delete account**, or contact the operator at `[insert support email]` for manual verification/erasure.

## 6. Security Measures
Passwords are stored using per-user random salts and `scrypt`, session tokens are SHA-256 hashed at rest with instant global revocation (`Sign out everywhere`), all API traffic uses HTTPS, and private database tables enforce Row-Level Security (RLS).
