import { NavLink } from "react-router-dom";
import { CalendarDays, LayoutDashboard, Settings as SettingsIcon } from "lucide-react";
import { cn } from "../lib/cn";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/monthly", label: "Monthly Report", icon: CalendarDays },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r border-zinc-900 bg-[#0a0a0b]/95 backdrop-blur">
      <div className="flex h-16 items-center gap-2.5 border-b border-zinc-900 px-5">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_0_12px_rgba(34,197,94,0.4)]">
          <span className="font-mono text-sm font-bold text-zinc-950">C</span>
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">ChronoScope</div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">v0.1.0</div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-zinc-900 text-zinc-100"
                  : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200",
              )
            }
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-zinc-900 p-4">
        <div className="flex items-center gap-2.5 rounded-lg bg-zinc-900/60 px-3 py-2.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <div className="text-xs">
            <div className="font-medium text-zinc-200">Tracking</div>
            <div className="text-[11px] text-zinc-500">active</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
