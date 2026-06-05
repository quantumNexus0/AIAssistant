# Nyaya AI Legal Assistant

A full-stack Indian legal assistant application built with a React/Vite frontend and a FastAPI backend. Nyaya AI helps lawyers, litigants, and legal researchers with case analysis, document drafting, legal research, and evidence tracking.

## What this project does

- **AI Legal Chat** for Indian legal guidance and Q&A
- **Case Analysis** for structured assessment of case facts, evidence, witnesses, and reliefs
- **Document Drafting** for court-ready plaints, notices, applications, and affidavits
- **Attachment support** for uploading evidence files and supporting documents
- **Persistent storage** for analysis reports and drafted documents in MongoDB
- **Ollama-based AI** integration for legal reasoning and drafting

## Key improvements in this version

- Added **file upload support** for the Case Analyzer Materials & Claims section
- Added **supporting document upload** for Document Drafting Assistant
- Saved document attachments alongside MongoDB drafts
- Added a **download draft** button for generated documents
- Improved README and developer setup instructions

## Project structure

- `backend/`
  - `app/main.py` — FastAPI entry point
  - `app/config.py` — environment configuration
  - `app/database.py` — MongoDB connection helper
  - `app/routers/` — REST API endpoints for AI, cases, and document storage
- `frontend/`
  - `src/` — React application source
  - `src/components/` — UI components for each app tab
  - `App.jsx` — root application wrapper and tab router
  - `App.css` — styling

## Architecture

The app consists of:

- React/Vite frontend
- FastAPI backend
- MongoDB persistence
- Ollama model server for AI inference

## Features

- Full case fact collection with jurisdiction, parties, orders, evidence, witnesses, and reliefs
- AI-driven legal analysis returning structured recommendations and strategy
- File attachment capture for evidence and supporting documents
- Document drafting assistant with prayers and court-ready formatting
- Draft download + saved draft archive
- MongoDB-backed persistence for analysis and draft history

## Backend setup

1. Open PowerShell in the repo root.
2. Create and activate a Python virtual environment:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```
3. Install backend dependencies:
   ```powershell
   pip install -r backend/requirements.txt
   ```
4. Set recommended environment variables if needed:
   - `OLLAMA_HOST_URL` (default: `http://localhost:11434`)
   - `MONGO_URI` (default: `mongodb://localhost:27017`)
   - `DATABASE_NAME` (default: `nyaya_ai`)
   - `PORT` (default: `8000`)
5. Start the backend:
   ```powershell
   uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
   ```

## Frontend setup

1. Open a terminal in `frontend/`.
2. Install dependencies:
   ```powershell
   npm install
   ```
3. Start the dev server:
   ```powershell
   npm run dev
   ```
4. Open the Vite-hosted URL shown in the terminal.

## Usage notes

- Use the **Case Analyzer** to enter full narrative facts and upload evidence files.
- Use the **Document Drafter** to draft pleadings and upload supporting documents.
- Generated drafts can be copied or downloaded directly.
- Saved drafts and case analyses persist in MongoDB.

## Environment variables

The backend reads these from the environment:

- `OLLAMA_HOST_URL` — Ollama server URL
- `MONGO_URI` — MongoDB connection string
- `DATABASE_NAME` — Mongo database name
- `PORT` — backend HTTP port

## Deployment

- Build the frontend with `npm run build` inside `frontend/`.
- Serve the static files from a web server, or integrate with FastAPI.
- Deploy the backend as a container or Python app with Uvicorn/Gunicorn.

## Troubleshooting

- If AI calls fail, make sure Ollama is running and reachable.
- If MongoDB calls fail, verify `MONGO_URI` and that MongoDB is accessible.
- For large file uploads, keep attachments within reasonable size limits.

## Contributing

- Modify UI components in `frontend/src/components/`
- Extend backend endpoints in `backend/app/routers/`
- Keep MongoDB documents consistent by reusing request/response fields

## License

Add a license file if you want to open-source this repository.
