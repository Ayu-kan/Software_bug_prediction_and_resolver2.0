# Task: Fully Debug, Upgrade, and Modernize the Existing ML-Powered Bug Prediction and Repair Application

Act as a senior software engineer, machine learning engineer, backend architect, and UI/UX designer. Your task is to **inspect, debug, improve, and complete my existing application** so that it works reliably, has a modern interface, supports multiple machine learning models, and implements secure authentication and API key management.

Do not merely provide suggestions, mockups, or example code. Work directly with the existing codebase, preserve useful functionality, implement the necessary changes, and verify the results.

## 1. First, Audit the Existing Application

Before modifying the code:

- Inspect the complete project structure, frontend, backend, database, API routes, authentication, ML pipeline, configuration, and dependencies.
- Identify runtime errors, broken endpoints, missing components, incorrect imports, dependency conflicts, security vulnerabilities, and incomplete features.
- Determine the existing technology stack and retain it unless a change is necessary and justified.
- Create a prioritized list of issues and an implementation plan.
- Avoid replacing the entire application unnecessarily. Refactor existing components wherever practical.
- Never claim that a feature works unless it has been implemented and tested.

## 2. Build a Genuine Machine Learning Bug Prediction Engine

The primary objective is to predict software defects and support automated bug repair using actual machine learning models.

**Strict requirement: Bug prediction and automated repair must use ML models, not external LLM APIs presented as machine learning.**

Implement a modular ML architecture with:

- Multiple selectable models rather than a single hard-coded model.
- Model training, validation, evaluation, versioning, loading, saving, and inference.
- Configurable feature extraction and preprocessing.
- A model registry that records each model's type, version, training dataset, supported task, and evaluation metrics.
- A common interface so that new ML algorithms can be added without rewriting the application.
- Confidence scores, prediction explanations where supported, and appropriate uncertainty handling.

Consider the following models when appropriate for the available data:

- Random Forest, Decision Tree, Logistic Regression, SVM, XGBoost, and LightGBM for structured defect prediction.
- Neural networks or trained code models for source-code defect classification.
- Graph-based models when repository relationships or dependency graphs provide useful information.
- Trained ML-based code-repair models for generating candidate patches.

Do not claim that every model supports every task. Verify compatibility between each model, its features, the target labels, and the supported input formats.

## 3. Support Multiple Data Types and Feature Engineering

Allow users to supply different types of relevant software engineering data.

Supported inputs should include, where applicable:

- Source-code files and repositories.
- CSV and JSON datasets.
- Git commit history and change metrics.
- Static-analysis reports.
- Unit-test results, execution logs, and defect records.
- Structured software quality metrics.

Implement a preprocessing pipeline that includes:

- Input validation and file-size limits.
- Missing-value handling and data cleaning.
- Feature extraction and transformation.
- Categorical encoding and numerical scaling when required.
- Feature selection and configuration.
- Dataset preview and schema inspection.
- Training, validation, and test splits that avoid data leakage.

Support features such as code complexity, code churn, change frequency, function length, dependency relationships, historical defects, test failures, and other features appropriate to the selected model.

Clearly distinguish between supported formats and formats that require additional preprocessing or a specialized model.

## 4. Improve Bug Detection and Automated Repair

Build a complete workflow:

1. Upload a dataset, source file, or supported repository.
2. Validate and preprocess the input.
3. Extract the appropriate features.
4. Select an ML model or compare multiple eligible models.
5. Predict defect likelihood and, when trained, defect category.
6. Identify suspicious files, functions, or code regions when the model supports that granularity.
7. Display prediction scores, confidence, and relevant explanations.
8. Generate candidate fixes using a trained ML repair model.
9. Run applicable tests, static checks, and regression tests against each candidate.
10. Display the proposed changes and validation results.
11. Require user approval before modifying the original source code.
12. Preserve the original code and provide rollback functionality.

If no suitable repair model is available, clearly report that automated repair is unavailable rather than inventing a fix or silently delegating repair to an LLM API.

## 5. Implement Model Comparison and Evaluation

Create a dedicated model-management and evaluation module.

Users should be able to:

- Select and configure supported models.
- Compare eligible models on the same dataset and evaluation protocol.
- Train models and monitor training status.
- Inspect evaluation history and model versions.
- Save and load trained models.
- Select a model for inference.
- Export evaluation results and prediction reports.

Report appropriate metrics, including:

- Classification: precision, recall, F1-score, ROC-AUC where appropriate, and confusion matrix.
- Imbalanced defect datasets: PR-AUC and class-specific metrics.
- Calibration and confidence quality where supported.
- Repair: patch validity, test pass rate, regression rate, and benchmark success rate.

Use reproducible experiments, fixed random seeds where applicable, and separate training, validation, and test datasets. Prevent repository, duplicate-sample, and temporal leakage where relevant.

Do not fabricate evaluation metrics or claim that one model is superior without measured results.

## 6. Strengthen JWT Authentication and Authorization

Review and improve the existing authentication system.

Implement:

- Secure registration, login, logout, and token refresh.
- Short-lived JWT access tokens.
- Refresh-token rotation and revocation.
- Proper password hashing using an established password-hashing algorithm.
- Token signature, issuer, audience, expiry, and algorithm validation as appropriate.
- Role-based access control with backend-enforced permissions.
- Protected API endpoints and ownership checks for user-specific datasets, models, and reports.
- Login rate limiting and appropriate authentication error handling.
- Secure cookie settings if cookies are used.
- CORS, CSRF, and security-header protections appropriate to the chosen architecture.

Use least-privilege permissions. Never rely on frontend checks alone to enforce authorization. Do not log passwords, JWTs, refresh tokens, or API keys.

## 7. Improve API Key Management and LLM Provider Integration

Support the following providers:

- OpenAI
- Google Gemini
- Grok/xAI
- Anthropic Claude

Implement a provider-independent configuration layer with separate provider settings.

Features should include:

- Secure API key entry and masked display.
- Provider-specific validation and connection tests.
- Configurable supported models.
- Clear status indicators for configured, valid, invalid, or unavailable credentials.
- Useful handling of authentication failures, rate limits, network errors, and provider outages.
- Request timeouts and retry policies where appropriate.
- Usage tracking and error reporting where available.
- Server-side secret storage using encryption or a managed secrets service.
- Key replacement and deletion.
- No exposure of secrets in frontend bundles, API responses, logs, or version control.

Use official provider SDKs and current supported APIs. Keep provider-specific code isolated behind a common interface.

**Separation of responsibilities:** These external providers may be used for optional integrations such as explanations, documentation, or other explicitly enabled assistant features. They must not replace the ML models responsible for bug prediction or ML-based repair. If a feature requires an LLM, identify it transparently.

## 8. Redesign and Improve the User Interface

Modernize the existing interface into a professional, responsive ML developer platform.

Improve:

- Overall visual hierarchy, typography, spacing, colors, and consistency.
- Sidebar navigation and application layout.
- Dashboard with meaningful statistics and recent activity.
- Dataset upload, preview, validation, and preprocessing screens.
- ML model selection, configuration, training, and comparison screens.
- Bug prediction results with risk scores, severity indicators, and code-level details.
- Repair review with proposed changes, test results, and approval controls.
- Evaluation charts and model-performance tables.
- User profile, authentication, provider settings, and API key management.
- Loading states, empty states, error messages, success notifications, and retry actions.
- Mobile and tablet responsiveness and accessibility.

Use reusable components and consistent design patterns. Avoid placeholder statistics, fake charts, nonfunctional buttons, and hard-coded prediction results. Every visible control must have a meaningful, implemented action.

## 9. Improve Backend, API, and Database Reliability

- Organize business logic, API routes, authentication, ML services, and provider integrations into clear modules.
- Add request validation, consistent error responses, structured logging, and sensible timeouts.
- Make long-running training and repository analysis jobs trackable.
- Add database migrations and appropriate indexes where required.
- Handle concurrent jobs, failed training runs, missing models, invalid datasets, and unavailable providers.
- Prevent path traversal, unsafe file uploads, arbitrary command execution, and unauthorized repository access.
- Use environment-based configuration and provide a sanitized example configuration file.
- Keep dependencies compatible and remove unused packages only after checking their usage.

## 10. Testing and Verification

Add or improve automated tests for:

- Authentication and authorization.
- API routes and validation.
- Dataset ingestion and preprocessing.
- ML training, inference, and model persistence.
- Model comparison and evaluation.
- Repair candidate validation and rollback.
- Provider configuration and API key handling.
- Frontend components and critical user workflows.

Run the available test suite, resolve regressions, and perform integration checks.

Verify that:

- The application starts successfully.
- Required services and database connections work.
- Authentication-protected routes reject unauthorized requests.
- Supported ML models can train or load and produce valid predictions.
- Dataset errors produce understandable messages.
- Provider settings work without exposing credentials.
- Predictions and repairs are not fabricated.
- Existing functionality remains intact unless intentionally changed.

If a test cannot be run because of missing credentials, unavailable hardware, missing data, or external service limitations, document the exact limitation.

## 11. Required Deliverables

Complete the work in the existing repository and provide:

1. A summary of the discovered problems.
2. The actual modified source code.
3. A list of implemented features and architectural changes.
4. Updated dependency files and database migrations, if needed.
5. Environment variable documentation and a sanitized `.env.example`.
6. Setup and execution instructions.
7. Automated tests and their actual results.
8. ML training and evaluation instructions.
9. Documentation for supported data formats and models.
10. Documentation for JWT security and all four provider integrations.
11. Remaining limitations and a prioritized list of future improvements.

## Execution Rules

- Begin by inspecting the repository; do not assume its structure or framework.
- Make changes incrementally and preserve existing working functionality.
- Prefer small, testable modifications over unnecessary rewrites.
- Do not hard-code secrets, credentials, prediction outputs, or fake evaluation results.
- Do not introduce external LLM calls into the ML prediction or repair path.
- Do not replace actual model inference with rule-based heuristics while claiming it is ML.
- Keep rule-based validation, static analysis, and tests as complementary verification tools, not substitutes for the ML engine.
- If a critical requirement cannot be implemented with the available data or resources, explain why and implement the strongest valid alternative.
- After implementation, report what changed, which tests passed or failed, and the exact commands needed to run the application.

**Final objective:** Deliver a secure, reliable, modern, extensible ML-powered bug prediction and repair application with multiple genuine ML models, flexible data and feature pipelines, tested JWT authentication and authorization, and secure integration with OpenAI, Gemini, Grok, and Anthropic.