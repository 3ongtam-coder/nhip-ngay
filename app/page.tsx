"use client";

import {
  BarChart3,
  Bell,
  BellOff,
  Brain,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronRight,
  Circle,
  Clock3,
  Clipboard,
  Flame,
  Flag,
  GraduationCap,
  HeartPulse,
  Home,
  House,
  KeyRound,
  LayoutList,
  Loader2,
  Mic,
  MicOff,
  Moon,
  NotebookPen,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Sun,
  Trash2,
  WalletCards,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import React, {
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

// Web Speech API types (not in default TS lib)
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
}
interface SpeechRecognitionResultEvent extends Event {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}

type Category = "work" | "health" | "growth" | "home" | "finance" | "other";
type Priority = "high" | "medium" | "low";
type Energy = "high" | "medium" | "low";
type View = "today" | "plan" | "notes" | "stats";

type AiDraft = {
  title: string;
  category: Category;
  priority: Priority;
  energy: Energy;
  date: string;
  time: string;          // "" = AI không xác định được → bắt buộc nhập thủ công
  needsTime?: boolean;   // true khi time trống
  duration: number;
  outcome: string;
  preparation: string[];
  steps: string[];
  note: string;
};

type CheckItem = {
  id: string;
  text: string;
  done: boolean;
};

type Task = {
  id: string;
  title: string;
  category: Category;
  date: string;
  time: string;
  duration: number;
  priority: Priority;
  energy: Energy;
  outcome: string;
  note: string;
  preparation: CheckItem[];
  steps: CheckItem[];
  done: boolean;
  createdAt: number;
};

type Reflection = {
  win: string;
  improve: string;
  tomorrow: string;
};

const STORAGE_KEY = "nhip-ngay-data-v1";
const HISTORY_KEY = "nhip-ngay-history-v1";
const THEME_KEY = "nhip-ngay-theme-v1";

type DayRecord = { total: number; done: number };
type HistoryData = { [date: string]: DayRecord };

function calcStreak(history: HistoryData): number {
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const check = new Date(d);
    check.setDate(check.getDate() - i);
    const key = dateKey(check);
    const record = history[key];
    if (!record || record.total === 0) {
      if (i === 0) continue; // today not recorded yet — skip
      break;
    }
    if (record.done === 0) break;
    streak++;
  }
  return streak;
}

const CONFETTI_COLORS = ["#f05a28", "#42765a", "#f5c518", "#4a90d9", "#e84393", "#9b59b6"];

function ConfettiShower() {
  const pieces = Array.from({ length: 40 }, (_, i) => (
    <div
      key={i}
      className="confetti-piece"
      style={{
        left: `${(i / 40) * 100 + (Math.sin(i) * 5)}%`,
        animationDelay: `${(i % 8) * 0.12}s`,
        animationDuration: `${1.0 + (i % 5) * 0.18}s`,
        background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        borderRadius: i % 3 === 0 ? "50%" : "2px",
        width: `${8 + (i % 4) * 2}px`,
        height: `${8 + (i % 4) * 2}px`,
      }}
    />
  ));
  return <div className="confetti-container" aria-hidden="true">{pieces}</div>;
}

const categories: Record<Category, { label: string; short: string }> = {
  work: { label: "Công việc", short: "Việc" },
  health: { label: "Sức khỏe", short: "Khỏe" },
  growth: { label: "Phát triển", short: "Học" },
  home: { label: "Gia đình", short: "Nhà" },
  finance: { label: "Tài chính", short: "Tiền" },
  other: { label: "Khác", short: "Khác" },
};

const priorities: Record<Priority, { label: string; rank: number }> = {
  high: { label: "Cao", rank: 3 },
  medium: { label: "Vừa", rank: 2 },
  low: { label: "Nhẹ", rank: 1 },
};

function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeItem(text: string, done = false): CheckItem {
  return { id: uid(), text, done };
}

function seedTasks(): Task[] {
  const today = dateKey();
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);

  return [
    {
      id: "ota-pricing",
      title: "Chốt giá OTA",
      category: "work",
      date: today,
      time: "09:00",
      duration: 45,
      priority: "high",
      energy: "high",
      outcome: "Có bảng giá cuối cùng sau khi tính đủ voucher và biên lợi nhuận.",
      note: "Kiểm tra riêng chương trình mobile và package trước khi chốt.",
      preparation: [
        { id: "prep-laptop", text: "Laptop", done: true },
        { id: "prep-price", text: "Bảng giá", done: true },
        { id: "prep-voucher", text: "Ảnh voucher", done: false },
      ],
      steps: [
        { id: "step-current", text: "Ghi giá bán hiện tại", done: true },
        { id: "step-stack", text: "Tính mức giảm cộng dồn", done: false },
        { id: "step-final", text: "Chốt giá niêm yết mới", done: false },
      ],
      done: false,
      createdAt: Date.now() - 3000,
    },
    {
      id: "workout",
      title: "30 phút tập luyện",
      category: "health",
      date: today,
      time: "17:30",
      duration: 30,
      priority: "medium",
      energy: "medium",
      outcome: "Hoàn thành đủ bài tập, không cần tập quá sức.",
      note: "Khởi động kỹ vai và lưng.",
      preparation: [
        { id: "prep-water", text: "Bình nước", done: false },
        { id: "prep-shoes", text: "Giày tập", done: true },
      ],
      steps: [
        { id: "step-warm", text: "Khởi động 5 phút", done: false },
        { id: "step-main", text: "Bài chính 20 phút", done: false },
        { id: "step-cool", text: "Thả lỏng 5 phút", done: false },
      ],
      done: false,
      createdAt: Date.now() - 2000,
    },
    {
      id: "english",
      title: "Học tiếng Anh",
      category: "growth",
      date: today,
      time: "20:30",
      duration: 30,
      priority: "medium",
      energy: "low",
      outcome: "Nhớ và dùng được 10 từ mới trong một đoạn ngắn.",
      note: "Ôn lại một lần trước khi ngủ.",
      preparation: [{ id: "prep-book", text: "Sổ từ vựng", done: false }],
      steps: [
        { id: "step-words", text: "Học 10 từ mới", done: false },
        { id: "step-write", text: "Viết đoạn 5 câu", done: false },
      ],
      done: false,
      createdAt: Date.now() - 1000,
    },
    {
      id: "tomorrow-budget",
      title: "Rà soát chi phí tuần",
      category: "finance",
      date: dateKey(tomorrowDate),
      time: "10:00",
      duration: 25,
      priority: "low",
      energy: "medium",
      outcome: "Biết ba khoản có thể tối ưu trong tuần tới.",
      note: "",
      preparation: [{ id: "prep-bank", text: "Sao kê ngân hàng", done: false }],
      steps: [{ id: "step-review", text: "Nhóm các khoản chi", done: false }],
      done: false,
      createdAt: Date.now(),
    },
  ];
}

function CategoryIcon({ category, size = 16 }: { category: Category; size?: number }) {
  const props = { size, strokeWidth: 1.8, "aria-hidden": true };
  if (category === "work") return <BriefcaseBusiness {...props} />;
  if (category === "health") return <HeartPulse {...props} />;
  if (category === "growth") return <GraduationCap {...props} />;
  if (category === "home") return <House {...props} />;
  if (category === "finance") return <WalletCards {...props} />;
  return <Sparkles {...props} />;
}

function formatShortDate(value: string) {
  const parsed = new Date(`${value}T12:00:00`);
  if (value === dateKey()) return "Hôm nay";
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (value === dateKey(tomorrow)) return "Ngày mai";
  return new Intl.DateTimeFormat("vi-VN", { weekday: "short", day: "numeric", month: "numeric" }).format(parsed);
}

function splitLines(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => makeItem(item));
}

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [reflection, setReflection] = useState<Reflection>({ win: "", improve: "", tomorrow: "" });
  const [activeView, setActiveView] = useState<View>("today");
  const [selectedId, setSelectedId] = useState("ota-pricing");
  const [detailOpen, setDetailOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");
  const [prepInput, setPrepInput] = useState("");
  const [stepInput, setStepInput] = useState("");
  const [online, setOnline] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState("");
  const [focus, setFocus] = useState<{ taskId: string; remaining: number; running: boolean } | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [history, setHistory] = useState<HistoryData>({});
  const [showConfetti, setShowConfetti] = useState(false);
  const prevCompletedRef = React.useRef(0);

  // Voice + AI state
  const [mistralKey, setMistralKey] = useState("");
  const [keyOnline, setKeyOnline] = useState(false);         // true khi key đã lưu trên server
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [textInput, setTextInput] = useState("");           // ô nhập văn bản tự do
  const [aiDrafts, setAiDrafts] = useState<AiDraft[]>([]);  // thay thế aiDraft
  const [formKey, setFormKey] = useState(0);
  const [keyInputValue, setKeyInputValue] = useState("");
  const srRef = React.useRef<SpeechRecognitionInstance | null>(null);

  // Notification state
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [notifyPermission, setNotifyPermission] = useState<NotificationPermission>("default");
  const [notifyLeadMin, setNotifyLeadMin] = useState(15); // phút nhắc trước
  const notifyTimers = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [showNotifySettings, setShowNotifySettings] = useState(false);

  // Cross-device sync state
  const [syncCode, setSyncCode] = useState("");
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncInput, setSyncInput] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const lastSyncTimeRef = React.useRef<number>(0);
  const syncTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);


  const today = dateKey();
  const todayTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.date === today)
        .sort((a, b) => priorities[b.priority].rank - priorities[a.priority].rank || a.time.localeCompare(b.time)),
    [tasks, today],
  );
  const completedToday = todayTasks.filter((task) => task.done).length;
  const progress = todayTasks.length ? Math.round((completedToday / todayTasks.length) * 100) : 0;
  const selectedTask = tasks.find((task) => task.id === selectedId) ?? tasks[0];

  const fullDate = useMemo(() => {
    const text = new Intl.DateTimeFormat("vi-VN", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date());
    return text.charAt(0).toUpperCase() + text.slice(1);
  }, []);

  const streak = useMemo(() => calcStreak(history), [history]);

  const heatmapCells = useMemo(() => {
    const cells: React.ReactNode[] = [];
    const start = new Date();
    start.setDate(start.getDate() - 83);
    for (let i = 0; i < 84; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = dateKey(d);
      const rec = history[key];
      const pct = rec?.total ? rec.done / rec.total : 0;
      const level = pct === 0 ? 0 : pct < 0.34 ? 1 : pct < 0.67 ? 2 : pct < 1 ? 3 : 4;
      const label = rec ? `${key}: ${rec.done}/${rec.total} hoàn thành` : key;
      cells.push(<div key={key} className={`heat-cell heat-${level}`} title={label} />);
    }
    return cells;
  }, [history]);

  function toggleTheme() {
    setTheme(t => t === "light" ? "dark" : "light");
  }

  useEffect(() => {
    const initialize = window.requestAnimationFrame(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as { tasks?: Task[]; reflection?: Reflection };
          if (Array.isArray(parsed.tasks) && parsed.tasks.length) {
            setTasks(parsed.tasks);
            setSelectedId(parsed.tasks[0].id);
          }
          if (parsed.reflection) setReflection(parsed.reflection);
        }
        // Load history
        const storedHistory = localStorage.getItem(HISTORY_KEY);
        if (storedHistory) setHistory(JSON.parse(storedHistory));
        // Load theme
        const savedTheme = localStorage.getItem(THEME_KEY) as "light" | "dark" | null;
        const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        const resolved = savedTheme ?? preferred;
        setTheme(resolved);
        document.documentElement.setAttribute("data-theme", resolved);
        // Load notification settings
        const savedLeadMin = localStorage.getItem("nhip-ngay-notify-lead");
        if (savedLeadMin) setNotifyLeadMin(Number(savedLeadMin));
        const savedNotifyEnabled = localStorage.getItem("nhip-ngay-notify-enabled");
        if (savedNotifyEnabled === "1") setNotifyEnabled(true);
        // Load or initialize sync code
        let code = localStorage.getItem("nhip-ngay-sync-code");
        if (!code) {
          const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
          let rand = "";
          for (let i = 0; i < 4; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length));
          code = `NHIP-${rand}`;
          try { localStorage.setItem("nhip-ngay-sync-code", code); } catch {}
        }
        setSyncCode(code);
        pullSync(code, false);
      } catch {
        // Keep the safe starter data when local storage is unavailable or malformed.
      }
      // Load Mistral API key — ưu tiên cookie (server) > localStorage (offline fallback)
      fetch("/api/key")
        .then(r => r.json() as Promise<{ key: string }>)
        .then(({ key }) => {
          if (key) { setMistralKey(key); setKeyOnline(true); }
          else {
            const savedKey = localStorage.getItem("nhip-ngay-mistral-key");
            if (savedKey) setMistralKey(savedKey);
          }
        })
        .catch(() => {
          const savedKey = localStorage.getItem("nhip-ngay-mistral-key");
          if (savedKey) setMistralKey(savedKey);
        });
      // Check notification permission
      if (typeof Notification !== "undefined") {
        setNotifyPermission(Notification.permission);
      }
      setOnline(navigator.onLine);
      setHydrated(true);
    });
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    return () => {
      window.cancelAnimationFrame(initialize);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // ── Schedule notifications when tasks / settings change ──────────────────────
  useEffect(() => {
    // Cancel all existing timers
    notifyTimers.current.forEach(id => clearTimeout(id));
    notifyTimers.current.clear();

    if (!notifyEnabled || notifyPermission !== "granted") return;

    const now = Date.now();
    const todayStr = dateKey();

    tasks.forEach(task => {
      if (task.done) return;
      if (task.date !== todayStr) return;
      if (!task.time || !/^\d{2}:\d{2}$/.test(task.time)) return;

      const [h, m] = task.time.split(":").map(Number);
      const taskMs = new Date().setHours(h, m, 0, 0);
      const fireMs = taskMs - notifyLeadMin * 60 * 1000;
      const delay = fireMs - now;
      if (delay <= 0) return; // đã qua giờ

      const id = setTimeout(() => {
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          const n = new Notification("\u23F0 Nhịp Ngày — Sắp đến giờ!", {
            body: `《${task.title}》 sẽ bắt đầu sau ${notifyLeadMin} phút`,
            icon: "/favicon.svg",
            tag: task.id,
            silent: false,
          });
          n.onclick = () => { window.focus(); n.close(); };
        }
        // Also notify via SW for background support
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification("\u23F0 Nhịp Ngày — Sắp đến giờ!", {
            body: `《${task.title}》 sẽ bắt đầu sau ${notifyLeadMin} phút`,
            icon: "/favicon.svg",
            tag: task.id,
            data: { url: "/" },
          });
        }).catch(() => {});
      }, delay);

      notifyTimers.current.set(task.id, id);
    });

    return () => {
      notifyTimers.current.forEach(id => clearTimeout(id));
      notifyTimers.current.clear();
    };
  }, [tasks, notifyEnabled, notifyPermission, notifyLeadMin]);

  // ── Sync Helper Functions ────────────────────────────────────────────────────
  async function pushSync(codeToUse: string, payload: { tasks: Task[]; reflection: Reflection; history: HistoryData; mistralKey?: string }) {
    if (!codeToUse || !online) return;
    setIsSyncing(true);
    const dataToPush = {
      tasks: payload.tasks,
      reflection: payload.reflection,
      history: payload.history,
      mistralKey: (payload.mistralKey ?? mistralKey).trim(),
    };
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeToUse, data: dataToPush }),
      });
      if (res.ok) {
        const data = await res.json() as { updatedAt: number };
        setLastSyncTime(data.updatedAt);
        lastSyncTimeRef.current = data.updatedAt;
      }
    } catch {
      // Silently handle offline/sync network errors
    } finally {
      setIsSyncing(false);
    }
  }

  async function pullSync(codeToUse: string, isManual = false) {
    if (!codeToUse || !online) return;
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/sync?code=${encodeURIComponent(codeToUse)}`);
      if (!res.ok) throw new Error("Sync failed");
      const json = await res.json() as { code: string; data: { tasks?: Task[]; reflection?: Reflection; history?: HistoryData; mistralKey?: string } | null; updatedAt: number };
      if (json.data && Array.isArray(json.data.tasks)) {
        if (isManual || json.updatedAt > lastSyncTimeRef.current) {
          setTasks(json.data.tasks);
          if (json.data.reflection) setReflection(json.data.reflection);
          if (json.data.history) setHistory(json.data.history);
          if (json.data.mistralKey && json.data.mistralKey.trim()) {
            const k = json.data.mistralKey.trim();
            setMistralKey(k);
            setKeyOnline(true);
            try { localStorage.setItem("nhip-ngay-mistral-key", k); } catch {}
            fetch("/api/key", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: k }) }).catch(() => {});
          }
          setLastSyncTime(json.updatedAt);
          lastSyncTimeRef.current = json.updatedAt;
          if (isManual) setToast(`Đã đồng bộ dữ liệu từ mã ${codeToUse}!`);
        }
      } else if (isManual) {
        pushSync(codeToUse, { tasks, reflection, history, mistralKey });
        setToast(`Mã ${codeToUse} mới — đã tải dữ liệu hiện tại lên!`);
      }
    } catch {
      if (isManual) setToast("Không thể kết nối máy chủ đồng bộ.");
    } finally {
      setIsSyncing(false);
    }
  }

  // Auto push sync on data change
  useEffect(() => {
    if (!hydrated || !syncCode || !online) return;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      pushSync(syncCode, { tasks, reflection, history, mistralKey });
    }, 1500);
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [tasks, reflection, history, mistralKey, syncCode, online, hydrated]);

  // Auto pull sync periodically (every 25s)
  useEffect(() => {
    if (!hydrated || !syncCode || !online) return;
    const timer = setInterval(() => {
      pullSync(syncCode, false);
    }, 25000);
    return () => clearInterval(timer);
  }, [syncCode, online, hydrated]);

  // Persist theme + apply to DOM
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (hydrated) localStorage.setItem(THEME_KEY, theme);
  }, [theme, hydrated]);

  // Save daily completion history & trigger confetti
  useEffect(() => {
    if (!hydrated) return;
    const record: DayRecord = { total: todayTasks.length, done: completedToday };
    setHistory(prev => {
      const updated = { ...prev, [today]: record };
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
    // Confetti: trigger only when newly completing all tasks
    if (todayTasks.length > 0 && completedToday === todayTasks.length && prevCompletedRef.current < todayTasks.length) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3600);
    }
    prevCompletedRef.current = completedToday;
  }, [tasks, hydrated, today]); // eslint-disable-line

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks, reflection }));
  }, [tasks, reflection, hydrated]);

  useEffect(() => {
    if (!focus?.running) return;
    const timer = window.setInterval(() => {
      setFocus((current) => {
        if (!current || current.remaining <= 1) {
          setToast("Hết một nhịp tập trung — nghỉ một chút nhé.");
          return current ? { ...current, remaining: 0, running: false } : null;
        }
        return { ...current, remaining: current.remaining - 1 };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [focus?.running]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // ── Mistral AI analysis ──────────────────────────────────────────────────────
  function sanitizeDraft(raw: Partial<AiDraft>, todayStr: string): AiDraft {
    const rawTime = String(raw.time ?? "").trim();
    const hasTime = /^\d{2}:\d{2}$/.test(rawTime) && rawTime !== "00:00";
    return {
      title:       String(raw.title ?? ""),
      category:    (["work","health","growth","home","finance","other"].includes(raw.category ?? "") ? raw.category : "work") as Category,
      priority:    (["high","medium","low"].includes(raw.priority ?? "") ? raw.priority : "medium") as Priority,
      energy:      (["high","medium","low"].includes(raw.energy ?? "") ? raw.energy : "medium") as Energy,
      date:        /^\d{4}-\d{2}-\d{2}$/.test(raw.date ?? "") ? raw.date! : todayStr,
      time:        hasTime ? rawTime : "",
      needsTime:   !hasTime,
      duration:    Number(raw.duration) > 0 ? Number(raw.duration) : 30,
      outcome:     String(raw.outcome ?? ""),
      preparation: Array.isArray(raw.preparation) ? raw.preparation.map(String) : [],
      steps:       Array.isArray(raw.steps) ? raw.steps.map(String) : [],
      note:        String(raw.note ?? ""),
    };
  }

  async function callMistralAI(text: string) {
    const key = mistralKey.trim();
    if (!key) { setShowKeyInput(true); return; }
    setIsAnalyzing(true);
    const todayStr = dateKey();
    const systemPrompt = `You are a strict task extraction assistant. Respond ONLY with a single valid JSON object. No explanation, no markdown fences, no extra text whatsoever.`;
    const userPrompt = `Extract ALL tasks from the following Vietnamese text. Return a JSON object with a "tasks" array.
If the text mentions multiple tasks, return multiple items. If only one task, return one item.

Each task object MUST have these fields:
{
  "title": "short task name in Vietnamese",
  "category": "work|health|growth|home|finance|other",
  "priority": "high|medium|low",
  "energy": "high|medium|low",
  "date": "YYYY-MM-DD (use ${todayStr} if not mentioned)",
  "time": "HH:MM if explicitly mentioned, or \"\" if time is unclear or not mentioned",
  "duration": <integer minutes, infer from context or use 30>,
  "outcome": "1-2 sentence success criteria in Vietnamese",
  "preparation": ["item1"],
  "steps": ["step1", "step2"],
  "note": "extra context or empty string"
}

IMPORTANT: Set "time" to empty string "" when the time cannot be clearly determined. Do NOT guess a time.

Return format: { "tasks": [ {...}, {...} ] }

Text: "${text}"`;
    try {
      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
        body: JSON.stringify({
          model: "mistral-large-latest",
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { choices: { message: { content: string } }[] };
      const raw = data.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw) as { tasks?: Partial<AiDraft>[] } | Partial<AiDraft>;

      // Support both { tasks: [...] } and legacy single-object response
      const rawList: Partial<AiDraft>[] = Array.isArray((parsed as { tasks?: Partial<AiDraft>[] }).tasks)
        ? (parsed as { tasks: Partial<AiDraft>[] }).tasks
        : [parsed as Partial<AiDraft>];

      if (!rawList.length) throw new Error("no tasks");
      const drafts = rawList.filter(d => d.title).map(d => sanitizeDraft(d, todayStr));
      if (!drafts.length) throw new Error("no valid tasks");

      setAiDrafts(drafts);
      if (drafts.length === 1) {
        setFormKey(k => k + 1); // trigger form re-render with new defaultValues
        setToast("AI đã phân tích xong — kiểm tra và lưu nhé!");
      } else {
        setToast(`AI tìm thấy ${drafts.length} công việc — kiểm tra và chỉnh sửa nhé!`);
      }
    } catch {
      setToast("Không thể phân tích. Kiểm tra API key hoặc thử lại.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  // ── Multi-draft helpers ───────────────────────────────────────────────────────
  function updateDraft(index: number, updates: Partial<AiDraft>) {
    setAiDrafts(prev => prev.map((d, i) => {
      if (i !== index) return d;
      const updated = { ...d, ...updates };
      // Re-evaluate needsTime when time changes
      if ("time" in updates) {
        updated.needsTime = !/^\d{2}:\d{2}$/.test(updated.time) || updated.time === "00:00";
      }
      return updated;
    }));
  }

  function removeDraft(index: number) {
    setAiDrafts(prev => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 1) {
        // Switch back to single-form mode
        setFormKey(k => k + 1);
      }
      return next;
    });
  }

  function addAllDrafts() {
    const newTasks: Task[] = aiDrafts.map(draft => ({
      id: uid(),
      title: draft.title,
      category: draft.category,
      priority: draft.priority,
      energy: draft.energy,
      date: draft.date,
      time: draft.time || "09:00",
      duration: draft.duration,
      outcome: draft.outcome,
      note: draft.note,
      preparation: draft.preparation.map(t => makeItem(t)),
      steps: draft.steps.map(t => makeItem(t)),
      done: false,
      createdAt: Date.now(),
    }));
    setTasks(prev => [...prev, ...newTasks]);
    setAiDrafts([]);
    setVoiceTranscript("");
    setTextInput("");
    setComposerOpen(false);
    const hasToday = newTasks.some(t => t.date === today);
    setActiveView(hasToday ? "today" : "plan");
    setToast(`Đã thêm ${newTasks.length} công việc.`);
  }

  function resetAiState() {
    setAiDrafts([]);
    setVoiceTranscript("");
    setTextInput("");
  }

  function startVoiceInput() {
    const SRClass = typeof window !== "undefined" ? (window.SpeechRecognition ?? window.webkitSpeechRecognition) : null;
    if (!SRClass) {
      setToast("Trình duyệt không hỗ trợ nhận giọng nói.");
      return;
    }
    if (isListening) {
      srRef.current?.stop();
      setIsListening(false);
      return;
    }
    const sr = new SRClass();
    srRef.current = sr;
    sr.lang = "vi-VN";
    sr.interimResults = false;
    sr.maxAlternatives = 1;
    sr.onstart = () => setIsListening(true);
    sr.onend = () => setIsListening(false);
    sr.onerror = () => { setIsListening(false); setToast("Lỗi microphone — thử lại nhé."); };
    sr.onresult = (event: SpeechRecognitionResultEvent) => {
      const text = event.results[0][0].transcript;
      setVoiceTranscript(text);
      callMistralAI(text);
    };
    sr.start();
  }

  function openTask(id: string) {
    setSelectedId(id);
    setDetailOpen(true);
    setPrepInput("");
    setStepInput("");
  }

  function toggleTask(id: string) {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
    );
  }

  function toggleCheck(taskId: string, list: "preparation" | "steps", itemId: string) {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              [list]: task[list].map((item) =>
                item.id === itemId ? { ...item, done: !item.done } : item,
              ),
            }
          : task,
      ),
    );
  }

  function addCheckItem(taskId: string, list: "preparation" | "steps", value: string) {
    const clean = value.trim();
    if (!clean) return;
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, [list]: [...task[list], makeItem(clean)] } : task,
      ),
    );
    if (list === "preparation") setPrepInput("");
    else setStepInput("");
  }

  function handleAddKey(
    event: KeyboardEvent<HTMLInputElement>,
    list: "preparation" | "steps",
    value: string,
  ) {
    if (event.key === "Enter" && selectedTask) {
      event.preventDefault();
      addCheckItem(selectedTask.id, list, value);
    }
  }

  function deleteTask(id: string) {
    setTasks((current) => current.filter((task) => task.id !== id));
    setDetailOpen(false);
    setSelectedId(tasks.find((task) => task.id !== id)?.id ?? "");
    setToast("Đã xóa công việc.");
  }

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    if (!title) return;
    const task: Task = {
      id: uid(),
      title,
      category: String(form.get("category") ?? "work") as Category,
      date: String(form.get("date") ?? today),
      time: String(form.get("time") ?? "09:00"),
      duration: Number(form.get("duration") ?? 30),
      priority: String(form.get("priority") ?? "medium") as Priority,
      energy: String(form.get("energy") ?? "medium") as Energy,
      outcome: String(form.get("outcome") ?? "").trim(),
      note: String(form.get("note") ?? "").trim(),
      preparation: splitLines(form.get("preparation")),
      steps: splitLines(form.get("steps")),
      done: false,
      createdAt: Date.now(),
    };
    setTasks((current) => [...current, task]);
    setSelectedId(task.id);
    setAiDrafts([]);
    setVoiceTranscript("");
    setTextInput("");
    setComposerOpen(false);
    setActiveView(task.date === today ? "today" : "plan");
    setToast("Đã thêm việc và lưu trên điện thoại.");
    event.currentTarget.reset();
  }

  function startFocus(taskId: string) {
    if (focus?.taskId === taskId) {
      setFocus({ ...focus, running: !focus.running });
      return;
    }
    setFocus({ taskId, remaining: 25 * 60, running: true });
    setDetailOpen(false);
    setToast("Bắt đầu một nhịp tập trung 25 phút.");
  }

  const filteredTasks = tasks
    .filter((task) => categoryFilter === "all" || task.category === categoryFilter)
    .filter((task) => task.title.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")))
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  const totalMinutes = tasks.filter((task) => task.done).reduce((sum, task) => sum + task.duration, 0);
  const preparedItems = tasks.flatMap((task) => task.preparation);
  const preparedPercent = preparedItems.length
    ? Math.round((preparedItems.filter((item) => item.done).length / preparedItems.length) * 100)
    : 0;

  function renderTaskRow(task: Task, index?: number) {
    return (
      <article
        className={`task-row ${task.id === selectedId ? "is-selected" : ""} ${task.done ? "is-done" : ""}`}
        key={task.id}
      >
        {typeof index === "number" && <span className="task-number">{String(index + 1).padStart(2, "0")}</span>}
        <button
          className="task-check"
          type="button"
          onClick={() => toggleTask(task.id)}
          aria-label={task.done ? `Đánh dấu chưa xong: ${task.title}` : `Hoàn thành: ${task.title}`}
        >
          {task.done ? <Check size={19} strokeWidth={2.4} /> : <Circle size={22} strokeWidth={1.4} />}
        </button>
        <button className="task-main" type="button" onClick={() => openTask(task.id)}>
          <span className="task-title">{task.title}</span>
          <span className="task-meta">
            <Clock3 size={14} /> {task.duration} phút
            <span className="meta-divider" />
            <CategoryIcon category={task.category} size={14} /> {categories[task.category].label}
            {task.priority === "high" && (
              <>
                <span className="meta-divider" /> <Flag size={14} /> Cao
              </>
            )}
          </span>
        </button>
        <button className="row-open" type="button" onClick={() => openTask(task.id)} aria-label={`Mở ${task.title}`}>
          <ChevronRight size={21} />
        </button>
      </article>
    );
  }

  function renderTaskDetail(task: Task | undefined, mobile = false) {
    if (!task) return null;
    const prepDone = task.preparation.filter((item) => item.done).length;
    const stepsDone = task.steps.filter((item) => item.done).length;
    return (
      <div className={`task-detail ${mobile ? "mobile-detail" : ""}`}>
        {mobile && <div className="sheet-handle" aria-hidden="true" />}
        <div className="detail-toolbar">
          <span className={`priority-badge priority-${task.priority}`}>
            <Flag size={15} /> {priorities[task.priority].label}
          </span>
          <div className="detail-actions">
            <button type="button" className="icon-button" onClick={() => deleteTask(task.id)} aria-label="Xóa công việc">
              <Trash2 size={19} />
            </button>
            {mobile && (
              <button type="button" className="icon-button" onClick={() => setDetailOpen(false)} aria-label="Đóng chi tiết">
                <X size={21} />
              </button>
            )}
          </div>
        </div>

        <h2>{task.title}</h2>
        <div className="detail-chips">
          <span><Clock3 size={16} /> {task.duration} phút</span>
          <span><CalendarDays size={16} /> {formatShortDate(task.date)}</span>
          <span><CategoryIcon category={task.category} /> {categories[task.category].label}</span>
        </div>

        {task.outcome && (
          <section className="outcome-box">
            <span className="eyebrow">Xong khi nào?</span>
            <p>{task.outcome}</p>
          </section>
        )}

        <section className="detail-section">
          <div className="section-heading">
            <h3>Chuẩn bị</h3>
            <span>{prepDone}/{task.preparation.length}</span>
          </div>
          <div className="check-list">
            {task.preparation.map((item) => (
              <label key={item.id} className={item.done ? "checked" : ""}>
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleCheck(task.id, "preparation", item.id)}
                />
                <span className="custom-check">{item.done && <Check size={15} />}</span>
                <span>{item.text}</span>
              </label>
            ))}
          </div>
          <div className="inline-add">
            <Plus size={17} />
            <input
              value={prepInput}
              onChange={(event) => setPrepInput(event.target.value)}
              onKeyDown={(event) => handleAddKey(event, "preparation", prepInput)}
              placeholder="Thêm đồ hoặc tài liệu cần chuẩn bị"
              aria-label="Thêm mục chuẩn bị"
            />
            {prepInput && <button type="button" onClick={() => addCheckItem(task.id, "preparation", prepInput)}>Thêm</button>}
          </div>
        </section>

        <section className="detail-section">
          <div className="section-heading">
            <h3>Các bước</h3>
            <span>{stepsDone}/{task.steps.length}</span>
          </div>
          <div className="check-list steps-list">
            {task.steps.map((item, index) => (
              <label key={item.id} className={item.done ? "checked" : ""}>
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleCheck(task.id, "steps", item.id)}
                />
                <span className="step-index">{item.done ? <Check size={14} /> : index + 1}</span>
                <span>{item.text}</span>
              </label>
            ))}
          </div>
          <div className="inline-add">
            <Plus size={17} />
            <input
              value={stepInput}
              onChange={(event) => setStepInput(event.target.value)}
              onKeyDown={(event) => handleAddKey(event, "steps", stepInput)}
              placeholder="Thêm bước thực hiện"
              aria-label="Thêm bước thực hiện"
            />
            {stepInput && <button type="button" onClick={() => addCheckItem(task.id, "steps", stepInput)}>Thêm</button>}
          </div>
        </section>

        {task.note && (
          <section className="note-box">
            <NotebookPen size={17} />
            <p>{task.note}</p>
          </section>
        )}

        <div className="detail-footer">
          <button className="focus-button" type="button" onClick={() => startFocus(task.id)}>
            {focus?.taskId === task.id && focus.running ? <Pause size={19} /> : <Play size={19} />}
            {focus?.taskId === task.id && focus.running ? "Tạm dừng" : "Tập trung 25′"}
          </button>
          <button className={`complete-button ${task.done ? "done" : ""}`} type="button" onClick={() => toggleTask(task.id)}>
            <Check size={19} /> {task.done ? "Đã hoàn thành" : "Hoàn thành"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="brand" type="button" onClick={() => setActiveView("today")}>
          <span>Nhịp Ngày</span>
          <i aria-hidden="true" />
        </button>

        <nav className="desktop-nav" aria-label="Điều hướng chính">
          <button className={activeView === "today" ? "active" : ""} onClick={() => setActiveView("today")}><Home size={18} /> Hôm nay</button>
          <button className={activeView === "plan" ? "active" : ""} onClick={() => setActiveView("plan")}><LayoutList size={18} /> Kế hoạch</button>
          <button className={activeView === "notes" ? "active" : ""} onClick={() => setActiveView("notes")}><NotebookPen size={18} /> Nhật ký</button>
          <button className={activeView === "stats" ? "active" : ""} onClick={() => setActiveView("stats")}><BarChart3 size={18} /> Nhịp độ</button>
        </nav>

        <div className="header-actions">
          <span className={`streak-badge ${streak === 0 ? "zero" : ""}`} title={`Chuỗi ${streak} ngày liên tiếp`}>
            <Flame size={13} />{streak > 0 ? `${streak} ngày` : "Bắt đầu hôm nay"}
          </span>
          <span className={`connection ${online ? "online" : "offline"}`} title={online ? "Đang trực tuyến" : "Đang dùng ngoại tuyến"}>
            {online ? <Wifi size={16} /> : <WifiOff size={16} />}
            <span>{online ? "Đã lưu" : "Ngoại tuyến"}</span>
          </span>
          {/* Cross-device sync button */}
          <button
            type="button"
            className={`sync-header-btn${isSyncing ? " syncing" : ""}`}
            onClick={() => setShowSyncModal(true)}
            title={`Đồng bộ đa thiết bị (Mã: ${syncCode || "..."})`}
            aria-label="Mở cài đặt đồng bộ thiết bị"
          >
            <RefreshCw size={15} className={isSyncing ? "spin-icon" : ""} />
            <span>{syncCode || "Đồng bộ"}</span>
          </button>
          {/* Notification toggle */}
          <button
            type="button"
            className={`notify-toggle${notifyEnabled && notifyPermission === "granted" ? " notify-on" : ""}`}
            onClick={() => {
              if (notifyPermission === "denied") {
                setToast("Thông báo bị chặn — vào Settings → Site Settings → Notifications để bật.");
                return;
              }
              if (notifyPermission === "default" || !notifyEnabled) {
                Notification.requestPermission().then(perm => {
                  setNotifyPermission(perm);
                  if (perm === "granted") {
                    setNotifyEnabled(true);
                    localStorage.setItem("nhip-ngay-notify-enabled", "1");
                    setShowNotifySettings(true);
                    setToast("Đã bật nhắc nhở — sẽ báo trước giờ làm việc!");
                  } else {
                    setToast("Không được phép gửi thông báo.");
                  }
                });
                return;
              }
              // Toggle off
              const next = !notifyEnabled;
              setNotifyEnabled(next);
              localStorage.setItem("nhip-ngay-notify-enabled", next ? "1" : "0");
              setToast(next ? "Đã bật nhắc nhở." : "Đã tắt nhắc nhở.");
            }}
            title={notifyPermission === "denied" ? "Thông báo bị chặn" : notifyEnabled ? "Tắt nhắc nhở" : "Bật nhắc nhở"}
            aria-label="Toggle nhắc nhở công việc"
          >
            {notifyPermission === "denied" || !notifyEnabled ? <BellOff size={17} /> : <Bell size={17} />}
          </button>
          <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={theme === "dark" ? "Chuyển sang sáng" : "Chuyển sang tối"}>
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button className="primary-add desktop-add" type="button" onClick={() => setComposerOpen(true)}><Plus size={20} /> Thêm việc</button>
        </div>
      </header>

      <main className="main-content">
        {activeView === "today" && (
          <div className="today-layout">
            <section className="day-overview">
              <p className="hand-date">{fullDate}</p>
              <h1>Hôm nay mình sẽ<br className="desktop-break" /> tiến một bước nhỏ</h1>

              <div className="progress-block">
                <div className="progress-ring" style={{ "--progress": `${progress * 3.6}deg` } as CSSProperties}>
                  <span>{progress}%</span>
                </div>
                <div>
                  <strong>{completedToday}/{todayTasks.length} hoàn thành</strong>
                  <span>{todayTasks.length - completedToday > 0 ? `Còn ${todayTasks.length - completedToday} việc, cứ làm từng việc.` : "Một ngày trọn vẹn — giỏi lắm!"}</span>
                </div>
              </div>

              <div className="priority-header">
                <span>Ba ưu tiên hôm nay</span>
                <button type="button" onClick={() => setActiveView("plan")}>Xem tất cả</button>
              </div>
              <div className="priority-list">
                {todayTasks.slice(0, 3).map((task, index) => renderTaskRow(task, index))}
                {!todayTasks.length && (
                  <button className="empty-day" type="button" onClick={() => setComposerOpen(true)}>
                    <Plus size={22} /> Thêm việc quan trọng đầu tiên
                  </button>
                )}
              </div>

              <div className="day-insight">
                <Sparkles size={18} />
                <p><strong>Gợi ý nhịp ngày:</strong> Làm việc cần nhiều tỉnh táo trước, sau đó xen một việc nhẹ để giữ đà.</p>
              </div>
            </section>

            <aside className="desktop-detail" aria-label="Chi tiết công việc đã chọn">
              {renderTaskDetail(selectedTask)}
            </aside>
          </div>
        )}

        {activeView === "plan" && (
          <section className="single-view plan-view">
            <div className="view-heading">
              <div>
                <p className="hand-date">Mọi việc, đúng chỗ</p>
                <h1>Kế hoạch của mình</h1>
              </div>
              <button className="primary-add" type="button" onClick={() => setComposerOpen(true)}><Plus size={20} /> Thêm việc</button>
            </div>
            <div className="search-box">
              <Search size={19} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm công việc..." aria-label="Tìm công việc" />
            </div>
            <div className="filter-scroll" aria-label="Lọc theo lĩnh vực">
              <button className={categoryFilter === "all" ? "active" : ""} onClick={() => setCategoryFilter("all")}>Tất cả</button>
              {(Object.keys(categories) as Category[]).map((category) => (
                <button key={category} className={categoryFilter === category ? "active" : ""} onClick={() => setCategoryFilter(category)}>
                  <CategoryIcon category={category} /> {categories[category].label}
                </button>
              ))}
            </div>
            <div className="plan-list">
              {filteredTasks.map((task, index) => (
                <div className="plan-item" key={task.id}>
                  {(index === 0 || filteredTasks[index - 1].date !== task.date) && <h2>{formatShortDate(task.date)}</h2>}
                  {renderTaskRow(task)}
                </div>
              ))}
              {!filteredTasks.length && <div className="empty-state"><Search size={28} /><h2>Chưa tìm thấy việc</h2><p>Thử từ khóa hoặc lĩnh vực khác nhé.</p></div>}
            </div>
          </section>
        )}

        {activeView === "notes" && (
          <section className="single-view journal-view">
            <div className="view-heading">
              <div>
                <p className="hand-date">Khép ngày nhẹ nhàng</p>
                <h1>Nhật ký cuối ngày</h1>
              </div>
              <span className="autosave"><Check size={15} /> Tự động lưu</span>
            </div>
            <p className="view-intro">Ba câu ngắn giúp bạn nhìn lại tiến bộ và bắt đầu ngày mai rõ ràng hơn.</p>
            <div className="journal-grid">
              <label className="journal-card win-card">
                <span>01</span>
                <strong>Điều mình làm tốt hôm nay</strong>
                <textarea value={reflection.win} onChange={(event) => setReflection({ ...reflection, win: event.target.value })} placeholder="Một việc nhỏ cũng đáng ghi nhận..." />
              </label>
              <label className="journal-card">
                <span>02</span>
                <strong>Điều mình muốn điều chỉnh</strong>
                <textarea value={reflection.improve} onChange={(event) => setReflection({ ...reflection, improve: event.target.value })} placeholder="Không phán xét, chỉ quan sát..." />
              </label>
              <label className="journal-card tomorrow-card">
                <span>03</span>
                <strong>Việc quan trọng nhất ngày mai</strong>
                <textarea value={reflection.tomorrow} onChange={(event) => setReflection({ ...reflection, tomorrow: event.target.value })} placeholder="Chỉ chọn một việc thật sự quan trọng..." />
              </label>
            </div>
          </section>
        )}

        {activeView === "stats" && (
          <section className="single-view stats-view">
            <div className="view-heading">
              <div>
                <p className="hand-date">Tiến bộ, không áp lực</p>
                <h1>Nhịp độ của mình</h1>
              </div>
              <span className="period-chip">12 tuần gần đây</span>
            </div>
            <div className="stats-grid">
              <article className="stat-card stat-primary"><span>Hoàn thành hôm nay</span><strong>{progress}%</strong><p>{completedToday} trên {todayTasks.length} công việc</p></article>
              <article className="stat-card"><span>Thời gian đã hoàn thành</span><strong>{totalMinutes}<small> phút</small></strong><p>Mỗi phút tập trung đều được tính.</p></article>
              <article className="stat-card"><span>Mức sẵn sàng</span><strong>{preparedPercent}%</strong><p>Đồ dùng và tài liệu đã chuẩn bị.</p></article>
            </div>
            <div className="heatmap-section">
              <div className="heatmap-heading">
                <div>
                  <span className="eyebrow">Lịch sử 12 tuần</span>
                  <h2>Chuỗi ngày của mình</h2>
                  <p>Mỗi ô là một ngày — màu càng đậm, càng nhiều việc xong.</p>
                </div>
                <div className="streak-display">
                  <span className="streak-num">{streak}</span>
                  <span className="streak-label">ngày liên tiếp 🔥</span>
                </div>
              </div>
              <div className="heatmap-grid" aria-label="Biểu đồ hoàn thành 84 ngày gần nhất">
                {heatmapCells}
              </div>
              <div className="heatmap-legend">
                <span>Ít</span>
                <div className="heatmap-legend-cells">
                  <div className="heat-cell" />
                  <div className="heat-cell heat-1" />
                  <div className="heat-cell heat-2" />
                  <div className="heat-cell heat-3" />
                  <div className="heat-cell heat-4" />
                </div>
                <span>Nhiều</span>
              </div>
            </div>
            <article className="rhythm-card">
              <div><span className="eyebrow">Nhận xét nhẹ</span><h2>Chuẩn bị tốt giúp bắt đầu dễ hơn.</h2><p>Bạn không cần nhồi thật nhiều việc. Hãy chọn ba ưu tiên, chuẩn bị trước và để khoảng thở giữa các nhịp.</p></div>
              <div className="rhythm-bars" aria-label="Minh họa nhịp hoàn thành trong tuần">
                {[36, 64, 48, 82, 58, 72, progress || 18].map((height, index) => <i key={index} style={{ height: `${height}%` }}><span>{["T2", "T3", "T4", "T5", "T6", "T7", "CN"][index]}</span></i>)}
              </div>
            </article>
          </section>
        )}
      </main>

      <nav className="mobile-nav" aria-label="Điều hướng trên điện thoại">
        <button className={activeView === "today" ? "active" : ""} onClick={() => setActiveView("today")}><Home size={21} /><span>Hôm nay</span></button>
        <button className={activeView === "plan" ? "active" : ""} onClick={() => setActiveView("plan")}><LayoutList size={21} /><span>Kế hoạch</span></button>
        <button className={activeView === "notes" ? "active" : ""} onClick={() => setActiveView("notes")}><NotebookPen size={21} /><span>Nhật ký</span></button>
        <button className={activeView === "stats" ? "active" : ""} onClick={() => setActiveView("stats")}><BarChart3 size={21} /><span>Nhịp độ</span></button>
      </nav>

      <button className="mobile-fab" type="button" onClick={() => setComposerOpen(true)} aria-label="Thêm công việc mới"><Plus size={27} /></button>

      {detailOpen && selectedTask && (
        <div className="sheet-layer" role="dialog" aria-modal="true" aria-label={`Chi tiết ${selectedTask.title}`}>
          <button className="sheet-backdrop" type="button" onClick={() => setDetailOpen(false)} aria-label="Đóng chi tiết" />
          {renderTaskDetail(selectedTask, true)}
        </div>
      )}

      {composerOpen && (() => {
        const singleDraft = aiDrafts.length === 1 ? aiDrafts[0] : null;
        const isMulti = aiDrafts.length > 1;
        const canAddAll = aiDrafts.every(d => /^\d{2}:\d{2}$/.test(d.time) && d.time !== "00:00" && d.title.trim());
        return (
          <div className={`sheet-layer composer-layer${isMulti ? " multi-layer" : ""}`} role="dialog" aria-modal="true" aria-label="Thêm công việc mới">
            <button className="sheet-backdrop" type="button" onClick={() => { setComposerOpen(false); resetAiState(); }} aria-label="Đóng biểu mẫu" />

            {/* ── MULTI-TASK VIEW ──────────────────────────────────────── */}
            {isMulti ? (
              <div className="composer multi-composer">
                <div className="sheet-handle" aria-hidden="true" />
                <div className="composer-header">
                  <div>
                    <span className="eyebrow">AI tìm thấy {aiDrafts.length} công việc</span>
                    <h2>Kiểm tra &amp; chỉnh sửa</h2>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button type="button" className="icon-button" onClick={() => { setKeyInputValue(mistralKey); setShowKeyInput(true); }} title="Cài Mistral API key" aria-label="Cài API key"><KeyRound size={18} /></button>
                    <button type="button" className="icon-button" onClick={() => { setComposerOpen(false); resetAiState(); }} aria-label="Đóng"><X size={22} /></button>
                  </div>
                </div>

                <div className="draft-list">
                  {aiDrafts.map((draft, idx) => (
                    <div key={idx} className={`draft-card${draft.needsTime ? " draft-needs-time" : ""}`}>
                      <div className="draft-card-top">
                        <input
                          className="draft-title-input"
                          value={draft.title}
                          onChange={e => updateDraft(idx, { title: e.target.value })}
                          placeholder="Tên công việc"
                          aria-label="Tên công việc"
                        />
                        <button type="button" className="draft-remove-btn" onClick={() => removeDraft(idx)} aria-label="Bỏ công việc này"><X size={15} /></button>
                      </div>
                      <div className="draft-card-row">
                        <label className="draft-field">
                          <span>Lĩnh vực</span>
                          <select value={draft.category} onChange={e => updateDraft(idx, { category: e.target.value as Category })}>
                            {(Object.keys(categories) as Category[]).map(c => <option key={c} value={c}>{categories[c].label}</option>)}
                          </select>
                        </label>
                        <label className="draft-field">
                          <span>Ưu tiên</span>
                          <select value={draft.priority} onChange={e => updateDraft(idx, { priority: e.target.value as Priority })}>
                            <option value="high">Cao</option><option value="medium">Vừa</option><option value="low">Nhẹ</option>
                          </select>
                        </label>
                        <label className="draft-field">
                          <span>Thời lượng</span>
                          <select value={String(draft.duration)} onChange={e => updateDraft(idx, { duration: Number(e.target.value) })}>
                            <option value="15">15 phút</option><option value="25">25 phút</option><option value="30">30 phút</option>
                            <option value="45">45 phút</option><option value="60">60 phút</option><option value="90">90 phút</option>
                            {![15,25,30,45,60,90].includes(draft.duration) && <option value={String(draft.duration)}>{draft.duration} phút</option>}
                          </select>
                        </label>
                      </div>
                      <div className="draft-card-row">
                        <label className="draft-field">
                          <span>Ngày</span>
                          <input type="date" value={draft.date} onChange={e => updateDraft(idx, { date: e.target.value })} />
                        </label>
                        <label className={`draft-field${draft.needsTime ? " draft-field-required" : ""}`}>
                          <span>{draft.needsTime ? "⚠ Giờ bắt đầu (bắt buộc)" : "Giờ bắt đầu"}</span>
                          <input
                            type="time"
                            value={draft.time}
                            onChange={e => updateDraft(idx, { time: e.target.value })}
                            required
                            aria-required="true"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="composer-footer">
                  <button type="button" className="ghost-button" onClick={resetAiState}>Nhập lại</button>
                  <button
                    type="button"
                    className="save-button"
                    onClick={addAllDrafts}
                    disabled={!canAddAll}
                    title={!canAddAll ? "Điền giờ bắt đầu cho tất cả công việc trước khi thêm" : ""}
                  >
                    <Check size={19} /> Thêm tất cả {aiDrafts.length} việc
                  </button>
                </div>
              </div>

            ) : (
              /* ── SINGLE-TASK FORM (cũ + text input) ─────────────────── */
              <form key={formKey} className="composer" onSubmit={addTask}>
                <div className="sheet-handle" aria-hidden="true" />
                <div className="composer-header">
                  <div><span className="eyebrow">Ghi rõ để làm dễ</span><h2>Thêm công việc</h2></div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button type="button" className="icon-button" onClick={() => { setKeyInputValue(mistralKey); setShowKeyInput(true); }} aria-label="Cài API key" title="Cài Mistral API key"><KeyRound size={18} /></button>
                    <button type="button" className="icon-button" onClick={() => { setComposerOpen(false); resetAiState(); }} aria-label="Đóng"><X size={22} /></button>
                  </div>
                </div>

                <div className={`voice-panel${isListening ? " listening" : ""}${isAnalyzing ? " analyzing" : ""}`}>
                  {/* Voice row */}
                  <div className="voice-row">
                    <button type="button" id="voice-mic-btn" className={`mic-btn${isListening ? " mic-active" : ""}`} onClick={startVoiceInput} disabled={isAnalyzing} aria-label={isListening ? "Dừng ghi âm" : "Bắt đầu ghi giọng nói"}>
                      {isListening ? <MicOff size={22} /> : <Mic size={22} />}
                      {isListening && <span className="mic-pulse" aria-hidden="true" />}
                    </button>
                    <div className="voice-text-area">
                      {isAnalyzing ? (
                        <span className="voice-analyzing"><Loader2 size={15} className="spin-icon" /><Brain size={15} />AI đang phân tích...</span>
                      ) : voiceTranscript ? (
                        <span className="voice-transcript">&ldquo;{voiceTranscript}&rdquo;</span>
                      ) : (
                        <span className="voice-hint">{isListening ? "🎙️ Đang nghe... nói tên và mô tả công việc" : "Nhấn mic và nói — AI sẽ điền tên, chuẩn bị, các bước và ghi chú"}</span>
                      )}
                    </div>
                    {voiceTranscript && !isAnalyzing && (
                      <button type="button" className="icon-button" onClick={() => callMistralAI(voiceTranscript)} title="Phân tích lại" aria-label="Phân tích lại"><Brain size={17} /></button>
                    )}
                  </div>

                  {/* Text input row */}
                  <div className="text-input-row">
                    <span className="text-input-divider">hoặc nhập văn bản</span>
                    <div className="text-input-wrap">
                      <textarea
                        id="ai-text-input"
                        className="ai-text-input"
                        value={textInput}
                        onChange={e => setTextInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && textInput.trim()) { e.preventDefault(); callMistralAI(textInput.trim()); }}}
                        placeholder="Mô tả công việc... (Ctrl+Enter để phân tích)"
                        disabled={isAnalyzing || isListening}
                        rows={2}
                        aria-label="Nhập văn bản để AI phân tích"
                      />
                      <button
                        type="button"
                        className="analyze-btn"
                        onClick={() => { if (textInput.trim()) callMistralAI(textInput.trim()); }}
                        disabled={!textInput.trim() || isAnalyzing || isListening}
                        aria-label="Phân tích bằng AI"
                      >
                        {isAnalyzing ? <Loader2 size={15} className="spin-icon" /> : <Sparkles size={15} />}
                        Phân tích AI
                      </button>
                    </div>
                  </div>

                  {singleDraft && <div className="ai-badge"><Sparkles size={13} /> AI đã điền — kiểm tra và chỉnh sửa trước khi lưu</div>}
                </div>

                <div className="form-grid">
                  <label className="field field-full"><span>Tên công việc</span><input name="title" autoFocus placeholder="Ví dụ: Chuẩn bị hồ sơ khách hàng" required defaultValue={singleDraft?.title ?? ""} /></label>
                  <label className="field"><span>Lĩnh vực</span><select name="category" defaultValue={singleDraft?.category ?? "work"}>{(Object.keys(categories) as Category[]).map((c) => <option key={c} value={c}>{categories[c].label}</option>)}</select></label>
                  <label className="field"><span>Ưu tiên</span><select name="priority" defaultValue={singleDraft?.priority ?? "medium"}><option value="high">Cao</option><option value="medium">Vừa</option><option value="low">Nhẹ</option></select></label>
                  <label className="field"><span>Ngày</span><input name="date" type="date" defaultValue={singleDraft?.date ?? today} required /></label>
                  <label className={`field${singleDraft?.needsTime ? " field-required" : ""}`}>
                    <span>{singleDraft?.needsTime ? "⚠ Giờ bắt đầu (bắt buộc nhập)" : "Giờ bắt đầu"}</span>
                    <input name="time" type="time" defaultValue={singleDraft?.time || ""} required={singleDraft?.needsTime} />
                  </label>
                  <label className="field"><span>Thời lượng</span>
                    <select name="duration" defaultValue={String(singleDraft?.duration ?? 30)}>
                      <option value="15">15 phút</option><option value="25">25 phút</option><option value="30">30 phút</option>
                      <option value="45">45 phút</option><option value="60">60 phút</option><option value="90">90 phút</option>
                      {singleDraft && ![15,25,30,45,60,90].includes(singleDraft.duration) && <option value={String(singleDraft.duration)}>{singleDraft.duration} phút</option>}
                    </select>
                  </label>
                  <label className="field"><span>Năng lượng cần</span><select name="energy" defaultValue={singleDraft?.energy ?? "medium"}><option value="high">Cao — cần tỉnh táo</option><option value="medium">Vừa</option><option value="low">Thấp — việc nhẹ</option></select></label>
                  <label className="field field-full"><span>Kết quả mong muốn</span><textarea name="outcome" placeholder="Việc này được xem là xong khi..." defaultValue={singleDraft?.outcome ?? ""} /></label>
                  <label className="field field-full"><span>Cần chuẩn bị</span><textarea name="preparation" placeholder={"Mỗi mục một dòng\nVí dụ: Laptop\nTài liệu báo giá"} defaultValue={singleDraft?.preparation?.join("\n") ?? ""} /></label>
                  <label className="field field-full"><span>Các bước thực hiện</span><textarea name="steps" placeholder={"Mỗi bước một dòng\nVí dụ: Kiểm tra số liệu\nGửi xác nhận"} defaultValue={singleDraft?.steps?.join("\n") ?? ""} /></label>
                  <label className="field field-full"><span>Ghi chú thêm</span><textarea name="note" placeholder="Thông tin, người liên quan hoặc điều cần nhớ..." defaultValue={singleDraft?.note ?? ""} /></label>
                </div>
                <div className="composer-footer">
                  <button type="button" className="ghost-button" onClick={() => { setComposerOpen(false); resetAiState(); }}>Để sau</button>
                  <button className="save-button" type="submit"><Check size={19} /> Lưu công việc</button>
                </div>
              </form>
            )}
          </div>
        );
      })()}


      {showKeyInput && (
        <div className="sheet-layer key-layer" role="dialog" aria-modal="true" aria-label="Mistral API Key">
          <button className="sheet-backdrop" type="button" onClick={() => setShowKeyInput(false)} aria-label="Đóng" />
          <div className="key-modal">
            <div className="sheet-handle" aria-hidden="true" />
            <div className="key-modal-header">
              <Brain size={26} />
              <div>
                <h2>Mistral API Key</h2>
                <p>{keyOnline ? <span className="key-online-badge">✅ Đã lưu trên máy chủ — đăng nhập lại tự điền</span> : "Key lưu trên thiết bị này, không gửi đi đâu."}</p>
              </div>
            </div>

            {/* Input key */}
            <input
              id="mistral-key-input"
              className="key-input"
              type="password"
              placeholder="Dán API key vào đây..."
              value={keyInputValue}
              onChange={e => setKeyInputValue(e.target.value)}
              autoFocus
              onKeyDown={e => {
                if (e.key === "Enter") {
                  const k = keyInputValue.trim();
                  if (!k) return;
                  setMistralKey(k);
                  try { localStorage.setItem("nhip-ngay-mistral-key", k); } catch {}
                  // Save to server cookie
                  fetch("/api/key", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: k }) })
                    .then(() => setKeyOnline(true)).catch(() => {});
                  setKeyInputValue("");
                  setShowKeyInput(false);
                  setToast("Đã lưu API key.");
                }
              }}
            />

            {/* Copy existing key */}
            {mistralKey && (
              <button
                type="button"
                className="key-copy-btn"
                onClick={() => {
                  navigator.clipboard.writeText(mistralKey)
                    .then(() => setToast("Đã sao chép key — dán vào máy khác nhé!"))
                    .catch(() => setToast("Không sao chép được, hãy sao chép thủ công."));
                }}
                aria-label="Sao chép API key"
              >
                <Clipboard size={15} /> Sao chép key hiện tại sang máy khác
              </button>
            )}

            <p className="key-hint">Lấy key tại <a href="https://console.mistral.ai" target="_blank" rel="noreferrer">console.mistral.ai</a> → API Keys</p>
            <div className="composer-footer">
              <button type="button" className="ghost-button" onClick={() => setShowKeyInput(false)}>Hủy</button>
              <button
                type="button"
                className="save-button"
                onClick={() => {
                  const k = keyInputValue.trim();
                  if (!k) return;
                  setMistralKey(k);
                  try { localStorage.setItem("nhip-ngay-mistral-key", k); } catch {}
                  fetch("/api/key", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: k }) })
                    .then(() => setKeyOnline(true)).catch(() => {});
                  setKeyInputValue("");
                  setShowKeyInput(false);
                  setToast("Đã lưu API key.");
                }}
              ><Check size={18} /> Lưu key</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Notify settings modal ── */}
      {showNotifySettings && (
        <div className="sheet-layer key-layer" role="dialog" aria-modal="true" aria-label="Cài đặt nhắc nhở">
          <button className="sheet-backdrop" type="button" onClick={() => setShowNotifySettings(false)} aria-label="Đóng" />
          <div className="key-modal">
            <div className="sheet-handle" aria-hidden="true" />
            <div className="key-modal-header">
              <Bell size={26} />
              <div><h2>Cài đặt nhắc nhở</h2><p>Sẽ thông báo trước giờ bắt đầu công việc.</p></div>
            </div>
            <label className="field" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>Nhắc trước bao nhiêu phút?</span>
              <select
                value={notifyLeadMin}
                onChange={e => {
                  const v = Number(e.target.value);
                  setNotifyLeadMin(v);
                  try { localStorage.setItem("nhip-ngay-notify-lead", String(v)); } catch {}
                }}
                style={{ padding: "10px 12px", borderRadius: 10, border: "1.5px solid var(--line-strong)", fontSize: 14, background: "white", fontFamily: "inherit" }}
              >
                <option value={5}>5 phút trước</option>
                <option value={10}>10 phút trước</option>
                <option value={15}>15 phút trước</option>
                <option value={20}>20 phút trước</option>
                <option value={30}>30 phút trước</option>
              </select>
            </label>
            <p className="key-hint">Hiện đang nhắc <strong>{notifyLeadMin} phút</strong> trước giờ bắt đầu mỗi việc có giờ đặt.</p>
            <div className="composer-footer">
              <button type="button" className="ghost-button" onClick={() => {
                setNotifyEnabled(false);
                localStorage.setItem("nhip-ngay-notify-enabled", "0");
                setShowNotifySettings(false);
                setToast("Đã tắt nhắc nhở.");
              }}>Tắt nhắc nhở</button>
              <button type="button" className="save-button" onClick={() => setShowNotifySettings(false)}><Check size={18} /> Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cross-Device Sync Modal ── */}
      {showSyncModal && (
        <div className="sheet-layer key-layer" role="dialog" aria-modal="true" aria-label="Đồng bộ thiết bị">
          <button className="sheet-backdrop" type="button" onClick={() => setShowSyncModal(false)} aria-label="Đóng" />
          <div className="key-modal sync-modal">
            <div className="sheet-handle" aria-hidden="true" />
            <div className="key-modal-header">
              <RefreshCw size={26} className={isSyncing ? "spin-icon" : ""} />
              <div>
                <h2>Đồng bộ PC ↔ Điện thoại</h2>
                <p>Tạo việc ở PC, mở Điện thoại vào là thấy ngay.</p>
              </div>
            </div>

            {/* Current Sync Code Box */}
            <div className="sync-code-box">
              <span className="sync-box-label">MÃ ĐỒNG BỘ CỦA THIẾT BỊ NÀY</span>
              <div className="sync-code-row">
                <strong className="sync-code-val">{syncCode}</strong>
                <button
                  type="button"
                  className="sync-copy-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(syncCode)
                      .then(() => setToast("Đã sao chép mã đồng bộ! Nhập mã này trên Điện thoại."))
                      .catch(() => setToast("Vui lòng sao chép mã thủ công: " + syncCode));
                  }}
                  aria-label="Sao chép mã đồng bộ"
                >
                  <Clipboard size={15} /> Sao chép mã
                </button>
              </div>
              <p className="sync-box-hint">
                💡 Trên <strong>Điện thoại</strong>: Mở web → nhấn nút <strong>Đồng bộ</strong> trên cùng → dán mã <strong>{syncCode}</strong> này vào để xem chung danh sách việc.
              </p>
            </div>

            {/* Connect other code */}
            <div className="sync-connect-box">
              <span className="sync-box-label">HOẶC KẾT NỐI MÃ TỪ THIẾT BỊ KHÁC</span>
              <div className="sync-input-wrap">
                <input
                  className="key-input"
                  style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}
                  placeholder="Nhập mã từ máy khác (vd: NHIP-9K2P)..."
                  value={syncInput}
                  onChange={e => setSyncInput(e.target.value.toUpperCase())}
                  onKeyDown={e => {
                    if (e.key === "Enter" && syncInput.trim()) {
                      const code = syncInput.trim().toUpperCase();
                      setSyncCode(code);
                      try { localStorage.setItem("nhip-ngay-sync-code", code); } catch {}
                      pullSync(code, true);
                      setSyncInput("");
                      setShowSyncModal(false);
                    }
                  }}
                />
                <button
                  type="button"
                  className="save-button"
                  disabled={!syncInput.trim()}
                  onClick={() => {
                    const code = syncInput.trim().toUpperCase();
                    setSyncCode(code);
                    try { localStorage.setItem("nhip-ngay-sync-code", code); } catch {}
                    pullSync(code, true);
                    setSyncInput("");
                    setShowSyncModal(false);
                  }}
                >
                  Kết nối
                </button>
              </div>
            </div>

            {lastSyncTime && (
              <p className="key-hint" style={{ color: "var(--green)", fontWeight: 650 }}>
                ✓ Đã đồng bộ lúc {new Date(lastSyncTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </p>
            )}

            <div className="composer-footer">
              <button
                type="button"
                className="ghost-button"
                onClick={() => pullSync(syncCode, true)}
              >
                Tải lại dữ liệu
              </button>
              <button type="button" className="save-button" onClick={() => setShowSyncModal(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}


      {focus && (
        <div className="focus-dock" aria-live="polite">
          <button type="button" onClick={() => setFocus({ ...focus, running: !focus.running })} aria-label={focus.running ? "Tạm dừng" : "Tiếp tục"}>{focus.running ? <Pause size={18} /> : <Play size={18} />}</button>
          <div><span>Đang tập trung</span><strong>{tasks.find((task) => task.id === focus.taskId)?.title ?? "Công việc"}</strong></div>
          <time>{String(Math.floor(focus.remaining / 60)).padStart(2, "0")}:{String(focus.remaining % 60).padStart(2, "0")}</time>
          <button type="button" onClick={() => setFocus(null)} aria-label="Dừng nhịp tập trung"><X size={18} /></button>
        </div>
      )}

      {toast && <div className="toast" role="status"><Check size={17} /> {toast}</div>}
      {showConfetti && <ConfettiShower />}
    </div>
  );
}
