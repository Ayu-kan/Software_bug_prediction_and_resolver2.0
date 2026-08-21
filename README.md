# Enterprise Bug Risk Intelligence Platform v2.0

An enterprise-grade, multi-language software bug risk prediction platform powered by static code analysis, calibrated ML predictions, interactive code preview with red bug highlighting, side-by-side AI code diff, and LLM-powered issue resolution.

---

## 🌟 Features

### 1. User Authentication & Access Control
- Full user sign-up, sign-in, and persistent session management.
- Protected application routes — analysis tools accessible only to authenticated users.
- Complete user data isolation: each user sees only their own analyses and history.

### 2. Premium Dark Navbar UI
- Responsive top navigation bar with glassmorphism styling replacing the old sidebar.
- Dynamic icons per navigation tab with active tab highlighting and hover transitions.
- Responsive mobile hamburger menu.
- Live **API Key Status Badge** in the navbar showing whether an LLM key is active.

### 3. LLM API Configuration & Persistent Session Key
- Settings page to configure **OpenAI** or **Google Gemini** provider and API key.
- Key is persisted for the **active user session** across all pages without re-entry.
- API key is securely wiped on logout or explicit clear.

### 4. Repository Analysis & Calibrated ML Bug Prediction
- Multi-language static code analysis (`.py`, `.js`, `.ts`, `.java`).
- Graph-based dependency risk modeling and architectural role detection.
- ML classification using **XGBoost**, **Random Forest**, and **Logistic Regression**.
- **Per-repo score calibration**: risk scores are normalized relative to the repository being analyzed (5th–95th percentile rescaling), preventing systematic over-prediction when git history features are absent.

### 5. Hybrid Mode Filtering
- Analysis mode that filters results to show only files with ML risk probability **> 65%** (calibrated).
- Reduces noise and focuses the user on genuinely risky files.

### 6. Ranked Risk Inventory
- Full sortable table with Rank, File, Risk Level, ML Probability, and Action columns.
- Inline expandable row showing **Risk Triggers**, **Code Metrics** (LOC, Complexity, Churn), and **Suspicious Lines** list.
- Clicking a suspicious line in the table directly opens the **Code Preview** scrolled to that exact line.

### 7. Interactive Code Preview with Red Bug Highlighting
- Full source file rendered in Monaco Editor (VS Code engine) with syntax highlighting.
- Suspicious/buggy lines highlighted in **red** with glyph margin markers.
- Auto-scroll to target line on click.
- Interactive **Bug Details Side Drawer** showing severity, line range, explanation, and impact.
- One-click **"Generate AI Fix for this Line"** shortcut.
- Gracefully loads full file content from backend if source is missing.

### 8. Suspicious Line Detection (Refined)
- Pattern-based + AST analysis for Python files.
- Detects: bare `except:`, `eval()`/`exec()`, TODO/FIXME markers, `while True:`, empty catch blocks, global state mutation.
- Tightened thresholds to reduce false positives: function length > 80 lines (was 40), args > 7 (was 5).

### 9. AI Issue Resolution with Side-by-Side Diff
- AI resolution drawer powered by configured OpenAI or Gemini API.
- Structured solution tabs:
  - **Side-by-Side Diff** — Monaco `DiffEditor` comparing original vs. AI-refactored code.
  - **Fixed Code** — full refactored file viewer with copy button.
  - **Fix Steps** — step-by-step refactoring recommendations.
  - **Summary & Impacts** — problem analysis and side-effect warnings.
- Fallback rule-based engine when no API key is configured.

### 10. Analysis History & Dashboard
- Persistent per-user analysis history stored in SQLite.
- Dashboard shows metrics: total analyses, latest repo, total files, high-risk count.
- Risk distribution donut chart and recent analyses history table.

---

## 📁 Project Structure

```text
Software_bug_prediction_and_resolver2.0/
│
├── frontend/                        # React + Vite TypeScript SPA
│   └── src/
│       ├── components/
│       │   ├── ai/AiResolution.tsx  # AI fix drawer with Monaco DiffView
│       │   ├── code/
│       │   │   ├── CodePreview.tsx  # Monaco editor with red line highlighting
│       │   │   └── CodeDiffView.tsx # Side-by-side Monaco DiffEditor
│       │   ├── common/
│       │   │   ├── Navbar.tsx       # Premium dark top navigation bar
│       │   │   └── ErrorBoundary.tsx
│       │   └── risk/RiskTable.tsx   # Ranked risk inventory table
│       ├── pages/
│       │   ├── Dashboard.tsx        # Metrics + history overview
│       │   ├── Analysis.tsx         # Repository analysis runner
│       │   ├── Settings.tsx         # LLM API key configuration
│       │   └── Login.tsx
│       ├── store/
│       │   ├── authStore.ts         # Zustand auth + persistent llmConfig
│       │   └── analysisStore.ts
│       └── services/api.ts          # Axios API client
│
├── backend/                         # FastAPI Python backend
│   ├── api/app.py                   # All handlers + per-repo calibration
│   ├── auth/                        # JWT security, password hashing
│   ├── database/db.py               # SQLite ORM & queries
│   └── services/
│       ├── ranking_service.py       # File ranking + risk level assignment
│       ├── suspicious_line_service.py  # AST + pattern bug detection
│       └── llm_service.py           # OpenAI / Gemini API + fallback engine
│
├── src/                             # Feature extraction engine
│   ├── extract_features.py          # Static + git metrics extractor
│   ├── analyzers/                   # Language-specific analyzers
│   ├── graph/                       # Dependency graph builder
│   └── repo/                        # Repo validator + temp clone util
│
├── models/                          # Trained ML model files
│   ├── xgboost.joblib
│   ├── random_forest.joblib
│   ├── logistic_regression.joblib
│   ├── scaler.joblib
│   └── feature_columns.json
│
├── data/                            # SQLite database storage
├── tests/                           # Unit test suites
├── requirements.txt                 # Python backend dependencies
├── start_backend.ps1                # PowerShell backend launcher
├── start_frontend.ps1               # PowerShell frontend launcher
└── README.md
```

---

## 🛠️ Technology Stack

### Backend
| Technology | Purpose |
|---|---|
| Python 3.10+ | Runtime |
| FastAPI | REST API framework |
| Uvicorn | ASGI server |
| Pydantic v2 | Request/response validation |
| SQLite + custom ORM | Persistent user data storage |
| PBKDF2 + JWT | Auth security |
| XGBoost, Random Forest, Logistic Regression | ML bug prediction |
| Scikit-learn, NumPy, Pandas | Feature processing & ML |
| Lizard, Radon | Cyclomatic complexity metrics |
| PyDriller | Git commit history mining |
| NetworkX | Dependency graph analysis |
| python-dotenv | Environment variable loading |

### Frontend
| Technology | Purpose |
|---|---|
| React 19 + TypeScript | UI framework |
| Vite | Build tool & dev server |
| TailwindCSS v4 | Utility-first styling |
| Zustand | Global state management (auth + LLM session) |
| Monaco Editor (`@monaco-editor/react`) | Code viewer + Diff editor |
| Framer Motion | UI animations & transitions |
| Recharts | Dashboard charts |
| Axios | HTTP API client |
| Lucide React | Icons |
| React Router DOM | Client-side routing |

---

## 💻 Installation & Setup

### Prerequisites
- Python 3.10+
- Node.js 18+

### 1. Clone the Repository
```bash
git clone <repo-url>
cd Software_bug_prediction_and_resolver2.0
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
JWT_SECRET=your-super-secret-key-here
OPENAI_API_KEY=          # Optional: can be configured per-user in Settings
GEMINI_API_KEY=          # Optional: can be configured per-user in Settings
```

### 3. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 4. Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

---

## 🚀 Running the Application

### Start the Backend (FastAPI)
```bash
uvicorn backend.main:app --reload --port 8000
```
Or use the helper script:
```bash
.\start_backend.ps1
```
API available at: `http://localhost:8000`  
Interactive docs: `http://localhost:8000/docs`

### Start the Frontend (React/Vite)
```bash
cd frontend
npm run dev
```
Or use the helper script:
```bash
.\start_frontend.ps1
```
App available at: `http://localhost:5173`

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Register a new user account |
| `POST` | `/auth/login` | Authenticate and receive JWT token |
| `POST` | `/auth/config` | Save LLM provider and API key for user |
| `POST` | `/analysis/run` | Run full ML analysis on a repository path or GitHub URL |
| `POST` | `/analysis/resolve` | Generate AI fix using user's saved LLM credentials |
| `GET`  | `/analysis/history/{user_id}` | Get analysis history list for a user |
| `GET`  | `/analysis/details/{analysis_id}` | Retrieve full analysis result data |
| `DELETE` | `/analysis/delete/{analysis_id}` | Delete a saved analysis record |
| `GET`  | `/analysis/file-content` | Fetch raw source file content by path |
| `GET`  | `/health` | Health check |

---

## 🧪 Running Tests

```bash
python -m unittest tests/test_upgraded_features.py
python -m unittest tests/test_pipeline.py
```

---

## 📝 Notes

- **Risk Calibration**: ML risk scores are calibrated per-repo using percentile normalization, ensuring scores reflect relative risk within the analyzed codebase rather than absolute model outputs. This prevents most files from showing "High" when git history data is unavailable.
- **LLM API Keys**: Keys can be stored server-side per user via `/auth/config`, or configured in `.env` for global fallback. The frontend persists the active key in Zustand session state.
- **Supported Languages**: Python, JavaScript, TypeScript, Java (feature extraction + syntax highlighting).
