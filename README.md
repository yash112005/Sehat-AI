# Sehat-AI (सेहत-AI)

**Healthcare That Speaks Your Language**

A mobile-first, voice-first healthcare companion concept for Indian doctors, patients, families, and ASHA workers. Built for **The Great Indian AI Internship Challenge** using Gnani AI speech services and Google Gemini.

> Sehat-AI provides assistance for communication and understanding. It does not diagnose conditions or replace a qualified clinician. Always have prescriptions and report interpretations reviewed by a doctor.

## The problem

Patients can leave a busy clinic with a handwritten prescription or a complex lab report they cannot easily understand. Language barriers and difficult medicine schedules can make follow-up at home harder. Doctors working busy OPDs also have limited time to write detailed notes and explain every instruction.

## The solution

Sehat-AI brings voice input, plain-language explanations, and patient-friendly guidance together in a responsive web app. Its goal is to make common healthcare interactions easier for people who prefer speaking over reading or typing.

### Current feature areas

- **Doctor OPD voice-to-prescription:** Record or upload a doctor’s dictation, transcribe it, and ask Gemini to structure a draft prescription and patient guidance.
- **Patient audio guide and pill scanner:** Listen to medicine guidance in a selected language and submit a medicine-strip image for comparison with the active prescription. A clinician or pharmacist should confirm medicine identity and instructions before use.
- **Lab report explainer and anatomy viewer:** Upload a report for a plain-language explanation, inspect test-related body regions in the interactive anatomy viewer, and hear narration. Report values and explanations require clinical review.
- **Voice symptom locator:** Speak symptoms and create a pre-consultation summary with mapped body regions for discussion with a doctor. This is not a diagnosis.
- **Care Circle:** Keep family, friend, doctor, or ASHA contacts in browser `localStorage`; use call, WhatsApp, and voice-summary actions. Emergency and critical-report alerts are presented in the app for the user to review.
- **Patient emergency guidance:** Presents emergency information and routes users toward help, including India’s 108 ambulance guidance.

The retinal scan, voice-biomarker screening, and blood-sugar screening/report-analyzer modules are not part of the current app.

## Technology

- Next.js App Router, React, TypeScript
- Tailwind CSS and Lucide icons
- Gnani Prisma v2.5 speech-to-text and Timbre v2.5 text-to-speech integrations
- Google Gemini 2.5 Flash through `@google/generative-ai`
- Browser MediaRecorder for audio capture; microphone recordings are converted to WAV before upload where supported by the app
- Browser `localStorage` for Care Circle contacts

## Requirements

- Node.js 20 or later
- npm
- Gnani AI and Google Gemini API credentials for live AI features
- A modern browser; microphone and location features require user permission. Microphone access generally requires HTTPS or `localhost`.

## Configure environment

Copy `.env.example` to `.env.local` and replace the placeholders with valid credentials:

```env
GNANI_API_KEY=your_gnani_api_key
GEMINI_API_KEY=your_google_gemini_api_key
```

Keep `.env.local` private. Do not commit real API keys to GitHub or expose them through `NEXT_PUBLIC_` variables. If a key has already been committed, revoke/rotate it with the provider and update the deployment environment.

## Run locally

```bash
npm install
npm run dev
```



Production build and server:

```bash
npm run build
npm run start
```

## API routes

| Route | Purpose |
| --- | --- |
| `POST /api/stt` | Forwards submitted audio to Gnani Prisma v2.5 and returns a transcript. |
| `POST /api/tts` | Requests speech audio from Gnani Timbre v2.5. The browser has a speech-synthesis fallback for playback failures. |
| `POST /api/analyze` | Uses Gemini 2.5 Flash for supported app modes, including prescription, report, emergency, pill scan, symptom mapping, translation, and body-report narration. |

Check the route handlers under `src/app/api/` for request formats and supported modes.

## Privacy, safety, and prototype limitations

- API credentials are used by server-side route handlers; do not put them in client-side code.
- Care Circle contacts are stored in the current browser’s `localStorage`. They are not synchronized to a server and may be lost when browser storage is cleared.
- Calling a contact uses the device dialer. WhatsApp alerts open a prefilled message for the user to review and send; the app does not silently send SMS or WhatsApp messages. Location is included only when the user provides it or grants location access.
- This project does not currently provide user authentication, a secure medical-record database, or a validated clinical AI model. Avoid entering identifiable patient information into a demo deployment.
- Gemini output can be incomplete or wrong. Verify every medicine, dose, report value, and recommendation with the original source and a qualified clinician. Do not delay emergency care while using the app; call local emergency services when needed.
- Speech recognition, voice availability, image analysis, and report interpretation depend on provider access, network connectivity, supported formats, and configured API keys. If a model or hardware is unavailable, the related capability is not a validated screening result.

## Challenge alignment

Sehat-AI explores how resilient Indian-language speech input, empathetic audio output, and multimodal assistance can support patients and health workers in busy, multilingual care settings. Its focus is accessible communication for Bharat, with human review kept central to medical decisions.
