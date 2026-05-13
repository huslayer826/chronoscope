import { Settings as SettingsIcon } from "lucide-react";
import { Header } from "../components/Header";
import { Card } from "../components/ui/Card";

export function Settings() {
  return (
    <>
      <Header title="Settings" />
      <div className="p-8">
        <Card>
          <div className="flex items-center gap-4">
            <div className="grid h-10 w-10 place-items-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400">
              <SettingsIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">
                Settings coming soon
              </div>
              <div className="text-xs text-zinc-500">
                Tracking preferences, categories, and integrations will live here.
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
