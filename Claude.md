## ChronoScope Build Rules

This project is built on macOS but targets Windows. Therefore:

1. NEVER attempt to run `npm run tauri dev`, `cargo run`, `cargo build`, or any command that compiles Windows-specific Rust code. These will fail on Mac.

2. NEVER attempt to test functionality that requires Windows APIs (foreground window detection, idle, session lock, tray, registry).

3. The browser extension (in `extension/`) IS testable on Mac in Chrome - you may verify it loads correctly if relevant to your task.

4. The React frontend can be inspected visually via `npm run dev` (Vite alone, without Tauri backend) but Tauri commands will fail. Do not run this unless explicitly asked.

5. Safe commands you may run: `npm install`, `cargo fmt`, `cargo check --target x86_64-pc-windows-msvc` (if the target is installed; pure type-checking only).

6. After completing every phase, ALWAYS commit and push to GitHub:
   git add .
   git commit -m "Phase N: <short description matching the phase>"
   git push origin main

7. If git push fails (auth or network), report it; do not silently move on.
