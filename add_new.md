# Mandatory User API Key and Multi-Provider AI Integration

Please update the application's AI and API architecture with the following requirements.

## 1. API Key Must Be Mandatory for AI Features

The AI-powered features must **not work unless the user provides their own API key**.

If no API key has been configured:

* Do not start AI analysis.
* Do not generate AI-based bug fixes.
* Do not generate code.
* Do not call any LLM provider.
* Clearly inform the user that an API key is required.

Display a professional message such as:

> **API Key Required**
> Please configure your API key and select an AI provider before using AI analysis, bug explanation, or AI code generation features.

The UI should provide a clear button to navigate the user to the API Key configuration section.

## 2. Use Only the User's API Key

The application must use **the API key provided by the currently logged-in user**.

Do not use:

* A server-side default API key.
* A developer's personal API key.
* A fallback API key.
* An environment variable API key for AI generation on behalf of users.

Each AI request must use the API key configured by the current user for the selected provider.

The application should support separate API key configurations for each provider.

For example:

* OpenAI → User's OpenAI API Key
* Gemini → User's Gemini API Key
* Groq → User's Groq API Key

The application must never silently switch to another provider or API key.

## 3. Add Groq as an AI Provider

Add **Groq** as an additional LLM provider alongside OpenAI and Gemini.

The application should provide a provider selection interface with:

* OpenAI
* Google Gemini
* Groq

Each provider should have:

* Its own API key input.
* Provider-specific model selection where applicable.
* API key validation.
* Connection testing.
* Clear success and error messages.

Example flow:

```text
Select AI Provider

[ OpenAI ] [ Gemini ] [ Groq ]

Selected Provider: Groq

API Key: [ ************************ ]

Model: [ Select Model ]

[ Test Connection ]   [ Save API Key ]
```

## 4. Unified AI Provider Architecture

Create a unified LLM provider architecture so that OpenAI, Gemini, and Groq work through a common interface.

For example, the application should support operations such as:

```text
analyzeBug()
explainBug()
generateFix()
generateCode()
```

The application should internally route the request to the selected provider.

This architecture should make it easy to add more providers in the future without rewriting the entire AI system.

## 5. Groq Functionality

Groq should support the same core AI capabilities as the other providers, including:

* Repository and bug analysis.
* Bug explanation.
* Risk analysis.
* Code generation.
* AI-generated bug fixes.
* Generating new functions or classes when required.
* Generating modifications across multiple files when necessary.

The provider selected by the user should be used consistently throughout the current session.

For example:

```text
User selects Groq
        ↓
User enters Groq API Key
        ↓
API key is validated
        ↓
Groq is saved for the current session
        ↓
All AI analysis and AI fixes use Groq
```

## 6. Prevent AI Fix Without an API Key

The **AI Fix**, **Generate Solution**, and **Generate Code** features must remain disabled when no valid API key is configured.

The UI should clearly indicate why the feature is unavailable.

For example:

```text
[ 🔒 AI Fix ]

API key required to generate an AI-powered solution.
```

Once the user configures and validates an API key:

* The AI Fix button should become active.
* The Generate Solution feature should become available.
* The application should use only the selected provider and the user's API key.

## 7. API Key Session Management

After the user successfully configures an API key:

* Keep the key available during the active user session.
* Allow the user to switch between OpenAI, Gemini, and Groq.
* Use the API key corresponding to the currently selected provider.
* Do not require the user to enter the key repeatedly while the session remains active.

The API key should be removed when:

* The user logs out.
* The user explicitly removes the API key.
* The user clears application data.

After removal, all AI-powered features must immediately stop working until the user provides a new valid API key.

## 8. Error Handling

Never allow an invalid API key, provider error, network issue, or LLM response failure to cause a blank page or application crash.

Handle errors gracefully and display meaningful messages such as:

* Invalid API key.
* API key missing.
* Authentication failed.
* Selected model is unavailable.
* Provider request failed.
* Rate limit exceeded.
* Network connection failed.
* AI generation failed.

The user should always remain inside the application and be able to retry or change the provider/API key.

## Final Expected Behavior

The final application should support the following workflow:

1. The user logs into their account.
2. The user selects **OpenAI, Gemini, or Groq**.
3. The user enters **their own API key**.
4. The application validates and stores the API key for the active session.
5. AI features become available.
6. Repository analysis identifies potential bugs.
7. The user selects a bug and views the complete source file.
8. The suspected buggy code is highlighted in red.
9. The user can request an AI explanation or AI-generated fix.
10. The selected AI provider uses **only the current user's API key**.
11. If the user has not provided an API key, AI analysis and AI Fix features remain unavailable.
12. On logout or when application data is cleared, the API key is removed and AI functionality is disabled again.

## Critical Requirement

**Do not use any server-side, developer, default, fallback, or hidden API key for AI requests. All AI analysis, bug explanations, code generation, and AI fixes must require and use the API key explicitly provided by the currently authenticated user.**
