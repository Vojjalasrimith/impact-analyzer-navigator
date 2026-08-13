# Implementation Plan — AI Project Dependency Navigator

## POC Goal

Build a lightweight developer tool where an interviewer can dynamically create, modify, and delete project entities and relationships, then ask:

> What could be affected if I change this service?

The system should demonstrate:

**Dynamic Graph → CognoDB Retrieval → Dependency Traversal → Gemini Reasoning → Explainable Impact Analysis**

### Stack

- Frontend: React + React Flow
- Backend: Node.js + Express
- MongoDB: basic entity/application data
- CognoDB Cloud: dependency/context graph
- Gemini API: reasoning and explanation

### Scope Constraints

Do NOT build:

- Authentication
- Authorization
- User management
- Complex dashboards
- Real-time collaboration
- File uploads
- Microservices
- CI/CD
- Vector database
- LLM fine-tuning
- Advanced graph editor
- Complex MongoDB schema

The interviewer must be able to add new data and relationships without changing seed code.

---

# Phase 0 — Final Scope & Architecture

## Goal

Freeze the MVP and establish the architecture before implementation.

### Final User Flow

```text
Open App
   ↓
Graph Management
   ↓
Add / Edit / Delete Entities
   ↓
Add / Delete Relationships
   ↓
Graph updates
   ↓
Select Service
   ↓
Analyze Impact
   ↓
Node API
   ↓
CognoDB Graph Traversal
   ↓
Build structured context
   ↓
Gemini
   ↓
Impact Analysis
   ↓
React UI
```

### UI

Keep only two primary areas:

1. Graph Management
2. Impact Analysis

### Backend boundaries

```text
React
  ↓ REST
Node + Express
  ├── MongoDB
  ├── CognoDB
  └── Gemini
```

## Prompt

```text
You are helping me build a 30-hour POC called "AI Project Dependency Navigator".

The goal is to build a very small developer tool where an interviewer can dynamically add, edit, and delete project entities and relationships, visualize the dependency graph, select a service, and run an AI-powered impact analysis.

Tech stack:
- React
- React Flow
- Node.js
- Express
- MongoDB
- CognoDB Cloud
- Gemini API

Core flow:
React → Node/Express → CognoDB traversal → structured graph context → Gemini → impact analysis → React.

The interviewer must be able to add new entities and relationships through the UI. The system must not depend only on hardcoded seed data.

For this phase, do NOT write implementation code yet.

Instead:
1. Propose a minimal architecture.
2. Define the frontend/backend responsibilities.
3. Define the boundaries between MongoDB, CognoDB, and Gemini.
4. Identify the minimum APIs needed.
5. Identify what should explicitly remain out of scope.
6. Keep every decision optimized for a 30-hour POC.

Do not introduce authentication, microservices, vector databases, advanced graph editing, or unnecessary abstractions.
```

---

# Phase 1 — Project Setup

## Goal

Get frontend, backend, MongoDB, and environment configuration working.

### Backend Structure

```text
backend/
├── src/
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   ├── repositories/
│   ├── models/
│   ├── config/
│   ├── utils/
│   └── app.js
├── .env
├── package.json
└── server.js
```

### Frontend Structure

```text
frontend/
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── services/
│   ├── types/
│   └── utils/
└── package.json
```

### First API

```http
GET /api/health
```

Expected:

```json
{
  "status": "ok"
}
```

## Prompt

```text
Implement Phase 1 of the AI Project Dependency Navigator.

Create the frontend and backend foundations for the existing project.

Requirements:

Backend:
- Node.js + Express
- Clean but lightweight folder structure
- Environment variable support
- MongoDB connection
- CORS
- Centralized basic error middleware
- GET /api/health endpoint
- Keep architecture simple; do not over-engineer repositories or dependency injection.

Frontend:
- React
- React Flow installed and ready
- Basic application layout
- API service/client abstraction
- Loading and error handling foundations
- Connect to the backend health endpoint

Use the project's existing package manager and conventions if they already exist.

Do not implement graph logic, CRUD, Gemini, or CognoDB yet.

At the end:
1. Show the files created/modified.
2. Explain how to run frontend and backend.
3. Verify the frontend can call GET /api/health.
4. Do not add unnecessary dependencies.
```

---

# Phase 2 — Define the Data Model

## Goal

Create the smallest possible entity model.

### Entity Types

```text
PROJECT
FEATURE
SERVICE
DEVELOPER
```

### Relationship Types

```text
HAS_FEATURE
IMPLEMENTED_BY
DEPENDS_ON
OWNED_BY
```

### Valid Relationship Mapping

```text
PROJECT
  └── HAS_FEATURE → FEATURE

FEATURE
  └── IMPLEMENTED_BY → SERVICE

SERVICE
  ├── DEPENDS_ON → SERVICE
  └── OWNED_BY → DEVELOPER
```

MongoDB stores basic entity information.

CognoDB stores graph relationships.

## Prompt

```text
Implement Phase 2 of the AI Project Dependency Navigator.

Define the minimal data model for:

Entities:
- PROJECT
- FEATURE
- SERVICE
- DEVELOPER

Relationships:
- HAS_FEATURE
- IMPLEMENTED_BY
- DEPENDS_ON
- OWNED_BY

MongoDB should store basic entity information such as:
- id
- type
- name
- description
- timestamps if useful

CognoDB will be responsible for graph relationships and graph traversal.

Define validation for valid relationship combinations:

PROJECT -> HAS_FEATURE -> FEATURE
FEATURE -> IMPLEMENTED_BY -> SERVICE
SERVICE -> DEPENDS_ON -> SERVICE
SERVICE -> OWNED_BY -> DEVELOPER

Do not create four complicated MongoDB schemas unless the existing project requires them. Prefer a simple entities collection/model.

Implement:
1. Entity type constants/enums.
2. Relationship type constants/enums.
3. Validation helpers.
4. Minimal MongoDB entity model/schema.
5. Type definitions/interfaces where appropriate.

Keep the implementation small and easy to understand.

Do not implement REST endpoints yet.
```

---

# Phase 3 — CognoDB Integration

## Goal

Integrate CognoDB and prove that graph creation/retrieval works before building the complete UI.

### Seed Dataset

Project:

```text
E-Commerce Platform
```

Features:

```text
Checkout
Payment
Order Tracking
Notifications
```

Services:

```text
Order Service
Payment Service
Notification Service
Shipping Service
```

Developers:

```text
Alice
Bob
Charlie
```

Relationships:

```text
Project
 ├── HAS_FEATURE → Checkout
 ├── HAS_FEATURE → Payment
 ├── HAS_FEATURE → Order Tracking
 └── HAS_FEATURE → Notifications

Checkout
 └── IMPLEMENTED_BY → Order Service

Payment
 └── IMPLEMENTED_BY → Payment Service

Order Tracking
 └── IMPLEMENTED_BY → Shipping Service

Notifications
 └── IMPLEMENTED_BY → Notification Service

Order Service
 └── DEPENDS_ON → Payment Service

Shipping Service
 └── DEPENDS_ON → Order Service

Notification Service
 └── DEPENDS_ON → Payment Service

Payment Service
 └── OWNED_BY → Alice

Order Service
 └── OWNED_BY → Bob
```

## Prompt

```text
Implement Phase 3 of the AI Project Dependency Navigator.

Integrate CognoDB Cloud into the backend.

Important:
- First inspect the current CognoDB SDK/API documentation or integration already available in the project.
- Do not invent CognoDB API methods.
- Keep all CognoDB-specific code isolated inside a dedicated service such as cognoService.js.
- Controllers must not contain CognoDB-specific query code.

The CognoDB service should expose a small interface such as:
- createNode/entity representation if required by the chosen CognoDB model
- deleteNode
- createRelationship
- deleteRelationship
- getGraph
- findEntity
- traverseDependencies

Use the actual CognoDB API/SDK syntax available in the project.

Seed the following small graph:

Project:
E-Commerce Platform

Features:
Checkout
Payment
Order Tracking
Notifications

Services:
Order Service
Payment Service
Notification Service
Shipping Service

Developers:
Alice
Bob
Charlie

Relationships:
Project HAS_FEATURE Checkout
Project HAS_FEATURE Payment
Project HAS_FEATURE Order Tracking
Project HAS_FEATURE Notifications

Checkout IMPLEMENTED_BY Order Service
Payment IMPLEMENTED_BY Payment Service
Order Tracking IMPLEMENTED_BY Shipping Service
Notifications IMPLEMENTED_BY Notification Service

Order Service DEPENDS_ON Payment Service
Shipping Service DEPENDS_ON Order Service
Notification Service DEPENDS_ON Payment Service

Payment Service OWNED_BY Alice
Order Service OWNED_BY Bob

Before building any frontend UI, verify that the backend can:
1. Create the graph.
2. Retrieve the graph.
3. Create a new test entity.
4. Create a test relationship.
5. Delete the relationship.
6. Delete the entity.

Most importantly, prove that graph data can be changed without changing seed code.

Do not implement Gemini yet.
```

---

# Phase 4 — Entity APIs

## Goal

Allow the UI/interviewer to dynamically manage entities.

### APIs

```http
POST   /api/entities
GET    /api/entities
GET    /api/entities/:id
PATCH  /api/entities/:id
DELETE /api/entities/:id
```

Example:

```json
{
  "type": "SERVICE",
  "name": "Fraud Detection Service",
  "description": "Detects fraudulent transactions"
}
```

## Prompt

```text
Implement Phase 4 of the AI Project Dependency Navigator.

Build lightweight REST APIs for entity CRUD.

Endpoints:

POST   /api/entities
GET    /api/entities
GET    /api/entities/:id
PATCH  /api/entities/:id
DELETE /api/entities/:id

Entity types:
- PROJECT
- FEATURE
- SERVICE
- DEVELOPER

Requirements:
- Validate entity type.
- Require a non-empty name.
- Return appropriate HTTP status codes.
- Return clear error messages.
- Store basic entity data in MongoDB.
- If the graph representation in CognoDB requires a corresponding node, keep MongoDB and CognoDB synchronization inside the service layer.
- Do not put database logic directly in routes.
- Keep controllers thin.
- Do not build authentication or authorization.

When deleting an entity:
- Also remove its associated graph relationships from CognoDB so orphaned edges are not left behind.

Provide example curl/API requests for each endpoint.

Do not build the frontend yet.
```

---

# Phase 5 — Relationship APIs

## Goal

Allow the interviewer to dynamically modify graph relationships.

### APIs

```http
POST   /api/relationships
GET    /api/relationships
DELETE /api/relationships/:id
```

Example:

```json
{
  "from": "fraud-service-id",
  "type": "DEPENDS_ON",
  "to": "payment-service-id"
}
```

## Prompt

```text
Implement Phase 5 of the AI Project Dependency Navigator.

Create lightweight relationship APIs:

POST   /api/relationships
GET    /api/relationships
DELETE /api/relationships/:id

Relationship types:
- HAS_FEATURE
- IMPLEMENTED_BY
- DEPENDS_ON
- OWNED_BY

Validate relationship combinations:

PROJECT -> HAS_FEATURE -> FEATURE
FEATURE -> IMPLEMENTED_BY -> SERVICE
SERVICE -> DEPENDS_ON -> SERVICE
SERVICE -> OWNED_BY -> DEVELOPER

Requirements:
- Validate that both source and target entities exist.
- Validate the relationship type.
- Reject invalid source/target combinations.
- Prevent duplicate relationships where appropriate.
- Store/create relationships in CognoDB.
- If relationship metadata must also exist in MongoDB for API management, keep it minimal.
- Delete relationships from CognoDB.
- Return clear HTTP errors.

Do not implement relationship editing. Delete + recreate is enough for the POC.

Keep routes/controllers/services simple.

Do not modify the frontend yet.
```

---

# Phase 6 — Graph API

## Goal

Provide one frontend-friendly graph representation.

### API

```http
GET /api/graph
```

Response:

```json
{
  "nodes": [
    {
      "id": "payment",
      "type": "SERVICE",
      "label": "Payment Service"
    }
  ],
  "edges": [
    {
      "id": "order-payment",
      "source": "order",
      "target": "payment",
      "label": "DEPENDS_ON"
    }
  ]
}
```

## Prompt

```text
Implement Phase 6 of the AI Project Dependency Navigator.

Create:

GET /api/graph

The endpoint should retrieve the current graph from the backend/CognoDB and transform it into a frontend-friendly structure.

Return:

{
  "nodes": [
    {
      "id": "...",
      "type": "SERVICE|FEATURE|PROJECT|DEVELOPER",
      "label": "..."
    }
  ],
  "edges": [
    {
      "id": "...",
      "source": "...",
      "target": "...",
      "label": "DEPENDS_ON"
    }
  ]
}

Requirements:
- React Flow should not need to know anything about CognoDB.
- Keep CognoDB-specific transformations in the backend.
- Do not calculate AI impact yet.
- Do not add pagination; the POC graph is intentionally small.
- Ensure newly created/deleted entities and relationships appear in the response immediately.

Add basic error handling.
```

---

# Phase 7 — Frontend Graph Visualization

## Goal

Build the main graph screen.

### UI

```text
AI Project Dependency Navigator

[+ Add Entity] [+ Add Relationship]

          React Flow Graph
```

## Prompt

```text
Implement Phase 7 of the AI Project Dependency Navigator frontend.

Build the main Graph Management screen using React Flow.

Requirements:
- Load GET /api/graph when the screen opens.
- Render nodes and edges.
- Show entity labels.
- Show relationship labels.
- Support pan and zoom.
- Add fit-to-view.
- Allow node selection.
- Allow edge selection.
- Keep the UI clean and minimal.

Use simple visual differentiation between:
- Project
- Feature
- Service
- Developer

Do not build advanced drag-and-drop graph editing.
Do not allow users to draw arbitrary edges directly on the canvas.
Relationships will be created using a form in a later phase.

Create a small API service module for graph requests.

Keep React Flow state simple.

At this phase, clicking a node should only select it and expose its basic information. Do not implement AI analysis yet.
```

---

# Phase 8 — Entity CRUD UI

## Goal

Allow the interviewer to create/edit/delete entities from the graph UI.

### Add Entity

```text
Type
Name
Description
[Create]
```

### Node actions

```text
[Edit] [Delete]
```

## Prompt

```text
Implement Phase 8 of the AI Project Dependency Navigator frontend.

Add entity management to the existing Graph screen.

Add:
- "+ Add Entity" button.
- Reusable Add/Edit Entity modal.
- Entity type selector:
  PROJECT
  FEATURE
  SERVICE
  DEVELOPER
- Name field.
- Description field.

Node selection should show a small details panel/popover containing:
- Name
- Type
- Description
- Edit
- Delete

API usage:
POST   /api/entities
PATCH  /api/entities/:id
DELETE /api/entities/:id

After every successful mutation:
- Close the modal if appropriate.
- Refresh GET /api/graph.
- Show a small success/error state.

Delete should require a simple confirmation.

Do not create separate pages for Projects, Features, Services, and Developers.

Do not build advanced forms, validation libraries, or state management unless already present in the project.

The goal is to make dynamic graph modification easy for an interviewer.
```

---

# Phase 9 — Relationship Management UI

## Goal

Allow the interviewer to create/delete graph relationships.

### Form

```text
From
Relationship
To
```

## Prompt

```text
Implement Phase 9 of the AI Project Dependency Navigator frontend.

Add relationship management to the Graph screen.

Add:
- "+ Add Relationship" button.
- Relationship modal with:
  - From entity dropdown
  - Relationship type dropdown
  - To entity dropdown

Relationship types:
- HAS_FEATURE
- IMPLEMENTED_BY
- DEPENDS_ON
- OWNED_BY

Use GET /api/entities to populate dropdowns.

When possible, filter valid source/target entity choices based on the selected relationship type.

Submit using:
POST /api/relationships

When an edge is selected:
- Show its source, relationship type, and target.
- Provide "Delete Relationship".

Delete using:
DELETE /api/relationships/:id

After successful mutation:
- Refresh the graph.
- Close the modal/panel.
- Show a small error message if something fails.

Do not build a dedicated relationship-management page.

Do not implement edge dragging or visual graph editing.

The interviewer should be able to create a new service and connect it to an existing service within a few clicks.
```

---

# Phase 10 — Dependency Traversal

## Goal

Implement the core graph reasoning before involving Gemini.

Example:

```text
Risk Service
     ↓
Fraud Service
     ↓
Payment Service
```

When Payment Service is changed, discover:

```text
Fraud Service
Risk Service
```

and preserve paths.

## Prompt

```text
Implement Phase 10 of the AI Project Dependency Navigator backend.

Build the dependency traversal logic independently of Gemini.

The target use case is:

"What could be affected if I change Payment Service?"

Given a target service, traverse the graph to find services that depend on it, including multi-level dependencies.

Example:

Risk Service
  DEPENDS_ON
Fraud Service
  DEPENDS_ON
Payment Service

If Payment Service is the target, the traversal should discover:
- Fraud Service
- Risk Service

It must also preserve the actual dependency paths, for example:

[
  ["Fraud Service", "Payment Service"],
  ["Risk Service", "Fraud Service", "Payment Service"]
]

Requirements:
- Put traversal logic in a dedicated impact/dependency service.
- Do not put traversal logic in Express routes.
- Avoid infinite loops if the graph contains cycles.
- Avoid duplicate nodes and duplicate paths where practical.
- Define a reasonable maximum traversal depth for POC safety.
- Keep traversal independent from Gemini.

First inspect how the CognoDB graph query/traversal API actually works and use the correct API syntax.

Return a structured internal result containing:
- target service
- affected services
- dependency paths

Do not generate AI responses yet.
```

---

# Phase 11 — Build Impact Context

## Goal

Convert raw graph traversal into structured facts that Gemini can consume.

### Example

```json
{
  "target": "Payment Service",
  "affectedServices": [
    "Order Service",
    "Shipping Service",
    "Notification Service"
  ],
  "affectedFeatures": [
    "Checkout",
    "Order Tracking",
    "Notifications"
  ],
  "developers": [
    "Alice",
    "Bob"
  ],
  "paths": [
    [
      "Checkout",
      "Order Service",
      "Payment Service"
    ]
  ]
}
```

## Prompt

```text
Implement Phase 11 of the AI Project Dependency Navigator backend.

Create an impact context builder that takes a target service and the dependency traversal result and produces structured facts for Gemini.

The context must contain:
- target service
- affected services
- affected features
- developers/owners
- dependency paths

Use the graph relationships to determine:
1. Which services depend on the target.
2. Which features are implemented by those affected services.
3. Which developers own the affected services.
4. The exact dependency paths explaining why each item is affected.

Important architecture rule:

CognoDB determines factual graph relationships.
This service prepares those facts.
Gemini should only explain/reason over those supplied facts.

Do not ask Gemini to discover relationships.

Return a clean JSON object.

Also make sure the target service itself is not incorrectly listed as an affected dependent service.

Add a small unit-testable function around context construction if practical.
```

---

# Phase 12 — Gemini Integration

## Goal

Use Gemini to explain the graph facts.

### AI should return

- Summary
- Risk
- Affected services
- Affected features
- Developers
- Recommended tests
- Explanation

## Prompt

```text
Implement Phase 12 of the AI Project Dependency Navigator backend.

Integrate the Gemini API using the project's configured API key/environment variables.

Create a dedicated geminiService.

Gemini will receive ONLY structured graph context generated by the backend.

Prompt requirements:
- Explain the potential impact of changing the target service.
- Identify risk as LOW, MEDIUM, or HIGH.
- Explain affected services.
- Explain affected features.
- Mention developers involved.
- Recommend relevant tests.
- Explain the dependency paths.
- Do not invent services, features, developers, relationships, or dependencies.
- If the supplied graph context is insufficient, explicitly say that.
- Treat graph context as factual source data.

Prefer structured JSON output if supported by the chosen Gemini API.

Expected output shape:

{
  "summary": "...",
  "risk": "HIGH",
  "affectedServices": [],
  "affectedFeatures": [],
  "developers": [],
  "recommendedTests": [],
  "explanations": []
}

Do not let Gemini perform graph traversal.

Add basic error handling for API failures and malformed responses.

Do not build the frontend yet.
```

---

# Phase 13 — Impact Analysis API

## Goal

Expose the complete backend flow through one endpoint.

### API

```http
POST /api/impact-analysis
```

Request:

```json
{
  "entityId": "payment-service"
}
```

Flow:

```text
Request
  ↓
Validate service
  ↓
CognoDB traversal
  ↓
Build impact context
  ↓
Gemini
  ↓
Return structured result
```

## Prompt

```text
Implement Phase 13 of the AI Project Dependency Navigator backend.

Create:

POST /api/impact-analysis

Request:

{
  "entityId": "..."
}

Backend flow must be:

1. Validate that the entity exists.
2. Validate that the target is a SERVICE.
3. Retrieve/traverse the dependency graph using CognoDB.
4. Build the structured impact context.
5. Send the context to Gemini.
6. Return the structured impact analysis.

Expected response:

{
  "target": "...",
  "risk": "HIGH",
  "summary": "...",
  "affectedServices": [],
  "affectedFeatures": [],
  "developers": [],
  "paths": [],
  "recommendedTests": [],
  "explanations": []
}

Keep each responsibility in its service:
- Controller: HTTP handling.
- Impact service: traversal/context.
- CognoDB service: graph operations.
- Gemini service: AI reasoning.

Handle:
- Invalid entity ID.
- Non-service target.
- CognoDB failure.
- Gemini failure.

Do not add streaming or chat functionality.
```

---

# Phase 14 — Impact Analysis UI

## Goal

Allow the interviewer to select a service and analyze its impact.

### UI

```text
Payment Service

[Analyze Impact]
```

Then show:

```text
Risk: HIGH

Affected Services
Affected Features
Developers
Recommended Tests
```

## Prompt

```text
Implement Phase 14 of the AI Project Dependency Navigator frontend.

When a SERVICE node is selected, show:

- Service name
- Service description
- Owner if available
- "Analyze Impact" button

When the button is clicked:

POST /api/impact-analysis

{
  "entityId": "<selected service id>"
}

Show a loading state such as:
"Analyzing dependency graph..."

Then render:
- Risk
- Summary
- Affected Services
- Affected Features
- Developers
- Recommended Tests
- Explanations

Keep the impact result in a right-side panel or clean modal/drawer so the graph remains visible.

The user should be able to compare the result with the graph.

Handle:
- Loading
- API error
- Empty impact
- Successful analysis

Do not build a generic AI chat interface.

Keep the UI focused on impact analysis.
```

---

# Phase 15 — Explainability

## Goal

Show exactly why something is affected.

Example:

```text
Why is Checkout affected?

Checkout
   ↓
Order Service
   ↓
Payment Service
```

## Prompt

```text
Implement Phase 15 of the AI Project Dependency Navigator.

Add explainability to the impact analysis UI.

For every affected feature/service where a path exists, show the dependency path explaining the impact.

Example:

Why is Checkout affected?

Checkout
  ↓
Order Service
  ↓
Payment Service

Why is Order Tracking affected?

Order Tracking
  ↓
Shipping Service
  ↓
Order Service
  ↓
Payment Service

Use the backend-provided paths as the source of truth.

Do not ask Gemini to invent or reconstruct paths.

If practical with the existing React Flow implementation:
- Make a path clickable.
- Highlight the corresponding nodes and edges in the graph.

If path highlighting becomes time-consuming, keep the path as a simple visual list and do not expand scope.

The primary goal is to demonstrate that the AI explanation is backed by an actual graph path.
```

---

# Phase 16 — Dynamic Data Testing

## Goal

Prove that the system is not hardcoded.

### Test Scenario

Start:

```text
Order Service
      ↓
Payment Service
```

Add:

```text
Fraud Detection Service
      ↓
Payment Service
```

Then:

```text
Risk Service
      ↓
Fraud Detection Service
```

Analyze Payment Service after each change.

## Prompt

```text
Implement Phase 16 as an end-to-end validation phase.

Do not add new product features.

Verify that the application supports dynamic interviewer testing.

Test this exact scenario:

1. Analyze Payment Service using the seeded graph.
2. Create:
   Fraud Detection Service
3. Create:
   Fraud Detection Service DEPENDS_ON Payment Service
4. Analyze Payment Service again.
5. Verify Fraud Detection Service appears in the impact result.
6. Create:
   Risk Service
7. Create:
   Risk Service DEPENDS_ON Fraud Detection Service
8. Analyze Payment Service again.
9. Verify the multi-level path is discovered:
   Risk Service → Fraud Detection Service → Payment Service
10. Delete the Risk → Fraud Detection relationship.
11. Analyze again and verify the Risk Service impact disappears.
12. Delete Fraud Detection Service.
13. Verify its relationships are removed and the graph remains consistent.

Fix any bugs discovered in:
- MongoDB synchronization
- CognoDB synchronization
- graph refresh
- traversal
- impact context
- Gemini output
- UI state

Do not add unrelated features.
```

---

# Phase 17 — Error Handling

## Goal

Make the demo resilient.

Handle:

```text
404 Entity not found
400 Invalid relationship
400 Duplicate relationship
503 CognoDB unavailable
503 Gemini unavailable
```

## Prompt

```text
Implement Phase 17 of the AI Project Dependency Navigator.

Add lightweight production-like error handling suitable for a POC.

Backend:
- Centralized Express error handling.
- Consistent JSON error responses.
- Validate request bodies.
- Return correct HTTP status codes.
- Handle CognoDB failures.
- Handle MongoDB failures.
- Handle Gemini failures.
- Avoid leaking API keys or internal credentials.

Frontend:
- Show clear API error messages.
- Show loading states.
- Disable mutation/analysis buttons during requests.
- Prevent duplicate submissions.
- Handle empty graph and empty impact results.

Do not introduce a large error-handling framework.

Keep the implementation simple and readable.
```

---

# Phase 18 — Demo Polish

## Goal

Improve usability without expanding functionality.

### Add

- Empty states
- Loading states
- Error messages
- Delete confirmation
- Fit graph
- Clean impact panel
- Simple node styling

### Avoid

- Animations
- Dashboards
- Complex navigation
- Theme systems
- Advanced filtering

## Prompt

```text
Implement Phase 18 of the AI Project Dependency Navigator.

Polish the existing POC without adding new product functionality.

Improve:
- Empty graph state.
- Empty impact state.
- Loading indicators.
- API error messages.
- Delete confirmation.
- Fit-to-view graph button.
- Node/edge readability.
- Clear selected-node state.
- Clean impact-analysis panel.
- Clear labels for entity and relationship types.

Keep the UI professional but intentionally simple.

Do NOT add:
- authentication
- dashboards
- animations
- advanced filters
- complex navigation
- real-time features
- advanced graph editing

Prioritize clarity and demo reliability over visual complexity.
```

---

# Phase 19 — End-to-End Testing

## Goal

Validate the complete application.

## Test Matrix

### Initial graph

```text
Payment Service
```

Expected impact:

```text
Order Service
Shipping Service
Notification Service
```

### Add new service

```text
Fraud Detection Service
```

Relationship:

```text
Fraud Detection → DEPENDS_ON → Payment
```

Expected new impact:

```text
Fraud Detection Service
```

### Add multi-level dependency

```text
Risk Service
   ↓
Fraud Detection
   ↓
Payment
```

Expected path:

```text
Risk Service
   ↓
Fraud Detection Service
   ↓
Payment Service
```

### Delete relationship

Risk should disappear from the impact chain.

### Delete entity

Its relationships should disappear too.

## Prompt

```text
Perform Phase 19: complete end-to-end validation of the AI Project Dependency Navigator.

Do not add features.

Test the full workflow:

1. Open application.
2. Load the seeded graph.
3. Verify all entities and relationships render.
4. Select Payment Service.
5. Run impact analysis.
6. Verify affected services/features/developers are sensible.
7. Verify dependency paths are shown.
8. Create a new service from the UI.
9. Create a DEPENDS_ON relationship from the UI.
10. Re-run impact analysis.
11. Verify the new service is dynamically included.
12. Add a second-level dependency.
13. Verify multi-level traversal.
14. Delete a relationship.
15. Verify the impact changes.
16. Delete an entity.
17. Verify its relationships are removed.
18. Refresh the browser.
19. Verify data persists correctly.
20. Test invalid relationship combinations.
21. Test missing entity IDs.
22. Test Gemini failure handling if practical.

Fix only issues related to the existing MVP.

At the end, provide:
- Bugs fixed.
- Remaining known limitations.
- Exact steps for the final demo.
```

---

# Phase 20 — Final Demo Preparation

## Goal

Prepare a repeatable 5–10 minute interviewer demonstration.

### Demo Sequence

```text
1. Open graph
       ↓
2. Explain Project / Feature / Service / Developer
       ↓
3. Show Payment → Order dependency
       ↓
4. Analyze Payment Service
       ↓
5. Show impact
       ↓
6. Show exact graph paths
       ↓
7. Add Fraud Detection Service
       ↓
8. Connect Fraud → Payment
       ↓
9. Analyze Payment again
       ↓
10. Show new impact
       ↓
11. Add Risk → Fraud
       ↓
12. Analyze again
       ↓
13. Show multi-level impact
```

## Prompt

```text
Prepare Phase 20: final demo readiness for the AI Project Dependency Navigator.

Do not modify the product unless necessary to fix a demo-blocking issue.

Create a concise demo checklist based on this flow:

1. Open the application.
2. Show the existing dependency graph.
3. Explain the entity types and relationship types.
4. Select Payment Service.
5. Run impact analysis.
6. Explain how CognoDB provides dependency relationships.
7. Explain how the backend builds structured context.
8. Explain that Gemini reasons over that context rather than discovering relationships.
9. Create a new Fraud Detection Service through the UI.
10. Create Fraud Detection Service DEPENDS_ON Payment Service.
11. Re-run impact analysis.
12. Demonstrate that the new service appears automatically.
13. Add Risk Service DEPENDS_ON Fraud Detection Service.
14. Re-run analysis.
15. Demonstrate the multi-level dependency path.
16. Optionally delete a relationship and demonstrate that the result changes.

Also provide:
- A 2-minute architecture explanation.
- A 5-minute complete demo flow.
- A list of likely interviewer questions and concise technical answers.
- A list of known POC limitations that can be honestly explained.

Keep the final demo focused on:
Dynamic graph → CognoDB traversal → structured context → Gemini reasoning → explainable impact.
```

---

# Final 30-Hour Execution Order

Use these phases in this order:

```text
PHASE 0
Scope + Architecture
       ↓
PHASE 1
Project Setup
       ↓
PHASE 2
Data Model
       ↓
PHASE 3
CognoDB Integration
       ↓
PHASE 4
Entity APIs
       ↓
PHASE 5
Relationship APIs
       ↓
PHASE 6
Graph API
       ↓
PHASE 7
React Flow
       ↓
PHASE 8
Entity CRUD UI
       ↓
PHASE 9
Relationship UI
       ↓
PHASE 10
Dependency Traversal
       ↓
PHASE 11
Impact Context
       ↓
PHASE 12
Gemini
       ↓
PHASE 13
Impact API
       ↓
PHASE 14
Impact UI
       ↓
PHASE 15
Explainability
       ↓
PHASE 16
Dynamic Testing
       ↓
PHASE 17
Error Handling
       ↓
PHASE 18
Polish
       ↓
PHASE 19
E2E Testing
       ↓
PHASE 20
Final Demo
```

## Critical Milestones

If you're working phase-by-phase, stop and verify these milestones:

### Milestone 1

```text
Phase 3 complete

CognoDB graph works independently.
```

### Milestone 2

```text
Phase 6 complete

Frontend can retrieve the live graph.
```

### Milestone 3

```text
Phase 9 complete

Interviewer can modify the graph without code changes.
```

### Milestone 4

```text
Phase 11 complete

Backend can calculate factual impact context without Gemini.
```

### Milestone 5

```text
Phase 14 complete

End-to-end AI impact analysis works.
```

### Milestone 6

```text
Phase 16 complete

Interviewer can add NEW data and the AI result changes accordingly.
```

**Milestone 6 is the most important one for your interview.**

If time becomes tight, prioritize:

```text
Graph CRUD
     ↓
CognoDB
     ↓
Traversal
     ↓
Gemini
     ↓
Impact UI
```

and sacrifice visual polish before sacrificing dynamic graph functionality.
