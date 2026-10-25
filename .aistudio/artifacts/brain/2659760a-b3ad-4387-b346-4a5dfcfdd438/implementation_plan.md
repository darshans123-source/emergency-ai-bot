# Global Incident Search in AppLayout Header

Deliver an instant, keyboard-accessible global search bar in the top command header so emergency operators, administrators, and reporters can immediately locate and jump to any incident by its ID, street location, or title from anywhere in the platform.

### User Review & Critical Decisions

> [!IMPORTANT]
> Because the interactive configuration prompts were skipped, the plan adopts the recommended operational defaults below. Please review and confirm or request adjustments before implementation.

- **Instant Live Dropdown + Queue Navigation (Recommended Default)**: Typing in the header search bar triggers a debounced live dropdown displaying matching incidents immediately, while pressing `Enter` or clicking "View all matching in Incidents Queue" navigates to the full Incidents Queue filtered by the search query.
- **Direct Incident Workspace Navigation (Recommended Default)**: Selecting a result from the dropdown navigates directly to that incident's command workspace, with a secondary quick-action button on each row to center the incident on the Live Operations Map.
- **Keyboard Shortcut & Rich Result Metadata (Recommended Default)**: Includes a global `Cmd/Ctrl + K` (and `/`) keyboard shortcut to focus the search input, arrow-key navigation across results, and clear priority, status, and verified-coordinate indicators in each result row.

---

### 1. Overview & Core Concept

- **What It Does**: Embeds a persistent global search control in the top navigation bar that queries backend incident records in real time by Incident ID (e.g., `INC-2026-001`), location address (e.g., `Market St`, `Pier 14`), or incident title.
- **Target Audience / Persona**: Emergency dispatch operators and command administrators who need sub-second access to specific active incidents without leaving their current map, resource, or multi-agent view.
- **Key Value**: Eliminates multi-click navigation through the queue table during time-critical triage, allowing operators to jump straight to any incident workspace or map pin from any screen.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Quick Focus**: The operator clicks the search bar in the top header or presses `Cmd+K` / `Ctrl+K` from any screen.
  2. **Live Typeahead Search**: As the user types (e.g., `001` or `Market`), the input debounces (150ms) and queries the backend incident search endpoint, opening a structured results popover below the input.
  3. **Result Inspection & Selection**: Each result row displays the monospace Incident ID (`tabular-nums`), incident title, street address with GPS verification status, and semantic priority/status indicators.
  4. **Action Execution**:
     - Clicking a result row (or pressing `Enter` on a highlighted item) opens the Incident Details Workspace and closes the popover.
     - Clicking the secondary "View on Map" affordance navigates to the Live Operations Map centered on that incident.
     - Pressing `Enter` without a highlighted row (or clicking the footer link) navigates to the Incidents Queue with the search query pre-applied in the URL and filter state.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: High-density enterprise dispatch console adhering to the existing command-center visual language.
  - *Color Palette & Mood*: Crisp white header surface (`#FFFFFF`) with slate hairline borders (`#E2E8F0`), deep slate typography (`#111827`), muted secondary location metadata (`#64748B`), and high-intent blue focus rings (`#2563EB`). Semantic priority states use crimson (`#DC2626`) for Critical, amber (`#D97706`) for High, and blue (`#2563EB`) for Medium.
  - *Typography & Hierarchy*: Monospace tabular numerals (`font-mono tabular-nums`) for Incident IDs, timestamps, and keyboard shortcut hints (`⌘K`), paired with clean sans-serif titles and single-line truncated location strings.
  - *Component Styling & Layout*: Single-elevation header layout with a responsive centered/right-aligned search container (`w-64 sm:w-80 lg:w-96`), maintaining a single-row top bar with subtle 1px borders.
- **Interactive Feedback & Motion**:
  - Instant focus transition (`<= 150ms`), subtle inline loading spinner while fetching, keyboard highlight state (`Up` / `Down` arrows, `Escape` to dismiss), clear "No matching incidents found" empty state with a button to clear the query, and a one-click clear (`X`) button inside the input.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Server-Backed Debounced Search vs. Client-Only Filtering**
  - *Chosen Approach*: Debounced calls (150ms) to the existing backend `/api/incidents?search=...` endpoint with role-aware access control.
  - *Why*: Ensures search results always reflect the latest persisted database state, respects role-based isolation (reporters only search their permitted records while operators/admins search across the dispatch scope), and scales cleanly without downloading the entire database into the header.
  - *Alternatives Considered*: Caching all incidents in a global React context was passed over because concurrent updates or large incident histories would cause stale results.
- **Decision 2: URL Query Parameter Synchronization on Queue Page**
  - *Chosen Approach*: Synchronize the `?search=` URL query parameter with the Incidents Queue page filter state.
  - *Why*: Allows pressing `Enter` in the global header search bar to seamlessly deep-link to `/incidents?search=<query>` and pre-populate the queue table's search filter.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           AppLayout Shell                                │
│  ┌──────────────────┐  ┌──────────────────────────────────────────────┐  │
│  │     Sidebar      │  │            Top Header (Navbar)               │  │
│  │  (Navigation &   │  │  ┌──────────────┐  ┌──────────────────────┐  │  │
│  │   Role Switch)   │  │  │ Sector Scope │  │ Global Incident      │  │  │
│  │                  │  │  │ & WS Status  │  │ Search Bar (⌘K)      │  │  │
│  │                  │  │  └──────────────┘  └──────────┬───────────┘  │  │
│  │                  │  │                               │              │  │
│  │                  │  │                    ┌──────────▼───────────┐  │  │
│  │                  │  │                    │ Live Search Popover  │  │  │
│  │                  │  │                    │ • ID & Location Hit  │  │  │
│  │                  │  │                    │ • Priority & Status  │  │  │
│  │                  │  │                    │ • Keyboard Nav       │  │  │
│  │                  │  │                    └───────┬──────┬───────┘  │  │
│  └──────────────────┘  └────────────────────────────┼──────┼──────────┘  │
│                                                     │      │             │
│  ┌──────────────────────────────────────────────────▼──────▼──────────┐  │
│  │                        Main Viewport Outlet                        │  │
│  │   ┌───────────────────────────┐    ┌───────────────────────────┐   │  │
│  │   │ Incident Details Workspace│    │ Incidents Queue           │   │  │
│  │   │ (/incidents/:id)          │    │ (/incidents?search=query) │   │  │
│  │   └───────────────────────────┘    └───────────────────────────┘   │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ GET /api/incidents?search=<query>&limit=8
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                 Express Backend & Database Service                       │
│  • Matches Incident ID, Street Location Address, Notes, and Title        │
│  • Enforces Role-Based Visibility (Operator/Admin vs. Reporter)          │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - Uses the existing `Incident` entity (`id`, `title`, `category`, `priority`, `status`, `location.address`, `location.verified`, `createdAt`).
  - Enhances backend search matching so queries match against `id`, `location.address`, `location.notes`, `title`, and `description` with exact/prefix ID matches prioritized first.
- **Interactive Component & State Mapping**:
  - **Search Input State**: Tracks `searchQuery`, `isSearchOpen`, `isSearching`, `results: Incident[]`, and `activeIndex: number` (for keyboard arrow navigation).
  - **Keyboard Event Handlers**:
    - Global `keydown` listener for `Cmd+K` / `Ctrl+K` (and `/` when not focused inside an input/textarea) focuses the search input.
    - `ArrowDown` / `ArrowUp` cycles `activeIndex` through returned incident results.
    - `Enter` navigates to `/incidents/${results[activeIndex].id}` if an item is highlighted, or `/incidents?search=${encodeURIComponent(searchQuery)}` otherwise.
    - `Escape` closes the dropdown and blurs the input.
  - **Queue Filter Sync**: Updates the Incidents Queue view to read `?search=` from `useSearchParams()` so navigating from the global header search bar automatically filters the queue table.
