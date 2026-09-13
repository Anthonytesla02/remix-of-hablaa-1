# Habla introduction flow

## What will change
- Add a mobile-only introduction page opened by **Get started**.
- First screen: the Habla llama introduces itself with a speech bubble and a **Continue** button.
- Second screen: Habla explains that a few quick setup questions come before the first lesson.
- Continue from the second screen into the existing account creation form.
- Keep the existing back controls, sign-in path, account behavior, and landing-page links unchanged.

## Visual direction
- Match the supplied references: deep full-screen background, centered character, outlined speech bubble, and a large bottom action button.
- Use the existing background-free Habla character and the app’s semantic colors, typography, button depth, and reduced-motion support.
- Add a small, friendly character entrance/idle motion without delaying navigation.

## Technical details
- Create a dedicated TanStack route for the two-step introduction flow with unique page metadata.
- Pass the intended sign-up state into `/auth` through a typed URL search value so the existing form opens directly.
- Update only the **Get started** action; **I already have an account** continues to open sign-in directly.
- Verify the full mobile flow and current build status.
