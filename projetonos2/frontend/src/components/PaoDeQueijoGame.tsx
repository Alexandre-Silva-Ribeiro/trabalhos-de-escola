import { useEffect, useRef, useState } from "react";

type PaoDeQueijoGameProps = {
  done: boolean;
  onSuccess: () => void;
};

type Pao = {
  id: number;
  x: number;
  y: number;
  tamanho: number;
  rotacao: number;
  camada: "fundo" | "meio" | "frente";
  discreto?: boolean;
};

type Efeito = {
  id: number;
  x: number;
  y: number;
};

const OBJETIVO = 10;

const PAES: Pao[] = [
  { id: 1, x: 11, y: 79, tamanho: 18, rotacao: -12, camada: "frente" },
  { id: 2, x: 19, y: 66, tamanho: 13, rotacao: 8, camada: "meio", discreto: true },
  { id: 3, x: 30, y: 63, tamanho: 11, rotacao: -7, camada: "fundo", discreto: true },
  { id: 4, x: 38, y: 76, tamanho: 19, rotacao: 10, camada: "frente" },
  { id: 5, x: 48, y: 54, tamanho: 10, rotacao: -16, camada: "meio", discreto: true },
  { id: 6, x: 57, y: 82, tamanho: 16, rotacao: 5, camada: "frente" },
  { id: 7, x: 67, y: 62, tamanho: 10, rotacao: -8, camada: "fundo", discreto: true },
  { id: 8, x: 74, y: 69, tamanho: 14, rotacao: 14, camada: "meio", discreto: true },
  { id: 9, x: 83, y: 77, tamanho: 18, rotacao: -9, camada: "frente" },
  { id: 10, x: 88, y: 58, tamanho: 10, rotacao: 18, camada: "fundo", discreto: true },
  { id: 11, x: 16, y: 49, tamanho: 9, rotacao: -14, camada: "fundo", discreto: true },
  { id: 12, x: 24, y: 85, tamanho: 12, rotacao: 9, camada: "frente", discreto: true },
  { id: 13, x: 52, y: 70, tamanho: 10, rotacao: -6, camada: "meio", discreto: true },
  { id: 14, x: 63, y: 47, tamanho: 9, rotacao: 13, camada: "fundo", discreto: true },
  { id: 15, x: 78, y: 84, tamanho: 13, rotacao: -11, camada: "frente" },
];

function classeCamada(camada: Pao["camada"]): string {
  if (camada === "frente") {
    return "pao-camada-frente";
  }
  if (camada === "meio") {
    return "pao-camada-meio";
  }
  return "pao-camada-fundo";
}

function PaoDeQueijoGame({ done, onSuccess }: PaoDeQueijoGameProps) {
  const [encontrados, setEncontrados] = useState<number[]>([]);
  const [efeitos, setEfeitos] = useState<Efeito[]>([]);
  const [status, setStatus] = useState(
    done
      ? "Você sempre encontra o que importa."
      : "Encontre 10 pães de queijo escondidos."
  );

  const efeitoIdRef = useRef(0);
  const concluidoRef = useRef(done);

  useEffect(() => {
    if (!done) {
      return;
    }
    concluidoRef.current = true;
    setStatus("Você sempre encontra o que importa.");
  }, [done]);

  useEffect(() => {
    if (efeitos.length === 0) {
      return;
    }
    const timeout = window.setTimeout(() => {
      setEfeitos((atuais) => atuais.slice(1));
    }, 420);
    return () => window.clearTimeout(timeout);
  }, [efeitos]);

  const quantidadeEncontrada = Math.min(encontrados.length, OBJETIVO);

  const encontrarPao = (pao: Pao) => {
    if (concluidoRef.current || encontrados.includes(pao.id)) {
      return;
    }

    efeitoIdRef.current += 1;
    setEfeitos((atuais) => [
      ...atuais,
      { id: efeitoIdRef.current, x: pao.x, y: pao.y },
    ]);

    setEncontrados((atuais) => {
      if (atuais.includes(pao.id)) {
        return atuais;
      }

      const novos = [...atuais, pao.id];
      if (novos.length >= OBJETIVO && !concluidoRef.current) {
        concluidoRef.current = true;
        setStatus("Você sempre encontra o que importa.");
        onSuccess();
      }
      return novos;
    });
  };

  return (
    <article className="painel painel-jogo">
      <header className="cabecalho-jogo">
        <h2>Jogo 3: encontre os pães de queijo</h2>
        <p className="texto-apoio">
          Alguns estão atrás de objetos, outros são menores. Encontre 10.
        </p>
      </header>

      <div className="pao-cenario">
        <div className="pao-fundo-luz" aria-hidden="true" />
        <div className="pao-armarios" aria-hidden="true" />
        <div className="pao-fogao" aria-hidden="true" />
        <div className="pao-mesa" aria-hidden="true" />
        <div className="pao-bancada" aria-hidden="true" />
        <div className="pao-panela" aria-hidden="true" />
        <div className="pao-jarra" aria-hidden="true" />
        <div className="pao-tigela" aria-hidden="true" />
        <div className="pao-obstaculo pao-obstaculo-a" aria-hidden="true" />
        <div className="pao-obstaculo pao-obstaculo-b" aria-hidden="true" />

        {PAES.map((pao) => {
          if (encontrados.includes(pao.id)) {
            return null;
          }

          return (
            <button
              key={pao.id}
              type="button"
              className={`pao-item ${classeCamada(pao.camada)} ${
                pao.discreto ? "pao-item-discreto" : ""
              }`}
              style={{
                left: `${pao.x}%`,
                top: `${pao.y}%`,
                width: `${pao.tamanho}px`,
                height: `${pao.tamanho}px`,
                transform: `translate(-50%, -50%) rotate(${pao.rotacao}deg)`,
              }}
              onClick={() => encontrarPao(pao)}
              aria-label="Encontrar pão de queijo"
            >
              <span className="pao-forma" />
            </button>
          );
        })}

        {efeitos.map((efeito) => (
          <span
            key={efeito.id}
            className="pao-efeito"
            style={{ left: `${efeito.x}%`, top: `${efeito.y}%` }}
            aria-hidden="true"
          />
        ))}
      </div>

      <p className="status-jogo">
        Encontrados: {quantidadeEncontrada}/{OBJETIVO}
        {done || quantidadeEncontrada >= OBJETIVO ? " • fragmento 10 coletado." : ""}
      </p>
      <p className="texto-apoio">{status}</p>
    </article>
  );
}

export default PaoDeQueijoGame;
