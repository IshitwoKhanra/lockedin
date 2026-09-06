LockedIn

AI-powered mock interview practice with voice interaction, resume-grounded questions, and actionable post-interview feedback.

LockedIn is a full-stack interview-practice application that lets a candidate upload a resume, choose an interview domain, and conduct a spoken mock interview with an AI interviewer. The backend handles speech-to-text, LLM responses, text-to-speech, session persistence, and report generation, while the React frontend provides the interview UI and authentication flow.

✨ Features

Resume-grounded interviews — questions are tailored to the candidate's uploaded resume and selected domain.

Voice-first interaction — speak naturally instead of typing answers.

Speech-to-text — uses faster-whisper for local transcription.

AI interviewer — uses OpenAI for interview questions and follow-ups.

Text-to-speech — uses Piper for spoken interviewer responses.

Interview timing — answer durations are measured server-side.

Session history — previous interviews and reports are stored in Supabase.

AI feedback report — generates an overall score, strengths, improvement areas, and per-question feedback.

Authentication — Supabase Auth protects user sessions and backend endpoints.

Rate limiting — selected API endpoints are protected with slowapi.

🏗️ Architecture

┌──────────────────────┐
│   React + Vite UI    │
│      frontend/       │
└──────────┬───────────┘
           │ HTTP / WebSocket
           ▼
┌──────────────────────┐
│   FastAPI Backend    │
│       backend/       │
├──────────────────────┤
│ Resume extraction    │
│ VAD / audio handling │
│ Faster-Whisper STT   │
│ OpenAI interviewer   │
│ Piper TTS            │
│ Report generation    │
└──────────┬───────────┘
           │
           ├──────────────► Supabase Auth
           │
           └──────────────► Supabase Database

🧰 Tech Stack

Frontend

React 19

Vite

React Router

Supabase JavaScript client

Tailwind CSS

Radix UI / shadcn-style components

Lucide React

Backend

Python

FastAPI

WebSockets

NumPy

WebRTC VAD

Faster-Whisper

OpenAI API

Piper TTS

pypdf

Supabase Python client

PyJWT

SlowAPI

📁 Project Structure

lockedin/
├── backend/
│   ├── main.py                 # FastAPI routes + WebSocket interview loop
│   ├── auth.py                 # Supabase JWT verification
│   ├── db.py                   # Supabase session persistence
│   ├── resume.py               # Resume/PDF text extraction
│   ├── report.py               # AI interview report generation
│   ├── llm_stream_test.py      # OpenAI interviewer + streaming responses
│   ├── stt_test.py             # Faster-Whisper speech-to-text
│   ├── tts_test.py             # Piper text-to-speech
│   ├── vad_stream.py           # Voice activity detection
│   ├── audio_utils.py          # Audio conversion helpers
│   ├── ffmpeg_bridge.py        # FFmpeg/audio bridge utilities
│   ├── requirements.txt
│   ├── en_US-lessac-medium.onnx
│   └── en_US-lessac-medium.onnx.json
│
├── frontend/
│   ├── src/
│   │   ├── components/         # UI and interview screens
│   │   ├── context/            # Authentication context
│   │   ├── hooks/              # Interview session hook
│   │   └── lib/                # Supabase client + helpers
│   ├── public/
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
│
├── .gitignore
└── README.md

🚀 Getting Started

1. Clone the repository

git clone https://github.com/IshitwoKhanra/lockedin.git
cd lockedin

2. Backend setup

Create and activate a Python virtual environment:

cd backend

python -m venv venv

Windows PowerShell:

.\venv\Scripts\Activate.ps1

Windows Command Prompt:

venv\Scripts\activate

Install dependencies:

pip install -r requirements.txt

Create backend/.env locally:

OPENAI_API_KEY=your_openai_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

Never commit this file. The service-role key is a backend secret and must never be exposed to the frontend.

Start the API from the backend directory:

uvicorn main:app --reload --env-file .env

The backend runs on:

http://localhost:8000

3. Frontend setup

Open a second terminal:

cd frontend
npm install

Create frontend/.env locally:

VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

The frontend only uses the Supabase publishable/anon key. Do not put SUPABASE_SERVICE_ROLE_KEY or OPENAI_API_KEY in the frontend environment.

Start the frontend:

npm run dev

The Vite development server normally runs on:

http://localhost:5173

🗄️ Supabase

The application uses:

Supabase Auth for user authentication.

Supabase Database for interview sessions, transcripts, timings, resumes, and reports.

The backend expects a sessions table containing the fields used by backend/db.py, including:

id

user_id

resume_text

transcript

timings

report

created_at

transcript, timings, and report should use JSON-compatible database types such as jsonb.

For a production deployment, configure Row Level Security and review all database policies carefully. The backend currently uses the Supabase service-role key and therefore performs explicit user_id ownership checks in its database queries.

🔐 Environment Variables & Security

This repository intentionally does not contain real environment files.

Ignored local files include:

.env
.env.*
!.env.example

Important secrets:

Variable

Used by

Secret?

OPENAI_API_KEY

Backend

YES

SUPABASE_SERVICE_ROLE_KEY

Backend

YES

SUPABASE_URL

Backend

Configuration

VITE_SUPABASE_URL

Frontend

Configuration

VITE_SUPABASE_ANON_KEY

Frontend

Publishable/anon key

If a secret has ever been committed to Git history or exposed publicly, rotate/revoke it rather than relying only on .gitignore.

🎙️ Audio / ML Models

The backend uses:

Faster-Whisper (small.en) for speech recognition.

Piper with the included en_US-lessac-medium.onnx voice model for speech synthesis.

WebRTC VAD for detecting speech boundaries.

The Piper model is included in the repository because it is a runtime dependency of the current application. The model is approximately 63 MB, so GitHub may display a large-file warning. Git LFS is a good option if you want to keep large model assets versioned without storing them as normal Git blobs.

🧪 Useful Commands

Frontend:

npm run dev
npm run build
npm run lint

Backend:

uvicorn main:app --reload --env-file .env

Basic health check:

GET http://localhost:8000/

Expected response:

{"status": "ok"}

⚠️ Current Development Notes

The frontend currently targets the local backend at http://localhost:8000 and ws://localhost:8000.

Production deployment will require configurable API/WebSocket URLs.

Microphone access requires browser permission.

The backend performs local speech processing and requires enough CPU/RAM for Faster-Whisper and Piper.

API usage through OpenAI can incur costs.

The current project is structured primarily as a development/local deployment rather than a production-hardened deployment.

📌 Security Checklist Before Pushing

Run these checks from the repository root:

git status
git diff --cached
git ls-files | findstr /I ".env"

On PowerShell, you can also search tracked files with:

git ls-files | Select-String "\.env"

Before the first push, verify that:

backend/.env is not staged.

frontend/.env is not staged.

venv/ is not staged.

node_modules/ is not staged.

__pycache__/ is not staged.

lockedin.zip is not staged.

No API keys or passwords appear in the staged diff.

The Supabase service-role key is never present in frontend code.

📄 License

No license has been selected for this repository yet. If you plan to make the project open source, add an appropriate license before treating the repository as licensed for reuse.