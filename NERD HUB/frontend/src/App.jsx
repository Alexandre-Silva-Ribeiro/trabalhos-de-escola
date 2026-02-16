
import { useEffect, useMemo, useState } from "react";
import { api } from "./api.js";

const TABS = [
  { id: "timeline", label: "Linha do Tempo" },
  { id: "reciprocity", label: "Reciprocidade" },
  { id: "notes", label: "Notas" },
  { id: "calendar", label: "Agenda" },
  { id: "stats", label: "Reflexao" },
  { id: "settings", label: "Ajustes" }
];

const USERS = {
  alexandre: { label: "Alexandre", birthday: "2010-06-03", vibe: "Aventura | Xbox | Tetris" },
  iris: { label: "Iris", birthday: "2011-02-25", vibe: "Terror | PlayStation | FNAF" }
};

function createId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function toInputDate(date = new Date()) {
  return new Date(date).toISOString().slice(0, 10);
}

function toInputDateTime(date = new Date()) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function computeAge(birthday) {
  const birth = new Date(`${birthday}T00:00:00`);
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

function buildDefaultVault() {
  const now = new Date();
  const boot = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const sync = new Date(now.getTime() - 8 * 60 * 1000).toISOString();

  return {
    version: 1,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    settings: {
      theme: "dark",
      accent: "#45a4ff"
    },
    timeline: [
      {
        id: createId(),
        type: "mensagem",
        actor: "alexandre",
        title: "Boot da base NERD HUB",
        details: "Estrutura online inicializada.",
        occurredAt: boot,
        createdAt: boot
      },
      {
        id: createId(),
        type: "momento",
        actor: "iris",
        title: "Sincronizacao remota ativa",
        details: "Dados agora vivem no backend.",
        occurredAt: sync,
        createdAt: sync
      }
    ],
    reciprocityRules: {
      alexandre: {
        replyLimitHours: 8,
        initiativeDays: 2,
        expectedAction: "Mandar update noturno curto"
      },
      iris: {
        replyLimitHours: 10,
        initiativeDays: 2,
        expectedAction: "Check-in rapido apos aulas"
      }
    },
    quests: [],
    notes: [],
    calendar: []
  };
}

function energyFor(vault, userKey) {
  const rule = vault.reciprocityRules[userKey];
  let energy = 100;

  const overdue = vault.quests.filter(
    (quest) => quest.owner === userKey && !quest.done && new Date(quest.dueAt).getTime() < Date.now()
  ).length;
  energy -= overdue * 15;

  const messages = [...vault.timeline]
    .filter((entry) => entry.type === "mensagem" && (entry.actor === "alexandre" || entry.actor === "iris"))
    .sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt));

  const responseTimes = [];
  for (let i = 1; i < messages.length; i += 1) {
    const prev = messages[i - 1];
    const current = messages[i];
    if (prev.actor === current.actor || current.actor !== userKey) {
      continue;
    }

    const hours = (new Date(current.occurredAt).getTime() - new Date(prev.occurredAt).getTime()) / (1000 * 60 * 60);
    responseTimes.push(hours);
  }

  if (responseTimes.length) {
    const avg = responseTimes.reduce((acc, value) => acc + value, 0) / responseTimes.length;
    const over = Math.max(0, avg - rule.replyLimitHours);
    energy -= Math.min(35, over * 3);
  }

  const latestEntry = [...vault.timeline]
    .filter((entry) => entry.actor === userKey)
    .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))[0];

  if (latestEntry) {
    const daysSince = (Date.now() - new Date(latestEntry.occurredAt).getTime()) / (24 * 60 * 60 * 1000);
    if (daysSince > rule.initiativeDays) {
      energy -= Math.min(25, (daysSince - rule.initiativeDays) * 5);
    }
  }

  return Math.max(10, Math.min(100, Math.round(energy)));
}

function bareUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeInt(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(parsed)));
}
export default function App() {
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    username: "",
    displayName: "",
    password: ""
  });

  const [token, setToken] = useState(() => sessionStorage.getItem("nh_token") || "");
  const [user, setUser] = useState(() => {
    const raw = sessionStorage.getItem("nh_user");
    return raw ? JSON.parse(raw) : null;
  });

  const [vault, setVault] = useState(null);
  const [activeTab, setActiveTab] = useState("timeline");
  const [status, setStatus] = useState("Preencha seus dados para entrar no hub.");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [timelineForm, setTimelineForm] = useState({
    type: "mensagem",
    actor: "alexandre",
    title: "",
    details: "",
    occurredAt: toInputDateTime(new Date())
  });

  const [ruleOwner, setRuleOwner] = useState("alexandre");
  const [questForm, setQuestForm] = useState({
    owner: "alexandre",
    action: "",
    dueAt: toInputDateTime(new Date(Date.now() + 24 * 60 * 60 * 1000))
  });

  const [noteForm, setNoteForm] = useState({
    owner: "alexandre",
    title: "",
    tags: "",
    content: ""
  });

  const [calendarForm, setCalendarForm] = useState({
    date: toInputDate(new Date()),
    mode: "conversa",
    title: "",
    notes: ""
  });

  const [passwordForm, setPasswordForm] = useState({
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
      .then((response) => {
        if (!alive) {
          return;
        }

        setVault(response.vault || buildDefaultVault());
        setStatus("Vault carregado do backend.");
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
  }, [vault]);

  useEffect(() => {
    if (!dirty || !vault || !token) {
      return;
    }

    const timeout = setTimeout(() => {
      setSaving(true);
      api
        .saveVault(token, vault)
        .then(() => {
          setDirty(false);
          setStatus(`Sincronizado online em ${formatDateTime(nowIso())}.`);
        })
        .catch((error) => {
          setStatus(`Falha ao sincronizar: ${error.message}`);
        })
        .finally(() => {
          setSaving(false);
        });
    }, 850);

    return () => clearTimeout(timeout);
  }, [dirty, vault, token]);

  const stats = useMemo(() => {
    if (!vault) {
      return {
        weeklyInteractions: 0,
        avgResponseHours: null,
        completedQuests: 0,
        byDay: []
      };
    }

    const now = Date.now();
    const weeklyInteractions = vault.timeline.filter(
      (entry) => new Date(entry.occurredAt).getTime() >= now - 7 * 24 * 60 * 60 * 1000
    ).length;

    const messages = [...vault.timeline]
      .filter((entry) => entry.type === "mensagem" && (entry.actor === "alexandre" || entry.actor === "iris"))
      .sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt));

    const responses = [];
    for (let i = 1; i < messages.length; i += 1) {
      const prev = messages[i - 1];
      const current = messages[i];
      if (prev.actor === current.actor) {
        continue;
      }

      const hours = (new Date(current.occurredAt).getTime() - new Date(prev.occurredAt).getTime()) / (1000 * 60 * 60);
      responses.push(hours);
    }

    const avgResponseHours = responses.length
      ? responses.reduce((acc, value) => acc + value, 0) / responses.length
      : null;

    const completedQuests = vault.quests.filter((quest) => quest.done).length;

    const byDay = [];
    for (let i = 13; i >= 0; i -= 1) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const key = toInputDate(date);
      byDay.push({
        day: key.slice(5),
        value: vault.timeline.filter((entry) => entry.occurredAt.startsWith(key)).length
      });
    }

    return {
      weeklyInteractions,
      avgResponseHours,
      completedQuests,
      byDay
    };
  }, [vault]);

  function patchVault(mutator) {
    setVault((current) => {
      if (!current) {
        return current;
      }

      const next = clone(current);
      mutator(next);
      next.updatedAt = nowIso();
      return next;
    });

    setDirty(true);
  }
  function persistSession(nextToken, nextUser) {
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

  async function submitAuth(event) {
    event.preventDefault();
    setBusy(true);
    setStatus("Processando autenticacao...");

    try {
      const payload =
        authMode === "register"
          ? await api.register({
              username: authForm.username,
              displayName: authForm.displayName,
              password: authForm.password
            })
          : await api.login({
              username: authForm.username,
              password: authForm.password
            });

      const safeUser = bareUser(payload.user);
      persistSession(payload.token, safeUser);
      setVault(payload.vault || buildDefaultVault());
      setStatus("Acesso liberado. Vault online carregado.");
      setAuthForm({ username: "", displayName: "", password: "" });
    } catch (error) {
      setStatus(`Falha no acesso: ${error.message}`);
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
      setStatus(`Salvo online em ${formatDateTime(nowIso())}.`);
    } catch (error) {
      setStatus(`Falha ao salvar: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function submitPasswordChange(event) {
    event.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.nextPassword) {
      return;
    }

    setBusy(true);
    try {
      await api.changePassword(token, passwordForm);
      setStatus("Senha atualizada com sucesso.");
      setPasswordForm({ currentPassword: "", nextPassword: "" });
    } catch (error) {
      setStatus(`Falha na troca de senha: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  if (token && user && !vault) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <p className="auth-tag">PRIVATE ONLINE BUILD</p>
          <h1>NERD HUB</h1>
          <p className="status-line">Carregando vault online...</p>
        </section>
      </main>
    );
  }

  if (!token || !user) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <p className="auth-tag">RELATIONSHIP SYSTEM CORE</p>
          <h1>NERD HUB</h1>
          <p className="auth-desc">
            Versao React + backend. Vault persistido online com autenticacao e criptografia no servidor.
          </p>

          <form onSubmit={submitAuth} className="auth-form">
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
                  placeholder="NERD HUB PRIVATE"
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

            <button disabled={busy} type="submit" className="btn btn-primary">
              {busy ? "Processando..." : authMode === "register" ? "Criar conta" : "Entrar"}
            </button>
          </form>

          <div className="auth-switch">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setAuthMode((prev) => (prev === "login" ? "register" : "login"))}
            >
              {authMode === "login" ? "Nao tem conta? Criar" : "Ja tem conta? Entrar"}
            </button>
          </div>

          <p className="status-line">{status}</p>
        </section>
      </main>
    );
  }

  const sortedTimeline = [...vault.timeline].sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
  const sortedQuests = [...vault.quests].sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
  const sortedNotes = [...vault.notes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const sortedCalendar = [...vault.calendar].sort((a, b) => new Date(a.date) - new Date(b.date));

  const energyAlex = energyFor(vault, "alexandre");
  const energyIris = energyFor(vault, "iris");
  const currentRule = vault.reciprocityRules[ruleOwner];

  return (
    <main className="app-page">
      <header className="topbar panel">
        <div>
          <p className="auth-tag">PRIVATE ONLINE BUILD</p>
          <h1>NERD HUB</h1>
          <p className="small-text">Conta ativa: {user.displayName || user.username}</p>
        </div>

        <div className="top-actions">
          <label className="control-pill">
            Acento
            <input
              type="color"
              value={vault.settings.accent}
              onChange={(event) =>
                patchVault((next) => {
                  next.settings.accent = event.target.value;
                })
              }
            />
          </label>

          <button
            className="btn btn-ghost"
            onClick={() =>
              patchVault((next) => {
                next.settings.theme = next.settings.theme === "dark" ? "light" : "dark";
              })
            }
          >
            Modo: {vault.settings.theme === "dark" ? "Escuro" : "Claro"}
          </button>

          <button className="btn btn-ghost" onClick={saveNow} disabled={saving}>
            {saving ? "Salvando..." : "Salvar online"}
          </button>

          <button className="btn btn-ghost" onClick={logout}>
            Sair
          </button>
        </div>
      </header>
      <div className="layout">
        <aside className="sidebar panel">
          <div className="profiles">
            {Object.entries(USERS).map(([key, profile]) => (
              <article key={key} className="profile-card">
                <h3>{profile.label}</h3>
                <p className="small-text">Idade: {computeAge(profile.birthday)} anos</p>
                <p className="small-text">{profile.vibe}</p>
              </article>
            ))}
          </div>

          <nav className="tab-grid">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <p className="small-text">{dirty ? "Alteracoes pendentes de sync" : "Tudo sincronizado"}</p>
        </aside>

        <section className="panel view-panel">
          {activeTab === "timeline" && (
            <div className="view">
              <h2>Linha do Tempo de Interacoes</h2>
              <form
                className="grid-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!timelineForm.title.trim()) {
                    return;
                  }

                  patchVault((next) => {
                    next.timeline.push({
                      id: createId(),
                      type: timelineForm.type,
                      actor: timelineForm.actor,
                      title: timelineForm.title.trim(),
                      details: timelineForm.details.trim(),
                      occurredAt: new Date(timelineForm.occurredAt).toISOString(),
                      createdAt: nowIso()
                    });
                  });

                  setTimelineForm((prev) => ({
                    ...prev,
                    title: "",
                    details: "",
                    occurredAt: toInputDateTime(new Date())
                  }));
                }}
              >
                <label>
                  Tipo
                  <select
                    value={timelineForm.type}
                    onChange={(event) => setTimelineForm((prev) => ({ ...prev, type: event.target.value }))}
                  >
                    <option value="mensagem">Mensagem</option>
                    <option value="encontro">Encontro</option>
                    <option value="momento">Momento</option>
                  </select>
                </label>

                <label>
                  Autor
                  <select
                    value={timelineForm.actor}
                    onChange={(event) => setTimelineForm((prev) => ({ ...prev, actor: event.target.value }))}
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
                  Data/hora
                  <input
                    type="datetime-local"
                    value={timelineForm.occurredAt}
                    onChange={(event) => setTimelineForm((prev) => ({ ...prev, occurredAt: event.target.value }))}
                  />
                </label>

                <div className="align-end">
                  <button className="btn btn-primary" type="submit">
                    Registrar
                  </button>
                </div>
              </form>

              <div className="cards">
                {sortedTimeline.map((entry) => (
                  <article className="item-card" key={entry.id}>
                    <div className="line-between">
                      <strong>{entry.title}</strong>
                      <span className="badge">{entry.type}</span>
                    </div>
                    <p>{entry.details || "Sem detalhes"}</p>
                    <p className="small-text">
                      {USERS[entry.actor]?.label || entry.actor} | {formatDateTime(entry.occurredAt)}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          )}

          {activeTab === "reciprocity" && (
            <div className="view">
              <h2>Gestor de Reciprocidade</h2>

              <div className="energy-grid">
                <article className="meter-card">
                  <h3>Energia de Alexandre</h3>
                  <div className="meter">
                    <span style={{ width: `${energyAlex}%` }} />
                  </div>
                  <p className="small-text">{energyAlex}%</p>
                </article>
                <article className="meter-card">
                  <h3>Energia de Iris</h3>
                  <div className="meter">
                    <span style={{ width: `${energyIris}%` }} />
                  </div>
                  <p className="small-text">{energyIris}%</p>
                </article>
              </div>

              <form
                className="grid-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  patchVault((next) => {
                    next.reciprocityRules[ruleOwner] = {
                      replyLimitHours: safeInt(currentRule.replyLimitHours, 1, 168, 8),
                      initiativeDays: safeInt(currentRule.initiativeDays, 1, 30, 2),
                      expectedAction: currentRule.expectedAction
                    };
                  });
                }}
              >
                <label>
                  Usuario
                  <select value={ruleOwner} onChange={(event) => setRuleOwner(event.target.value)}>
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
                    value={currentRule.replyLimitHours}
                    onChange={(event) =>
                      patchVault((next) => {
                        next.reciprocityRules[ruleOwner].replyLimitHours = safeInt(event.target.value, 1, 168, 8);
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
                    value={currentRule.initiativeDays}
                    onChange={(event) =>
                      patchVault((next) => {
                        next.reciprocityRules[ruleOwner].initiativeDays = safeInt(event.target.value, 1, 30, 2);
                      })
                    }
                  />
                </label>

                <label className="span-2">
                  Gesto esperado
                  <input
                    maxLength={180}
                    value={currentRule.expectedAction}
                    onChange={(event) =>
                      patchVault((next) => {
                        next.reciprocityRules[ruleOwner].expectedAction = event.target.value;
                      })
                    }
                  />
                </label>
              </form>

              <form
                className="grid-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!questForm.action.trim()) {
                    return;
                  }

                  patchVault((next) => {
                    next.quests.push({
                      id: createId(),
                      owner: questForm.owner,
                      action: questForm.action.trim(),
                      dueAt: new Date(questForm.dueAt).toISOString(),
                      done: false,
                      createdAt: nowIso(),
                      doneAt: null
                    });
                  });

                  setQuestForm((prev) => ({
                    ...prev,
                    action: "",
                    dueAt: toInputDateTime(new Date(Date.now() + 24 * 60 * 60 * 1000))
                  }));
                }}
              >
                <label>
                  Responsavel
                  <select
                    value={questForm.owner}
                    onChange={(event) => setQuestForm((prev) => ({ ...prev, owner: event.target.value }))}
                  >
                    <option value="alexandre">Alexandre</option>
                    <option value="iris">Iris</option>
                  </select>
                </label>

                <label className="span-2">
                  Acao
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

                <div className="align-end">
                  <button className="btn btn-primary" type="submit">
                    Adicionar quest
                  </button>
                </div>
              </form>

              <div className="cards">
                {sortedQuests.length === 0 && <p className="small-text">Sem quests no momento.</p>}
                {sortedQuests.map((quest) => (
                  <article key={quest.id} className="item-card">
                    <div className="line-between">
                      <strong>{quest.action}</strong>
                      <span className={`badge ${quest.done ? "ok" : ""}`}>{quest.done ? "concluida" : "pendente"}</span>
                    </div>
                    <p className="small-text">
                      {USERS[quest.owner]?.label} | prazo {formatDateTime(quest.dueAt)}
                    </p>
                    <div className="inline-actions">
                      <button
                        className="btn btn-ghost"
                        onClick={() =>
                          patchVault((next) => {
                            const item = next.quests.find((entry) => entry.id === quest.id);
                            if (!item) return;
                            item.done = !item.done;
                            item.doneAt = item.done ? nowIso() : null;
                          })
                        }
                      >
                        {quest.done ? "Reabrir" : "Concluir"}
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={() =>
                          patchVault((next) => {
                            next.quests = next.quests.filter((entry) => entry.id !== quest.id);
                          })
                        }
                      >
                        Remover
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {activeTab === "notes" && (
            <div className="view">
              <h2>Notas Privadas</h2>

              <form
                className="grid-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!noteForm.title.trim() || !noteForm.content.trim()) {
                    return;
                  }

                  patchVault((next) => {
                    next.notes.push({
                      id: createId(),
                      owner: noteForm.owner,
                      title: noteForm.title.trim(),
                      tags: noteForm.tags
                        .split(",")
                        .map((tag) => tag.trim().toLowerCase())
                        .filter(Boolean)
                        .slice(0, 10),
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
                    onChange={(event) => setNoteForm((prev) => ({ ...prev, owner: event.target.value }))}
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
                  Tags (separadas por virgula)
                  <input
                    maxLength={180}
                    value={noteForm.tags}
                    onChange={(event) => setNoteForm((prev) => ({ ...prev, tags: event.target.value }))}
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

                <div className="align-end">
                  <button className="btn btn-primary" type="submit">
                    Salvar nota
                  </button>
                </div>
              </form>

              <div className="cards">
                {sortedNotes.length === 0 && <p className="small-text">Nenhuma nota registrada.</p>}
                {sortedNotes.map((note) => (
                  <article className="item-card" key={note.id}>
                    <div className="line-between">
                      <strong>{note.title}</strong>
                      <span className="small-text">{USERS[note.owner]?.label}</span>
                    </div>
                    <p className="small-text">{formatDateTime(note.createdAt)}</p>
                    <p>{note.content}</p>
                    <div className="chip-row">
                      {note.tags.map((tag) => (
                        <span key={tag} className="chip">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <button
                      className="btn btn-ghost"
                      onClick={() =>
                        patchVault((next) => {
                          next.notes = next.notes.filter((entry) => entry.id !== note.id);
                        })
                      }
                    >
                      Apagar
                    </button>
                  </article>
                ))}
              </div>
            </div>
          )}

          {activeTab === "calendar" && (
            <div className="view">
              <h2>Agenda / Calendario de Conexoes</h2>

              <form
                className="grid-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!calendarForm.title.trim()) {
                    return;
                  }

                  patchVault((next) => {
                    next.calendar.push({
                      id: createId(),
                      date: calendarForm.date,
                      mode: calendarForm.mode,
                      title: calendarForm.title.trim(),
                      notes: calendarForm.notes.trim(),
                      done: false,
                      createdAt: nowIso()
                    });
                  });

                  setCalendarForm((prev) => ({ ...prev, title: "", notes: "", date: toInputDate(new Date()) }));
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

                <div className="align-end">
                  <button className="btn btn-primary" type="submit">
                    Agendar
                  </button>
                </div>
              </form>

              <div className="cards">
                {sortedCalendar.length === 0 && <p className="small-text">Sem eventos agendados.</p>}
                {sortedCalendar.map((entry) => (
                  <article className="item-card" key={entry.id}>
                    <div className="line-between">
                      <strong>{entry.title}</strong>
                      <span className={`badge ${entry.done ? "ok" : ""}`}>{entry.done ? "feito" : entry.mode}</span>
                    </div>
                    <p className="small-text">{formatDate(entry.date)}</p>
                    <p>{entry.notes || "Sem detalhes"}</p>
                    <div className="inline-actions">
                      <button
                        className="btn btn-ghost"
                        onClick={() =>
                          patchVault((next) => {
                            const item = next.calendar.find((node) => node.id === entry.id);
                            if (!item) return;
                            item.done = !item.done;
                          })
                        }
                      >
                        {entry.done ? "Marcar pendente" : "Concluir"}
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={() =>
                          patchVault((next) => {
                            next.calendar = next.calendar.filter((node) => node.id !== entry.id);
                          })
                        }
                      >
                        Remover
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {activeTab === "stats" && (
            <div className="view">
              <h2>Modo Reflexao</h2>

              <div className="stats-grid">
                <article className="stat-card">
                  <p className="small-text">Interacoes 7 dias</p>
                  <p className="stat-number">{stats.weeklyInteractions}</p>
                </article>
                <article className="stat-card">
                  <p className="small-text">Tempo medio de resposta</p>
                  <p className="stat-number">
                    {stats.avgResponseHours === null ? "sem base" : `${stats.avgResponseHours.toFixed(1)}h`}
                  </p>
                </article>
                <article className="stat-card">
                  <p className="small-text">Quests concluidas</p>
                  <p className="stat-number">{stats.completedQuests}</p>
                </article>
              </div>

              <div className="bars-wrap">
                {stats.byDay.map((point) => (
                  <div key={point.day} className="bar-col">
                    <div className="bar-track">
                      <span style={{ height: `${Math.max(4, point.value * 12)}px` }} />
                    </div>
                    <small>{point.day}</small>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="view">
              <h2>Ajustes de Conta</h2>
              <p className="small-text">
                Seus dados do vault ficam no backend. O frontend so guarda token de sessao para manter login.
              </p>

              <form className="grid-form" onSubmit={submitPasswordChange}>
                <label>
                  Senha atual
                  <input
                    type="password"
                    minLength={8}
                    maxLength={120}
                    value={passwordForm.currentPassword}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                  />
                </label>

                <label>
                  Nova senha
                  <input
                    type="password"
                    minLength={8}
                    maxLength={120}
                    value={passwordForm.nextPassword}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, nextPassword: event.target.value }))}
                  />
                </label>

                <div className="align-end">
                  <button className="btn btn-primary" disabled={busy} type="submit">
                    Atualizar senha
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>
      </div>

      <footer className="status-footer panel">
        <p className="small-text">{status}</p>
      </footer>
    </main>
  );
}
