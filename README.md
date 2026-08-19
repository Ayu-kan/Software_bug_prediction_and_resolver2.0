# Upgraded Enterprise Bug Risk Prediction & Solution Platform

An enterprise-grade, multi-language software bug risk prediction platform powered by static code analysis, ML predictions, line-level suspicious code detection, file ranking, hybrid risk filtering, and LLM issue resolution.

---

## 🌟 Overview & Key Features

### 1. User Authentication & Access Control
- Full user sign-up, sign-in, and session management.
- Protected application routes ensuring analysis tools and data are accessible only to authenticated users.

### 2. LLM API Configuration & Key Management
- Dedicated **API Key / LLM Configuration** modal and button.
- Support for **OpenAI** and **Google Gemini** LLM providers.
- Secure, persistent per-user key storage in the SQLite database.
- Automatic key utilization during AI issue resolution with update/replacement support.

### 3. Repository Analysis & ML Bug Prediction
- Multi-language static code analysis (`.py`, `.js`, `.ts`, `.java`).
- Graph-based dependency risk modeling and architectural role detection.
- ML classification using XGBoost, Random Forest, and Logistic Regression models.

### 4. Hybrid Mode Filtering
- New **Hybrid Mode** repository analysis option.
- Filters displayed results to show **only files with ML risk probability > 60%**.

### 5. File Ranking & Top 10 Risky Files
- Automated ranking of repository files by ML bug probability.
- Top 10 highest-risk files spotlight.

### 6. Complete Ranked Risk Inventory
- File rank, file path, ML probability, risk level, suspicious lines count, code preview action, and AI resolve action.
- **Cleaned Layout**: Excludes the raw churn column from display tables while retaining metrics internally.

### 7. Suspicious Lines Detection
- Line-by-line static AST and pattern analysis.
- Identifies current bug risks, security vulnerabilities, infinite loop risks, and technical debt.
- Provides clear explanations for flagged lines.

### 8. File Code Preview with Highlighted Risky Lines
- Interactive code preview modal with line numbers.
- Differentiates and highlights suspicious code lines with inline risk warnings and hover/click tooltips.

### 9. Dynamic AI Issue Resolution (No Full-Page Refreshes)
- Direct inline resolution drawer powered by configured OpenAI or Gemini APIs.
- Fixes previous full-page refresh/reset issues by dynamically updating UI state.

---

## 📁 Project Folder Structure

```text
project/
│
├── frontend/
│   ├── components/      # UI components (auth, api_key_modal, file_ranking, risk_inventory, code_preview_modal)
│   ├── pages/           # Application views
│   ├── services/        # Backend API service connections (api_service.py)
│   ├── hooks/           # State & interaction hooks
│   ├── context/         # User session & theme context
│   └── utils/           # Helper utilities
│
├── backend/
│   ├── api/             # API routes & request schemas (app.py)
│   ├── services/        # Core business logic services
│   │   ├── repository_service/
│   │   ├── analysis_service/
│   │   ├── prediction_service/
│   │   ├── suspicious_line_service/
│   │   ├── ranking_service/
│   │   └── llm_service/
│   ├── models/          # Saved ML models & scalar jobs
│   ├── database/        # SQLite connection & schemas (db.py)
│   ├── auth/            # Security, password hashing & auth service (security.py, auth_service.py)
│   └── core/            # Configuration & constants
│
├── dashboard/           # Streamlit Web Dashboard entry point (app.py)
├── data/                # Dataset store
├── models/              # Joblib trained models
├── src/                 # Static code analyzers & feature extractors
├── tests/               # Unit test suites
├── add_new.md           # Architecture specifications & task requirements
└── README.md            # Comprehensive project documentation
```

---

## 🛠️ Technology Stack

- **Backend**: Python 3.10+, FastAPI / Service Layer, SQLite, JWT/PBKDF2 Security, Pydantic.
- **Frontend**: Streamlit / Modular React Component Architecture, Custom Glassmorphism CSS.
- **Machine Learning**: Scikit-Learn, XGBoost, Joblib, Pandas, NumPy, NetworkX.
- **LLM Integration**: OpenAI API, Google Gemini Pro API.

---

## 💻 Installation & Setup

1. **Clone the Repository**:
   ```bash
   git clone <repo-url>
   cd "New folder (5)"
   ```

2. **Environment Configuration**:
   Create a `.env` file in the root directory (optional defaults provided):
   ```env
   JWT_SECRET=super-secret-key-2026
   OPENAI_API_KEY=
   GEMINI_API_KEY=
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements1.txt
   ```

---

## 🚀 Running the Application

### Running the Dashboard
Launch the unified interface (with authentication, API key modal, and dynamic analysis):

```bash
streamlit run dashboard/app.py
```

Open your browser at `http://localhost:8501`.

---

## 🔌 API Overview

- `POST /auth/register`: Register a new user account.
- `POST /auth/login`: Authenticate user and retrieve JWT token + saved API key configuration.
- `POST /auth/config`: Save user LLM provider (`openai` / `gemini`) and API key.
- `POST /analysis/run`: Run repository feature extraction, ML prediction, file ranking, hybrid filtering, and suspicious line detection.
- `POST /analysis/resolve`: Generate AI fix solution using saved user LLM credentials.

---

## 🧪 Running Tests

Run the test suite covering authentication, suspicious line detection, file ranking, hybrid mode, and LLM resolution:

```bash
py -m unittest tests/test_upgraded_features.py
```
