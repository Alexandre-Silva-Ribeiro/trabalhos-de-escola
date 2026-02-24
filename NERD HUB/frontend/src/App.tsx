import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { User } from "firebase/auth";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile
} from "firebase/auth";
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";

import { firebaseAuth, firestoreDb, googleProvider, isFirebaseConfigured } from "./firebase";
import type {
  AbaPrincipal,
  CategoriaQuest,
  EstadoAviso,
  Quest,
  RegistroLocalizacao,
  StatusOnline,
  TemaModo,
  UsuarioApp
} from "./types";

type ModoAuth = "entrar" | "cadastro";

const COLECOES = {
  usuarios: "users",
  temaPreferencia: "theme_preference",
  statusOnline: "status_online",
  diasAtividade: "dias_atividade",
  localizacao: "localizacao",
  quests: "quests",
  sincronizacao: "sincronizacao_tempo_real"
} as const;

const ABAS: Array<{ id: AbaPrincipal; titulo: string }> = [
  { id: "inicio", titulo: "Inicio" },
  { id: "quests", titulo: "Quests" },
  { id: "comunidade", titulo: "Comunidade" },
  { id: "perfil", titulo: "Perfil" },
  { id: "configuracoes", titulo: "Configuracoes" }
];

const CATEGORIAS: Array<{ valor: CategoriaQuest; rotulo: string }> = [
  { valor: "estudo", rotulo: "Estudo" },
  { valor: "projeto", rotulo: "Projeto" },
  { valor: "rotina", rotulo: "Rotina" },
  { valor: "lazer", rotulo: "Lazer" }
];

const SEQUENCIA_OCULTA = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "KeyB",
  "KeyA"
];

function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function normalizarNomeUsuario(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 30);
}

function nomePadrao(usuario: User): string {
  const porEmail = (usuario.email || "").split("@")[0];
  const base = (usuario.displayName || porEmail || "usuario").trim();
  return base.slice(0, 30);
}

function chaveDia(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function chaveMes(data: Date): string {
  return chaveDia(data).slice(0, 7);
}

function valorParaIso(valor: unknown): string {
  if (valor instanceof Timestamp) {
    return valor.toDate().toISOString();
  }
  if (typeof valor === "string") {
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? new Date().toISOString() : data.toISOString();
  }
  if (typeof valor === "number") {
    return new Date(valor).toISOString();
  }
  if (typeof valor === "object" && valor && "seconds" in valor) {
    return new Date(Number((valor as { seconds: number }).seconds || 0) * 1000).toISOString();
  }
  return new Date().toISOString();
}

function formatarDataHora(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(iso));
}

function nivelAtividade(quantidade: number): number {
  if (quantidade <= 0) return 0;
  if (quantidade <= 2) return 1;
  if (quantidade <= 4) return 2;
  if (quantidade <= 6) return 3;
  return 4;
}

function temaInicial(): TemaModo {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function IconeAba({ aba }: { aba: AbaPrincipal }) {
  const comum = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };

  if (aba === "inicio") {
    return (
      <svg {...comum}>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
      </svg>
    );
  }
  if (aba === "quests") {
    return (
      <svg {...comum}>
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="m8 12 2.3 2.3L16 8.7" />
      </svg>
    );
  }
  if (aba === "comunidade") {
    return (
      <svg {...comum}>
        <circle cx="8" cy="9" r="3" />
        <circle cx="16" cy="9" r="3" />
        <path d="M4 19c1-3.2 3.8-5 7-5" />
        <path d="M13 14c3.2 0 6 1.8 7 5" />
      </svg>
    );
  }
  if (aba === "perfil") {
    return (
      <svg {...comum}>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c1-3.2 3.8-5 7-5s6 1.8 7 5" />
      </svg>
    );
  }
  return (
    <svg {...comum}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="m19.4 15-.9 1.6-2-.2a6.8 6.8 0 0 1-1.2.7l-.4 2h-2l-.4-2a6.8 6.8 0 0 1-1.2-.7l-2 .2-.9-1.6 1.5-1.3a7 7 0 0 1 0-1.4L7.4 11l.9-1.6 2 .2c.4-.3.8-.5 1.2-.7l.4-2h2l.4 2c.4.2.8.4 1.2.7l2-.2.9 1.6-1.5 1.3c.1.5.1.9 0 1.4z" />
    </svg>
  );
}

export default function App() {
  const [modoAuth, setModoAuth] = useState<ModoAuth>("entrar");
  const [carregandoAuth, setCarregandoAuth] = useState(true);
  const [usuarioAuth, setUsuarioAuth] = useState<User | null>(null);
  const [usuarioApp, setUsuarioApp] = useState<UsuarioApp | null>(null);
  const [tema, setTema] = useState<TemaModo>(temaInicial);
  const [temaPronto, setTemaPronto] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<AbaPrincipal>("inicio");
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<EstadoAviso>({ tipo: "neutro", mensagem: "" });

  const [formAuth, setFormAuth] = useState({ nomeUsuario: "", nomeExibido: "", email: "", senha: "" });
  const [questForm, setQuestForm] = useState<{ titulo: string; categoria: CategoriaQuest; prioridade: 1 | 2 | 3 }>({
    titulo: "",
    categoria: "rotina",
    prioridade: 2
  });

  const [quests, setQuests] = useState<Quest[]>([]);
  const [statusOnline, setStatusOnline] = useState<StatusOnline[]>([]);
  const [mapaAtividade, setMapaAtividade] = useState<Record<string, number>>({});
  const [localizacoes, setLocalizacoes] = useState<RegistroLocalizacao[]>([]);
  const [rastreioAtivo, setRastreioAtivo] = useState(false);
  const [comandoSecreto, setComandoSecreto] = useState("");

  const [easterLogoAtivo, setEasterLogoAtivo] = useState(false);
  const [easterModoTerminal, setEasterModoTerminal] = useState(false);
  const [easterTecladoAtivo, setEasterTecladoAtivo] = useState(false);
  const [easterDuplaAtivo, setEasterDuplaAtivo] = useState(false);
  const [easterDataAtivo, setEasterDataAtivo] = useState(false);
  const [cliquesLogo, setCliquesLogo] = useState(0);

  const watchIdRef = useRef<number | null>(null);
  const heartbeatRef = useRef<number | null>(null);
  const bufferTeclasRef = useRef<string[]>([]);

  const emailValido = validarEmail(formAuth.email);
  const senhaValida = formAuth.senha.length >= 8;
  const nomeUsuarioNormalizado = normalizarNomeUsuario(formAuth.nomeUsuario);
  const nomeUsuarioValido = /^[a-z0-9_]{3,30}$/.test(nomeUsuarioNormalizado);

  const onlineAtivos = useMemo(() => statusOnline.filter((item) => item.online), [statusOnline]);
  const questsConcluidas = useMemo(() => quests.filter((item) => item.concluida).length, [quests]);

  useEffect(() => {
    document.documentElement.dataset.theme = tema;
  }, [tema]);

  useEffect(() => {
    const hoje = new Date();
    const chave = `${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
    setEasterDataAtivo(chave === "06-03" || chave === "02-25");
  }, []);

  useEffect(() => {
    if (!firebaseAuth) {
      setCarregandoAuth(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      setUsuarioAuth(user);
      setCarregandoAuth(false);
    });
    return () => unsubscribe();
  }, []);

  async function registrarSincronizacao(uid: string, evento: string, extra?: Record<string, unknown>) {
    if (!firestoreDb) return;
    await setDoc(
      doc(firestoreDb, COLECOES.sincronizacao, uid),
      { uid, evento, extra: extra || {}, atualizadoEm: serverTimestamp() },
      { merge: true }
    );
  }

  async function registrarAtividade(uid: string, tipo: string) {
    if (!firestoreDb) return;
    const hoje = new Date();
    const dia = chaveDia(hoje);
    await setDoc(
      doc(firestoreDb, COLECOES.diasAtividade, `${uid}_${dia}`),
      {
        uid,
        data: dia,
        mes: chaveMes(hoje),
        quantidade: increment(1),
        tipoUltimoEvento: tipo,
        atualizadoEm: serverTimestamp()
      },
      { merge: true }
    );
  }

  useEffect(() => {
    if (!usuarioAuth || !firestoreDb) {
      setUsuarioApp(null);
      setTemaPronto(false);
      setQuests([]);
      setStatusOnline([]);
      setMapaAtividade({});
      setLocalizacoes([]);
      return;
    }

    let ativo = true;
    setTemaPronto(false);

    const uid = usuarioAuth.uid;
    const nomeBase = nomePadrao(usuarioAuth);
    const nomeUsuarioBase = normalizarNomeUsuario(nomeBase || "usuario");

    const userRef = doc(firestoreDb, COLECOES.usuarios, uid);
    const temaRef = doc(firestoreDb, COLECOES.temaPreferencia, uid);
    const statusRef = doc(firestoreDb, COLECOES.statusOnline, uid);

    const atualizarStatus = async (online: boolean) => {
      await setDoc(
        statusRef,
        {
          uid,
          nomeExibido: usuarioAuth.displayName || nomeBase,
          online,
          ultimoPulso: serverTimestamp()
        },
        { merge: true }
      );
    };

    void (async () => {
      try {
        await setDoc(
          userRef,
          {
            uid,
            nomeExibido: usuarioAuth.displayName || nomeBase,
            nomeUsuario: nomeUsuarioBase,
            nomeUsuarioLower: nomeUsuarioBase,
            email: usuarioAuth.email || "",
            temaPreferido: "dark",
            criadoEm: serverTimestamp(),
            atualizadoEm: serverTimestamp()
          },
          { merge: true }
        );

        const temaSnap = await getDoc(temaRef);
        if (!temaSnap.exists()) {
          await setDoc(temaRef, { uid, tema: "dark", atualizadoEm: serverTimestamp() }, { merge: true });
        }

        await registrarAtividade(uid, "acesso");
        await registrarSincronizacao(uid, "sessao_iniciada", { uid });
        await atualizarStatus(true);
      } catch (erro) {
        if (ativo) {
          setAviso({ tipo: "erro", mensagem: `Falha ao preparar dados: ${String(erro)}` });
        }
      }
    })();

    const unsubUsuario = onSnapshot(userRef, (snap) => {
      if (!ativo) return;
      const data = snap.data();
      if (!data) return;
      setUsuarioApp({
        uid,
        nomeExibido: String(data.nomeExibido || nomeBase),
        nomeUsuario: String(data.nomeUsuario || nomeUsuarioBase),
        nomeUsuarioLower: String(data.nomeUsuarioLower || nomeUsuarioBase),
        email: String(data.email || usuarioAuth.email || ""),
        temaPreferido: data.temaPreferido === "light" ? "light" : "dark",
        criadoEm: valorParaIso(data.criadoEm),
        atualizadoEm: valorParaIso(data.atualizadoEm)
      });
    });

    const unsubTema = onSnapshot(temaRef, (snap) => {
      if (!ativo) return;
      const data = snap.data();
      setTema(data?.tema === "light" ? "light" : "dark");
      setTemaPronto(true);
    });

    const questsQuery = query(collection(firestoreDb, COLECOES.quests), orderBy("atualizadoEm", "desc"), limit(200));
    const unsubQuests = onSnapshot(questsQuery, (snap) => {
      if (!ativo) return;
      setQuests(
        snap.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            titulo: String(data.titulo || "Quest sem titulo"),
            categoria: (data.categoria || "rotina") as CategoriaQuest,
            prioridade: Math.max(1, Math.min(3, Number(data.prioridade || 2))) as 1 | 2 | 3,
            concluida: Boolean(data.concluida),
            criadaPor: String(data.criadaPor || ""),
            criadoEm: valorParaIso(data.criadoEm),
            atualizadoEm: valorParaIso(data.atualizadoEm),
            concluidaEm: data.concluidaEm ? valorParaIso(data.concluidaEm) : null
          } satisfies Quest;
        })
      );
    });

    const statusQuery = query(collection(firestoreDb, COLECOES.statusOnline), where("online", "==", true), limit(30));
    const unsubStatus = onSnapshot(statusQuery, (snap) => {
      if (!ativo) return;
      const lista = snap.docs
        .map((docSnap) => {
          const data = docSnap.data();
          return {
            uid: docSnap.id,
            nomeExibido: String(data.nomeExibido || "Usuario"),
            online: Boolean(data.online),
            ultimoPulso: valorParaIso(data.ultimoPulso)
          } satisfies StatusOnline;
        })
        .sort((a, b) => new Date(b.ultimoPulso).getTime() - new Date(a.ultimoPulso).getTime());
      setStatusOnline(lista);
    });

    const atividadeQuery = query(collection(firestoreDb, COLECOES.diasAtividade), where("uid", "==", uid), limit(400));
    const unsubAtividade = onSnapshot(atividadeQuery, (snap) => {
      if (!ativo) return;
      const mapa: Record<string, number> = {};
      for (const item of snap.docs) {
        const data = item.data();
        if (data.data) {
          mapa[String(data.data)] = Number(data.quantidade || 0);
        }
      }
      setMapaAtividade(mapa);
    });

    const localQuery = query(collection(firestoreDb, COLECOES.localizacao), limit(30));
    const unsubLocal = onSnapshot(localQuery, (snap) => {
      if (!ativo) return;
      const lista = snap.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          uid: docSnap.id,
          nomeExibido: String(data.nomeExibido || "Usuario"),
          ativo: Boolean(data.ativo),
          latitude: typeof data.latitude === "number" ? data.latitude : null,
          longitude: typeof data.longitude === "number" ? data.longitude : null,
          atualizadoEm: valorParaIso(data.atualizadoEm)
        } satisfies RegistroLocalizacao;
      });
      setLocalizacoes(lista);
      setRastreioAtivo(Boolean(lista.find((item) => item.uid === uid)?.ativo));
    });

    if (heartbeatRef.current !== null) {
      window.clearInterval(heartbeatRef.current);
    }
    heartbeatRef.current = window.setInterval(() => {
      void atualizarStatus(true);
    }, 30_000);

    const aoMudarVisibilidade = () => {
      if (document.visibilityState === "hidden") {
        void atualizarStatus(false);
      } else {
        void atualizarStatus(true);
      }
    };
    const aoFechar = () => {
      void atualizarStatus(false);
    };

    document.addEventListener("visibilitychange", aoMudarVisibilidade);
    window.addEventListener("beforeunload", aoFechar);

    return () => {
      ativo = false;
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
      window.removeEventListener("beforeunload", aoFechar);
      if (heartbeatRef.current !== null) {
        window.clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      void atualizarStatus(false);
      unsubUsuario();
      unsubTema();
      unsubQuests();
      unsubStatus();
      unsubAtividade();
      unsubLocal();
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [usuarioAuth]);

  useEffect(() => {
    if (onlineAtivos.length < 2) return;
    setEasterDuplaAtivo(true);
    const timer = window.setTimeout(() => setEasterDuplaAtivo(false), 4000);
    return () => window.clearTimeout(timer);
  }, [onlineAtivos]);

  useEffect(() => {
    const aoPressionar = (evento: KeyboardEvent) => {
      bufferTeclasRef.current.push(evento.code);
      if (bufferTeclasRef.current.length > SEQUENCIA_OCULTA.length) {
        bufferTeclasRef.current.shift();
      }
      const bateu = SEQUENCIA_OCULTA.every((codigo, i) => bufferTeclasRef.current[i] === codigo);
      if (!bateu) return;
      setEasterTecladoAtivo(true);
      setAviso({ tipo: "sucesso", mensagem: "Modo ritmo oculto ativado por 10 segundos." });
      window.setTimeout(() => setEasterTecladoAtivo(false), 10_000);
      bufferTeclasRef.current = [];
    };
    window.addEventListener("keydown", aoPressionar);
    return () => window.removeEventListener("keydown", aoPressionar);
  }, []);

  async function atualizarTema(novoTema: TemaModo) {
    setTema(novoTema);
    if (!usuarioAuth || !firestoreDb) return;
    await setDoc(doc(firestoreDb, COLECOES.temaPreferencia, usuarioAuth.uid), {
      uid: usuarioAuth.uid,
      tema: novoTema,
      atualizadoEm: serverTimestamp()
    }, { merge: true });
    await setDoc(doc(firestoreDb, COLECOES.usuarios, usuarioAuth.uid), {
      temaPreferido: novoTema,
      atualizadoEm: serverTimestamp()
    }, { merge: true });
    await registrarSincronizacao(usuarioAuth.uid, "tema_alterado", { tema: novoTema });
  }

  async function enviarCadastro(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!firebaseAuth || !firestoreDb) return;
    if (!nomeUsuarioValido || !emailValido || !senhaValida) {
      setAviso({ tipo: "erro", mensagem: "Revise os campos antes de continuar." });
      return;
    }
    setOcupado(true);
    try {
      const consulta = query(collection(firestoreDb, COLECOES.usuarios), where("nomeUsuarioLower", "==", nomeUsuarioNormalizado), limit(1));
      const existe = await getDocs(consulta);
      if (!existe.empty) {
        throw new Error("Esse nome de usuario ja esta em uso.");
      }

      const cred = await createUserWithEmailAndPassword(firebaseAuth, formAuth.email.trim().toLowerCase(), formAuth.senha);
      const nomeExibido = formAuth.nomeExibido.trim() || formAuth.nomeUsuario.trim();
      await updateProfile(cred.user, { displayName: nomeExibido });
      await sendEmailVerification(cred.user).catch(() => null);

      await setDoc(doc(firestoreDb, COLECOES.usuarios, cred.user.uid), {
        uid: cred.user.uid,
        nomeExibido,
        nomeUsuario: formAuth.nomeUsuario.trim(),
        nomeUsuarioLower: nomeUsuarioNormalizado,
        email: formAuth.email.trim().toLowerCase(),
        temaPreferido: "dark",
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      }, { merge: true });

      await setDoc(doc(firestoreDb, COLECOES.temaPreferencia, cred.user.uid), {
        uid: cred.user.uid,
        tema: "dark",
        atualizadoEm: serverTimestamp()
      }, { merge: true });

      await registrarAtividade(cred.user.uid, "cadastro");
      setAviso({ tipo: "sucesso", mensagem: "Conta criada com sucesso." });
      setFormAuth((atual) => ({ ...atual, senha: "" }));
    } catch (erro) {
      setAviso({ tipo: "erro", mensagem: String((erro as Error).message || "Falha ao criar conta.") });
    } finally {
      setOcupado(false);
    }
  }

  async function enviarLogin(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!firebaseAuth || !firestoreDb) return;
    if (!emailValido || !senhaValida) {
      setAviso({ tipo: "erro", mensagem: "Informe e-mail valido e senha com no minimo 8 caracteres." });
      return;
    }
    setOcupado(true);
    try {
      const cred = await signInWithEmailAndPassword(firebaseAuth, formAuth.email.trim().toLowerCase(), formAuth.senha);
      await registrarAtividade(cred.user.uid, "login");
      setAviso({ tipo: "sucesso", mensagem: "Acesso liberado." });
      setFormAuth((atual) => ({ ...atual, senha: "" }));
    } catch {
      setAviso({ tipo: "erro", mensagem: "Nao foi possivel entrar. Confira e-mail e senha." });
    } finally {
      setOcupado(false);
    }
  }

  async function entrarComGoogle() {
    if (!firebaseAuth || !firestoreDb) return;
    setOcupado(true);
    try {
      const cred = await signInWithPopup(firebaseAuth, googleProvider);
      const nomeExibido = nomePadrao(cred.user);
      const nomeUsuarioLower = normalizarNomeUsuario(nomeExibido || "usuario");
      await setDoc(doc(firestoreDb, COLECOES.usuarios, cred.user.uid), {
        uid: cred.user.uid,
        nomeExibido,
        nomeUsuario: nomeUsuarioLower,
        nomeUsuarioLower,
        email: cred.user.email || "",
        temaPreferido: "dark",
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      }, { merge: true });
      await setDoc(doc(firestoreDb, COLECOES.temaPreferencia, cred.user.uid), {
        uid: cred.user.uid,
        tema: "dark",
        atualizadoEm: serverTimestamp()
      }, { merge: true });
      await registrarAtividade(cred.user.uid, "login_google");
      setAviso({ tipo: "sucesso", mensagem: "Login com Google concluido." });
    } catch (erro) {
      setAviso({ tipo: "erro", mensagem: String((erro as Error).message || "Falha no login com Google.") });
    } finally {
      setOcupado(false);
    }
  }

  async function sairDaConta() {
    if (!firebaseAuth) return;
    setOcupado(true);
    try {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (usuarioAuth && firestoreDb) {
        await setDoc(doc(firestoreDb, COLECOES.statusOnline, usuarioAuth.uid), {
          uid: usuarioAuth.uid,
          nomeExibido: usuarioAuth.displayName || "Usuario",
          online: false,
          ultimoPulso: serverTimestamp()
        }, { merge: true });
        await setDoc(doc(firestoreDb, COLECOES.localizacao, usuarioAuth.uid), {
          uid: usuarioAuth.uid,
          nomeExibido: usuarioAuth.displayName || "Usuario",
          ativo: false,
          atualizadoEm: serverTimestamp()
        }, { merge: true });
      }
      await signOut(firebaseAuth);
      setAviso({ tipo: "sucesso", mensagem: "Sessao encerrada." });
    } catch {
      setAviso({ tipo: "erro", mensagem: "Falha ao sair da conta." });
    } finally {
      setOcupado(false);
    }
  }

  async function criarQuest(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!usuarioAuth || !firestoreDb) return;
    if (!questForm.titulo.trim()) return;
    setOcupado(true);
    try {
      const ref = doc(collection(firestoreDb, COLECOES.quests));
      await setDoc(ref, {
        titulo: questForm.titulo.trim(),
        categoria: questForm.categoria,
        prioridade: questForm.prioridade,
        concluida: false,
        criadaPor: usuarioAuth.uid,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
        concluidaEm: null
      });
      await registrarAtividade(usuarioAuth.uid, "quest_criada");
      await registrarSincronizacao(usuarioAuth.uid, "quest_criada", { questId: ref.id });
      setQuestForm((atual) => ({ ...atual, titulo: "" }));
    } catch {
      setAviso({ tipo: "erro", mensagem: "Nao foi possivel criar a quest." });
    } finally {
      setOcupado(false);
    }
  }

  async function alternarQuest(quest: Quest) {
    if (!usuarioAuth || !firestoreDb) return;
    const proximo = !quest.concluida;
    await updateDoc(doc(firestoreDb, COLECOES.quests, quest.id), {
      concluida: proximo,
      concluidaEm: proximo ? serverTimestamp() : null,
      atualizadoEm: serverTimestamp()
    });
    if (proximo) {
      await registrarAtividade(usuarioAuth.uid, "quest_concluida");
      await registrarSincronizacao(usuarioAuth.uid, "quest_concluida", { questId: quest.id });
    }
  }

  async function removerQuest(id: string) {
    if (!usuarioAuth || !firestoreDb) return;
    await deleteDoc(doc(firestoreDb, COLECOES.quests, id));
    await registrarSincronizacao(usuarioAuth.uid, "quest_removida", { questId: id });
  }

  async function salvarLocalizacao(ativo: boolean, latitude: number | null, longitude: number | null, origem: "manual" | "watch") {
    if (!usuarioAuth || !firestoreDb) return;
    await setDoc(doc(firestoreDb, COLECOES.localizacao, usuarioAuth.uid), {
      uid: usuarioAuth.uid,
      nomeExibido: usuarioAuth.displayName || usuarioApp?.nomeExibido || "Usuario",
      ativo,
      latitude,
      longitude,
      origem,
      atualizadoEm: serverTimestamp()
    }, { merge: true });
    await registrarSincronizacao(usuarioAuth.uid, "localizacao_atualizada", { ativo, origem });
  }

  function ativarRastreio() {
    if (!usuarioAuth || !firestoreDb) return;
    if (!("geolocation" in navigator)) {
      setAviso({ tipo: "erro", mensagem: "Seu navegador nao suporta localizacao." });
      return;
    }
    if (watchIdRef.current !== null) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (posicao) => {
        void salvarLocalizacao(true, posicao.coords.latitude, posicao.coords.longitude, "watch");
        setRastreioAtivo(true);
      },
      () => {
        setRastreioAtivo(false);
        setAviso({ tipo: "erro", mensagem: "Permissao de localizacao negada ou indisponivel." });
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );

    setRastreioAtivo(true);
    setAviso({ tipo: "sucesso", mensagem: "Rastreio ativo." });
  }

  function desativarRastreio() {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setRastreioAtivo(false);
    void salvarLocalizacao(false, null, null, "manual");
    setAviso({ tipo: "neutro", mensagem: "Rastreio desativado." });
  }

  function executarComandoSecreto() {
    const comando = comandoSecreto.trim().toLowerCase();
    if (!comando) return;

    if (comando === "duo:ritmo") {
      setEasterModoTerminal((atual) => !atual);
      setAviso({ tipo: "sucesso", mensagem: "Camada oculta alternada." });
      setComandoSecreto("");
      return;
    }

    if (comando === "duo:limpar") {
      setAviso({ tipo: "neutro", mensagem: "" });
      setComandoSecreto("");
      return;
    }

    setAviso({ tipo: "erro", mensagem: "Comando nao reconhecido." });
  }

  function tratarCliqueLogo() {
    const proximo = cliquesLogo + 1;
    setCliquesLogo(proximo);
    if (proximo < 7) return;
    setCliquesLogo(0);
    setEasterLogoAtivo((atual) => !atual);
    setAviso({ tipo: "sucesso", mensagem: "Sinal oculto liberado." });
  }

  if (!isFirebaseConfigured || !firebaseAuth || !firestoreDb) {
    return (
      <main className="app-shell">
        <section className="painel-autenticacao">
          <h1>NERD HUB</h1>
          <p>Firebase nao configurado. Defina as variaveis VITE_FIREBASE e recarregue a pagina.</p>
        </section>
      </main>
    );
  }

  if (carregandoAuth) {
    return (
      <main className="app-shell">
        <section className="painel-autenticacao">
          <h1>NERD HUB</h1>
          <p>Carregando sessao...</p>
        </section>
      </main>
    );
  }

  if (!usuarioAuth) {
    const submitAuth = modoAuth === "cadastro" ? enviarCadastro : enviarLogin;
    return (
      <main className="app-shell">
        <section className="painel-autenticacao">
          <button className="logo-interativo" type="button" onClick={tratarCliqueLogo}>
            <span className="logo-letra">N</span>
            <span className="logo-titulo">NERD HUB</span>
          </button>

          <p className="texto-secundario">Espaco privado para rotina, quests e conexao em tempo real.</p>

          <div className="troca-auth">
            <button
              type="button"
              className={`botao-aba-auth ${modoAuth === "entrar" ? "ativo" : ""}`}
              onClick={() => setModoAuth("entrar")}
            >
              Entrar
            </button>
            <button
              type="button"
              className={`botao-aba-auth ${modoAuth === "cadastro" ? "ativo" : ""}`}
              onClick={() => setModoAuth("cadastro")}
            >
              Criar conta
            </button>
          </div>

          <form className="form-auth" onSubmit={submitAuth}>
            {modoAuth === "cadastro" && (
              <>
                <label>
                  Nome de usuario
                  <input
                    value={formAuth.nomeUsuario}
                    onChange={(evento) => setFormAuth((atual) => ({ ...atual, nomeUsuario: evento.target.value }))}
                    placeholder="usuario_exemplo"
                    required
                  />
                  <small className={nomeUsuarioValido ? "campo-ok" : "campo-erro"}>
                    {nomeUsuarioValido ? "Nome de usuario valido." : "Use 3 a 30 caracteres: letras, numeros ou _"}
                  </small>
                </label>
                <label>
                  Nome exibido
                  <input
                    value={formAuth.nomeExibido}
                    onChange={(evento) => setFormAuth((atual) => ({ ...atual, nomeExibido: evento.target.value }))}
                    placeholder="Como voce quer aparecer"
                  />
                </label>
              </>
            )}

            <label>
              E-mail
              <input
                type="email"
                value={formAuth.email}
                onChange={(evento) => setFormAuth((atual) => ({ ...atual, email: evento.target.value }))}
                placeholder="voce@dominio.com"
                required
              />
              <small className={emailValido ? "campo-ok" : "campo-erro"}>
                {emailValido ? "E-mail valido." : "Informe um e-mail valido."}
              </small>
            </label>

            <label>
              Senha
              <input
                type="password"
                value={formAuth.senha}
                onChange={(evento) => setFormAuth((atual) => ({ ...atual, senha: evento.target.value }))}
                minLength={8}
                required
              />
              <small className={senhaValida ? "campo-ok" : "campo-erro"}>
                {senhaValida ? "Senha valida." : "A senha precisa ter no minimo 8 caracteres."}
              </small>
            </label>

            <button className="botao-primario" type="submit" disabled={ocupado}>
              {ocupado ? "Processando..." : modoAuth === "cadastro" ? "Criar conta" : "Entrar"}
            </button>
          </form>

          <button className="botao-secundario" type="button" onClick={entrarComGoogle} disabled={ocupado}>
            Entrar com Google
          </button>

          {aviso.mensagem && <p className={`aviso aviso-${aviso.tipo}`}>{aviso.mensagem}</p>}
          {easterLogoAtivo && <p className="texto-terminal">[modo oculto] assinatura do duo detectada</p>}
        </section>
      </main>
    );
  }

  if (!temaPronto) {
    return (
      <main className="app-shell">
        <section className="painel-autenticacao">
          <h1>NERD HUB</h1>
          <p>Preparando ambiente...</p>
        </section>
      </main>
    );
  }

  const diasMesAtual = Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() }, (_, i) => new Date(new Date().getFullYear(), new Date().getMonth(), i + 1));
  const totalAtividadeMes = Object.entries(mapaAtividade)
    .filter(([data]) => data.startsWith(chaveMes(new Date())))
    .reduce((soma, [, qtd]) => soma + qtd, 0);

  return (
    <main className={`app-shell app-logado ${easterTecladoAtivo ? "efeito-ritmo" : ""} ${easterModoTerminal ? "modo-terminal" : ""} ${easterDataAtivo ? "tema-data-especial" : ""}`}>
      <aside className="barra-lateral">
        <button className="logo-interativo" type="button" onClick={tratarCliqueLogo} title="NERD HUB">
          <span className="logo-letra">N</span>
        </button>
        <nav>
          {ABAS.map((aba) => (
            <button
              key={aba.id}
              type="button"
              className={`botao-icone ${abaAtiva === aba.id ? "ativo" : ""}`}
              onClick={() => setAbaAtiva(aba.id)}
              title={aba.titulo}
            >
              <IconeAba aba={aba.id} />
            </button>
          ))}
        </nav>
      </aside>

      <section className="area-principal">
        <header className="cabecalho">
          <div>
            <h1>NERD HUB</h1>
            <p className="texto-secundario">{usuarioApp?.nomeExibido || usuarioAuth.displayName || "Usuario"} • {ABAS.find((aba) => aba.id === abaAtiva)?.titulo}</p>
          </div>
          <div className="grupo-status">
            <span className={`ponto-presenca ${onlineAtivos.length >= 2 ? "duo" : ""}`} />
            <span>{onlineAtivos.length >= 2 ? "duo online" : "presenca parcial"}</span>
          </div>
        </header>

        {aviso.mensagem && <p className={`aviso aviso-${aviso.tipo}`}>{aviso.mensagem}</p>}
        {easterDuplaAtivo && <p className="faixa-easter">Sincronia detectada: os dois online.</p>}

        {abaAtiva === "inicio" && (
          <section className="grade grade-inicio">
            <article className="cartao destaque">
              <h2>Status rapido</h2>
              <div className="linha-estatistica"><span>Quests concluidas</span><strong>{questsConcluidas}</strong></div>
              <div className="linha-estatistica"><span>Quests abertas</span><strong>{Math.max(0, quests.length - questsConcluidas)}</strong></div>
              <div className="linha-estatistica"><span>Atividade no mes</span><strong>{totalAtividadeMes}</strong></div>
            </article>

            <article className="cartao">
              <h2>Presenca</h2>
              <ul className="lista-simples">
                {onlineAtivos.length === 0 && <li>Ninguem online no momento.</li>}
                {onlineAtivos.map((item) => (
                  <li key={item.uid}><span className="ponto-presenca pequeno" />{item.nomeExibido} • {formatarDataHora(item.ultimoPulso)}</li>
                ))}
              </ul>
            </article>

            <article className="cartao cartao-amplo">
              <h2>Calendario de atividade</h2>
              <div className="heatmap">
                {diasMesAtual.map((data) => {
                  const dia = chaveDia(data);
                  const quantidade = mapaAtividade[dia] || 0;
                  const nivel = nivelAtividade(quantidade);
                  return (
                    <button key={dia} type="button" className={`heat-cell nivel-${nivel}`} title={`${dia} • ${quantidade} atividade(s)`}>
                      {data.getDate()}
                    </button>
                  );
                })}
              </div>
            </article>
          </section>
        )}

        {abaAtiva === "quests" && (
          <section className="grade grade-quests">
            <article className="cartao">
              <h2>Nova quest</h2>
              <form className="form-padrao" onSubmit={criarQuest}>
                <label>
                  Titulo
                  <input value={questForm.titulo} onChange={(evento) => setQuestForm((atual) => ({ ...atual, titulo: evento.target.value }))} placeholder="Exemplo: revisar trabalho" maxLength={160} required />
                </label>
                <label>
                  Categoria
                  <select value={questForm.categoria} onChange={(evento) => setQuestForm((atual) => ({ ...atual, categoria: evento.target.value as CategoriaQuest }))}>
                    {CATEGORIAS.map((categoria) => <option key={categoria.valor} value={categoria.valor}>{categoria.rotulo}</option>)}
                  </select>
                </label>
                <label>
                  Dificuldade
                  <select value={questForm.prioridade} onChange={(evento) => setQuestForm((atual) => ({ ...atual, prioridade: Number(evento.target.value) as 1 | 2 | 3 }))}>
                    <option value={1}>Baixa</option>
                    <option value={2}>Media</option>
                    <option value={3}>Alta</option>
                  </select>
                </label>
                <button className="botao-primario" type="submit" disabled={ocupado}>Criar quest</button>
              </form>
            </article>

            <article className="cartao cartao-amplo">
              <h2>Lista de quests</h2>
              <div className="lista-quests">
                {quests.length === 0 && <p className="texto-secundario">Nenhuma quest registrada ainda.</p>}
                {quests.map((quest) => (
                  <article key={quest.id} className={`item-quest ${quest.concluida ? "concluida" : ""}`}>
                    <div>
                      <strong>{quest.titulo}</strong>
                      <p className="texto-secundario">{CATEGORIAS.find((item) => item.valor === quest.categoria)?.rotulo || "Rotina"} • prioridade {quest.prioridade}</p>
                    </div>
                    <div className="acoes-quest">
                      <button className="botao-secundario" type="button" onClick={() => void alternarQuest(quest)}>{quest.concluida ? "Reabrir" : "Concluir"}</button>
                      <button className="botao-perigo" type="button" onClick={() => void removerQuest(quest.id)}>Remover</button>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          </section>
        )}

        {abaAtiva === "comunidade" && (
          <section className="grade grade-comunidade">
            <article className="cartao">
              <h2>Presenca online</h2>
              <ul className="lista-simples">
                {onlineAtivos.length === 0 && <li>Ninguem online agora.</li>}
                {onlineAtivos.map((item) => <li key={item.uid}><span className="ponto-presenca pequeno" />{item.nomeExibido}</li>)}
              </ul>
            </article>

            <article className="cartao cartao-amplo">
              <h2>Rastreio em tempo real</h2>
              <p className="texto-secundario">So funciona com permissao manual do navegador.</p>
              <div className="linha-botoes">
                {!rastreioAtivo ? (
                  <button className="botao-primario" type="button" onClick={ativarRastreio}>Ativar rastreio</button>
                ) : (
                  <button className="botao-perigo" type="button" onClick={desativarRastreio}>Desativar rastreio</button>
                )}
                <span className={`status-rastreio ${rastreioAtivo ? "ativo" : ""}`}>{rastreioAtivo ? "Rastreio ativo" : "Rastreio inativo"}</span>
              </div>

              <div className="lista-localizacao">
                {localizacoes.length === 0 && <p className="texto-secundario">Sem localizacoes registradas.</p>}
                {localizacoes.map((item) => (
                  <article key={item.uid} className="item-localizacao">
                    <strong>{item.nomeExibido}</strong>
                    <p className="texto-secundario">{item.ativo ? `Lat ${item.latitude?.toFixed(5) || "--"} • Lng ${item.longitude?.toFixed(5) || "--"}` : "Rastreio desligado"}</p>
                    <small>Atualizado em {formatarDataHora(item.atualizadoEm)}</small>
                  </article>
                ))}
              </div>
            </article>
          </section>
        )}

        {abaAtiva === "perfil" && (
          <section className="grade grade-perfil">
            <article className="cartao">
              <h2>Seu perfil</h2>
              <p><strong>Nome:</strong> {usuarioApp?.nomeExibido || usuarioAuth.displayName || "Usuario"}</p>
              <p><strong>Usuario:</strong> {usuarioApp?.nomeUsuario || "sem identificador"}</p>
              <p><strong>E-mail:</strong> {usuarioAuth.email || "nao informado"}</p>
              <p><strong>Criado em:</strong> {usuarioApp ? formatarDataHora(usuarioApp.criadoEm) : "carregando"}</p>
              {easterDataAtivo && <p className="texto-terminal">data especial detectada • tema comemorativo liberado</p>}
            </article>
          </section>
        )}

        {abaAtiva === "configuracoes" && (
          <section className="grade grade-configuracoes">
            <article className="cartao">
              <h2>Tema</h2>
              <div className="linha-botoes">
                <button className={`botao-secundario ${tema === "dark" ? "ativo" : ""}`} type="button" onClick={() => void atualizarTema("dark")}>Tema escuro</button>
                <button className={`botao-secundario ${tema === "light" ? "ativo" : ""}`} type="button" onClick={() => void atualizarTema("light")}>Tema claro</button>
              </div>
            </article>

            <article className="cartao">
              <h2>Comando oculto</h2>
              <p className="texto-secundario">Digite o comando certo para alternar camadas escondidas.</p>
              <div className="linha-botoes">
                <input value={comandoSecreto} onChange={(evento) => setComandoSecreto(evento.target.value)} placeholder="comando..." />
                <button className="botao-secundario" type="button" onClick={executarComandoSecreto}>Executar</button>
              </div>
              {easterModoTerminal && <p className="texto-terminal">duo://ritmo_estavel :: sinal ativo</p>}
            </article>

            <article className="cartao">
              <h2>Sessao</h2>
              <button className="botao-perigo" type="button" onClick={() => void sairDaConta()} disabled={ocupado}>Sair da conta</button>
            </article>
          </section>
        )}
      </section>
    </main>
  );
}
