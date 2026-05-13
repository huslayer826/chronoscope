# ChronoScope

ChronoScope is a local-first Windows screen time tracker for understanding app and website usage without sending private activity data to a remote service. It is designed to keep tracking data on the user's machine while providing clear daily and monthly views of screen time.

## Tech Stack

- Tauri v2 for the desktop shell
- React and TypeScript for the frontend
- Tailwind CSS for styling
- Rust for native Windows tracking, local storage, and extension messaging
- SQLite for local persistence
- Chrome extension source in `extension/` for per-website tracking

## Building on Windows

ChronoScope targets Windows APIs for tracking foreground windows, idle state, session lock, tray behavior, and related desktop integrations. Builds and runs require a Windows machine.
