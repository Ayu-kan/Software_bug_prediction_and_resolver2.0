Update the existing project only. Do not rebuild or change unrelated functionality. First inspect the current codebase and implement the following fixes/features:

1. Logo

* Add the provided logo to the existing UI.
* Use the existing logo asset if already present; otherwise locate the provided asset.
* Place it appropriately in the navbar/sidebar/login UI without breaking the current responsive layout.

2. API Key Security

* User-provided API keys must be stored securely in the database.
* NEVER store or display the raw API key.
* Hash/encrypt it similarly to password security, using the project's existing security approach where possible.
* When displaying the API key later, show only a masked version such as `••••••••`.
* Never expose the raw key in API responses, frontend state, logs, error messages, or database UI.
* The backend must use the original key when required for API calls without exposing it to the user.
* Check existing authentication/security code before implementing a new mechanism.

3. Login Persistence

* Currently users are logged out when the server restarts.
* Fix authentication/session persistence so restarting the backend does NOT automatically log the user out.
* Store authentication state securely using the existing authentication architecture.
* Do not weaken authentication or security.
* Users should remain logged in until they explicitly log out or their session/token expires according to the intended authentication policy.

4. First-Time User — History

* If a user has no history, do not show a completely blank page.
* Show a clear first-time/empty-state UI, e.g.:
  "This is your first analysis"
  "Your analysis history will appear here once you run your first analysis."
* Include an appropriate CTA if the existing UI supports it.
* Keep the existing history functionality unchanged.

5. First-Time User — Workspace

* If the user has no workspace/data, show a meaningful empty-state instead of a blank page.
* Explain that this is their first workspace and guide them toward the next action.
* Match the existing UI design.

6. Active Workspace / Username UI Bug

* When selecting the active workspace/space, it currently overlaps the username.
* Fix the layout cleanly.
* Ensure proper spacing, alignment, truncation, and responsive behavior.
* Do not hide important information.
* Test at different screen widths.

Implementation rules:

* Inspect existing architecture before changing code.
* Reuse existing components, authentication, database models, styling, and utilities wherever possible.
* Make minimal targeted changes.
* Do not introduce unnecessary dependencies.
* Do not modify unrelated features.
* Handle existing users/data safely and maintain backward compatibility where possible.
* After implementation, run/build the frontend and backend and fix any errors caused by these changes.
* Provide a concise summary of files changed and how each requirement was implemented.
