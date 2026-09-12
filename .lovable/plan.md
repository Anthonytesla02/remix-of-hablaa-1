# Mobile account entry redesign

## Goal
Replace the landing-page account actions with a focused mobile welcome and authentication flow inspired by the supplied reference, while retaining Habla’s own visual identity.

## Changes
- Make every landing-page sign-in and account-creation action open the `/auth` welcome screen.
- Redesign `/auth` as a full-height mobile entry screen with the Habla name, the supplied llama avatar, a short promise, and two strong actions: **Get started** and **I already have an account**.
- Remove the avatar’s original background so the character sits naturally on the screen.
- Keep account creation and sign-in on the same page: each welcome action reveals the matching existing form, with Google and email/password options.
- Preserve confirmation messaging, loading states, existing redirects, and accessibility.
- Verify the welcome screen and both authentication modes at the mobile preview size.

## Technical details
- Use the existing `/auth` route and authentication services; no account data model or backend behavior changes.
- Store the cleaned avatar through the project asset flow and reference it from the auth screen.
- Add route-specific social metadata and ensure motion respects reduced-motion settings.
