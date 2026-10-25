# Emergency Response Bot AI

## Multi-Agent Emergency Coordination and Intelligent Routing Platform

Emergency Response Bot AI is an operations-grade emergency management and response coordination platform. It enables authorized human operators and dispatch teams to ingest incident reports, conduct automated multi-agent reasoning, score priority with transparent testable policies, match verified fleet resources while preventing allocation conflicts, and calculate road-network routing corridors using graph-based algorithms (Dijkstra).

---

## 1. System Architecture

The platform is designed around a multi-agent decision support architecture:

```
[ Incident Intake: Reporter / Public API ]
                   │
                   ▼
       [ Command Orchestrator ]
                   │
     ┌─────────────┼─────────────┬─────────────┐
     ▼             ▼             ▼             ▼
[ 1. Incident  [ 2. Priority  [ 3. Resource  [ 4. Route
   Analysis       Assessment     Coordination   Planning
    Agent ]        Agent ]        Agent ]       Agent ]
     │             │             │             │
     └─────────────┼─────────────┴─────────────┘
                   ▼
         [ 5. Communication Agent ]
                   │
                   ▼
[ Awaiting Authorized Operator Approval / Rejection ]
```

### The 6 Coordinated Agents:
1. **Incident Analysis Agent**: Ingests narrative reports, extracts structured facts (casualties, trapped occupants, chemical/fuel hazards), labels known uncertainties, flags missing information, and determines potential resource classes. Uses Gemini 2.5 Flash if `GEMINI_API_KEY` is configured, with a deterministic rule-based NLP extraction fallback.
2. **Priority Assessment Agent**: Computes an objective triage severity score (0–100) based on testable weights: Life Danger (40%), Casualty Scale (25%), Hazard Class (20%), and Uncertainty/Verification (15%). Recommends `CRITICAL`, `HIGH`, `MEDIUM`, or `LOW`. Explicitly labeled as decision support.
3. **Resource Coordination Agent**: Filters suitable response units (Ambulance, Fire unit, Police patrol, Rescue team, HazMat/General support), computes road corridor distances, ranks candidates, and identifies concurrency conflicts.
4. **Route Planning Agent**: Uses Dijkstra's graph shortest-path algorithm across an interconnected metropolitan road network. Enforces strict prerequisite checking: if incident coordinates are unverified or absent, safely aborts routing without inventing coordinates.
5. **Communication Agent**: Prepares operational alerts for operators and reporters, persists notification records, and pushes real-time WebSocket events.
6. **Command Center Orchestrator**: Executes the sequential workflow state machine (`RECEIVED -> VALIDATING -> ANALYZING -> ASSESSING_PRIORITY -> CHECKING_RESOURCES -> PLANNING_ROUTE -> PREPARING_NOTIFICATIONS -> AWAITING_OPERATOR_APPROVAL`), persists execution events and durations, and supports idempotent retries.

---

## 2. Key Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7, Lucide Icons, Leaflet interactive maps.
- **Full-Stack Runtime**: Express + Vite middlewares in TypeScript (`server.ts`) serving REST API (`/api/*`), WebSockets (`/ws`), and client SPA on port 3000.
- **Python Backend Engine**: Full Python FastAPI / SQLAlchemy project structure with models, schemas, repositories, agents, and unittest suite in `backend/`.
- **Database & Persistence**: File-backed atomic JSON database (`data/emergency_db.json`) and SQLite/PostgreSQL schemas with concurrency locks and audit logging.
- **Routing Engine**: Graph-based Dijkstra algorithm on metropolitan arterial road network graph with turn-by-turn road instructions and real travel-time weights.

---

## 3. Getting Started & Local Execution

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)

### Quick Start (Full-Stack Mode on Port 3000)
```bash
# 1. Install dependencies
npm install

# 2. Run automated test suite (verifies all 14 scenarios)
npm test

# 3. Start development server
npm run dev
```

The application will be live at `http://localhost:3000`.

### Running Backend Python Unit Tests
```bash
python3 -m unittest backend/tests/test_all_scenarios.py
```

### Seeding Demonstration Data
The database auto-seeds upon initial start. You can also re-seed at any time via:
```bash
python3 backend/scripts/seed_demo_data.py
```
Or click the **Reset Demo Data** button directly in the application sidebar.

---

## 4. Default Seeded Credentials

| Role | Email | Password | Scope |
|---|---|---|---|
| **Administrator** | `admin@emergency.gov` | `AdminPass2026!` | Full audit access, user management, resource fleet registration |
| **Operator** | `operator@emergency.gov` | `OperatorPass2026!` | Triage queue, resource approval/rejection, route dispatch |
| **Operator 2** | `sarah.lin@emergency.gov` | `OperatorPass2026!` | Fire & rescue coordination |
| **Reporter** | `citizen@metro.org` | `ReporterPass2026!` | Citizen incident reporting & personal tracking |

*(Quick-switch role buttons are also available on the Login screen and Sidebar for demonstration convenience).*

---

## 5. Verification of the 14 Mandatory Test Scenarios

The automated test suite (`npx tsx tests/run_scenarios.ts` and `python3 -m unittest backend/tests/test_all_scenarios.py`) verifies all 14 requirements:

1. **TEST 1**: Reporter submits valid incident -> Unique identifier `INC-2026-xxx` generated and persisted.
2. **TEST 2**: Unauthorized user attempts access to admin endpoint -> Blocked with HTTP 403 Forbidden.
3. **TEST 3**: Operator runs incident-analysis workflow -> Agent outputs, durations, and events persisted in database.
4. **TEST 4**: Incident lacks verified coordinates -> Route planning reports prerequisite failure without fabricating coordinates.
5. **TEST 5**: Two incidents compete for same resource -> Backend detects assignment conflict and rejects conflicting claim.
6. **TEST 6**: Agent failure handled safely -> Incident record preserved in database without loss.
7. **TEST 7**: Operator rejects resource recommendation -> Rejection status and mandatory reason recorded in audit log.
8. **TEST 8**: Dashboard metrics -> Real-time values calculated directly from database records.
9. **TEST 9**: Browser refresh / API fetch -> Persisted incident data remains available and intact.
10. **TEST 10**: Simultaneous assignment race-condition -> Concurrency lock prevents duplicate allocations.
11. **TEST 11**: Malformed structured output -> Schema validation catches error and returns fallback unassessed state.
12. **TEST 12**: Routing destination disconnected -> Engine reports unreachable status with explicit disclaimer notes.
13. **TEST 13**: Access policy isolation -> Reporter tokens restricted from accessing other reporters' restricted files.
14. **TEST 14**: Operator changes incident status -> Status transition logged in incident history and immutable audit trail.

---

## 6. Safety & Operational Constraints

1. **Decision Support Only**: Real emergency dispatch must never happen automatically. All real-world dispatch decisions strictly remain under authorized human operator control.
2. **No Fictional GPS Telemetry**: Simulated resources are explicitly designated as demonstration units in the Central Metro district.
3. **External AI Integration**: Optional Gemini API key can be set in `GEMINI_API_KEY`. When not present, the system defaults smoothly to the deterministic rule-based NLP engine.
