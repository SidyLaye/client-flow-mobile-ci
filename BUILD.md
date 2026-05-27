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

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```env
VITE_SUPABASE_URL="https://YOUR-PROJECT-ID.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="YOUR-ANON-KEY"
VITE_SUPABASE_PROJECT_ID="YOUR-PROJECT-ID"
```

You get these values at:
**Supabase Dashboard → your project → Settings → API**.

If you haven't yet provisioned Supabase, see `README.md`'s "Database Setup"
and "Deploy Edge Functions" sections, then come back here.

## 3. Install JS dependencies

From the project root in PowerShell:

```powershell
cd C:\Users\sarrs\Documents\mourad\a2t-frontend
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
   `src-tauri\target\release\bundle\`.

You'll find:
- `bundle\nsis\ComptaFlow_0.1.0_x64-setup.exe` — NSIS installer (smaller, recommended)
- `bundle\msi\ComptaFlow_0.1.0_x64_en-US.msi` — MSI installer

The first build is slow (Rust compiles every dependency). Subsequent builds
take 30–90 seconds.

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
| Blank window on launch | The Supabase env vars are missing or wrong. Check `.env` and rebuild. |
| Window opens but says "Failed to fetch" | Your Supabase project's edge functions aren't deployed, or its URL is wrong. |
| WebView2 missing on older Windows | Install from the link in step 1.4. |

## 8. Project structure recap

```
a2t-frontend/
├── src/                # React app (TypeScript + Tailwind + shadcn/ui)
│   ├── pages/          # Route components
│   ├── components/     # Shared UI
│   ├── contexts/       # AuthContext (Supabase)
│   └── integrations/   # Supabase client
├── supabase/           # Migrations + edge functions (deploy with supabase CLI)
└── src-tauri/          # Rust shell + Tauri config
    ├── src/            # Rust entry (lib.rs, main.rs)
    ├── icons/          # App icons (.ico + .png)
    ├── capabilities/   # Tauri permissions (default.json)
    └── tauri.conf.json # Window size, identifier, bundler targets
```
