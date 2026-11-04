PDF Insight
PDF Insight is a React + TypeScript web application for extracting text from PDF documents and converting document content into a concise summary and validated structured data.

The application supports local PDF parsing, AI-assisted document analysis, JSON preview and export, analysis history, and a local fallback when the AI service is unavailable.

Demo
Public demo:

TODO: add GitHub Pages URL

Repository:

TODO: add public GitHub repository URL

Screenshot:

TODO: add screenshot before submission

Features
Core functionality
PDF upload using file picker
Drag & drop support
PDF-only validation
Maximum file size: 10 MB
Text extraction from PDFs with a text layer
Local document analysis fallback
AI-assisted structured analysis
Summary generated in the document language
Key information extraction
Organizations and people extraction
Amounts with currency and context
Date extraction
Keywords
Structured output validation
JSON preview
JSON file download
Loading state
Error state
Retry action
Empty state
Local analysis history
Additional functionality
AI/local analysis status
AI v2 / Local v1.2 source badges
Local browser history for successful AI analyses
Local comparison utilities for historical analyses
Result schema
Every analysis follows this structure:

{
  "document": {
    "fileName": "umowa.pdf",
    "pages": 4,
    "language": "pl",
    "type": "umowa",
    "title": "Umowa serwisowa",
    "date": "2026-09-01"
  },
  "summary": "Document summary...",
  "keyPoints": [
    "Important point 1",
    "Important point 2",
    "Important point 3"
  ],
  "entities": {
    "organizations": [],
    "people": []
  },
  "amounts": [
    {
      "value": 12500,
      "currency": "PLN",
      "context": "wynagrodzenie"
    }
  ],
  "dates": [
    {
      "date": "2026-10-01",
      "context": "termin płatności"
    }
  ],
  "keywords": [
    "serwis",
    "SLA"
  ]
}
The result is validated before it is displayed.

Main validation rules include:

language uses a two-letter language code
supported document types:
faktura
umowa
oferta
raport
inne
document date is YYYY-MM-DD or null
extracted dates use YYYY-MM-DD
currencies use three-letter codes such as PLN, EUR, or USD
keyPoints contains between 3 and 7 entries
Architecture
PDF Insight uses a frontend/backend architecture.

Browser
  |
  | PDF
  v
React + TypeScript
  |
  | pdf.js text extraction
  v
Local analysis
  |
  | structured request
  v
Backend API
  |
  | secured AI request
  v
LLM API
  |
  | structured result
  v
Zod validation
  |
  v
UI + JSON export + History
Frontend
The frontend is built using:

React
TypeScript
Vite
pdf.js
Zod
The frontend:

validates the selected file,
extracts the PDF text,
creates an immediate local result,
requests the AI analysis,
validates the structured response,
displays the final result,
allows JSON download,
stores successful AI results locally.
Backend
The backend uses:

Node.js
Express
OpenAI SDK
Zod Structured Outputs
The API key is used only by the backend.

The frontend never receives the API key.

AI security
PDF document text is treated as untrusted data.

The backend system prompt explicitly instructs the model not to execute instructions contained inside uploaded PDF documents.

This protects against document-based prompt injection attempts such as:

Ignore previous instructions...
The test document used during development contains an intentional prompt-injection attempt. The application was verified to ignore that instruction and extract the actual contract information instead.

The AI is also instructed to:

extract only information supported by the document,
avoid inventing missing facts,
avoid inventing dates,
preserve monetary context,
deduplicate duplicated translations,
return structured output matching the application schema.
Local fallback
PDF Insight performs local analysis before the AI result is available.

Typical state flow:

PDF selected
    ↓
Odczytywanie dokumentu PDF...
    ↓
Local v1.2 result
    ↓
AI v2 analizuje dokument...
    ↓
Analiza AI v2 gotowa.
If AI analysis fails, the local result remains available to the user.

Analysis history
Successful AI v2 results are stored locally in the browser.

History stores information including:

file name,
analysis date,
document type,
number of pages,
summary,
amounts,
full structured result.
History does not contain the OpenAI API key.

Users can:

view previous results,
delete individual entries,
clear the history.
JSON export
Every displayed analysis can be inspected as formatted JSON.

The result can also be downloaded as a .json file.

Example:

umowa-insight.json
File restrictions
Uploaded files must:

be PDF files,
be no larger than 10 MB.
Files that fail validation are rejected before analysis.

Environment variables
Copy:

.env.example
to:

.env
Example configuration:

OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-5.5
PORT=3001

ALLOWED_ORIGIN=http://localhost:5173

VITE_API_URL=http://localhost:3001
Important
Never commit .env.

The repository contains .env.example only.

OPENAI_API_KEY must never use the VITE_ prefix because VITE_* variables are exposed to the frontend bundle.

VITE_API_URL is public configuration and contains only the backend address.

Installation
Requirements:

Node.js
npm
Install dependencies:

npm install
Local development
Start frontend and backend together:

npm run dev
This starts:

Frontend: http://localhost:5173
Backend:  http://localhost:3001
Backend health endpoint:

http://localhost:3001/api/health
Expected response:

{
  "ok": true,
  "service": "pdf-insight-ai"
}
Available commands
Development:

npm run dev
Frontend only:

npm run dev:web
Backend only:

npm run dev:ai
Lint:

npm run lint
Tests:

npm test
Production build:

npm run build
Preview production build:

npm run preview
Testing
Schema validation is covered with Vitest unit tests.

Run:

npm test
Current validation test suite covers:

valid structured result
nullable document date
empty optional arrays
invalid document type
invalid language code
invalid document date
invalid extracted date
invalid currency code
fewer than 3 key points
more than 7 key points
invalid page count
empty summary
Before submission, the local quality gate is:

npm run lint && npm test && npm run build
API security
The backend includes:

API key isolation
restricted CORS configuration
configurable production origin
JSON request-size limit
request rate limiting
structured-output validation
prompt-injection protection
Local frontend origins currently allowed during development include:

http://localhost:5173
http://localhost:5174
Production origin is configured using:

ALLOWED_ORIGIN=https://example.github.io
Privacy
The application extracts document text in the browser.

When AI analysis is enabled, extracted document text is sent to the configured backend and then processed by the configured AI API.

Users should not upload documents they are not authorized to process.

Local history is stored in the browser.

Project structure
pdf-insight/
├── server/
│   └── index.ts
│
├── src/
│   ├── components/
│   │   ├── JsonResult.tsx
│   │   ├── PdfHistory.tsx
│   │   └── PdfUploader.tsx
│   │
│   ├── lib/
│   │   ├── ai-analyze.ts
│   │   ├── analyze.ts
│   │   ├── compare.ts
│   │   ├── history.ts
│   │   ├── pdf.ts
│   │   ├── schema.test.ts
│   │   └── schema.ts
│   │
│   ├── App.css
│   └── App.tsx
│
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── vite.config.ts
Known limitations
OCR for image-only/scanned PDFs is not implemented.
The current local analyzer is less capable than AI v2 and acts primarily as a fallback.
Very long documents may require additional chunking logic depending on backend/model limits.
The frontend and AI backend are deployed separately.
Browser history is local to the current browser/device.
AI results can vary slightly between repeated analyses.
Some extracted monetary values may represent rates, limits, capital, penalties, or totals, so their context should always be considered.
Deployment
The intended production architecture is:

GitHub Pages
     |
     | VITE_API_URL
     v
Backend API
     |
     v
AI API
GitHub Pages hosts only the static frontend.

The AI API key remains on the backend.

The frontend production build receives the public backend address through:

VITE_API_URL
CI/CD
The project quality pipeline runs:

lint
  ↓
test
  ↓
build
  ↓
deploy
GitHub Actions is used for automated validation and deployment.

AI usage
AI tools were used during development for:

architecture planning,
TypeScript implementation assistance,
debugging,
prompt design,
schema validation,
security review,
test creation,
documentation assistance.
A more detailed development record is available in:

AI_LOG.md
Submission checklist
Before final submission:

PDF drag & drop
PDF file picker
PDF-only validation
10 MB limit
PDF text extraction
AI summary
Structured data
Zod validation
JSON preview
JSON download
Loading state
Error state
Retry
Empty state
Unit tests
Prompt-injection protection
Local analysis history
API key isolated from frontend
Restricted CORS
Request limits
Public GitHub repository
GitHub Actions deployment
Public GitHub Pages demo
Production backend URL
Final screenshot
Final demo acceptance test
License
This project was created as a recruitment task implementation.