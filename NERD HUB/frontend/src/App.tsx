
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "./api";
import type {
  QuestEntry,
  ReciprocityRule,
  ThemeMode,
  TimelineEntry,
  UserKey,
  UserSummary,
  VaultData
} from "./types";

type AuthMode = "login" | "register";
type ViewId = "home" | "timeline" | "reciprocity" | "notes" | "calendar" | "stats" | "settings";

const PARTICIPANT_LABELS: Record<UserKey, string> = {
  alexandre: "Pessoa A",
  iris: "Pessoa B"
};

const VIEWS: Array<{ id: ViewId; label: string; hint: string }> = [
  { id: "home", label: "Home", hint: "Acoes rapidas" },
  { id: "timeline", label: "Timeline", hint: "Interacoes e momentos" },
  { id: "reciprocity", label: "Reciprocidade", hint: "Quests e energia" },
  { id: "notes", label: "Notas", hint: "Espaco privado" },
  { id: "calendar", label: "Agenda", hint: "Conexoes marcadas" },
  { id: "stats", label: "Reflexao", hint: "Padroes e metricas" },
  { id: "settings", label: "Ajustes", hint: "Conta e seguranca" }
];

type DevicePlatform = "android" | "ios" | "windows" | "mac" | "linux" | "other";

interface AppShortcut {
  id: string;
  name: string;
  iconUrl: string;
  androidPackage: string;
  iosAppId: string;
  deepLinks: Partial<Record<DevicePlatform | "default", string>>;
  webUrl: string;
}

const APP_SHORTCUTS: AppShortcut[] = [
  {
    id: "discord",
    name: "Discord",
    iconUrl: "https://cdn.simpleicons.org/discord/5865F2",
    androidPackage: "com.discord",
    iosAppId: "985746746",
    deepLinks: { default: "discord://" },
    webUrl: "https://discord.com/download"
  },
  {
    id: "twitch",
    name: "Twitch",
    iconUrl: "https://cdn.simpleicons.org/twitch/9146FF",
    androidPackage: "tv.twitch.android.app",
    iosAppId: "460177396",
    deepLinks: { default: "twitch://" },
    webUrl: "https://www.twitch.tv/downloads"
  },
  {
    id: "tiktok",
    name: "TikTok",
    iconUrl: "https://cdn.simpleicons.org/tiktok/FFFFFF",
    androidPackage: "com.zhiliaoapp.musically",
    iosAppId: "835599320",
    deepLinks: { default: "tiktok://" },
    webUrl: "https://www.tiktok.com/download"
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    iconUrl: "https://cdn.simpleicons.org/whatsapp/25D366",
    androidPackage: "com.whatsapp",
    iosAppId: "310633997",
    deepLinks: { default: "whatsapp://" },
    webUrl: "https://www.whatsapp.com/download"
  },
  {
    id: "telegram",
    name: "Telegram",
    iconUrl: "https://cdn.simpleicons.org/telegram/26A5E4",
    androidPackage: "org.telegram.messenger",
    iosAppId: "686449807",
    deepLinks: { default: "tg://resolve?domain=telegram" },
    webUrl: "https://telegram.org/apps"
  },
  {
    id: "instagram",
    name: "Instagram",
    iconUrl: "https://cdn.simpleicons.org/instagram/E4405F",
    androidPackage: "com.instagram.android",
    iosAppId: "389801252",
    deepLinks: { default: "instagram://" },
    webUrl: "https://www.instagram.com/download"
  },
  {
    id: "spotify",
    name: "Spotify",
    iconUrl: "https://cdn.simpleicons.org/spotify/1DB954",
    androidPackage: "com.spotify.music",
    iosAppId: "324684580",
    deepLinks: { default: "spotify://" },
    webUrl: "https://www.spotify.com/download"
  }
];

interface AuthForm {
  username: string;
  email: string;
  displayName: string;
  password: string;
}

interface AuthNotice {
  tone: "neutral" | "error" | "success";
  message: string;
}

interface TimelineForm {
  type: TimelineEntry["type"];
  actor: TimelineEntry["actor"];
  title: string;
  details: string;
  occurredAt: string;
}

interface QuestForm {
  owner: UserKey;
  action: string;
  dueAt: string;
}

interface NoteForm {
  owner: UserKey;
  title: string;
  tags: string;
  content: string;
}

interface CalendarForm {
  date: string;
  mode: string;
  title: string;
  notes: string;
}

interface PasswordForm {
  currentPassword: string;
  nextPassword: string;
}

function createId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function toDateInput(value: Date = new Date()): string {
  const date = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return date.toISOString().slice(0, 10);
}

function toDateTimeInput(value: Date = new Date()): string {
  const date = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return date.toISOString().slice(0, 16);
}

function fromDateTimeInput(value: string): string {
  return new Date(value).toISOString();
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function participantLabel(userKey: UserKey): string {
  return PARTICIPANT_LABELS[userKey];
}

function actorLabel(actor: TimelineEntry["actor"]): string {
  if (actor === "ambos") {
    return "Ambos";
  }
  if (actor === "sistema") {
    return "Sistema";
  }
  return participantLabel(actor);
}

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(value)));
}

function isUserKey(value: string): value is UserKey {
  return value === "alexandre" || value === "iris";
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function applyDocumentTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
}

function ViewIcon({ view }: { view: ViewId }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": "true"
  };

  switch (view) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
          <path d="M9 21v-6h6v6" />
        </svg>
      );
    case "timeline":
      return (
        <svg {...common}>
          <path d="M4 6h16" />
          <path d="M4 12h10" />
          <path d="M4 18h14" />
          <circle cx="17" cy="12" r="1.5" />
        </svg>
      );
    case "reciprocity":
      return (
        <svg {...common}>
          <path d="M7 8h10" />
          <path d="M7 12h10" />
          <path d="M7 16h6" />
          <path d="M4 5v14" />
          <path d="M20 5v14" />
        </svg>
      );
    case "notes":
      return (
        <svg {...common}>
          <path d="M7 3h8l4 4v14H7z" />
          <path d="M15 3v5h5" />
          <path d="M10 12h6" />
          <path d="M10 16h6" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M4 10h16" />
        </svg>
      );
    case "stats":
      return (
        <svg {...common}>
          <path d="M5 19V10" />
          <path d="M11 19V6" />
          <path d="M17 19v-8" />
          <path d="M3 19h18" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3.2" />
          <path d="m19.4 15-.9 1.6-2-.2a6.8 6.8 0 0 1-1.2.7l-.4 2h-2l-.4-2a6.8 6.8 0 0 1-1.2-.7l-2 .2-.9-1.6 1.5-1.3a7 7 0 0 1 0-1.4L7.4 11l.9-1.6 2 .2c.4-.3.8-.5 1.2-.7l.4-2h2l.4 2c.4.2.8.4 1.2.7l2-.2.9 1.6-1.5 1.3c.1.5.1.9 0 1.4z" />
        </svg>
      );
    default:
      return null;
  }
}

function questDifficultyLevel(quest: QuestEntry): 1 | 2 | 3 {
  if (quest.done) {
    return 1;
  }

  const remainingHours = (new Date(quest.dueAt).getTime() - Date.now()) / (1000 * 60 * 60);
  if (remainingHours <= 0) {
    return 3;
  }
  if (remainingHours <= 24) {
    return 2;
  }
  return 1;
}

function questCategoryLabel(quest: QuestEntry): string {
  const normalized = quest.action.toLowerCase();

  if (normalized.includes("musica") || normalized.includes("playlist") || normalized.includes("beat")) {
    return "musica";
  }

  if (normalized.includes("jogo") || normalized.includes("tetris") || normalized.includes("fnaf")) {
    return "game";
  }

  if (normalized.includes("conversa") || normalized.includes("mensagem") || normalized.includes("call")) {
    return "conexao";
  }

  return quest.owner === "alexandre" ? "aventura" : "terror";
}

function questDurationLabel(quest: QuestEntry): string {
  if (quest.done && quest.doneAt) {
    const elapsedMs = Math.max(0, new Date(quest.doneAt).getTime() - new Date(quest.createdAt).getTime());
    const elapsedMin = Math.round(elapsedMs / (1000 * 60));
    const clamped = Math.max(10, Math.min(90, elapsedMin));
    return `${clamped} min`;
  }

  const complexity = Math.max(0, Math.min(45, Math.round(quest.action.length / 3)));
  return `${Math.max(15, 12 + complexity)} min`;
}

function buildSyncWavePath(values: number[], width = 260, height = 70): string {
  if (!values.length) {
    return `M0 ${height / 2} L${width} ${height / 2}`;
  }

  const safeMax = Math.max(1, ...values);
  const step = values.length > 1 ? width / (values.length - 1) : width;

  return values
    .map((raw, index) => {
      const normalized = Math.max(0, raw) / safeMax;
      const x = index * step;
      const y = height - normalized * (height - 8) - 4;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function detectPlatform(): DevicePlatform {
  const ua = navigator.userAgent.toLowerCase();

  if (/android/.test(ua)) {
    return "android";
  }
  if (/iphone|ipad|ipod/.test(ua)) {
    return "ios";
  }
  if (/windows/.test(ua)) {
    return "windows";
  }
  if (/macintosh|mac os x/.test(ua)) {
    return "mac";
  }
  if (/linux/.test(ua)) {
    return "linux";
  }
  return "other";
}

function storeUrlFor(app: AppShortcut, platform: DevicePlatform): string {
  if (platform === "android") {
    return `https://play.google.com/store/apps/details?id=${encodeURIComponent(app.androidPackage)}`;
  }

  if (platform === "ios") {
    return `https://apps.apple.com/app/id${app.iosAppId}`;
  }

  if (platform === "windows") {
    return `https://apps.microsoft.com/search?query=${encodeURIComponent(app.name)}`;
  }

  return app.webUrl;
}

function openAppOrStore(app: AppShortcut): void {
  const platform = detectPlatform();
  const deepLink = app.deepLinks[platform] ?? app.deepLinks.default;
  const fallback = storeUrlFor(app, platform);

  if (!deepLink) {
    window.location.assign(fallback);
    return;
  }

  let hidden = false;

  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      hidden = true;
    }
  };

  const onBlur = () => {
    hidden = true;
  };

  const cleanup = () => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("blur", onBlur);
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("blur", onBlur);

  const fallbackTimer = window.setTimeout(() => {
    cleanup();
    if (!hidden) {
      window.location.assign(fallback);
    }
  }, 1700);

  try {
    window.location.href = deepLink;
  } catch {
    window.clearTimeout(fallbackTimer);
    cleanup();
    window.location.assign(fallback);
  }
}

function buildDefaultVault(): VaultData {
  const now = new Date();
  const boot = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const sync = new Date(now.getTime() - 15 * 60 * 1000).toISOString();

  return {
    version: 1,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    settings: {
      theme: "dark",
      accent: "#4fa8ff"
    },
    timeline: [
      {
        id: createId(),
        type: "mensagem",
        actor: "alexandre",
        title: "NERD HUB online ativado",
        details: "Base React + TS conectada ao backend Node.",
        occurredAt: boot,
        createdAt: boot
      },
      {
        id: createId(),
        type: "momento",
        actor: "iris",
        title: "Design GX carregado",
        details: "Interface escura, limpa e moderna liberada.",
        occurredAt: sync,
        createdAt: sync
      }
    ],
    reciprocityRules: {
      alexandre: {
        replyLimitHours: 8,
        initiativeDays: 2,
        expectedAction: "Check-in curto antes de dormir"
      },
      iris: {
        replyLimitHours: 10,
        initiativeDays: 2,
        expectedAction: "Mensagem de status apos aula"
      }
    },
    quests: [],
    notes: [],
    calendar: []
  };
}

function responsePairs(timeline: TimelineEntry[]): Array<{ responder: UserKey; hours: number }> {
  const messages = [...timeline]
    .filter((entry) => entry.type === "mensagem" && isUserKey(entry.actor))
    .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());

  const pairs: Array<{ responder: UserKey; hours: number }> = [];

  for (let index = 1; index < messages.length; index += 1) {
    const prev = messages[index - 1];
    const current = messages[index];

    if (!isUserKey(prev.actor) || !isUserKey(current.actor) || prev.actor === current.actor) {
      continue;
    }

    const delta = new Date(current.occurredAt).getTime() - new Date(prev.occurredAt).getTime();
    if (delta <= 0) {
      continue;
    }

    pairs.push({ responder: current.actor, hours: delta / (1000 * 60 * 60) });
  }

  return pairs;
}

function energyFor(vault: VaultData, user: UserKey): number {
  const rule: ReciprocityRule = vault.reciprocityRules[user];
  let energy = 100;

  const overdue = vault.quests.filter(
    (quest) => quest.owner === user && !quest.done && new Date(quest.dueAt).getTime() < Date.now()
  ).length;

  energy -= overdue * 16;

  const avgReply = (() => {
    const pairs = responsePairs(vault.timeline).filter((pair) => pair.responder === user);
    if (!pairs.length) {
      return null;
    }

    return pairs.reduce((acc, item) => acc + item.hours, 0) / pairs.length;
  })();

  if (avgReply !== null) {
    const excess = Math.max(0, avgReply - rule.replyLimitHours);
    energy -= Math.min(34, excess * 2.8);
  }

  const lastAction = [...vault.timeline]
    .filter((entry) => entry.actor === user)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())[0];

  if (lastAction) {
    const daysSince = (Date.now() - new Date(lastAction.occurredAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > rule.initiativeDays) {
      energy -= Math.min(24, (daysSince - rule.initiativeDays) * 4.6);
    }
  }

  return Math.max(8, Math.min(100, Math.round(energy)));
}
export default function App() {
  const authTransitionTimerRef = useRef<number | null>(null);

  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authForm, setAuthForm] = useState<AuthForm>({
    username: "",
    email: "",
    displayName: "",
    password: ""
  });
  const [authNotice, setAuthNotice] = useState<AuthNotice>({
    tone: "neutral",
    message: ""
  });
  const [lastPendingEmail, setLastPendingEmail] = useState("");
  const [authTheme, setAuthTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return "dark";
    }
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });
  const [authBursting, setAuthBursting] = useState(false);
  const [themePreference, setThemePreference] = useState<ThemeMode>("dark");
  const [themeReady, setThemeReady] = useState(false);

  const [token, setToken] = useState<string>(() => localStorage.getItem("nh_token") || sessionStorage.getItem("nh_token") || "");
  const [user, setUser] = useState<UserSummary | null>(() => {
    const cached = localStorage.getItem("nh_user") || sessionStorage.getItem("nh_user");
    if (!cached) {
      return null;
    }

    const parsed = JSON.parse(cached) as Partial<UserSummary>;
    if (!parsed.id || !parsed.username || !parsed.displayName || !parsed.createdAt || !parsed.updatedAt) {
      return null;
    }

    return {
      ...parsed,
      email: parsed.email || ""
    } as UserSummary;
  });

  const [vault, setVault] = useState<VaultData | null>(null);
  const [activeView, setActiveView] = useState<ViewId>("home");
  const [status, setStatus] = useState<string>("Conecte sua conta para carregar o vault online.");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverNow, setServerNow] = useState<Date>(() => new Date());
  const [brainQuickInput, setBrainQuickInput] = useState("");

  const [timelineForm, setTimelineForm] = useState<TimelineForm>({
    type: "mensagem",
    actor: "alexandre",
    title: "",
    details: "",
    occurredAt: toDateTimeInput(new Date())
  });

  const [ruleOwner, setRuleOwner] = useState<UserKey>("alexandre");

  const [questForm, setQuestForm] = useState<QuestForm>({
    owner: "alexandre",
    action: "",
    dueAt: toDateTimeInput(new Date(Date.now() + 24 * 60 * 60 * 1000))
  });

  const [noteForm, setNoteForm] = useState<NoteForm>({
    owner: "alexandre",
    title: "",
    tags: "",
    content: ""
  });

  const [calendarForm, setCalendarForm] = useState<CalendarForm>({
    date: toDateInput(new Date()),
    mode: "conversa",
    title: "",
    notes: ""
  });

  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: "",
    nextPassword: ""
  });

  useEffect(() => {
    if (token || user) {
      return;
    }

    let alive = true;
    setBusy(true);
    setStatus("Restaurando sessao...");

    api
      .restoreSession()
      .then((session) => {
        if (!alive || !session) {
          return;
        }
        setThemePreference(session.themePreference);
        applyDocumentTheme(session.themePreference);
        setThemeReady(true);
        persistSession(session.token, session.user);
        setVault(session.vault || buildDefaultVault());
        setActiveView("home");
        setStatus("Sessao restaurada.");
      })
      .catch((error: Error) => {
        if (!alive) {
          return;
        }
        setStatus(error.message || "Falha ao restaurar sessao.");
      })
      .finally(() => {
        if (alive) {
          setBusy(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [token, user]);

  useEffect(() => {
    if (!token || vault) {
      return;
    }

    let alive = true;
    setBusy(true);

    api
      .getVault(token)
      .then((payload) => {
        if (!alive) {
          return;
        }

        setVault(payload.vault || buildDefaultVault());
        const persistedTheme = payload.themePreference === "light" ? "light" : "dark";
        setThemePreference(persistedTheme);
        applyDocumentTheme(persistedTheme);
        setThemeReady(true);
        setStatus("Vault online carregado.");
      })
      .catch(() => {
        if (!alive) {
          return;
        }

        logout();
        setStatus("Sessao expirada. Entre novamente.");
      })
      .finally(() => {
        if (alive) {
          setBusy(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [token, vault]);

  useEffect(() => {
    return () => {
      if (authTransitionTimerRef.current !== null) {
        window.clearTimeout(authTransitionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (token && user) {
      return;
    }

    applyDocumentTheme(authTheme);
  }, [authTheme, token, user]);

  useEffect(() => {
    if (!token || !user) {
      return;
    }

    applyDocumentTheme(themePreference);
  }, [token, user, themePreference]);

  useEffect(() => {
    const timer = window.setInterval(() => setServerNow(new Date()), 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!dirty || !vault || !token) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSaving(true);

      api
        .saveVault(token, vault)
        .then(() => {
          setDirty(false);
          setStatus(`Sincronizado em ${formatDateTime(nowIso())}.`);
        })
        .catch((error: Error) => {
          setStatus(`Falha de sync: ${error.message}`);
        })
        .finally(() => {
          setSaving(false);
        });
    }, 850);

    return () => {
      window.clearTimeout(timer);
    };
  }, [dirty, vault, token]);

  const normalizedUsername = authForm.username.trim().toLowerCase();
  const normalizedEmail = authForm.email.trim().toLowerCase();
  const usernameValid =
    normalizedUsername.length >= 3 && normalizedUsername.length <= 30 && /^[a-z0-9_]+$/.test(normalizedUsername);
  const emailValid = isValidEmail(normalizedEmail);
  const passwordValid = authForm.password.length >= 8;

  const canSubmitAuth =
    authMode === "login"
      ? emailValid && passwordValid && !busy
      : usernameValid && emailValid && passwordValid && !busy;

  useEffect(() => {
    setAuthNotice({ tone: "neutral", message: "" });
  }, [authMode]);

  function patchVault(mutator: (draft: VaultData) => void) {
    setVault((current) => {
      if (!current) {
        return current;
      }

      const draft = deepClone(current);
      mutator(draft);
      draft.updatedAt = nowIso();
      return draft;
    });

    setDirty(true);
  }

  function persistSession(nextToken: string, nextUser: UserSummary) {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem("nh_token", nextToken);
    localStorage.setItem("nh_user", JSON.stringify(nextUser));
    sessionStorage.setItem("nh_token", nextToken);
    sessionStorage.setItem("nh_user", JSON.stringify(nextUser));
  }

  function logout() {
    void api.logout();
    if (authTransitionTimerRef.current !== null) {
      window.clearTimeout(authTransitionTimerRef.current);
      authTransitionTimerRef.current = null;
    }
    setToken("");
    setUser(null);
    setVault(null);
    setActiveView("home");
    setDirty(false);
    setBusy(false);
    setAuthBursting(false);
    setThemeReady(false);
    applyDocumentTheme(authTheme);
    localStorage.removeItem("nh_token");
    localStorage.removeItem("nh_user");
    sessionStorage.removeItem("nh_token");
    sessionStorage.removeItem("nh_user");
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmitAuth) {
      const fallbackMessage =
        authMode === "register"
          ? "Revise usuario, e-mail e senha (minimo 8 caracteres) antes de criar a conta."
          : "Informe e-mail valido e senha com minimo de 8 caracteres.";
      setAuthNotice({
        tone: "error",
        message: fallbackMessage
      });
      return;
    }

    setBusy(true);
    setStatus("Autenticando...");
    setAuthNotice({ tone: "neutral", message: "" });

    try {
      if (authMode === "register") {
        const registration = await api.register({
          username: normalizedUsername,
          email: normalizedEmail,
          displayName: authForm.displayName.trim() || undefined,
          password: authForm.password
        });

        setLastPendingEmail(registration.email);
        setAuthNotice({
          tone: "success",
          message: registration.message
        });
        setStatus(registration.message);
        setAuthMode("login");
        setAuthForm({
          username: "",
          email: registration.email,
          displayName: "",
          password: ""
        });
        setBusy(false);
        return;
      }

      const payload = await api.login({
        email: normalizedEmail,
        password: authForm.password
      });

      setStatus("Acesso liberado. Preparando workspace...");
      setAuthNotice({
        tone: "success",
        message: "Login realizado com sucesso."
      });
      setAuthBursting(true);

      if (authTransitionTimerRef.current !== null) {
        window.clearTimeout(authTransitionTimerRef.current);
      }

      authTransitionTimerRef.current = window.setTimeout(() => {
        setThemePreference(payload.themePreference);
        applyDocumentTheme(payload.themePreference);
        setThemeReady(true);
        persistSession(payload.token, payload.user);
        setVault(payload.vault || buildDefaultVault());
        setActiveView("home");
        setAuthForm({ username: "", email: "", displayName: "", password: "" });
        setStatus("Sistema operacional do hub ativo.");
        setAuthBursting(false);
        setBusy(false);
        authTransitionTimerRef.current = null;
      }, 280);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      const normalizedError = message.toLowerCase();
      let authMessage = message;
      if (normalizedError.includes("invalid credentials")) {
        authMessage = "Credenciais invalidas. Confira e-mail e senha.";
      } else if (normalizedError.includes("email already exists")) {
        authMessage = "Esse e-mail ja esta cadastrado.";
      } else if (normalizedError.includes("username already exists")) {
        authMessage = "Esse nome de usuario ja esta em uso.";
      } else if (normalizedError.includes("email not verified")) {
        authMessage = "E-mail ainda nao verificado. Confirme no link enviado para sua caixa de entrada.";
        setLastPendingEmail(normalizedEmail);
      }

      setAuthBursting(false);
      setAuthNotice({
        tone: "error",
        message: authMessage
      });
      setStatus(`Falha de acesso: ${authMessage}`);
      setBusy(false);
    }
  }

  async function resendVerification() {
    const targetEmail = (lastPendingEmail || authForm.email || "").trim().toLowerCase();
    if (!isValidEmail(targetEmail)) {
      setAuthNotice({
        tone: "error",
        message: "Informe um e-mail valido para reenviar a verificacao."
      });
      return;
    }

    setBusy(true);
    try {
      const result = await api.resendVerification({ email: targetEmail });
      setAuthNotice({
        tone: "success",
        message: result.message
      });
      setStatus(result.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao reenviar verificacao.";
      setAuthNotice({
        tone: "error",
        message
      });
      setStatus(message);
    } finally {
      setBusy(false);
    }
  }

  async function saveNow() {
    if (!token || !vault) {
      return;
    }

    setSaving(true);

    try {
      await api.saveVault(token, vault);
      setDirty(false);
      setStatus(`Salvo manualmente em ${formatDateTime(nowIso())}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      setStatus(`Falha ao salvar: ${message}`);
    } finally {
      setSaving(false);
    }
  }

  async function toggleUserTheme() {
    if (!token) {
      return;
    }

    const previous = themePreference;
    const next: ThemeMode = previous === "dark" ? "light" : "dark";
    setThemePreference(next);
    applyDocumentTheme(next);
    setVault((current) =>
      current
        ? {
            ...current,
            settings: {
              ...current.settings,
              theme: next
            }
          }
        : current
    );

    try {
      await api.updateThemePreference(token, next);
      setStatus(`Tema ${next === "dark" ? "escuro" : "claro"} aplicado.`);
    } catch (error) {
      setThemePreference(previous);
      applyDocumentTheme(previous);
      setVault((current) =>
        current
          ? {
              ...current,
              settings: {
                ...current.settings,
                theme: previous
              }
            }
          : current
      );
      const message = error instanceof Error ? error.message : "Falha ao atualizar tema.";
      setStatus(message);
    }
  }

  function submitBrainQuick(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const command = brainQuickInput.trim();
    if (!command) {
      return;
    }

    patchVault((draft) => {
      draft.timeline.push({
        id: createId(),
        type: "sistema",
        actor: "sistema",
        title: `Brain Quick: ${command.slice(0, 80)}`,
        details: command,
        occurredAt: nowIso(),
        createdAt: nowIso()
      });
    });

    setBrainQuickInput("");
    setStatus("Entrada rapida adicionada na timeline.");
  }

  async function submitPasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!passwordForm.currentPassword || !passwordForm.nextPassword) {
      setStatus("Preencha senha atual e nova senha.");
      return;
    }

    setBusy(true);

    try {
      await api.changePassword(token, passwordForm);
      setPasswordForm({ currentPassword: "", nextPassword: "" });
      setStatus("Senha alterada com sucesso.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      setStatus(`Falha ao trocar senha: ${message}`);
    } finally {
      setBusy(false);
    }
  }

  function launchShortcut(app: AppShortcut) {
    setStatus(`Abrindo ${app.name}. Se nao estiver instalado, voce sera enviado para a loja oficial.`);
    openAppOrStore(app);
  }

  function renderAppRail(className: string) {
    return (
      <aside className={className}>
        {APP_SHORTCUTS.map((app) => (
          <button
            key={app.id}
            className="rail-app"
            type="button"
            data-label={app.name}
            title={app.name}
            aria-label={`Abrir ${app.name}`}
            onClick={() => launchShortcut(app)}
          >
            <img src={app.iconUrl} alt="" loading="lazy" decoding="async" />
          </button>
        ))}
      </aside>
    );
  }

  const showAuth = !token || !user;

  if (showAuth) {
    return (
      <main className="auth-shell">
        <section className={`auth-main ${authBursting ? "bursting" : ""}`}>
          <header className="chrome-panel">
            <div className="chrome-left">
              <span className="chrome-dot" />
              <span className="chrome-dot" />
              <span className="chrome-dot" />
              <div className="chrome-url">localhost:5173 / NERD HUB</div>
            </div>
            <div className="chrome-tab">NERD HUB</div>
          </header>

          <section className="auth-center">
            <section className="auth-card">
              <p className="eyebrow">PRIVATE RELATIONSHIP SYSTEM</p>
              <p className="duo-signature">Espaco compartilhado privado</p>
              <h1>NERD HUB</h1>
              <p className="muted">
                Espaco compartilhado para musica, rotina e nerdice em ritmo leve.
              </p>

              <form className="auth-form" onSubmit={submitAuth}>
                {authMode === "register" && (
                  <label>
                    Nome de usuario
                    <input
                      required
                      minLength={3}
                      maxLength={30}
                      value={authForm.username}
                      onChange={(event) => {
                        setAuthForm((prev) => ({ ...prev, username: event.target.value }));
                        if (authNotice.tone !== "neutral") {
                          setAuthNotice({ tone: "neutral", message: "" });
                        }
                      }}
                      placeholder="usuario_duo"
                    />
                    <small
                      className={`field-note ${
                        !authForm.username.trim() ? "" : !usernameValid ? "error" : "ok"
                      }`}
                    >
                      {!authForm.username.trim()
                        ? "Use letras, numeros ou underline (3-30)."
                        : !usernameValid
                          ? "Formato invalido para nome de usuario."
                          : "Nome de usuario valido."}
                    </small>
                  </label>
                )}

                <label>
                  E-mail
                  <input
                    required
                    type="email"
                    maxLength={120}
                    value={authForm.email}
                    onChange={(event) => {
                      setAuthForm((prev) => ({ ...prev, email: event.target.value }));
                      if (authNotice.tone !== "neutral") {
                        setAuthNotice({ tone: "neutral", message: "" });
                      }
                    }}
                    placeholder="voce@exemplo.com"
                  />
                  <small
                    className={`field-note ${
                      !authForm.email.trim() ? "" : !emailValid ? "error" : "ok"
                    }`}
                  >
                    {!authForm.email.trim()
                      ? "Informe um e-mail valido."
                      : !emailValid
                        ? "Formato de e-mail invalido."
                        : "E-mail valido."}
                  </small>
                </label>

                {authMode === "register" && (
                  <label>
                    Nome exibido
                    <input
                      value={authForm.displayName}
                      onChange={(event) => setAuthForm((prev) => ({ ...prev, displayName: event.target.value }))}
                      placeholder="NERD HUB CORE"
                    />
                  </label>
                )}

                <label>
                  Senha
                  <input
                    required
                    type="password"
                    minLength={8}
                    maxLength={120}
                    value={authForm.password}
                    onChange={(event) => {
                      setAuthForm((prev) => ({ ...prev, password: event.target.value }));
                      if (authNotice.tone !== "neutral") {
                        setAuthNotice({ tone: "neutral", message: "" });
                      }
                    }}
                  />
                  <small className={`field-note ${!authForm.password ? "" : passwordValid ? "ok" : "error"}`}>
                    {!authForm.password
                      ? "Minimo de 8 caracteres."
                      : passwordValid
                        ? "Senha valida."
                        : "Senha precisa de no minimo 8 caracteres."}
                  </small>
                </label>

                <button className="btn btn-primary" disabled={!canSubmitAuth} type="submit">
                  {busy ? "Processando..." : authMode === "register" ? "Criar conta" : "Entrar"}
                </button>
              </form>

              {authNotice.message ? <p className={`auth-notice ${authNotice.tone}`}>{authNotice.message}</p> : null}

              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setAuthMode((prev) => (prev === "login" ? "register" : "login"))}
              >
                {authMode === "login" ? "Nao tem conta? Criar" : "Ja tem conta? Entrar"}
              </button>

              {authMode === "login" && (
                <button className="btn btn-ghost" type="button" onClick={resendVerification} disabled={busy}>
                  Reenviar verificacao de e-mail
                </button>
              )}

              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setAuthTheme((prev) => (prev === "dark" ? "light" : "dark"))}
              >
                {authTheme === "dark" ? "Visual Claro" : "Visual Escuro"}
              </button>

              <p className="status-text">{status}</p>
            </section>
          </section>
        </section>
      </main>
    );
  }

  if (token && user && (!vault || !themeReady)) {
    return (
      <main className="loading-shell">
        <section className="loading-card duo-loader" aria-busy="true">
          <span className="duo-loader-ring" aria-hidden="true" />
          <h1>NERD HUB</h1>
          <p className="duo-loader-line">syncing_duo_frequency...</p>
        </section>
      </main>
    );
  }

  if (!vault) {
    return null;
  }
  const sortedTimeline = [...vault.timeline].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );

  const sortedQuests = [...vault.quests].sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  const sortedNotes = [...vault.notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const sortedCalendar = [...vault.calendar].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const responseAvg = (() => {
    const pairs = responsePairs(vault.timeline);
    if (!pairs.length) {
      return null;
    }
    return pairs.reduce((sum, item) => sum + item.hours, 0) / pairs.length;
  })();

  const weeklyInteractions = vault.timeline.filter(
    (entry) => new Date(entry.occurredAt).getTime() >= Date.now() - 7 * 24 * 60 * 60 * 1000
  ).length;

  const completedQuests = vault.quests.filter((quest) => quest.done).length;
  const overdueQuests = vault.quests.filter(
    (quest) => !quest.done && new Date(quest.dueAt).getTime() < Date.now()
  ).length;

  const activitySeries = (() => {
    const now = Date.now();
    const series: Array<{ key: string; value: number }> = [];

    for (let offset = 13; offset >= 0; offset -= 1) {
      const date = new Date(now - offset * 24 * 60 * 60 * 1000);
      const key = toDateInput(date);
      const value = vault.timeline.filter((entry) => entry.occurredAt.startsWith(key)).length;
      series.push({ key: key.slice(5), value });
    }

    return series;
  })();

  const energyAlexandre = energyFor(vault, "alexandre");
  const energyIris = energyFor(vault, "iris");
  const activeRule = vault.reciprocityRules[ruleOwner];
  const discordShortcut = APP_SHORTCUTS.find((entry) => entry.id === "discord");
  const twitchShortcut = APP_SHORTCUTS.find((entry) => entry.id === "twitch");
  const weeklySeries = activitySeries.slice(-7);
  const weeklyPeak = Math.max(1, ...weeklySeries.map((item) => item.value));
  const quickQuests = sortedQuests.slice(0, 5);
  const alexStatus = energyAlexandre >= 72 ? "Stable" : energyAlexandre >= 48 ? "Watch" : "Low";
  const irisStatus = energyIris >= 72 ? "Stable" : energyIris >= 48 ? "Watch" : "Low";
  const serverTimeLabel = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(serverNow);
  const syncPercent = Math.max(0, Math.min(100, Math.round((energyAlexandre + energyIris) / 2 - overdueQuests * 4)));
  const recentLoad = weeklySeries.slice(-3).reduce((sum, item) => sum + item.value, 0);
  const previousLoad = weeklySeries.slice(0, 3).reduce((sum, item) => sum + item.value, 0);
  const syncDelta = recentLoad - previousLoad;
  const syncActive = syncPercent >= 68 && overdueQuests === 0;
  const syncEqualizer = weeklySeries.slice(-5).map((point) => ({
    key: point.key,
    height: Math.max(14, Math.round((point.value / weeklyPeak) * 42) + 10)
  }));
  const syncWavePath = buildSyncWavePath([
    weeklyInteractions,
    completedQuests,
    overdueQuests,
    Math.round(responseAvg || 0),
    energyAlexandre,
    energyIris
  ]);
  const statusTone = /falha|erro|expirada|inval/i.test(status)
    ? "error"
    : /salvo|sync|aplicado|sucesso|carregado|atualizado/i.test(status)
      ? "success"
      : "neutral";

  return (
    <main className="gx-shell">
      <div className="gx-main">
        <header className="chrome-panel">
          <div className="chrome-left">
            <span className="chrome-dot" />
            <span className="chrome-dot" />
            <span className="chrome-dot" />
            <div className="chrome-url">localhost:5173 / NERD HUB / {activeView}</div>
          </div>

          <div className="chrome-tab">NERD HUB</div>

          <div className="chrome-actions">
            <button className="btn btn-ghost" onClick={toggleUserTheme}>
              {themePreference === "dark" ? "Modo Claro" : "Modo Escuro"}
            </button>

            <button className="btn btn-ghost" onClick={saveNow} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </button>

            <button className="btn btn-ghost" onClick={logout}>
              Sair
            </button>
          </div>
        </header>

        <section className="hero-grid">
          <article className="hero-card panel">
            <p className="eyebrow">SHARED RHYTHM SPACE</p>
            <p className="duo-signature">Conta ativa: {user.displayName}</p>
            <h1>NERD HUB</h1>
            <p className="muted">
              Vault online ativo para <strong>{user.displayName}</strong>. Interface previsivel, organizada e feita para
              reduzir ruido.
            </p>
            <div className="hero-badges">
              <span>{participantLabel("alexandre")}</span>
              <span>{participantLabel("iris")}</span>
              <span>{dirty ? "Sync pendente" : "Sync em dia"}</span>
            </div>
          </article>

          <article className="quick-card panel">
            <h3>Snapshot</h3>
            <div className="snapshot-grid">
              <div>
                <p className="muted">Interacoes 7d</p>
                <strong>{weeklyInteractions}</strong>
              </div>
              <div>
                <p className="muted">Resposta media</p>
                <strong>{responseAvg === null ? "--" : `${responseAvg.toFixed(1)}h`}</strong>
              </div>
              <div>
                <p className="muted">Quests feitas</p>
                <strong>{completedQuests}</strong>
              </div>
              <div>
                <p className="muted">Quests atrasadas</p>
                <strong>{overdueQuests}</strong>
              </div>
            </div>
          </article>
        </section>

        <section className="workspace-grid">
          <nav className="view-nav panel">
            {VIEWS.map((view) => (
              <button
                key={view.id}
                className={`view-link ${activeView === view.id ? "active" : ""}`}
                onClick={() => setActiveView(view.id)}
                title={`${view.label} • ${view.hint}`}
                data-label={view.label}
                aria-label={view.label}
              >
                <span className="view-link-icon">
                  <ViewIcon view={view.id} />
                </span>
                <span className="view-link-text">{view.label}</span>
              </button>
            ))}
          </nav>

          <section className="module-panel panel">
            {activeView === "home" && (
              <section className="module-view">
                <div className="module-head">
                  <h2>Home</h2>
                  <p className="muted">Base diaria de voces: rotina, tracks e sync com foco calmo.</p>
                </div>

                <div className="home-grid">
                  <article className="home-block status-compact">
                    <div className="block-head">
                      <h3>Status Compact</h3>
                    </div>

                    <div className="status-strip">
                      <div className="status-strip-item">
                        <small>Status pessoa A</small>
                        <strong>
                          {participantLabel("alexandre")}: {alexStatus}
                        </strong>
                      </div>
                      <div className="status-strip-item">
                        <small>Status pessoa B</small>
                        <strong>
                          {participantLabel("iris")}: {irisStatus}
                        </strong>
                      </div>
                      <div className="status-strip-item">
                        <small>Server time</small>
                        <strong>{serverTimeLabel}</strong>
                      </div>
                    </div>

                    <div className="status-controls">
                      <button className="btn btn-primary" onClick={saveNow} disabled={saving}>
                        {saving ? "Salvando..." : "Salvar agora"}
                      </button>
                      <button className="btn btn-ghost" onClick={toggleUserTheme}>
                        {themePreference === "dark" ? "Modo Claro" : "Modo Escuro"}
                      </button>
                    </div>
                  </article>

                  <article className="home-block quest-playlist">
                    <div className="block-head">
                      <h3>Quest Playlist</h3>
                      <button className="btn btn-ghost compact" onClick={() => setActiveView("reciprocity")}>
                        Abrir gestor
                      </button>
                    </div>

                    <div className="track-list">
                      {quickQuests.length === 0 && <p className="muted">Nenhuma quest ativa agora.</p>}
                      {quickQuests.map((quest) => {
                        const difficulty = questDifficultyLevel(quest);
                        return (
                          <article key={quest.id} className={`track-row ${quest.done ? "done" : ""}`}>
                            <label className="track-check">
                              <input
                                type="checkbox"
                                checked={quest.done}
                                onChange={() =>
                                  patchVault((draft) => {
                                    const target = draft.quests.find((entry) => entry.id === quest.id);
                                    if (!target) {
                                      return;
                                    }
                                    target.done = !target.done;
                                    target.doneAt = target.done ? nowIso() : null;
                                  })
                                }
                              />
                            </label>
                            <div className="track-content">
                              <strong>{quest.action}</strong>
                              <small className="muted">
                                {questDurationLabel(quest)} • {questCategoryLabel(quest)} •{" "}
                                {quest.done ? "finalizada" : participantLabel(quest.owner)}
                              </small>
                            </div>
                            <div className="track-difficulty" aria-label={`Dificuldade ${difficulty} de 3`}>
                              {[1, 2, 3].map((index) => (
                                <span key={index} className={index <= difficulty ? "on" : ""} />
                              ))}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </article>

                  <article className={`home-block sync-stats ${syncActive ? "in-sync" : ""}`}>
                    <div className="block-head">
                      <h3>Sync + Stats</h3>
                    </div>
                    <svg className="sync-waveform" viewBox="0 0 260 70" role="img" aria-label="Waveform de sincronizacao">
                      <path d={syncWavePath} />
                    </svg>
                    <div className="sync-equalizer" aria-hidden="true">
                      {syncEqualizer.map((bar) => (
                        <span key={bar.key} style={{ height: `${bar.height}px` }} />
                      ))}
                    </div>
                    <div className="sync-values">
                      <div>
                        <small className="muted">Sync</small>
                        <strong>{syncPercent}%</strong>
                      </div>
                      <div>
                        <small className="muted">Delta</small>
                        <strong>{syncDelta >= 0 ? `+${syncDelta}` : syncDelta}</strong>
                      </div>
                    </div>
                  </article>

                  <article className="home-block brain-quick">
                    <div className="block-head">
                      <h3>Brain Quick</h3>
                    </div>
                    <form className="brain-quick-form" onSubmit={submitBrainQuick}>
                      <input
                        className="brain-input"
                        value={brainQuickInput}
                        onChange={(event) => setBrainQuickInput(event.target.value)}
                        placeholder="> registrar ideia rapida..."
                        maxLength={160}
                      />
                    </form>
                    <div className="quick-actions-grid">
                      <button
                        className="home-action-card"
                        type="button"
                        onClick={() => {
                          setActiveView("settings");
                          setStatus("Abrindo perfil e dados da conta.");
                        }}
                      >
                        <strong>Perfil</strong>
                        <small>Conta e seguranca</small>
                      </button>
                      <button
                        className="home-action-card"
                        type="button"
                        onClick={() => {
                          setActiveView("settings");
                          setStatus("Abrindo configuracoes.");
                        }}
                      >
                        <strong>Configuracoes</strong>
                        <small>Preferencias do sistema</small>
                      </button>
                      <button
                        className="home-action-card"
                        type="button"
                        onClick={() => {
                          if (twitchShortcut) {
                            launchShortcut(twitchShortcut);
                            return;
                          }
                          setStatus("Atalho de Jogos indisponivel no momento.");
                        }}
                      >
                        <strong>Jogos</strong>
                        <small>Abrir hub gamer</small>
                      </button>
                      <button
                        className="home-action-card"
                        type="button"
                        onClick={() => {
                          if (discordShortcut) {
                            launchShortcut(discordShortcut);
                            return;
                          }
                          setStatus("Atalho de Comunidade indisponivel no momento.");
                        }}
                      >
                        <strong>Comunidade</strong>
                        <small>Abrir Discord</small>
                      </button>
                      <button className="home-action-card danger" type="button" onClick={logout}>
                        <strong>Logout</strong>
                        <small>Encerrar sessao</small>
                      </button>
                    </div>
                  </article>

                  <article className="home-block weekly-data">
                    <div className="block-head">
                      <h3>Weekly Data</h3>
                    </div>
                    <div className="weekly-bars">
                      {weeklySeries.map((point) => {
                        const height = Math.max(8, Math.round((point.value / weeklyPeak) * 88));
                        const toneClass = point.value >= 2 ? "group" : "solo";
                        return (
                          <div
                            key={point.key}
                            className={`weekly-bar ${toneClass}`}
                            title={`${point.key}: ${point.value} interacoes`}
                          >
                            <span style={{ height: `${height}px` }} />
                            <small>{point.key}</small>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                </div>
              </section>
            )}

            {activeView === "timeline" && (
              <section className="module-view">
                <div className="module-head">
                  <h2>Linha do Tempo</h2>
                  <p className="muted">Registro de mensagens, encontros e marcos.</p>
                </div>

                <form
                  className="form-grid"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!timelineForm.title.trim()) {
                      return;
                    }

                    patchVault((draft) => {
                      draft.timeline.push({
                        id: createId(),
                        type: timelineForm.type,
                        actor: timelineForm.actor,
                        title: timelineForm.title.trim(),
                        details: timelineForm.details.trim(),
                        occurredAt: fromDateTimeInput(timelineForm.occurredAt),
                        createdAt: nowIso()
                      });
                    });

                    setTimelineForm((prev) => ({
                      ...prev,
                      title: "",
                      details: "",
                      occurredAt: toDateTimeInput(new Date())
                    }));
                  }}
                >
                  <label>
                    Tipo
                    <select
                      value={timelineForm.type}
                      onChange={(event) =>
                        setTimelineForm((prev) => ({ ...prev, type: event.target.value as TimelineEntry["type"] }))
                      }
                    >
                      <option value="mensagem">Mensagem</option>
                      <option value="encontro">Encontro</option>
                      <option value="momento">Momento</option>
                      <option value="sistema">Sistema</option>
                    </select>
                  </label>

                  <label>
                    Autor
                    <select
                      value={timelineForm.actor}
                      onChange={(event) =>
                        setTimelineForm((prev) => ({ ...prev, actor: event.target.value as TimelineEntry["actor"] }))
                      }
                    >
                      <option value="alexandre">Pessoa A</option>
                      <option value="iris">Pessoa B</option>
                      <option value="ambos">Ambos</option>
                      <option value="sistema">Sistema</option>
                    </select>
                  </label>

                  <label className="span-2">
                    Titulo
                    <input
                      required
                      maxLength={180}
                      value={timelineForm.title}
                      onChange={(event) => setTimelineForm((prev) => ({ ...prev, title: event.target.value }))}
                    />
                  </label>

                  <label className="span-2">
                    Detalhes
                    <textarea
                      rows={2}
                      maxLength={500}
                      value={timelineForm.details}
                      onChange={(event) => setTimelineForm((prev) => ({ ...prev, details: event.target.value }))}
                    />
                  </label>

                  <label>
                    Data e hora
                    <input
                      type="datetime-local"
                      value={timelineForm.occurredAt}
                      onChange={(event) => setTimelineForm((prev) => ({ ...prev, occurredAt: event.target.value }))}
                    />
                  </label>

                  <div className="form-actions">
                    <button className="btn btn-primary" type="submit">
                      Registrar
                    </button>
                  </div>
                </form>

                <div className="item-list">
                  {sortedTimeline.map((entry) => (
                    <article key={entry.id} className="item-card">
                      <div className="item-head-row">
                        <strong>{entry.title}</strong>
                        <span className="pill">{entry.type}</span>
                      </div>
                      <p>{entry.details || "Sem detalhes."}</p>
                      <small className="muted">
                        {actorLabel(entry.actor)} • {formatDateTime(entry.occurredAt)}
                      </small>
                    </article>
                  ))}
                </div>
              </section>
            )}
            {activeView === "reciprocity" && (
              <section className="module-view">
                <div className="module-head">
                  <h2>Reciprocidade</h2>
                  <p className="muted">Regras de cuidado, quests e medidores de energia.</p>
                </div>

                <div className="energy-grid">
                  <article className="energy-card">
                    <p className="muted">Energia pessoa A</p>
                    <div className="meter-track">
                      <span style={{ width: `${energyAlexandre}%` }} />
                    </div>
                    <strong>{energyAlexandre}%</strong>
                  </article>

                  <article className="energy-card">
                    <p className="muted">Energia pessoa B</p>
                    <div className="meter-track">
                      <span style={{ width: `${energyIris}%` }} />
                    </div>
                    <strong>{energyIris}%</strong>
                  </article>
                </div>

                <form
                  className="form-grid"
                  onSubmit={(event) => {
                    event.preventDefault();
                    patchVault((draft) => {
                      draft.reciprocityRules[ruleOwner].replyLimitHours = clampInt(
                        draft.reciprocityRules[ruleOwner].replyLimitHours,
                        1,
                        168,
                        8
                      );

                      draft.reciprocityRules[ruleOwner].initiativeDays = clampInt(
                        draft.reciprocityRules[ruleOwner].initiativeDays,
                        1,
                        30,
                        2
                      );
                    });
                  }}
                >
                  <label>
                    Usuario
                    <select value={ruleOwner} onChange={(event) => setRuleOwner(event.target.value as UserKey)}>
                      <option value="alexandre">Pessoa A</option>
                      <option value="iris">Pessoa B</option>
                    </select>
                  </label>

                  <label>
                    Limite resposta (h)
                    <input
                      type="number"
                      min={1}
                      max={168}
                      value={activeRule.replyLimitHours}
                      onChange={(event) =>
                        patchVault((draft) => {
                          draft.reciprocityRules[ruleOwner].replyLimitHours = clampInt(
                            Number(event.target.value),
                            1,
                            168,
                            8
                          );
                        })
                      }
                    />
                  </label>

                  <label>
                    Iniciativa (dias)
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={activeRule.initiativeDays}
                      onChange={(event) =>
                        patchVault((draft) => {
                          draft.reciprocityRules[ruleOwner].initiativeDays = clampInt(
                            Number(event.target.value),
                            1,
                            30,
                            2
                          );
                        })
                      }
                    />
                  </label>

                  <label className="span-2">
                    Gesto esperado
                    <input
                      maxLength={180}
                      value={activeRule.expectedAction}
                      onChange={(event) =>
                        patchVault((draft) => {
                          draft.reciprocityRules[ruleOwner].expectedAction = event.target.value;
                        })
                      }
                    />
                  </label>
                </form>

                <form
                  className="form-grid"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!questForm.action.trim()) {
                      return;
                    }

                    patchVault((draft) => {
                      draft.quests.push({
                        id: createId(),
                        owner: questForm.owner,
                        action: questForm.action.trim(),
                        dueAt: fromDateTimeInput(questForm.dueAt),
                        done: false,
                        createdAt: nowIso(),
                        doneAt: null
                      });
                    });

                    setQuestForm((prev) => ({
                      ...prev,
                      action: "",
                      dueAt: toDateTimeInput(new Date(Date.now() + 24 * 60 * 60 * 1000))
                    }));
                  }}
                >
                  <label>
                    Responsavel
                    <select
                      value={questForm.owner}
                      onChange={(event) => setQuestForm((prev) => ({ ...prev, owner: event.target.value as UserKey }))}
                    >
                      <option value="alexandre">Pessoa A</option>
                      <option value="iris">Pessoa B</option>
                    </select>
                  </label>

                  <label className="span-2">
                    Quest
                    <input
                      required
                      maxLength={240}
                      value={questForm.action}
                      onChange={(event) => setQuestForm((prev) => ({ ...prev, action: event.target.value }))}
                    />
                  </label>

                  <label>
                    Prazo
                    <input
                      type="datetime-local"
                      value={questForm.dueAt}
                      onChange={(event) => setQuestForm((prev) => ({ ...prev, dueAt: event.target.value }))}
                    />
                  </label>

                  <div className="form-actions">
                    <button className="btn btn-primary" type="submit">
                      Criar quest
                    </button>
                  </div>
                </form>

                <div className="item-list">
                  {sortedQuests.map((quest) => {
                    const difficulty = questDifficultyLevel(quest);
                    return (
                      <article key={quest.id} className={`item-card quest-card ${quest.done ? "is-done" : ""}`}>
                        <div className="item-head-row">
                          <strong>{quest.action}</strong>
                          <span className={`pill ${quest.done ? "ok" : ""}`}>{quest.done ? "concluida" : "pendente"}</span>
                        </div>
                        <div className="quest-meta-row">
                          <small className="muted">
                            {participantLabel(quest.owner)} • prazo {formatDateTime(quest.dueAt)}
                          </small>
                          <div className="quest-difficulty" aria-label={`Dificuldade ${difficulty} de 3`}>
                            {[1, 2, 3].map((index) => (
                              <span key={index} className={index <= difficulty ? "on" : ""} />
                            ))}
                          </div>
                        </div>
                        <div className="row-actions">
                          <button
                            className="btn btn-ghost"
                            onClick={() =>
                              patchVault((draft) => {
                                const target = draft.quests.find((entry) => entry.id === quest.id);
                                if (!target) {
                                  return;
                                }
                                target.done = !target.done;
                                target.doneAt = target.done ? nowIso() : null;
                              })
                            }
                          >
                            {quest.done ? "Reabrir" : "Concluir"}
                          </button>

                          <button
                            className="btn btn-ghost"
                            onClick={() =>
                              patchVault((draft) => {
                                draft.quests = draft.quests.filter((entry) => entry.id !== quest.id);
                              })
                            }
                          >
                            Remover
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {activeView === "notes" && (
              <section className="module-view">
                <div className="module-head">
                  <h2>Notas Privadas</h2>
                  <p className="muted">Memorias, ideias e confidencias.</p>
                </div>

                <form
                  className="form-grid"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!noteForm.title.trim() || !noteForm.content.trim()) {
                      return;
                    }

                    patchVault((draft) => {
                      draft.notes.push({
                        id: createId(),
                        owner: noteForm.owner,
                        title: noteForm.title.trim(),
                        tags: noteForm.tags
                          .split(",")
                          .map((tag) => tag.trim().toLowerCase())
                          .filter(Boolean)
                          .slice(0, 12),
                        content: noteForm.content.trim(),
                        createdAt: nowIso()
                      });
                    });

                    setNoteForm((prev) => ({ ...prev, title: "", tags: "", content: "" }));
                  }}
                >
                  <label>
                    Dono
                    <select
                      value={noteForm.owner}
                      onChange={(event) => setNoteForm((prev) => ({ ...prev, owner: event.target.value as UserKey }))}
                    >
                      <option value="alexandre">Pessoa A</option>
                      <option value="iris">Pessoa B</option>
                    </select>
                  </label>

                  <label className="span-2">
                    Titulo
                    <input
                      required
                      maxLength={180}
                      value={noteForm.title}
                      onChange={(event) => setNoteForm((prev) => ({ ...prev, title: event.target.value }))}
                    />
                  </label>

                  <label className="span-2">
                    Tags
                    <input
                      maxLength={220}
                      value={noteForm.tags}
                      onChange={(event) => setNoteForm((prev) => ({ ...prev, tags: event.target.value }))}
                      placeholder="terror, aventura, gatos"
                    />
                  </label>

                  <label className="span-2">
                    Conteudo
                    <textarea
                      rows={5}
                      maxLength={12000}
                      value={noteForm.content}
                      onChange={(event) => setNoteForm((prev) => ({ ...prev, content: event.target.value }))}
                    />
                  </label>

                  <div className="form-actions">
                    <button className="btn btn-primary" type="submit">
                      Salvar nota
                    </button>
                  </div>
                </form>

                <div className="item-list">
                  {sortedNotes.map((note) => (
                    <article key={note.id} className="item-card">
                      <div className="item-head-row">
                        <strong>{note.title}</strong>
                        <span className="pill">{participantLabel(note.owner)}</span>
                      </div>
                      <small className="muted">{formatDateTime(note.createdAt)}</small>
                      <p>{note.content}</p>
                      <div className="tag-row">
                        {note.tags.map((tag) => (
                          <span key={tag} className="tag-chip">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <button
                        className="btn btn-ghost"
                        onClick={() =>
                          patchVault((draft) => {
                            draft.notes = draft.notes.filter((entry) => entry.id !== note.id);
                          })
                        }
                      >
                        Apagar
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            )}
            {activeView === "calendar" && (
              <section className="module-view">
                <div className="module-head">
                  <h2>Agenda de Conexoes</h2>
                  <p className="muted">Dias de conversa, encontros e missoes.</p>
                </div>

                <form
                  className="form-grid"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!calendarForm.title.trim()) {
                      return;
                    }

                    patchVault((draft) => {
                      draft.calendar.push({
                        id: createId(),
                        date: calendarForm.date,
                        mode: calendarForm.mode,
                        title: calendarForm.title.trim(),
                        notes: calendarForm.notes.trim(),
                        done: false,
                        createdAt: nowIso()
                      });
                    });

                    setCalendarForm((prev) => ({ ...prev, title: "", notes: "", date: toDateInput(new Date()) }));
                  }}
                >
                  <label>
                    Data
                    <input
                      type="date"
                      value={calendarForm.date}
                      onChange={(event) => setCalendarForm((prev) => ({ ...prev, date: event.target.value }))}
                    />
                  </label>

                  <label>
                    Tipo
                    <select
                      value={calendarForm.mode}
                      onChange={(event) => setCalendarForm((prev) => ({ ...prev, mode: event.target.value }))}
                    >
                      <option value="conversa">Conversa</option>
                      <option value="encontro">Encontro</option>
                      <option value="aventura">Quest Aventura</option>
                      <option value="terror">Sessao Terror</option>
                    </select>
                  </label>

                  <label className="span-2">
                    Objetivo
                    <input
                      required
                      maxLength={180}
                      value={calendarForm.title}
                      onChange={(event) => setCalendarForm((prev) => ({ ...prev, title: event.target.value }))}
                    />
                  </label>

                  <label className="span-2">
                    Detalhes
                    <textarea
                      rows={3}
                      maxLength={1200}
                      value={calendarForm.notes}
                      onChange={(event) => setCalendarForm((prev) => ({ ...prev, notes: event.target.value }))}
                    />
                  </label>

                  <div className="form-actions">
                    <button className="btn btn-primary" type="submit">
                      Agendar
                    </button>
                  </div>
                </form>

                <div className="item-list">
                  {sortedCalendar.map((entry) => (
                    <article key={entry.id} className="item-card">
                      <div className="item-head-row">
                        <strong>{entry.title}</strong>
                        <span className={`pill ${entry.done ? "ok" : ""}`}>{entry.done ? "feito" : entry.mode}</span>
                      </div>
                      <small className="muted">{formatDate(entry.date)}</small>
                      <p>{entry.notes || "Sem detalhes."}</p>

                      <div className="row-actions">
                        <button
                          className="btn btn-ghost"
                          onClick={() =>
                            patchVault((draft) => {
                              const target = draft.calendar.find((item) => item.id === entry.id);
                              if (!target) {
                                return;
                              }
                              target.done = !target.done;
                            })
                          }
                        >
                          {entry.done ? "Marcar pendente" : "Concluir"}
                        </button>

                        <button
                          className="btn btn-ghost"
                          onClick={() =>
                            patchVault((draft) => {
                              draft.calendar = draft.calendar.filter((item) => item.id !== entry.id);
                            })
                          }
                        >
                          Remover
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {activeView === "stats" && (
              <section className="module-view">
                <div className="module-head">
                  <h2>Reflexao</h2>
                  <p className="muted">Leitura rapida dos padroes de conexao.</p>
                </div>

                <div className="stats-grid">
                  <article className="stat-card">
                    <small className="muted">Interacoes 7 dias</small>
                    <strong>{weeklyInteractions}</strong>
                  </article>
                  <article className="stat-card">
                    <small className="muted">Tempo medio resposta</small>
                    <strong>{responseAvg === null ? "--" : `${responseAvg.toFixed(1)}h`}</strong>
                  </article>
                  <article className="stat-card">
                    <small className="muted">Quests concluidas</small>
                    <strong>{completedQuests}</strong>
                  </article>
                </div>

                <div className="chart-card">
                  {activitySeries.map((point) => (
                    <div key={point.key} className="bar-column">
                      <div className="bar-track">
                        <span style={{ height: `${Math.max(6, point.value * 12)}px` }} />
                      </div>
                      <small>{point.key}</small>
                    </div>
                  ))}
                </div>

                <div className="insight-grid">
                  <article className="insight-card">
                    <h4>Leitura de ritmo</h4>
                    <p>
                      {weeklyInteractions < 5
                        ? "Semana em ritmo leve. Uma interacao curta pode manter o fluxo sem pressao."
                        : "Semana consistente. A frequencia atual mostra estabilidade entre voces."}
                    </p>
                  </article>

                  <article className="insight-card">
                    <h4>Reciprocidade</h4>
                    <p>
                      {overdueQuests > 0
                        ? `Existem ${overdueQuests} quest(s) atrasadas. Foquem em uma entrega simples hoje.`
                        : "Nao ha quests atrasadas. Base de reciprocidade em bom estado."}
                    </p>
                  </article>
                </div>
              </section>
            )}

            {activeView === "settings" && (
              <section className="module-view">
                <div className="module-head">
                  <h2>Ajustes</h2>
                  <p className="muted">Conta, seguranca e estado da sessao.</p>
                </div>

                <article className="item-card">
                  <p>
                    <strong>Usuario:</strong> {user.displayName} ({user.username})
                  </p>
                  <p>
                    <strong>E-mail:</strong> {user.email}
                  </p>
                  <p>
                    <strong>Criado em:</strong> {formatDateTime(user.createdAt)}
                  </p>
                  <p>
                    <strong>Ultimo update:</strong> {formatDateTime(vault.updatedAt)}
                  </p>
                </article>

                <form className="form-grid" onSubmit={submitPasswordChange}>
                  <label>
                    Senha atual
                    <input
                      type="password"
                      minLength={8}
                      maxLength={120}
                      value={passwordForm.currentPassword}
                      onChange={(event) =>
                        setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                      }
                    />
                  </label>

                  <label>
                    Nova senha
                    <input
                      type="password"
                      minLength={8}
                      maxLength={120}
                      value={passwordForm.nextPassword}
                      onChange={(event) =>
                        setPasswordForm((prev) => ({ ...prev, nextPassword: event.target.value }))
                      }
                    />
                  </label>

                  <div className="form-actions">
                    <button className="btn btn-primary" disabled={busy} type="submit">
                      Atualizar senha
                    </button>
                  </div>
                </form>
              </section>
            )}
          </section>
        </section>

        <footer className="status-bar panel">
          <p className={`status-inline ${statusTone}`}>
            <span aria-hidden="true">{statusTone === "error" ? "!" : statusTone === "success" ? "+" : "i"}</span>
            <span>{status}</span>
          </p>
        </footer>
      </div>
    </main>
  );
}
