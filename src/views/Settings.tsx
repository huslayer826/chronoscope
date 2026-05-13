import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Database,
  Download,
  ExternalLink,
  FileJson,
  FileSpreadsheet,
  FolderOpen,
  Code2,
  Info,
  Lock,
  Pencil,
  Plus,
  Shield,
  Sliders,
  Tag,
  Trash2,
} from "lucide-react";
import { Header } from "../components/Header";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import { Switch } from "../components/ui/Switch";
import { cn } from "../lib/cn";
import {
  addCategory,
  addCategoryRule,
  addIgnoredApp,
  addIgnoredDomain,
  bulkAddCategoryRules,
  deleteAllData,
  deleteCategory,
  deleteCategoryRule,
  exportDataCsv,
  exportDataJson,
  getCategories,
  getCategoryRules,
  getDatabasePath,
  getIgnoredApps,
  getIgnoredDomains,
  getSettings,
  openDatabaseFolder,
  removeIgnoredApp,
  removeIgnoredDomain,
  setAutostart,
  updateCategory,
  updateSettings,
  type Category,
  type CategoryRule,
  type Settings as SettingsData,
} from "../lib/api";

type TabId = "general" | "categories" | "ignored" | "privacy" | "about";

interface TabSpec {
  id: TabId;
  label: string;
  icon: typeof Sliders;
}

const TABS: TabSpec[] = [
  { id: "general", label: "General", icon: Sliders },
  { id: "categories", label: "Categories", icon: Tag },
  { id: "ignored", label: "Ignored", icon: Shield },
  { id: "privacy", label: "Privacy & Data", icon: Database },
  { id: "about", label: "About", icon: Info },
];

const DEFAULT_SETTINGS: SettingsData = {
  tracking_enabled: true,
  idle_threshold_seconds: 60,
  include_browser_urls: true,
  launch_at_login: false,
  launch_to_tray: true,
};

export function Settings() {
  const [tab, setTab] = useState<TabId>("general");

  return (
    <>
      <Header title="Settings" />
      <div className="p-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <nav className="flex flex-wrap gap-1 rounded-lg border border-zinc-800 bg-zinc-950 p-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-zinc-900 text-zinc-100"
                      : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </nav>

          {tab === "general" && <GeneralTab />}
          {tab === "categories" && <CategoriesTab />}
          {tab === "ignored" && <IgnoredTab />}
          {tab === "privacy" && <PrivacyTab />}
          {tab === "about" && <AboutTab />}
        </div>
      </div>
    </>
  );
}

function GeneralTab() {
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [savingErr, setSavingErr] = useState<string | null>(null);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setSettings(DEFAULT_SETTINGS))
      .finally(() => setLoaded(true));
  }, []);

  function persist(next: SettingsData) {
    setSettings(next);
    setSavingErr(null);
    updateSettings(next).catch((err) => setSavingErr(String(err)));
  }

  async function persistAutostart(enabled: boolean) {
    const next = { ...settings, launch_at_login: enabled };
    setSettings(next);
    try {
      await setAutostart(enabled);
    } catch (err) {
      setSavingErr(String(err));
      setSettings({ ...next, launch_at_login: !enabled });
    }
  }

  return (
    <div className="space-y-4">
      <SectionTitle title="General" description="Tracking behavior and startup." />
      <Card>
        <Row
          label="Tracking enabled"
          hint="Master switch for ChronoScope tracking."
        >
          <Switch
            checked={settings.tracking_enabled}
            onChange={(v) => persist({ ...settings, tracking_enabled: v })}
          />
        </Row>
        <Divider />
        <Row
          label="Idle threshold"
          hint={`Pause tracking after ${settings.idle_threshold_seconds}s of inactivity.`}
        >
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={30}
              max={300}
              step={5}
              value={settings.idle_threshold_seconds}
              onChange={(e) =>
                persist({
                  ...settings,
                  idle_threshold_seconds: parseInt(e.currentTarget.value, 10),
                })
              }
              className="h-1 w-48 cursor-pointer accent-emerald-500"
            />
            <span className="w-12 text-right font-mono text-xs tabular-nums text-zinc-300">
              {settings.idle_threshold_seconds}s
            </span>
          </div>
        </Row>
        <Divider />
        <Row
          label="Auto-start with Windows"
          hint="Launch ChronoScope when you sign in."
        >
          <Switch
            checked={settings.launch_at_login}
            onChange={(v) => persistAutostart(v)}
          />
        </Row>
        <Divider />
        <Row
          label="Launch to tray on startup"
          hint="Skip the dashboard window when starting."
        >
          <Switch
            checked={settings.launch_to_tray}
            onChange={(v) => persist({ ...settings, launch_to_tray: v })}
          />
        </Row>
        <Divider />
        <Row label="Theme" hint="More themes coming in a future release.">
          <div className="inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300">
            <Lock className="h-3 w-3" />
            Dark
          </div>
        </Row>
      </Card>

      {!loaded && (
        <div className="text-xs text-zinc-500">Loading current settings…</div>
      )}
      {savingErr && (
        <div className="rounded-md border border-rose-900/60 bg-rose-950/30 px-3 py-2 text-xs text-rose-300">
          {savingErr}
        </div>
      )}
    </div>
  );
}

const PRESET_COLORS = [
  "#22c55e",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#a855f7",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#64748b",
];

const PRODUCTIVITY_LABEL: Record<number, string> = {
  1: "Productive",
  0: "Neutral",
  [-1]: "Distracting",
};

function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Category | null>(null);
  const [adding, setAdding] = useState(false);
  const [addingRule, setAddingRule] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const [c, r] = await Promise.all([getCategories(), getCategoryRules()]);
      setCategories(c);
      setRules(r);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleDeleteCategory(c: Category) {
    if (!confirm(`Delete category "${c.name}" and all its rules?`)) return;
    try {
      await deleteCategory(c.id);
      await refresh();
    } catch (e) {
      setErr(String(e));
    }
  }

  async function handleDeleteRule(id: number) {
    try {
      await deleteCategoryRule(id);
      await refresh();
    } catch (e) {
      setErr(String(e));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle
          title="Categories"
          description="Buckets used to classify your activity."
        />
        <Card>
          <div className="flex items-center justify-between">
            <div className="text-xs text-zinc-500">
              {loading ? "Loading…" : `${categories.length} categories`}
            </div>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Add category
            </button>
          </div>
          <ul className="mt-3 divide-y divide-zinc-900">
            {categories.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="inline-block h-4 w-4 shrink-0 rounded"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="truncate text-sm font-medium text-zinc-100">
                    {c.name}
                  </span>
                  <span className="rounded-md bg-zinc-900 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-zinc-400">
                    {PRODUCTIVITY_LABEL[c.is_productive] ?? "Neutral"}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(c)}
                    className="grid h-7 w-7 place-items-center rounded-md text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(c)}
                    className="grid h-7 w-7 place-items-center rounded-md text-zinc-400 hover:bg-zinc-900 hover:text-rose-300"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div>
        <SectionTitle
          title="Rules"
          description="App and domain patterns that map to categories."
        />
        <Card>
          <div className="flex items-center justify-between">
            <div className="text-xs text-zinc-500">
              {loading ? "Loading…" : `${rules.length} rules`}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setBulkOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
              >
                Bulk import
              </button>
              <button
                type="button"
                onClick={() => setAddingRule(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
              >
                <Plus className="h-3.5 w-3.5" />
                Add rule
              </button>
            </div>
          </div>
          <div className="mt-3 overflow-hidden rounded-md border border-zinc-900">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/50 text-[11px] uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Pattern</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Priority</th>
                  <th className="px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {rules.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                      No rules yet.
                    </td>
                  </tr>
                ) : (
                  rules.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2">
                        <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-zinc-400">
                          {r.match_type}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-zinc-200">
                        {r.pattern}
                      </td>
                      <td className="px-3 py-2 text-zinc-300">{r.category_name}</td>
                      <td className="px-3 py-2 font-mono text-zinc-500 tabular-nums">
                        {r.priority}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteRule(r.id)}
                          className="grid h-6 w-6 place-items-center rounded text-zinc-500 hover:bg-zinc-900 hover:text-rose-300"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {err && (
        <div className="rounded-md border border-rose-900/60 bg-rose-950/30 px-3 py-2 text-xs text-rose-300">
          {err}
        </div>
      )}

      <CategoryModal
        open={adding || editing !== null}
        category={editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        onSaved={refresh}
      />
      <RuleModal
        open={addingRule}
        categories={categories}
        onClose={() => setAddingRule(false)}
        onSaved={refresh}
      />
      <BulkImportModal
        open={bulkOpen}
        categories={categories}
        onClose={() => setBulkOpen(false)}
        onSaved={refresh}
      />
    </div>
  );
}

interface CategoryModalProps {
  open: boolean;
  category: Category | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

function CategoryModal({ open, category, onClose, onSaved }: CategoryModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [isProductive, setIsProductive] = useState(0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? "");
    setColor(category?.color ?? PRESET_COLORS[0]);
    setIsProductive(category?.is_productive ?? 0);
    setErr(null);
  }, [open, category]);

  async function handleSave() {
    setSaving(true);
    setErr(null);
    try {
      if (category) {
        await updateCategory(category.id, name, color, isProductive);
      } else {
        await addCategory(name, color, isProductive);
      }
      await onSaved();
      onClose();
    } catch (e) {
      setErr(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={category ? "Edit category" : "Add category"}
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? "Saving…" : "Save"}
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name">
          <TextInput
            value={name}
            onChange={setName}
            placeholder="e.g. Deep Work"
            autoFocus
          />
        </Field>
        <Field label="Color">
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn(
                  "h-6 w-6 rounded-md border-2 transition-transform",
                  color === c
                    ? "scale-110 border-zinc-100"
                    : "border-zinc-800 hover:scale-105",
                )}
                style={{ backgroundColor: c }}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.currentTarget.value)}
              className="h-6 w-10 cursor-pointer rounded-md border border-zinc-800 bg-zinc-900"
            />
          </div>
        </Field>
        <Field label="Type">
          <div className="flex gap-2">
            {[
              { value: 1, label: "Productive" },
              { value: 0, label: "Neutral" },
              { value: -1, label: "Distracting" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setIsProductive(opt.value)}
                className={cn(
                  "flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                  isProductive === opt.value
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-200"
                    : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-900",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>
        {err && <ErrorBanner>{err}</ErrorBanner>}
      </div>
    </Modal>
  );
}

interface RuleModalProps {
  open: boolean;
  categories: Category[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

function RuleModal({ open, categories, onClose, onSaved }: RuleModalProps) {
  const [matchType, setMatchType] = useState<"app" | "domain">("app");
  const [pattern, setPattern] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [priority, setPriority] = useState("100");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMatchType("app");
    setPattern("");
    setCategoryId(categories[0]?.id ?? null);
    setPriority("100");
    setErr(null);
  }, [open, categories]);

  async function handleSave() {
    if (!categoryId || !pattern.trim()) return;
    setSaving(true);
    setErr(null);
    try {
      await addCategoryRule({
        match_type: matchType,
        pattern: pattern.trim(),
        category_id: categoryId,
        priority: parseInt(priority, 10) || 100,
      });
      await onSaved();
      onClose();
    } catch (e) {
      setErr(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add rule"
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton
            onClick={handleSave}
            disabled={saving || !pattern.trim() || !categoryId}
          >
            {saving ? "Saving…" : "Add"}
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Match type">
          <Select
            value={matchType}
            onChange={(v) => setMatchType(v as "app" | "domain")}
            options={[
              { value: "app", label: "App executable" },
              { value: "domain", label: "Domain" },
            ]}
          />
        </Field>
        <Field
          label="Pattern"
          hint={
            matchType === "app"
              ? "e.g. code.exe, slack.exe"
              : "e.g. github.com, youtube.com"
          }
        >
          <TextInput
            value={pattern}
            onChange={setPattern}
            placeholder={matchType === "app" ? "code.exe" : "github.com"}
            autoFocus
          />
        </Field>
        <Field label="Category">
          <Select
            value={String(categoryId ?? "")}
            onChange={(v) => setCategoryId(parseInt(v, 10))}
            options={categories.map((c) => ({
              value: String(c.id),
              label: c.name,
            }))}
          />
        </Field>
        <Field label="Priority" hint="Higher wins ties. Default 100.">
          <TextInput value={priority} onChange={setPriority} />
        </Field>
        {err && <ErrorBanner>{err}</ErrorBanner>}
      </div>
    </Modal>
  );
}

interface BulkImportModalProps {
  open: boolean;
  categories: Category[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

function BulkImportModal({ open, categories, onClose, onSaved }: BulkImportModalProps) {
  const [text, setText] = useState("");
  const [matchType, setMatchType] = useState<"app" | "domain">("domain");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setText("");
    setMatchType("domain");
    setCategoryId(categories[0]?.id ?? null);
    setResult(null);
    setErr(null);
  }, [open, categories]);

  async function handleImport() {
    if (!categoryId) return;
    const patterns = text
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (patterns.length === 0) return;

    setSaving(true);
    setErr(null);
    try {
      const added = await bulkAddCategoryRules(
        patterns.map((p) => ({
          match_type: matchType,
          pattern: p,
          category_id: categoryId,
        })),
      );
      setResult(added);
      await onSaved();
    } catch (e) {
      setErr(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bulk import patterns"
      description="Paste one app or domain per line. Duplicates are skipped."
      widthClassName="max-w-lg"
      footer={
        <>
          <SecondaryButton onClick={onClose}>Close</SecondaryButton>
          <PrimaryButton
            onClick={handleImport}
            disabled={saving || !text.trim() || !categoryId}
          >
            {saving ? "Importing…" : "Import"}
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Match type">
          <Select
            value={matchType}
            onChange={(v) => setMatchType(v as "app" | "domain")}
            options={[
              { value: "domain", label: "Domains" },
              { value: "app", label: "App executables" },
            ]}
          />
        </Field>
        <Field label="Category">
          <Select
            value={String(categoryId ?? "")}
            onChange={(v) => setCategoryId(parseInt(v, 10))}
            options={categories.map((c) => ({
              value: String(c.id),
              label: c.name,
            }))}
          />
        </Field>
        <Field label="Patterns">
          <textarea
            rows={8}
            value={text}
            onChange={(e) => setText(e.currentTarget.value)}
            placeholder={"youtube.com\nnetflix.com\nhulu.com"}
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100 outline-none focus:border-emerald-500/50"
          />
        </Field>
        {result !== null && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-900/60 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-200">
            <CheckCircle2 className="h-4 w-4" />
            Imported {result} new rule{result === 1 ? "" : "s"}.
          </div>
        )}
        {err && <ErrorBanner>{err}</ErrorBanner>}
      </div>
    </Modal>
  );
}

function IgnoredTab() {
  const [apps, setApps] = useState<string[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newApp, setNewApp] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const [a, d] = await Promise.all([getIgnoredApps(), getIgnoredDomains()]);
      setApps(a);
      setDomains(d);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleAddApp() {
    const value = newApp.trim();
    if (!value) return;
    try {
      await addIgnoredApp(value);
      setNewApp("");
      await refresh();
    } catch (e) {
      setErr(String(e));
    }
  }
  async function handleRemoveApp(name: string) {
    try {
      await removeIgnoredApp(name);
      await refresh();
    } catch (e) {
      setErr(String(e));
    }
  }
  async function handleAddDomain() {
    const value = newDomain.trim();
    if (!value) return;
    try {
      await addIgnoredDomain(value);
      setNewDomain("");
      await refresh();
    } catch (e) {
      setErr(String(e));
    }
  }
  async function handleRemoveDomain(domain: string) {
    try {
      await removeIgnoredDomain(domain);
      await refresh();
    } catch (e) {
      setErr(String(e));
    }
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Ignored apps & sites"
        description="ChronoScope will never log activity for these. Patterns are matched against the executable name (e.g. KeePass.exe) or domain."
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <IgnoreList
          title="Ignored apps"
          placeholder="KeePass.exe"
          loading={loading}
          items={apps}
          value={newApp}
          onChange={setNewApp}
          onAdd={handleAddApp}
          onRemove={handleRemoveApp}
        />
        <IgnoreList
          title="Ignored domains"
          placeholder="bank.example.com"
          loading={loading}
          items={domains}
          value={newDomain}
          onChange={setNewDomain}
          onAdd={handleAddDomain}
          onRemove={handleRemoveDomain}
        />
      </div>
      {err && (
        <div className="rounded-md border border-rose-900/60 bg-rose-950/30 px-3 py-2 text-xs text-rose-300">
          {err}
        </div>
      )}
    </div>
  );
}

interface IgnoreListProps {
  title: string;
  placeholder: string;
  loading: boolean;
  items: string[];
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (item: string) => void;
}

function IgnoreList({
  title,
  placeholder,
  loading,
  items,
  value,
  onChange,
  onAdd,
  onRemove,
}: IgnoreListProps) {
  return (
    <Card>
      <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
        />
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>
      <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto">
        {loading ? (
          <li className="py-2 text-xs text-zinc-500">Loading…</li>
        ) : items.length === 0 ? (
          <li className="rounded-md border border-dashed border-zinc-900 px-3 py-4 text-center text-xs text-zinc-500">
            Nothing ignored yet.
          </li>
        ) : (
          items.map((it) => (
            <li
              key={it}
              className="flex items-center justify-between gap-3 rounded-md bg-zinc-900/40 px-2.5 py-1.5"
            >
              <span className="truncate font-mono text-xs text-zinc-200">{it}</span>
              <button
                type="button"
                onClick={() => onRemove(it)}
                className="grid h-6 w-6 place-items-center rounded text-zinc-500 hover:bg-zinc-900 hover:text-rose-300"
                title="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))
        )}
      </ul>
    </Card>
  );
}

function PrivacyTab() {
  const [dbPath, setDbPath] = useState<string>("");
  const [busy, setBusy] = useState<"json" | "csv" | "delete" | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    getDatabasePath()
      .then(setDbPath)
      .catch(() => setDbPath(""));
  }, []);

  async function pickPath(filters: { name: string; extensions: string[] }[], defaultName: string): Promise<string | null> {
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      return await save({ defaultPath: defaultName, filters });
    } catch {
      return null;
    }
  }

  async function handleExportJson() {
    setStatus(null);
    setErr(null);
    const path = await pickPath(
      [{ name: "JSON", extensions: ["json"] }],
      `chronoscope-${new Date().toISOString().slice(0, 10)}.json`,
    );
    if (!path) return;
    setBusy("json");
    try {
      const count = await exportDataJson(path);
      setStatus(`Exported ${count} events to ${path}.`);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(null);
    }
  }

  async function handleExportCsv() {
    setStatus(null);
    setErr(null);
    const path = await pickPath(
      [{ name: "CSV", extensions: ["csv"] }],
      `chronoscope-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    if (!path) return;
    setBusy("csv");
    try {
      const count = await exportDataCsv(path);
      setStatus(`Exported ${count} events to ${path}.`);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(null);
    }
  }

  async function handleOpenFolder() {
    try {
      await openDatabaseFolder();
    } catch (e) {
      setErr(String(e));
    }
  }

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Privacy & data"
        description="Your data stays on this device. Export it or wipe it any time."
      />
      <Card>
        <Row
          label="Export as JSON"
          hint="All raw events as a JSON array."
        >
          <SecondaryButton onClick={handleExportJson} disabled={busy !== null}>
            <FileJson className="h-4 w-4" />
            {busy === "json" ? "Exporting…" : "Export JSON"}
          </SecondaryButton>
        </Row>
        <Divider />
        <Row
          label="Export as CSV"
          hint="One row per event, easy to open in Excel."
        >
          <SecondaryButton onClick={handleExportCsv} disabled={busy !== null}>
            <FileSpreadsheet className="h-4 w-4" />
            {busy === "csv" ? "Exporting…" : "Export CSV"}
          </SecondaryButton>
        </Row>
        <Divider />
        <Row
          label="Database location"
          hint="ChronoScope writes a single SQLite file."
        >
          <div className="flex items-center gap-2">
            <code className="max-w-[280px] truncate rounded-md border border-zinc-900 bg-zinc-950 px-2 py-1 font-mono text-[11px] text-zinc-300">
              {dbPath || "—"}
            </code>
            <SecondaryButton onClick={handleOpenFolder} disabled={!dbPath}>
              <FolderOpen className="h-4 w-4" />
              Open folder
            </SecondaryButton>
          </div>
        </Row>
        <Divider />
        <Row
          label="Encrypt database"
          hint="Coming in a future release (SQLCipher)."
        >
          <div className="inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-400">
            <Lock className="h-3 w-3" />
            Coming soon
          </div>
        </Row>
      </Card>

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-rose-200">
              <AlertTriangle className="h-4 w-4" />
              Delete all tracking data
            </div>
            <p className="mt-1 max-w-md text-xs text-zinc-400">
              Permanently removes every event from the database. Categories, rules,
              and ignore lists are preserved.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-rose-900/60 bg-rose-950/40 px-3 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-900/40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete data…
          </button>
        </div>
      </Card>

      {status && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-900/60 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-200">
          <CheckCircle2 className="h-4 w-4" />
          {status}
        </div>
      )}
      {err && <ErrorBanner>{err}</ErrorBanner>}

      <DeleteAllModal
        open={confirmDelete}
        busy={busy === "delete"}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setBusy("delete");
          setErr(null);
          setStatus(null);
          try {
            await deleteAllData();
            setStatus("All event data deleted.");
            setConfirmDelete(false);
          } catch (e) {
            setErr(String(e));
          } finally {
            setBusy(null);
          }
        }}
      />
    </div>
  );
}

interface DeleteAllModalProps {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteAllModal({ open, busy, onClose, onConfirm }: DeleteAllModalProps) {
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTyped("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const armed = typed === "DELETE";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delete all event data?"
      description="This action cannot be undone."
      footer={
        <>
          <SecondaryButton onClick={onClose} disabled={busy}>
            Cancel
          </SecondaryButton>
          <button
            type="button"
            disabled={!armed || busy}
            onClick={onConfirm}
            className={cn(
              "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
              armed && !busy
                ? "border-rose-700 bg-rose-900/60 text-rose-100 hover:bg-rose-900"
                : "cursor-not-allowed border-zinc-800 bg-zinc-900 text-zinc-500",
            )}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {busy ? "Deleting…" : "Delete forever"}
          </button>
        </>
      }
    >
      <p className="text-sm text-zinc-300">
        Type <span className="font-mono text-rose-300">DELETE</span> to confirm.
      </p>
      <input
        ref={inputRef}
        type="text"
        value={typed}
        onChange={(e) => setTyped(e.currentTarget.value)}
        className="mt-3 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus:border-rose-500/60"
      />
    </Modal>
  );
}

function AboutTab() {
  const version = useMemo(() => {
    try {
      return __APP_VERSION__;
    } catch {
      return "0.1.0";
    }
  }, []);
  const buildDate = useMemo(() => {
    try {
      return __BUILD_DATE__;
    } catch {
      return "";
    }
  }, []);

  return (
    <div className="space-y-4">
      <SectionTitle title="About" description="ChronoScope desktop time tracker." />
      <Card>
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-lg font-bold text-zinc-950">
            C
          </div>
          <div>
            <div className="text-base font-semibold text-zinc-100">ChronoScope</div>
            <div className="font-mono text-xs text-zinc-500 tabular-nums">
              v{version} · build {buildDate || "dev"}
            </div>
          </div>
        </div>
        <Divider />
        <Row label="Source code" hint="Issues and contributions welcome.">
          <a
            href="https://github.com/huslayer826/chronoscope"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
          >
            <Code2 className="h-3.5 w-3.5" />
            github.com/huslayer826/chronoscope
            <ExternalLink className="h-3 w-3" />
          </a>
        </Row>
        <Divider />
        <Row label="Updates" hint="Auto-update wiring lands in Phase 14.">
          <div className="inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-400">
            <Download className="h-3 w-3" />
            Check for updates (soon)
          </div>
        </Row>
        <Divider />
        <Row label="License" hint="MIT — see repository for full text.">
          <span className="text-xs text-zinc-300">MIT</span>
        </Row>
      </Card>
    </div>
  );
}

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
      {description && <p className="text-xs text-zinc-500">{description}</p>}
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium text-zinc-100">{label}</div>
        {hint && <div className="text-xs text-zinc-500">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="h-px w-full bg-zinc-900" />;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-zinc-500">{hint}</p>}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        className="w-full appearance-none rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 pr-8 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-zinc-950">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition-colors hover:bg-emerald-400",
        "disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-800",
        "disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      {children}
    </button>
  );
}

function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-rose-900/60 bg-rose-950/30 px-3 py-2 text-xs text-rose-300">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
