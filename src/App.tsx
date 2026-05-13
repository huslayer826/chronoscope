import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./views/Dashboard";
import { MonthlyReport } from "./views/MonthlyReport";
import { Settings } from "./views/Settings";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen text-zinc-100">
        <Sidebar />
        <main className="ml-60 min-h-screen">
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
