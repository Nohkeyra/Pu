# Restoran Wawasan Pak Usop — System Application

A full-stack enterprise Point-of-Sale, Order Management, and Customer Invoicing System for Restoran Wawasan Pak Usop.

## Architecture

This application is built as a full-stack system consisting of:
- **Frontend**: React 18, Vite, Tailwind CSS, shadcn/ui.
- **Mobile**: Capacitor for Android native application support.
- **Backend**: Express.js server providing API endpoints, PDF invoice generation, and calendar/email integration.
- **Database & Authentication**: Firebase Firestore and Firebase Authentication.

## Setup & Environment Variables

Create a `.env` file at the root of the project by copying `.env.example`:

```bash
cp .env.example .env
```

Ensure you configure the required environment variables:
- Firebase Admin SDK credentials (e.g., `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`)
- Email/SMTP credentials for sending invoices
- Calendar API credentials

## Build & Run

### Local Development (Web)

To run the application locally for web development:

```bash
npm install
npm run dev
```

This will start the Express backend and Vite frontend together.

### Production Build

To build the application for production:

```bash
npm run build
npm run start
```

This compiles the frontend assets to `dist/` and bundles the Express server to `dist/server.cjs`.

### Native Android Build

To build the Android APK:

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

For more comprehensive Android build instructions, refer to `docs/BUILD.md`.

## Deployment

The application is containerized and designed for deployment to Google Cloud Run or any similar Docker-compatible environment. A `Dockerfile` is provided at the root.

Ensure that all required environment variables are set in your deployment environment and that port `3000` is exposed.
