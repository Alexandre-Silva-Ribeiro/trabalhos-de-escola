
import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import type {
  CalendarEntry,
  NoteEntry,
  QuestEntry,
  ReciprocityRule,
  ThemeMode,
  TimelineEntry,
  UserKey,
  UserSummary,
  VaultData
} from "./types";

type AuthMode = "login" | "register";
type ViewId = "timeline" | "reciprocity" | "notes" | "calendar" | "stats" | "settings";

interface UserProfile {
  label: string;
  birthday: string;
  vibe: string;
  platform: string;
}

const USERS: Record<UserKey, UserProfile> = {
  alexandre: {
    label: "Alexandre",
    birthday: "2010-06-03",
    vibe: "Aventura | Tetris | Poppy",
    platform: "Xbox"
  },
  iris: {
    label: "Iris",
    birthday: "2011-02-25",
    vibe: "Terror | FNAF | Poppy",
    platform: "PlayStation"
  }
};

const VIEWS: Array<{ id: ViewId; label: string; hint: string }> = [
  { id: "timeline", label: "Timeline", hint: "Interacoes e momentos" },
  { id: "reciprocity", label: "Reciprocidade", hint: "Quests e energia" },
  { id: "notes", label: "Notas", hint: "Espaco privado" },
  { id: "calendar", label: "Agenda", hint: "Conexoes marcadas" },
  { id: "stats", label: "Reflexao", hint: "Padroes e metricas" },
  { id: "settings", label: "Ajustes", hint: "Conta e seguranca" }
];

const RAIL_ITEMS = ["GX", "TL", "RC", "NT", "AG", "ST", "VR"];

interface AuthForm {
  username: string;
  displayName: string;
  password: string;
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

function computeAge(birthdayIso: string): number {
  const birth = new Date(`${birthdayIso}T00:00:00`);
  const now = new Date();

  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());

  if (beforeBirthday) {
    age -= 1;
  }

  return age;
}

function actorLabel(actor: TimelineEntry["actor"]): string {
  if (actor === "ambos") {
    return "Ambos";
  }
  if (actor === "sistema") {
    return "Sistema";
  }
  return USERS[actor]?.label || actor;
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

function shiftAccent(hex: string): string {
  const clean = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    return "#ff8a42";
  }

  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);

  const boostedR = Math.min(255, Math.round(r * 0.7 + 85));
  const boostedG = Math.min(255, Math.round(g * 0.55 + 55));
  const boostedB = Math.min(255, Math.round(b * 0.25 + 25));

  return `#${boostedR.toString(16).padStart(2, "0")}${boostedG.toString(16).padStart(2, "0")}${boostedB
    .toString(16)
    .padStart(2, "0")}`;
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
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authForm, setAuthForm] = useState<AuthForm>({
    username: "",
    displayName: "",
    password: ""
  });

  const [token, setToken] = useState<string>(() => sessionStorage.getItem("nh_token") || "");
  const [user, setUser] = useState<UserSummary | null>(() => {
    const cached = sessionStorage.getItem("nh_user");
    return cached ? (JSON.parse(cached) as UserSummary) : null;
  });

  const [vault, setVault] = useState<VaultData | null>(null);
  const [activeView, setActiveView] = useState<ViewId>("timeline");
  const [status, setStatus] = useState<string>("Conecte sua conta para carregar o vault online.");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

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
    if (!vault) {
      return;
    }

    document.documentElement.dataset.theme = vault.settings.theme;
    document.documentElement.style.setProperty("--accent", vault.settings.accent);
    document.documentElement.style.setProperty("--accent-alt", shiftAccent(vault.settings.accent));
  }, [vault]);

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
    sessionStorage.setItem("nh_token", nextToken);
    sessionStorage.setItem("nh_user", JSON.stringify(nextUser));
  }

  function logout() {
    setToken("");
    setUser(null);
    setVault(null);
    setDirty(false);
    sessionStorage.removeItem("nh_token");
    sessionStorage.removeItem("nh_user");
  }

  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus("Autenticando no backend...");

    try {
      const payload =
        authMode === "register"
          ? await api.register({
              username: authForm.username.trim(),
              displayName: authForm.displayName.trim() || undefined,
              password: authForm.password
            })
          : await api.login({
              username: authForm.username.trim(),
              password: authForm.password
            });

      persistSession(payload.token, payload.user);
      setVault(payload.vault || buildDefaultVault());
      setAuthForm({ username: "", displayName: "", password: "" });
      setStatus("Acesso liberado. Sistema operacional do hub ativo.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      setStatus(`Falha de acesso: ${message}`);
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

  async function submitPasswordChange(event: React.FormEvent<HTMLFormElement>) {
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

  const showAuth = !token || !user;

  if (showAuth) {
    return (
      <main className="auth-shell">
        <aside className="auth-rail">
          {RAIL_ITEMS.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </aside>

        <section className="auth-main">
          <header className="chrome-panel">
            <div className="chrome-left">
              <span className="chrome-dot" />
              <span className="chrome-dot" />
              <span className="chrome-dot" />
              <div className="chrome-url">localhost:5173 / NERD HUB</div>
            </div>
            <div className="chrome-tab">NERD HUB</div>
          </header>

          <section className="auth-card">
            <p className="eyebrow">PRIVATE RELATIONSHIP SYSTEM</p>
            <h1>NERD HUB</h1>
            <p className="muted">
              React + TypeScript + Node. Visual limpo e imersivo inspirado no Opera GX, sem copiar layout literal.
            </p>

            <form className="auth-form" onSubmit={submitAuth}>
              <label>
                Usuario
                <input
                  required
                  minLength={3}
                  maxLength={30}
                  value={authForm.username}
                  onChange={(event) => setAuthForm((prev) => ({ ...prev, username: event.target.value }))}
                  placeholder="alexandre_iris"
                />
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
                  onChange={(event) => setAuthForm((prev) => ({ ...prev, password: event.target.value }))}
                />
              </label>

              <button className="btn btn-primary" disabled={busy} type="submit">
                {busy ? "Processando..." : authMode === "register" ? "Criar conta" : "Entrar"}
              </button>
            </form>

            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => setAuthMode((prev) => (prev === "login" ? "register" : "login"))}
            >
              {authMode === "login" ? "Nao tem conta? Criar" : "Ja tem conta? Entrar"}
            </button>

            <p className="status-text">{status}</p>
          </section>
        </section>
      </main>
    );
  }

  if (token && user && !vault) {
    return (
      <main className="loading-shell">
        <section className="loading-card">
          <p className="eyebrow">SYNC ONLINE</p>
          <h2>Carregando vault...</h2>
          <p className="muted">Conectando dados no backend.</p>
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

  const activitySeries = useMemo(() => {
    const now = Date.now();
    const series: Array<{ key: string; value: number }> = [];

    for (let offset = 13; offset >= 0; offset -= 1) {
      const date = new Date(now - offset * 24 * 60 * 60 * 1000);
      const key = toDateInput(date);
      const value = vault.timeline.filter((entry) => entry.occurredAt.startsWith(key)).length;
      series.push({ key: key.slice(5), value });
    }

    return series;
  }, [vault.timeline]);

  const energyAlexandre = energyFor(vault, "alexandre");
  const energyIris = energyFor(vault, "iris");
  const activeRule = vault.reciprocityRules[ruleOwner];

  return (
    <main className="gx-shell">
      <aside className="gx-rail" aria-hidden="true">
        {RAIL_ITEMS.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </aside>

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
            <label className="chip-control">
              Acento
              <input
                type="color"
                value={vault.settings.accent}
                onChange={(event) =>
                  patchVault((draft) => {
                    draft.settings.accent = event.target.value;
                  })
                }
              />
            </label>

            <button
              className="btn btn-ghost"
              onClick={() =>
                patchVault((draft) => {
                  draft.settings.theme = draft.settings.theme === "dark" ? "light" : "dark";
                })
              }
            >
              {vault.settings.theme === "dark" ? "Modo Escuro" : "Modo Claro"}
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
            <p className="eyebrow">RELATIONSHIP SYSTEM CORE</p>
            <h1>NERD HUB</h1>
            <p className="muted">
              Vault online ativo para <strong>{user.displayName}</strong>. Design com atmosfera gamer limpa e foco em leitura.
            </p>
            <div className="hero-badges">
              <span>{USERS.alexandre.label} {computeAge(USERS.alexandre.birthday)}y</span>
              <span>{USERS.iris.label} {computeAge(USERS.iris.birthday)}y</span>
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
              >
                <strong>{view.label}</strong>
                <small>{view.hint}</small>
              </button>
            ))}
          </nav>

          <section className="module-panel panel">
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
                      <option value="alexandre">Alexandre</option>
                      <option value="iris">Iris</option>
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
                    <p className="muted">Energia Alexandre</p>
                    <div className="meter-track">
                      <span style={{ width: `${energyAlexandre}%` }} />
                    </div>
                    <strong>{energyAlexandre}%</strong>
                  </article>

                  <article className="energy-card">
                    <p className="muted">Energia Iris</p>
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
                      <option value="alexandre">Alexandre</option>
                      <option value="iris">Iris</option>
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
                      <option value="alexandre">Alexandre</option>
                      <option value="iris">Iris</option>
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
                  {sortedQuests.map((quest) => (
                    <article key={quest.id} className="item-card">
                      <div className="item-head-row">
                        <strong>{quest.action}</strong>
                        <span className={`pill ${quest.done ? "ok" : ""}`}>{quest.done ? "concluida" : "pendente"}</span>
                      </div>
                      <small className="muted">
                        {USERS[quest.owner].label} • prazo {formatDateTime(quest.dueAt)}
                      </small>
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
                  ))}
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
                      <option value="alexandre">Alexandre</option>
                      <option value="iris">Iris</option>
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
                        <span className="pill">{USERS[note.owner].label}</span>
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
          <p className="muted">{status}</p>
        </footer>
      </div>
    </main>
  );
}
