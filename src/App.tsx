import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { onUpdateAvailable, type UpdateAvailablePayload } from "./lib/api";
import { Dashboard } from "./views/Dashboard";
import { MonthlyReport } from "./views/MonthlyReport";
import { Settings } from "./views/Settings";

function App() {
  const [update, setUpdate] = useState<UpdateAvailablePayload | null>(null);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    onUpdateAvailable(setUpdate)
      .then((dispose) => {
        unlisten = dispose;
      })
      .catch((error) => {
        console.error("Failed to listen for updates", error);
      });

    return () => {
      unlisten?.();
    };
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen text-zinc-100">
        <Sidebar />
        <main className="ml-60 min-h-screen">
          {update && (
            <div className="sticky top-0 z-40 border-b border-emerald-500/30 bg-emerald-500/10 px-6 py-3 text-sm text-emerald-100 backdrop-blur">
              Update available: ChronoScope {update.version}
            </div>
          )}
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/monthly" element={<MonthlyReport />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
