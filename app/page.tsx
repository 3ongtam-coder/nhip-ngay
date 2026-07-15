"use client";

import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronRight,
  Circle,
  Clock3,
  Flag,
  GraduationCap,
  HeartPulse,
  Home,
  House,
  LayoutList,
  NotebookPen,
  Pause,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
  WalletCards,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import {
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

type Category = "work" | "health" | "growth" | "home" | "finance" | "other";
type Priority = "high" | "medium" | "low";
type Energy = "high" | "medium" | "low";
type View = "today" | "plan" | "notes" | "stats";

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
      } catch {
        // Keep the safe starter data when local storage is unavailable or malformed.
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
          <span className={`connection ${online ? "online" : "offline"}`} title={online ? "Đang trực tuyến" : "Đang dùng ngoại tuyến"}>
            {online ? <Wifi size={16} /> : <WifiOff size={16} />}
            <span>{online ? "Đã lưu" : "Ngoại tuyến"}</span>
          </span>
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
              <span className="period-chip">7 ngày gần đây</span>
            </div>
            <div className="stats-grid">
              <article className="stat-card stat-primary"><span>Hoàn thành hôm nay</span><strong>{progress}%</strong><p>{completedToday} trên {todayTasks.length} công việc</p></article>
              <article className="stat-card"><span>Thời gian đã hoàn thành</span><strong>{totalMinutes}<small> phút</small></strong><p>Mỗi phút tập trung đều được tính.</p></article>
              <article className="stat-card"><span>Mức sẵn sàng</span><strong>{preparedPercent}%</strong><p>Đồ dùng và tài liệu đã chuẩn bị.</p></article>
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

      {composerOpen && (
        <div className="sheet-layer composer-layer" role="dialog" aria-modal="true" aria-label="Thêm công việc mới">
          <button className="sheet-backdrop" type="button" onClick={() => setComposerOpen(false)} aria-label="Đóng biểu mẫu" />
          <form className="composer" onSubmit={addTask}>
            <div className="sheet-handle" aria-hidden="true" />
            <div className="composer-header">
              <div><span className="eyebrow">Ghi rõ để làm dễ</span><h2>Thêm công việc</h2></div>
              <button type="button" className="icon-button" onClick={() => setComposerOpen(false)} aria-label="Đóng"><X size={22} /></button>
            </div>

            <div className="form-grid">
              <label className="field field-full"><span>Tên công việc</span><input name="title" autoFocus placeholder="Ví dụ: Chuẩn bị hồ sơ khách hàng" required /></label>
              <label className="field"><span>Lĩnh vực</span><select name="category" defaultValue="work">{(Object.keys(categories) as Category[]).map((category) => <option key={category} value={category}>{categories[category].label}</option>)}</select></label>
              <label className="field"><span>Ưu tiên</span><select name="priority" defaultValue="medium"><option value="high">Cao</option><option value="medium">Vừa</option><option value="low">Nhẹ</option></select></label>
              <label className="field"><span>Ngày</span><input name="date" type="date" defaultValue={today} required /></label>
              <label className="field"><span>Giờ bắt đầu</span><input name="time" type="time" defaultValue="09:00" /></label>
              <label className="field"><span>Thời lượng</span><select name="duration" defaultValue="30"><option value="15">15 phút</option><option value="25">25 phút</option><option value="30">30 phút</option><option value="45">45 phút</option><option value="60">60 phút</option><option value="90">90 phút</option></select></label>
              <label className="field"><span>Năng lượng cần</span><select name="energy" defaultValue="medium"><option value="high">Cao — cần tỉnh táo</option><option value="medium">Vừa</option><option value="low">Thấp — việc nhẹ</option></select></label>
              <label className="field field-full"><span>Kết quả mong muốn</span><textarea name="outcome" placeholder="Việc này được xem là xong khi..." /></label>
              <label className="field field-full"><span>Cần chuẩn bị</span><textarea name="preparation" placeholder={'Mỗi mục một dòng\nVí dụ: Laptop\nTài liệu báo giá'} /></label>
              <label className="field field-full"><span>Các bước thực hiện</span><textarea name="steps" placeholder={'Mỗi bước một dòng\nVí dụ: Kiểm tra số liệu\nGửi xác nhận'} /></label>
              <label className="field field-full"><span>Ghi chú thêm</span><textarea name="note" placeholder="Thông tin, người liên quan hoặc điều cần nhớ..." /></label>
            </div>
            <div className="composer-footer"><button type="button" className="ghost-button" onClick={() => setComposerOpen(false)}>Để sau</button><button className="save-button" type="submit"><Check size={19} /> Lưu công việc</button></div>
          </form>
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
    </div>
  );
}
