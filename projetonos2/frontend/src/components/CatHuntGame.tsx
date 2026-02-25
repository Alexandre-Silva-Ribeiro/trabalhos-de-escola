import { useEffect, useMemo, useRef, useState } from "react";

type CatHuntGameProps = {
  done: boolean;
  onSuccess: () => void;
};

type Posicao = {
  x: number;
  y: number;
};

type OndaAcerto = {
  id: number;
  x: number;
  y: number;
};

const META_ACERTOS = 5;
const TEMPO_VISIVEL = 1500;
const INTERVALO_MIN = 1650;
const INTERVALO_MAX = 2450;

function sortearPosicao(): Posicao {
  return {
    x: 12 + Math.random() * 76,
    y: 42 + Math.random() * 42,
  };
}

function sortearIntervalo() {
  return INTERVALO_MIN + Math.random() * (INTERVALO_MAX - INTERVALO_MIN);
}

function tocarSomAcerto() {
  const Janela = window as Window &
    typeof globalThis & {
      webkitAudioContext?: typeof AudioContext;
    };

  const ContextoAudio = Janela.AudioContext || Janela.webkitAudioContext;
  if (!ContextoAudio) {
    return;
  }

  const contexto = new ContextoAudio();
  const master = contexto.createGain();
  master.gain.value = 0.028;
  master.connect(contexto.destination);

  const base = contexto.currentTime;
  const primeira = contexto.createOscillator();
  const segunda = contexto.createOscillator();
  const ganho = contexto.createGain();

  primeira.type = "sine";
  segunda.type = "triangle";
  primeira.frequency.value = 620;
  segunda.frequency.value = 960;

  ganho.gain.setValueAtTime(0, base);
  ganho.gain.linearRampToValueAtTime(0.33, base + 0.03);
  ganho.gain.exponentialRampToValueAtTime(0.001, base + 0.26);

  primeira.connect(ganho);
  segunda.connect(ganho);
  ganho.connect(master);

  primeira.start(base);
  segunda.start(base + 0.005);
  primeira.stop(base + 0.28);
  segunda.stop(base + 0.24);

  window.setTimeout(() => {
    void contexto.close();
  }, 500);
}

function CatHuntGame({ done, onSuccess }: CatHuntGameProps) {
  const [acertos, setAcertos] = useState(done ? META_ACERTOS : 0);
  const [visivel, setVisivel] = useState(false);
  const [posicao, setPosicao] = useState<Posicao>(() => sortearPosicao());
  const [ondas, setOndas] = useState<OndaAcerto[]>([]);
  const liberadoRef = useRef(done);
  const idOndaRef = useRef(0);

  const estrelas = useMemo(
    () =>
      Array.from({ length: 32 }, (_, indice) => ({
        id: indice + 1,
        x: `${(indice * 19.7) % 100}%`,
        y: `${(indice * 29.1) % 54}%`,
        size: `${1 + (indice % 3)}px`,
        delay: `${(indice % 8) * 0.3}s`,
      })),
    []
  );

  const particulas = useMemo(
    () =>
      Array.from({ length: 14 }, (_, indice) => ({
        id: indice + 1,
        x: `${(indice * 11.8) % 100}%`,
        y: `${58 + (indice % 7) * 5}%`,
        delay: `${(indice % 6) * 0.6}s`,
        duration: `${5.4 + (indice % 5) * 1.3}s`,
      })),
    []
  );

  useEffect(() => {
    if (done) {
      setAcertos(META_ACERTOS);
      setVisivel(false);
      liberadoRef.current = true;
    }
  }, [done]);

  useEffect(() => {
    if (done) {
      return;
    }

    let esconderTimeout: number | null = null;
    let proximoTimeout: number | null = null;
    let ativo = true;

    const ciclo = (inicio = false) => {
      const atraso = inicio ? 750 : sortearIntervalo();
      proximoTimeout = window.setTimeout(() => {
        if (!ativo) {
          return;
        }

        setPosicao(sortearPosicao());
        setVisivel(true);

        esconderTimeout = window.setTimeout(() => {
          setVisivel(false);
        }, TEMPO_VISIVEL);

        ciclo();
      }, atraso);
    };

    ciclo(true);

    return () => {
      ativo = false;
      if (esconderTimeout) {
        window.clearTimeout(esconderTimeout);
      }
      if (proximoTimeout) {
        window.clearTimeout(proximoTimeout);
      }
    };
  }, [done]);

  useEffect(() => {
    if (ondas.length === 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setOndas((atuais) => atuais.slice(1));
    }, 480);

    return () => window.clearTimeout(timeout);
  }, [ondas]);

  const capturar = () => {
    if (done || !visivel) {
      return;
    }

    setVisivel(false);
    tocarSomAcerto();

    idOndaRef.current += 1;
    const novaOnda: OndaAcerto = {
      id: idOndaRef.current,
      x: posicao.x,
      y: posicao.y,
    };
    setOndas((atuais) => [...atuais, novaOnda]);

    setAcertos((atual) => {
      const proximo = Math.min(META_ACERTOS, atual + 1);
      if (proximo >= META_ACERTOS && !liberadoRef.current) {
        liberadoRef.current = true;
        onSuccess();
      }
      return proximo;
    });
  };

  return (
    <article className="painel painel-jogo">
      <header className="cabecalho-jogo">
        <h2>Jogo 2: encontre o gato na noite</h2>
        <p className="texto-apoio">
          Encontre o gato escondido no cenário escuro. Cada aparição dura 1,5s.
        </p>
      </header>

      <div className="campo-gato-noite" aria-live="polite">
        <div className="camada-estrelas" aria-hidden="true">
          {estrelas.map((estrela) => (
            <span
              key={estrela.id}
              className="estrela"
              style={{
                left: estrela.x,
                top: estrela.y,
                width: estrela.size,
                height: estrela.size,
                animationDelay: estrela.delay,
              }}
            />
          ))}
        </div>

        <div className="camada-telhados-fundo" aria-hidden="true" />
        <div className="camada-nevoa camada-nevoa-a" aria-hidden="true" />
        <div className="camada-nevoa camada-nevoa-b" aria-hidden="true" />

        <div className="camada-particulas" aria-hidden="true">
          {particulas.map((particula) => (
            <span
              key={particula.id}
              className="particula-noite"
              style={{
                left: particula.x,
                top: particula.y,
                animationDelay: particula.delay,
                animationDuration: particula.duration,
              }}
            />
          ))}
        </div>

        {visivel && (
          <button
            type="button"
            className="gato-noturno"
            style={{ left: `${posicao.x}%`, top: `${posicao.y}%` }}
            onClick={capturar}
            aria-label="Encontrar o gato"
          >
            <span className="gato-corpo">
              <span className="olhos">
                <span className="olho" />
                <span className="olho" />
              </span>
            </span>
          </button>
        )}

        {ondas.map((onda) => (
          <span
            key={onda.id}
            className="onda-acerto"
            style={{ left: `${onda.x}%`, top: `${onda.y}%` }}
            aria-hidden="true"
          />
        ))}

        <div className="camada-telhados-frente" aria-hidden="true" />
      </div>

      <p className="status-jogo">
        Gatos encontrados: {acertos}/{META_ACERTOS}{" "}
        {done ? "• fragmento IR coletado." : ""}
      </p>
    </article>
  );
}

export default CatHuntGame;
