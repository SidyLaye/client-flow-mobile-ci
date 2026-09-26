# ComptaFlow — Build & Run Guide (Windows)

This document walks you through running ComptaFlow locally as a desktop app
and producing the Windows `.exe` installer.

## 1. Prerequisites (one-time setup)

Install the following on your Windows machine, in order:

1. **Node.js 18+** — https://nodejs.org/ (LTS recommended).
2. **Rust toolchain** — open PowerShell and run:
   ```powershell
   winget install --id Rustlang.Rustup -e
   ```
   Then in a new shell:
   ```powershell
   rustup default stable
   ```
3. **Visual Studio Build Tools** (required by Tauri for MSVC) —
   https://visualstudio.microsoft.com/visual-cpp-build-tools/
   When the installer opens, tick **"Desktop development with C++"** and install.
4. **WebView2** is already installed on Windows 10 21H2+ and 11 by default.
   Verify or install: https://developer.microsoft.com/microsoft-edge/webview2/

> Verify everything is wired up correctly:
> ```powershell
> node --version
> rustc --version
> cargo --version
> ```

## 2. Configure environment

Copy `.env.example` to `.env` and set the Django backend URL:

```env
VITE_API_URL="https://test.allinone.ovh"
```

Use `http://localhost:8000` to point at a backend running on your machine.
The value is baked into the build: rebuild after changing it.

## 3. Install JS dependencies

From the project root in PowerShell:

```powershell
cd chemin\vers\le-depot\desktop
npm install
```

## 4. Run in development (hot reload)

To run as a desktop app with hot reload:

```powershell
npm run tauri:dev
```

This opens the ComptaFlow window pointing at the Vite dev server.
Front-end edits reload instantly.

To run the front-end only in a browser (no desktop shell):

```powershell
npm run dev
# then open http://localhost:8080
```

## 5. Build the production .exe

```powershell
npm run tauri:build
```

What happens:
1. Vite builds the front-end into `dist/`.
2. Tauri compiles the Rust shell against `dist/`.
3. The Windows bundler emits installers under
   `target\release\bundle\` (the Cargo workspace root is `desktop/`).

You'll find:
- `bundle\nsis\ComptaFlow_0.1.0_x64-setup.exe` — NSIS installer (smaller, recommended)
- `bundle\msi\ComptaFlow_0.1.0_x64_en-US.msi` — MSI installer

The first build is slow (Rust compiles every dependency). Subsequent builds
take 30–90 seconds.

### Or let GitHub build it

Every push that touches `desktop/` runs `.github/workflows/desktop.yml` (at the
repository root) on a Windows runner. Download the installer from the run's
**Artifacts** (`ComptaFlow-Cabinet-Windows`).

## 6. Code-signing (optional, for distribution)

Out of the box the `.exe` is **unsigned**, so Windows SmartScreen will warn
end users on first run. For distribution to clients you'll want a code-signing
certificate. See:
https://v2.tauri.app/distribute/sign/windows/

## 7. Troubleshooting

| Problem | Fix |
| --- | --- |
| `npm install` fails on `@swc/core` | Re-run; SWC sometimes fails on first download. If it persists, delete `node_modules` and `package-lock.json`, then `npm install` again. |
| `cargo` not found | Re-open PowerShell after installing Rust. |
| `link.exe not found` | Install "Desktop development with C++" in Visual Studio Build Tools. |
| Window opens but says "Failed to fetch" | `VITE_API_URL` is wrong or the backend is down. Check `.env` and rebuild. |
| No Windows notification | Allow notifications for ComptaFlow in Windows Settings → System → Notifications, and keep the app open or minimized (a closed app receives nothing). |
| WebView2 missing on older Windows | Install from the link in step 1.4. |

## 8. Project structure recap

```
├── src/                # React app (TypeScript + Tailwind + shadcn/ui)
│   ├── pages/          # Route components
│   ├── components/     # Shared UI (TopBar = notifications)
│   ├── contexts/       # AuthContext (JWT + selected firm)
│   ├── hooks/          # use-desktop-notifications (Windows notifications)
│   └── lib/            # api.ts — typed client for the Django REST API
└── src-tauri/          # Rust shell + Tauri config
    ├── src/            # Rust entry (lib.rs: opener + notification plugins)
    ├── icons/          # App icons (.ico + .png)
    ├── capabilities/   # Tauri permissions (default.json)
    └── tauri.conf.json # Window size, identifier, bundler targets
```
