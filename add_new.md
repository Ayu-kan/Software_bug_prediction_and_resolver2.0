Update the EXISTING PROJECT. FRONTEND ONLY.

IMPORTANT:

* Do NOT modify backend code, API routes, database, authentication logic, ML models, data processing, or API contracts.
* Do NOT rebuild the application from scratch.
* Preserve all existing functionality.
* Reuse existing React/Tailwind components and dependencies.
* Make minimal, targeted frontend changes.

BRANDING:

* Change the frontend product name to:
  "BugRiskIntel"
* Display the edition/version as:
  "Enterprise v2.0"
* Use this branding consistently in the navbar/sidebar, login/register screens, dashboard header, loading screens, page title, and footer where appropriate.
* Do not use the old product name in visible frontend UI.
* Do not rename backend variables, API endpoints, database fields, or internal backend identifiers.

LOGO:

* Use the uploaded logo image as the source.
* Extract/use ONLY the blue bug/code symbol from the image as the logo.
* Do NOT use the full image with the large text as the logo.
* Preserve the logo's proportions and make it clean, sharp, and properly sized.
* Use it consistently across the frontend.
* Keep the logo and "BugRiskIntel / Enterprise v2.0" visually aligned.
* Avoid excessive logo size or whitespace.

ACTIVE SPACE / USERNAME:

* Fix the active-space selector overlapping the username.
* Adjust flex/grid layout, spacing, width, alignment, z-index, and text truncation.
* Both username and active space must remain readable.
* Make it responsive on desktop/tablet/mobile.

EMAIL VERIFICATION:

* Add frontend UI for email verification.
* Include unverified, verification-sent, verified, resend, loading, and error states.
* Use existing API/auth integration if available.
* If backend support is missing, create only the frontend integration point.
* Do NOT change backend logic.

FORGOT PASSWORD:

* Add "Forgot Password?" to the login UI.
* Add email input, loading, success, reset-link-sent, and error states.
* Use existing API integration if available.
* Frontend only.

API KEY ERROR:
Current error:
"AI generation failed. Please try again. ('ascii' codec can't encode characters in position 51-58: ordinal not in range(128))"

* Inspect frontend API-key input/request handling for encoding problems.
* Ensure frontend inputs support Unicode safely.
* Never display or log raw API keys.
* Mask API keys in the UI.
* Do NOT modify backend/ML logic.
* If the error is backend-generated, show a clean user-friendly frontend error instead of exposing the technical traceback.

HISTOGRAM:

* Add a "Preview Histogram" option to the dashboard.
* Show risk-score distribution using existing API data or mock data matching the existing response structure.
* Include bins, labels, tooltip, responsive sizing, and empty state.
* Frontend only.

PIE CHART:

* Upgrade the existing pie chart visually.
* Use existing data/mock data.
* Add percentages, legend, tooltips, responsive sizing, and a clean modern presentation.
* Match the application's existing theme.

UI:

* Keep the current application structure.
* Improve spacing, alignment, responsiveness, typography, cards, empty states, and visual consistency.
* Ensure the frontend looks polished and production-ready for a hackathon demo.
* Avoid unnecessary animations or dependencies.

VALIDATION:

* Run frontend build/type checks.
* Fix frontend errors caused by these changes.
* Verify all pages and responsive layouts.
* Do not modify unrelated files.

FINAL RESPONSE:
Only report:

1. Frontend files changed
2. Features/fixes implemented
3. Any backend integration points still required