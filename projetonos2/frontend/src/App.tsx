import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CatHuntGame from "./components/CatHuntGame";
import ConfettiBurst from "./components/ConfettiBurst";
import CountdownCard from "./components/CountdownCard";
import FinalChallenge from "./components/FinalChallenge";
import GallerySection from "./components/GallerySection";
import GiftReveal from "./components/GiftReveal";
import ImageModal from "./components/ImageModal";
import MessageModal from "./components/MessageModal";
import MidnightPortal from "./components/MidnightPortal";
import PaoDeQueijoGame from "./components/PaoDeQueijoGame";
import SecretFinalScreen from "./components/SecretFinalScreen";
import TerminalOverlay from "./components/TerminalOverlay";
import TetrisDropGame from "./components/TetrisDropGame";

const API_BASE_URL = "http://localhost:4000";

type Fragmento = "IR" | "IS" | "20" | "10";
const FRAGMENTOS: Fragmento[] = ["IR", "IS", "20", "10"];

type Countdown = {
  horas: string;
  minutos: string;
  segundos: string;
  totalMs: number;
};

type Imagem = {
  name: string;
  createdAt: number;
  url: string;
};

type RespostaApiErro = {
  error?: string;
};

type RetornoAcao = {
  ok: boolean;
  mensagem: string;
};

type JanelaComWebkitAudio = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

function calcularAlvo23h(agora: Date): Date {
  const alvo = new Date(agora);
  alvo.setHours(23, 0, 0, 0);
  if (agora >= alvo) {
    alvo.setDate(alvo.getDate() + 1);
  }
  return alvo;
}

function calcularContagem(alvo: Date, agora: Date): Countdown {
  const diferenca = Math.max(0, alvo.getTime() - agora.getTime());
  const totalSegundos = Math.floor(diferenca / 1000);
  const horas = Math.floor(totalSegundos / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;

  return {
    horas: String(horas).padStart(2, "0"),
    minutos: String(minutos).padStart(2, "0"),
    segundos: String(segundos).padStart(2, "0"),
    totalMs: diferenca,
  };
}

function tratarErro(erro: unknown, padrao: string): string {
  if (!(erro instanceof Error) || !erro.message.trim()) {
    return padrao;
  }

  if (
    erro.message.includes("Failed to fetch") ||
    erro.message.includes("NetworkError") ||
    erro.message.includes("Load failed")
  ) {
    return padrao;
  }

  return erro.message;
}

function obterContextoAudio() {
  const janela = window as JanelaComWebkitAudio;
  return janela.AudioContext || janela.webkitAudioContext;
}

function App() {
  const alvoContagemRef = useRef<Date>(calcularAlvo23h(new Date()));
  const portalJaAbertoRef = useRef(false);
  const audioAmbienteRef = useRef<{
    context: AudioContext;
    intervalId: number;
  } | null>(null);

  const [contagem, setContagem] = useState<Countdown>(() =>
    calcularContagem(alvoContagemRef.current, new Date())
  );

  const [fragments, setFragments] = useState<string[]>([]);
  const [mensagemAtiva, setMensagemAtiva] = useState<string | null>(null);
  const [terminalAberto, setTerminalAberto] = useState(false);
  const [desafioConcluido, setDesafioConcluido] = useState(false);
  const [telaSecretaAberta, setTelaSecretaAberta] = useState(false);
  const [portalAberto, setPortalAberto] = useState(false);
  const [presenteDesbloqueado, setPresenteDesbloqueado] = useState(false);
  const [presenteAberto, setPresenteAberto] = useState(false);
  const [mostrarConfete, setMostrarConfete] = useState(false);

  const [imagens, setImagens] = useState<Imagem[]>([]);
  const [carregandoImagens, setCarregandoImagens] = useState(false);
  const [statusGaleria, setStatusGaleria] = useState("");
  const [imagemAtiva, setImagemAtiva] = useState<Imagem | null>(null);

  const particulas = useMemo(
    () =>
      Array.from({ length: 28 }, (_, indice) => ({
        id: indice + 1,
        left: `${(indice * 11.3) % 100}%`,
        size: `${3 + ((indice * 2.2) % 8)}px`,
        delay: `${(indice % 8) * 0.6}s`,
        duration: `${9 + (indice % 7) * 1.6}s`,
      })),
    []
  );

  const temTodosFragmentos = useMemo(
    () => FRAGMENTOS.every((parte) => fragments.includes(parte)),
    [fragments]
  );

  const tocarSomPortal = useCallback(() => {
    const ContextoAudio = obterContextoAudio();
    if (!ContextoAudio) {
      return;
    }

    const context = new ContextoAudio();
    const gain = context.createGain();
    gain.gain.value = 0.04;
    gain.connect(context.destination);

    const notas = [174.61, 220, 261.63];
    notas.forEach((nota, indice) => {
      const oscilador = context.createOscillator();
      const ganhoOsc = context.createGain();
      oscilador.type = "sine";
      oscilador.frequency.value = nota;
      ganhoOsc.gain.setValueAtTime(0, context.currentTime + indice * 0.08);
      ganhoOsc.gain.linearRampToValueAtTime(
        0.26,
        context.currentTime + 0.42 + indice * 0.08
      );
      ganhoOsc.gain.linearRampToValueAtTime(
        0,
        context.currentTime + 2.5 + indice * 0.06
      );

      oscilador.connect(ganhoOsc);
      ganhoOsc.connect(gain);
      oscilador.start(context.currentTime + indice * 0.04);
      oscilador.stop(context.currentTime + 2.7 + indice * 0.06);
    });

    window.setTimeout(() => {
      void context.close();
    }, 3200);
  }, []);

  useEffect(() => {
    const atualizar = () => {
      const agora = new Date();
      const dados = calcularContagem(alvoContagemRef.current, agora);
      setContagem(dados);

      if (dados.totalMs === 0) {
        alvoContagemRef.current = calcularAlvo23h(new Date(agora.getTime() + 1000));

        if (!portalJaAbertoRef.current) {
          portalJaAbertoRef.current = true;
          setPortalAberto(true);
          setPresenteDesbloqueado(true);
          tocarSomPortal();
        }
      }
    };

    atualizar();
    const intervalo = window.setInterval(atualizar, 1000);
    return () => window.clearInterval(intervalo);
  }, [tocarSomPortal]);

  useEffect(
    () => () => {
      if (audioAmbienteRef.current) {
        window.clearInterval(audioAmbienteRef.current.intervalId);
        void audioAmbienteRef.current.context.close();
      }
    },
    []
  );

  const iniciarAmbiente = useCallback(() => {
    if (audioAmbienteRef.current) {
      return;
    }

    const ContextoAudio = obterContextoAudio();
    if (!ContextoAudio) {
      return;
    }

    const context = new ContextoAudio();
    const gain = context.createGain();
    gain.gain.value = 0.013;
    gain.connect(context.destination);

    const notas = [98, 123.47, 146.83, 196];
    let indice = 0;

    const tocar = () => {
      const oscilador = context.createOscillator();
      const filtro = context.createBiquadFilter();
      const ganhoOsc = context.createGain();

      oscilador.type = "triangle";
      oscilador.frequency.value = notas[indice % notas.length];
      filtro.type = "lowpass";
      filtro.frequency.value = 720;
      ganhoOsc.gain.setValueAtTime(0, context.currentTime);
      ganhoOsc.gain.linearRampToValueAtTime(0.2, context.currentTime + 1.15);
      ganhoOsc.gain.linearRampToValueAtTime(0, context.currentTime + 5.1);

      oscilador.connect(filtro);
      filtro.connect(ganhoOsc);
      ganhoOsc.connect(gain);
      oscilador.start();
      oscilador.stop(context.currentTime + 5.2);
      indice += 1;
    };

    tocar();
    const intervalId = window.setInterval(tocar, 3450);
    audioAmbienteRef.current = { context, intervalId };
  }, []);

  const carregarImagens = useCallback(async () => {
    setCarregandoImagens(true);

    try {
      const resposta = await fetch(`${API_BASE_URL}/images`);
      const dados = (await resposta.json().catch(() => [])) as
        | Imagem[]
        | RespostaApiErro;

      if (!resposta.ok || !Array.isArray(dados)) {
        const erro = !Array.isArray(dados) ? dados.error : undefined;
        throw new Error(erro || "Não foi possível carregar a galeria.");
      }

      setImagens(dados);
    } catch (erro) {
      setStatusGaleria(tratarErro(erro, "Não foi possível carregar a galeria."));
    } finally {
      setCarregandoImagens(false);
    }
  }, []);

  useEffect(() => {
    void carregarImagens();
  }, [carregarImagens]);

  const revelarFragmento = useCallback((fragmento: Fragmento, mensagem: string) => {
    setFragments((atual) => {
      if (atual.includes(fragmento)) {
        return atual;
      }
      setMensagemAtiva(mensagem);
      return [...atual, fragmento];
    });
  }, []);

  const enviarImagem = useCallback(
    async (arquivo: File | null, senha: string): Promise<RetornoAcao> => {
      if (!arquivo) {
        const mensagem = "Selecione uma imagem antes de enviar.";
        setStatusGaleria(mensagem);
        return { ok: false, mensagem };
      }

      const formData = new FormData();
      formData.append("image", arquivo);
      formData.append("password", senha);

      try {
        const resposta = await fetch(`${API_BASE_URL}/upload`, {
          method: "POST",
          body: formData,
        });

        const dados = (await resposta.json().catch(() => ({}))) as RespostaApiErro;

        if (!resposta.ok) {
          throw new Error(dados.error || "Não foi possível enviar a imagem.");
        }

        const mensagem = "Imagem enviada com sucesso.";
        setStatusGaleria(mensagem);
        await carregarImagens();
        return { ok: true, mensagem };
      } catch (erro) {
        const mensagem = tratarErro(erro, "Não foi possível enviar a imagem.");
        setStatusGaleria(mensagem);
        return { ok: false, mensagem };
      }
    },
    [carregarImagens]
  );

  const removerImagem = useCallback(
    async (nome: string): Promise<RetornoAcao> => {
      try {
        const resposta = await fetch(
          `${API_BASE_URL}/images/${encodeURIComponent(nome)}`,
          {
            method: "DELETE",
          }
        );

        const dados = (await resposta.json().catch(() => ({}))) as RespostaApiErro;

        if (!resposta.ok) {
          throw new Error(dados.error || "Não foi possível remover a imagem.");
        }

        const mensagem = "Imagem removida com sucesso.";
        setStatusGaleria(mensagem);
        await carregarImagens();
        return { ok: true, mensagem };
      } catch (erro) {
        const mensagem = tratarErro(erro, "Não foi possível remover a imagem.");
        setStatusGaleria(mensagem);
        return { ok: false, mensagem };
      }
    },
    [carregarImagens]
  );

  const abrirPresente = useCallback(() => {
    iniciarAmbiente();
    setPortalAberto(false);
    setMostrarConfete(true);
    setPresenteAberto(true);

    window.setTimeout(() => {
      setMostrarConfete(false);
    }, 5200);
  }, [iniciarAmbiente]);

  const concluirDesafio = useCallback(() => {
    setDesafioConcluido(true);
    setTelaSecretaAberta(true);
    setPresenteDesbloqueado(true);
  }, []);

  return (
    <div className="app-shell">
      <div className="camada-gradiente" />

      <div className="particulas-ambiente" aria-hidden="true">
        {particulas.map((particula) => (
          <span
            key={particula.id}
            className="particula-ambiente"
            style={{
              left: particula.left,
              width: particula.size,
              height: particula.size,
              animationDelay: particula.delay,
              animationDuration: particula.duration,
            }}
          />
        ))}
      </div>

      <main className="conteudo">
        <section className="painel hero">
          <p className="selo">Projeto: Nós Dois</p>
          <h1>Uma experiência feita para quem observa além do óbvio.</h1>
          <p>
            Explore os minijogos, colete os quatro fragmentos e desbloqueie a
            mensagem secreta.
          </p>

          <div className="chips-fragmentos">
            {FRAGMENTOS.map((fragmento) => (
              <span
                key={fragmento}
                className={`chip ${fragments.includes(fragmento) ? "chip-ativo" : ""}`}
              >
                {fragments.includes(fragmento) ? fragmento : "--"}
              </span>
            ))}
          </div>
        </section>

        <CountdownCard
          countdown={contagem}
          onTripleTapTitle={() => setTerminalAberto(true)}
        />

        <section className="grid-jogos">
          <TetrisDropGame
            done={fragments.includes("20")}
            onSuccess={() =>
              revelarFragmento(
                "20",
                "2010 pontos no Tetris.\nFragmento 20 desbloqueado."
              )
            }
          />

          <CatHuntGame
            done={fragments.includes("IR")}
            onSuccess={() =>
              revelarFragmento(
                "IR",
                "Você enxerga o que quase ninguém enxerga.\nAté no escuro."
              )
            }
          />

          <PaoDeQueijoGame
            done={fragments.includes("10")}
            onSuccess={() =>
              revelarFragmento("10", "Você sempre encontra o que importa.")
            }
          />
        </section>

        <GallerySection
          images={imagens}
          loading={carregandoImagens}
          statusMessage={statusGaleria}
          onUpload={enviarImagem}
          onRemove={removerImagem}
          onOpenImage={setImagemAtiva}
        />

        {temTodosFragmentos && (
          <FinalChallenge solved={desafioConcluido} onSolve={concluirDesafio} />
        )}

        {presenteDesbloqueado && !portalAberto && (
          <section className="painel painel-presente">
            <h2>Abrir Presente</h2>
            <p>Quando sentir que é o momento, o presente está esperando.</p>
            <button type="button" className="botao-principal" onClick={abrirPresente}>
              Abrir Presente
            </button>
          </section>
        )}
      </main>

      {mensagemAtiva && (
        <MessageModal
          title="Fragmento descoberto"
          message={mensagemAtiva}
          onClose={() => setMensagemAtiva(null)}
        />
      )}

      {imagemAtiva && (
        <ImageModal image={imagemAtiva} onClose={() => setImagemAtiva(null)} />
      )}

      {terminalAberto && (
        <TerminalOverlay
          onClose={() => setTerminalAberto(false)}
          onSuccess={() =>
            revelarFragmento(
              "IS",
              "acesso concedido.\nàs vezes o comando certo abre coisas inesperadas."
            )
          }
        />
      )}

      {telaSecretaAberta && (
        <SecretFinalScreen onClose={() => setTelaSecretaAberta(false)} />
      )}

      {portalAberto && <MidnightPortal onOpenGift={abrirPresente} />}
      {mostrarConfete && <ConfettiBurst />}
      {presenteAberto && <GiftReveal onClose={() => setPresenteAberto(false)} />}
    </div>
  );
}

export default App;
