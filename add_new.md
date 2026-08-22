# BugPredict AI — Complete Fixes and Deployment Requirements

Please implement the following fixes and improvements in the BugPredict AI application.

## 1. Fix New User Data Leakage

There is a critical issue with user data isolation.

### Current Problem

When a new user creates an account and logs into the application, the dashboard and History section sometimes display data belonging to a previous user.

For example:

* User A creates an account.
* User A performs repository analyses.
* User B creates a completely new account.
* User B logs in.
* User B incorrectly sees User A's dashboard data and history.

### Required Fix

Ensure that every user's data is completely isolated.

A newly created user must start with their own empty/default state unless they have their own previous history.

The following must be user-specific:

* Dashboard data.
* Repository analyses.
* Analysis history.
* Risk predictions.
* Bug reports.
* Previous fixes.
* Repository information.
* Workspace information.
* User preferences.
* LLM/API-key settings.

When a user logs in:

```text
Login → Identify User → Load Only That User's Data → Render Dashboard
```

When a new user registers:

```text
Register → Create User → Create/Initialize User State → Show Only New User Data
```

Do not reuse cached data, React state, localStorage values, session data, or previously loaded user information from another account.

Also ensure logout completely clears user-specific frontend state.

---

# 2. Workspace Admin Invitation and Member Approval System

The Workspace feature should support an admin-controlled member invitation workflow.

## Admin Flow

The workspace Admin should have an option such as:

```text
Add Member
```

The Admin enters another registered user's:

```text
Username
```

The system should create a pending workspace invitation.

The invited user should **not immediately become a workspace member**.

Their invitation should have a status such as:

```text
Pending
```

---

## Invited User Flow

When the invited user logs into their account, they should be able to see the workspace invitation.

Example:

```text
Workspace Invitation

Ayush invited you to join:
BugPredict Development Team

[ Accept ]   [ Reject ]
```

### If the user clicks Accept

The user becomes an authorized member of that workspace.

Then:

```text
Invitation → Accepted → Workspace Membership Created → Workspace Appears
```

The workspace should then appear in the user's Workspace section.

### If the user clicks Reject

The invitation should be rejected and the user should not gain access to the workspace.

---

# 3. Workspace Permissions

Maintain proper workspace roles.

### Admin

The Admin can:

* Add members.
* Send invitations.
* View pending invitations.
* Remove members.
* Manage workspace access.
* View workspace projects and analysis.
* Manage collaboration permissions.

### Collaborator/Member

A collaborator can access the workspace only after accepting the invitation.

Their access should follow the permissions assigned by the Admin.

### Important

A user must never be able to access a workspace simply because they know its name or ID.

Workspace access must be based on actual membership/permission state.

---

# 4. Fix Incorrect Default OpenAI Session Status

There is currently an incorrect UI state where the application displays something similar to:

```text
OpenAI is Active
```

even before the user has entered:

* OpenAI API key
* LLM model name

This is incorrect.

## Required Behavior

When a user first opens the application:

```text
Provider: OpenAI
Status: Not Configured
```

It must **not** display:

```text
OpenAI Active
```

until valid configuration has actually been provided.

For example:

```text
OpenAI
API Key: Not Configured
Model: Not Configured
Status: Inactive
```

After the user successfully enters and saves:

```text
OpenAI API Key
+
LLM Model Name
```

then the UI can display:

```text
OpenAI
Status: Active
```

The status should be determined from the actual configuration state, not from the fact that OpenAI is the default provider.

---

# 5. LLM Settings State Management

The LLM settings interface should correctly distinguish between:

### Provider Selected

```text
OpenAI
```

and:

### Provider Configured

```text
OpenAI + Valid API Key + Valid Model
```

Selecting OpenAI alone must **not** mean that OpenAI is active.

Use states such as:

```text
Not Configured
Configured
Invalid
Testing
Active
```

Only show **Active** when the required configuration has been successfully saved and validated.

The same principle should apply to all supported providers.

---

# 6. Fix Gemini API Key

The Gemini integration is currently not working correctly.

Investigate and resolve the frontend/configuration issue responsible for Gemini API keys not being recognized or used correctly.

### Requirements

When the user selects Gemini:

```text
Provider → Gemini
```

the application should correctly allow:

* Gemini API key entry.
* Gemini model selection/name.
* Saving the configuration.
* Detecting whether the key is configured.
* Displaying the correct configuration status.
* Using the user's Gemini API key when performing the supported AI operation.

Example:

```text
Provider: Gemini

API Key:
[ ********************** ]

Model:
[ gemini-... ]

[ Save Configuration ]

Status: Configured
```

Do not automatically use an OpenAI key when Gemini is selected.

Do not use a server-side Gemini key if the application is designed to use the user's own key.

Make sure switching providers does not incorrectly retain the previous provider's active state.

For example:

```text
OpenAI → Gemini
```

must result in:

```text
Gemini: Not Configured
```

if the user has not configured Gemini.

---

# 7. API Key Security

API keys must be handled securely.

Do not expose API keys unnecessarily in:

* UI text.
* Logs.
* Error messages.
* Console output.
* Repository files.
* Git commits.

Display masked keys when appropriate:

```text
sk-************1234
```

The frontend should never assume that a provider is active simply because it is selected.

---

# 8. Dockerfile

Create a production-ready `Dockerfile` for the application.

The Docker configuration should:

* Install required dependencies.
* Build the frontend if required.
* Configure the application correctly for container execution.
* Expose the required application port.
* Use environment variables for configuration.
* Avoid hardcoding API keys or secrets.
* Use an appropriate production server.
* Keep the image reasonably lightweight where possible.

The Dockerfile should work with the existing project structure without changing application functionality.

---

# 9. Docker Compose

Create a `docker-compose.yml` file for local development/deployment.

It should:

* Start the application.
* Configure environment variables through `.env`.
* Map the required ports.
* Provide persistent storage where required by the existing application.
* Make it easy to start the application using:

```bash
docker compose up --build
```

And stop it using:

```bash
docker compose down
```

Do not hardcode secrets inside `docker-compose.yml`.

Provide an appropriate `.env.example` showing which environment variables are required.

---

# 10. README.md

Create a complete professional `README.md`.

The README should include:

## Project Overview

Explain what BugPredict AI does.

## Features

Include:

* ML-based bug prediction.
* File-level risk scoring.
* Bug detection.
* AI-assisted fixes.
* Repository analysis.
* Analysis history.
* Personal workspace.
* Collaborative workspace.
* Admin/member invitations.
* User authentication.
* Multiple LLM providers.
* OpenAI support.
* Gemini support.
* Risk visualization.

## Tech Stack

Document the technologies actually used by the project.

For example:

```text
Frontend
React
Tailwind CSS

Backend
FastAPI / existing backend technology

Database
Existing database

ML
Existing ML model/framework

AI Providers
OpenAI
Gemini
```

Do not claim technologies that are not actually present in the project.

## Installation

Explain how to run the application locally.

Include:

```bash
git clone <repository-url>
cd <project-directory>
```

Then provide dependency installation and startup commands appropriate to the existing project.

## Environment Variables

Explain required environment variables without exposing real secrets.

Provide:

```text
.env.example
```

with placeholder values.

## Docker

Explain:

```bash
docker compose up --build
```

and how to stop the application.

## User Authentication

Explain registration, login, and user-specific data isolation.

## Workspace Collaboration

Explain:

```text
Admin creates workspace
        ↓
Admin enters username
        ↓
Invitation sent
        ↓
User accepts invitation
        ↓
User becomes workspace member
        ↓
Workspace becomes accessible
```

## LLM Configuration

Explain how users configure:

* OpenAI.
* Gemini.
* Other supported providers.

Explain that selecting a provider does not automatically mean it is configured.

## Troubleshooting

Add common issues and solutions for:

* API key not detected.
* Gemini configuration failure.
* OpenAI configuration failure.
* Docker startup problems.
* Database issues.
* Authentication/session issues.
* Workspace invitation issues.

---

# 11. Regression Prevention

While implementing these changes, verify that existing features continue working.

Test at minimum:

### Authentication

```text
Create User A
→ Login
→ Create analysis
→ Logout

Create User B
→ Login
→ Dashboard must NOT show User A data
→ History must NOT show User A history
```

### Workspace

```text
Admin
→ Add username
→ Invitation created

Member
→ Login
→ See invitation
→ Accept
→ Workspace appears

Member
→ Reject
→ Workspace remains inaccessible
```

### OpenAI

```text
New user
→ OpenAI selected
→ No API key
→ Status = Not Configured
```

Then:

```text
Enter API key
→ Enter model
→ Save
→ Status = Active/Configured
```

### Gemini

```text
Select Gemini
→ No Gemini key
→ Status = Not Configured
```

Then:

```text
Enter Gemini API key
→ Select model
→ Save
→ Status = Active/Configured
```

### Logout

```text
User A logout
→ User B login
→ User A data must not remain in frontend state
```

---

# 12. Important Implementation Rule

Do not solve the user-data issue by simply hiding the previous user's data in the UI.

The application must correctly associate displayed data with the currently authenticated user and ensure that stale frontend state, cached data, or previous session information cannot appear for another account.

Likewise, do not mark an LLM provider as active merely because it is the default selection.

The final application should provide:

**Secure user isolation + proper workspace invitation/approval + correct LLM configuration state + working Gemini integration + Docker deployment + complete documentation.**
