import { CalendarDays } from "lucide-react";
import { Header } from "../components/Header";
import { Card } from "../components/ui/Card";

export function MonthlyReport() {
  return (
    <>
      <Header title="Monthly Report" />
      <div className="p-8">
        <Card>
          <div className="flex items-center gap-4">
            <div className="grid h-10 w-10 place-items-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">
                Monthly reports coming soon
              </div>
              <div className="text-xs text-zinc-500">
                Aggregated weekly/monthly breakdowns will appear here.
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
