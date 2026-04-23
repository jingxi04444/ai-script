# AI Script Project Rules

## Project Overview
- This repository is an AI short-video script generation and replication project.
- `ui/` contains the project UI implementation.
- `ui/ui-front-web/` is the current frontend application, built with Vite + React.
- `ui/ui-admin-web/` is the current admin-side management application, built with Vite + React.
- `doc/` contains project documentation.
- `doc/request/` contains product requirement documents.
- `doc/request/前台需求.md` is the frontend user-side requirement document.
- `doc/request/后台需求.md` is the admin-side requirement document.

## Instruction Priority
- Requirement documents in `doc/request/` are the primary source of product behavior.
- When code behavior conflicts with requirement docs, follow the requirement docs unless the user explicitly says otherwise.
- For frontend tasks, prioritize `doc/request/前台需求.md`.
- For management, review, permissions, knowledge base, and operations tasks, prioritize `doc/request/后台需求.md`.
- If requirements are unclear, preserve the current implementation and ask one focused question instead of guessing.

## Directory Responsibilities
- Place user-side frontend page or component changes under `ui/ui-front-web/`.
- Place admin-side management UI changes under `ui/ui-admin-web/`.
- Do not treat `doc/` as runnable code; it is the project documentation source.
- Do not move or rename files in `doc/request/` unless the user explicitly requests documentation restructuring.
- When a new project, app, package, or major directory is added, update this `AGENTS.md` in the same task so the new structure and ownership rules stay current.

## Frontend Working Rules
- Follow the existing React + Vite structure already used in `ui/ui-front-web/src/` and `ui/ui-admin-web/src/`.
- Prefer small, local changes over broad refactors.
- Reuse existing UI components in `src/app/components/` and `src/app/components/ui/` before creating new ones.
- Keep step-oriented workflow naming consistent with the current product flow: global settings, selling points, viral analysis, storyboard, scene-role, dubbing, preview, analytics.
- Maintain Chinese product language in user-facing UI unless the user explicitly requests English or bilingual copy.
- Keep the dark visual style and existing layout direction unless a redesign is explicitly requested.
- For admin-side UI, keep permission boundaries, audit semantics, and brand isolation visible in the interface.

## Product Behavior Rules
- The product is workflow-driven; new UI or logic should fit the existing multi-step creation flow.
- Frontend changes should reflect the documented sequence in the requirement docs instead of inventing a parallel flow.
- Compliance and originality checks are core product capabilities; do not remove or weaken related UI, labels, or placeholders without explicit instruction.
- Distinguish clearly between user-side features and admin-side features.
- Do not place admin-side capability into the frontend user workflow unless the requirement doc calls for it.

## Editing Safety
- Do not modify `.env` or secret-like files unless the user explicitly asks.
- Do not delete existing assets, screenshots, or imported reference images unless the user asks.
- Do not overwrite documentation content in `doc/request/` when implementing UI tasks.
- If a task needs assumptions beyond the requirement docs, state the assumption clearly in the response.

## Verification
- For changes inside `ui/ui-front-web/`, use the frontend app's commands when verification is needed:
- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Build production bundle: `npm run build`
- For changes inside `ui/ui-admin-web/`, use the same verification commands:
- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Build production bundle: `npm run build`
- If the change affects visible UI flow, prefer at least a build check before finishing when the environment allows it.

## Collaboration Notes
- When describing work, reference affected requirement sections when useful.
- Keep summaries concise and implementation-oriented.
- If the user asks for rules, conventions, or project behavior guidance, update this `AGENTS.md` first unless they explicitly want a separate doc.
- Treat `AGENTS.md` as the source of truth for project-level working rules; keep it in sync as the repository structure evolves.
