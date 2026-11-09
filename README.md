# Restoran Wawasan Pak Usop

Restoran Wawasan Pak Usop is a full-stack restaurant management application designed to simplify catering orders, customer management, and invoicing.

The app allows restaurant staff to:

- Manage customer and catering orders
- Review, approve, and update order prices
- Track order status from submission to billing
- Generate and preview PDF invoices
- Send invoices to customers by email
- Schedule orders using Google Calendar
- Manage restaurant operations through a responsive web interface
- Access the system through an Android application

The application is built with React, TypeScript, Express.js, Firebase, and Capacitor.

## Project structure and maintenance

See [repository architecture](docs/repository-architecture.md) for module ownership and the [visual architecture](docs/visual-architecture.md) for styling responsibilities. Run `npm run lint:structure` after moving components or hooks.

## Development preview

Run `npm ci` and `npm run dev` to serve the Express API and Vite frontend together. The development WebSocket shares the HTTP server and port, so a preview proxy does not need to expose Vite's separate default WebSocket port.

Public calendar requests make one attempt per refresh. Failed requests keep the incomplete-data notice and **Try again** action; they do not silently repeat quota or server failures.

## Firestore reads and recovery

The calendar uses one public, privacy-filtered snapshot for both session totals and booking rows. Current clients call /api/calendar-data once; /api/calendar-orders and /api/calendar-sessions remain available. Concurrent requests and date ranges share the three-minute process cache, and existing order mutations invalidate it. The initial snapshot still reads legacy orders whose date fields differ.

Empty invoice background queries gradually wait up to 60 seconds. Local enqueue calls wake the ready query; known retry and lease deadlines remain eligible on the next worker tick. Work created on another instance is discovered within the idle polling interval. Explicit processQueue calls still run immediately.

A shared process-local quota pause starts at 60 seconds and increases to at most 15 minutes. One recovery probe resumes participating readers; an older in-flight success cannot cancel a newer pause. Calendar failures return HTTP 503 with Retry-After rather than successful empty results. Existing in-memory rate-limit fallback remains available during an outage; healthy counters still use authoritative transactions.

This reduces repeated reads but does not restore an exhausted Firebase quota. No daily reset time is assumed. Live usage and other server instances must still be checked in Firebase; no database schema migration is required.
