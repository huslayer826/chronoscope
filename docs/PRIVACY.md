# ChronoScope Privacy Policy

ChronoScope is designed as a local-first screen time tracker. Activity data is
stored locally on the user's Windows machine in the ChronoScope SQLite database.

The desktop app does not phone home for analytics, telemetry, advertising, or
usage tracking. Network access is limited to explicit update checks against the
configured GitHub Releases updater endpoint and the local WebSocket connection
used by the browser extension at `127.0.0.1:8765`.

Browser URL tracking is provided by the ChronoScope browser extension and is
used only to enrich local activity records with website/domain context.
