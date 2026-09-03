# Project Rules & Guidelines: Restoran Wawasan

## 📌 Project Overview
This is a Full-Stack React/Vite + Express application wrapped in Capacitor for Android.
- **Architecture**: React (Vite) + Express (Node.js) + Capacitor.
- **Database**: Firebase Firestore (default) & Firebase Auth.
- **Server**: Modular routes in `/server/routes`, binds to `0.0.0.0:3000`.

## 📂 Core Directories
- `/src`: Frontend React application source code.
- `/server`: Backend Express.js API server code.
- `/android`: Android project configuration for Capacitor.
- `/scripts`: Utility and build automation scripts.
- `/public`: Static assets (images, fonts, manifests).
- `/docs`: Project documentation and specifications.
- `/e2e`: End-to-end testing configurations and specs.

## ⚙️ Key NPM Scripts
- `dev`: Starts the development server.
- `build`: Compiles the project for production.
- `start`: Starts the production server.
- `lint`: Runs ESLint for code quality.
- `test`: Runs the project's test suite.

## 🛡️ Must-Follow Directives
Before performing tasks related to these areas, you MUST read the corresponding specification files:

- **Verification Routine on Feature Changes**:
  - Whenever new features or code changes are implemented, you MUST run `npm run typecheck` to verify TypeScript types across frontend and backend.
  - You MUST also run `npx cap sync android` to keep the native Android project in sync with web assets and plugins.
- **Android Builds/Releases**: Read `/docs/BUILD.md` and `/docs/CI_CD_COMPLETE.md` before starting.
- **Server Integrations (WhatsApp, Email, Calendar)**: Read `/docs/AGENTS.md` for integration-specific procedures.
- **Security-Sensitive Code (Auth, Firebase)**: Read `/docs/SECURITY_SPEC.md` before making any changes.
- **General Rules**:
  - **Package Management**: Use `npm` exclusively. Do NOT generate `bun.lock`.
  - **Fact-First Policy**: NEVER assume package versions, API formats, or file contents. Read source files before stating facts.
  - **Look Before Leaping**: Run `view_file` on existing configurations before adding new tools or workflows.

## 🔗 Integrations
### WhatsApp Business API
- **Service**: `/server/services/whatsappBusinessService.ts`
- **Rule**: Verify API signatures and validate message payloads before implementation.

### Email Service (Nodemailer)
- **Service**: `/server/emailService.ts`
- **Rule**: Templates must support Malay (BM) locale and be responsive for mobile.

### Google Calendar
- **Service**: `/server/calendarService.ts`
- **Rule**: Ensure correct time zone handling for Malaysian Standard Time (MYT).

## 💬 Communication
- Maintain a professional, clear, and jargon-free tone.
- Avoid displaying internal tool output descriptions.
- Focus summaries on high-level functional and visual outcomes.

