# Project Rules & Guidelines

- **Package Management**: Use `npm` exclusively. Do NOT create or generate `bun.lock` or any Bun-related lockfiles in this project (even though bun.lock exists in history, do not generate new ones).
- **Commit Messages**: At the end of every completed coding task, always automatically generate and display a clear, ready-to-use, conventional-style Git commit message (e.g. `feat(admin): ...`) in the final summary so the user can easily copy and paste it into the GitHub panel.
- **Existing Infrastructure & CI/CD**: This project has an established history and mature setup. ALWAYS check the existing file tree and read existing configuration files before proposing or creating new scripts/workflows. Do not overwrite or duplicate existing logic.
  - **GitHub Actions**: A highly advanced `build-apk.yml` exists. It patches `capacitor-updater` for Java 17, sets dynamic version codes based on timestamps, injects `google-services.json` from secrets, natively injects keystores into `key.properties`, and builds GitHub Releases using `ncipollo/release-action`. DO NOT create new workflow files for Android builds.
- **Architecture**: This is a Full-Stack React/Vite + Express application wrapped in Capacitor (`com.wawasanpakusop.app`).
  - **Server**: Express is located in `server.ts` with modular routes in `/server/routes`. It binds to `0.0.0.0:3000` and uses Vite as middleware in development mode.
  - **Firebase**: Firebase is configured in `src/firebaseConfig.ts`, dynamically reading from `VITE_FIREBASE_*` environment variables or falling back to `firebase-applet-config.json` for the sandbox.
- **Golden Rule**: Look before leaping. Before adding any new tool, workflow, or configuration, run `view_file` on existing configurations (like `package.json`, `vite.config.ts`, `.github/workflows/`) to understand how this project specifically handles it.
- **Communication & Tone**: Reply directly as a clear, polite, professional AI coding assistant. Avoid displaying internal tool output descriptions or verbose meta-explanations. Keep responses concise, scannable, and focused on user-facing functional outcomes.

