import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Tetromino = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
type Celula = Tetromino | null;
type Tabuleiro = Celula[][];
type Coordenada = [number, number];

type PecaAtiva = {
  tipo: Tetromino;
  rotacao: number;
  x: number;
  y: number;
};

type TetrisDropGameProps = {
  done: boolean;
  onSuccess: () => void;
};

const LARGURA = 10;
const ALTURA = 20;
const META_PONTOS = 2010;
const TIPOS: Tetromino[] = ["I", "O", "T", "S", "Z", "J", "L"];

const FORMAS: Record<Tetromino, Coordenada[][]> = {
  I: [
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
    ],
    [
      [2, 0],
      [2, 1],
      [2, 2],
      [2, 3],
    ],
    [
      [0, 2],
      [1, 2],
      [2, 2],
      [3, 2],
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
    ],
  ],
  O: [
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
    ],
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
    ],
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
    ],
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
    ],
  ],
  T: [
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    [
      [1, 0],
      [1, 1],
      [2, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [1, 2],
    ],
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
  ],
  S: [
    [
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
    ],
    [
      [1, 0],
      [1, 1],
      [2, 1],
      [2, 2],
    ],
    [
      [1, 1],
      [2, 1],
      [0, 2],
      [1, 2],
    ],
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
  ],
  Z: [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
    [
      [2, 0],
      [1, 1],
      [2, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [1, 2],
      [2, 2],
    ],
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [0, 2],
    ],
  ],
  J: [
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [2, 2],
    ],
    [
      [1, 0],
      [1, 1],
      [0, 2],
      [1, 2],
    ],
  ],
  L: [
    [
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [0, 2],
    ],
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
  ],
};

const KICKS_ROTACAO: Coordenada[] = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [-2, 0],
  [2, 0],
  [0, -1],
];

function criarTabuleiroVazio(): Tabuleiro {
  return Array.from({ length: ALTURA }, () =>
    Array.from({ length: LARGURA }, () => null)
  );
}

function embaralharTipos(lista: Tetromino[]): Tetromino[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function criarPeca(tipo: Tetromino): PecaAtiva {
  return {
    tipo,
    rotacao: 0,
    x: 3,
    y: -1,
  };
}

function celulasDaPeca(peca: PecaAtiva): Coordenada[] {
  return FORMAS[peca.tipo][peca.rotacao];
}

function posicaoValida(peca: PecaAtiva, tabuleiro: Tabuleiro): boolean {
  return celulasDaPeca(peca).every(([cx, cy]) => {
    const x = peca.x + cx;
    const y = peca.y + cy;

    if (x < 0 || x >= LARGURA || y >= ALTURA) {
      return false;
    }

    if (y >= 0 && tabuleiro[y][x] !== null) {
      return false;
    }

    return true;
  });
}

function mesclarPeca(tabuleiro: Tabuleiro, peca: PecaAtiva): Tabuleiro {
  const novo = tabuleiro.map((linha) => [...linha]);
  celulasDaPeca(peca).forEach(([cx, cy]) => {
    const x = peca.x + cx;
    const y = peca.y + cy;
    if (y >= 0 && y < ALTURA && x >= 0 && x < LARGURA) {
      novo[y][x] = peca.tipo;
    }
  });
  return novo;
}

function limparLinhas(tabuleiro: Tabuleiro): { tabuleiro: Tabuleiro; removidas: number } {
  const restantes = tabuleiro.filter((linha) => linha.some((celula) => celula === null));
  const removidas = ALTURA - restantes.length;
  const novas = Array.from({ length: removidas }, () =>
    Array.from({ length: LARGURA }, () => null)
  );
  return { tabuleiro: [...novas, ...restantes], removidas };
}

function classeCor(tipo: Tetromino | null): string {
  if (!tipo) {
    return "";
  }
  return `tetris-cor-${tipo.toLowerCase()}`;
}

function TetrisDropGame({ done, onSuccess }: TetrisDropGameProps) {
  const [tabuleiro, setTabuleiro] = useState<Tabuleiro>(() => criarTabuleiroVazio());
  const [pecaAtiva, setPecaAtiva] = useState<PecaAtiva | null>(null);
  const [proximaPeca, setProximaPeca] = useState<Tetromino>("I");
  const [pontuacao, setPontuacao] = useState(0);
  const [linhas, setLinhas] = useState(0);
  const [nivel, setNivel] = useState(1);
  const [quedaSuaveAtiva, setQuedaSuaveAtiva] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [metaAtingida, setMetaAtingida] = useState(done);
  const [status, setStatus] = useState(
    done
      ? "Fragmento 20 já coletado."
      : "Alcance 2010 pontos para liberar o fragmento 20."
  );

  const filaRef = useRef<Tetromino[]>([]);
  const tabuleiroRef = useRef(tabuleiro);
  const pecaRef = useRef<PecaAtiva | null>(pecaAtiva);
  const pontosRef = useRef(pontuacao);
  const linhasRef = useRef(linhas);
  const metaRef = useRef(metaAtingida);
  const gameOverRef = useRef(gameOver);
  const doneRef = useRef(done);
  const sucessoRef = useRef(done);
  const lateralAtivoRef = useRef<-1 | 0 | 1>(0);
  const timeoutLateralRef = useRef<number | null>(null);
  const intervaloLateralRef = useRef<number | null>(null);

  useEffect(() => {
    tabuleiroRef.current = tabuleiro;
  }, [tabuleiro]);

  useEffect(() => {
    pecaRef.current = pecaAtiva;
  }, [pecaAtiva]);

  useEffect(() => {
    pontosRef.current = pontuacao;
  }, [pontuacao]);

  useEffect(() => {
    linhasRef.current = linhas;
  }, [linhas]);

  useEffect(() => {
    metaRef.current = metaAtingida;
  }, [metaAtingida]);

  useEffect(() => {
    gameOverRef.current = gameOver;
  }, [gameOver]);

  useEffect(() => {
    doneRef.current = done;
  }, [done]);

  const preencherFila = useCallback(() => {
    while (filaRef.current.length < 7) {
      filaRef.current.push(...embaralharTipos(TIPOS));
    }
  }, []);

  const retirarTipoDaFila = useCallback((): Tetromino => {
    preencherFila();
    const tipo = filaRef.current.shift() || "I";
    preencherFila();
    setProximaPeca(filaRef.current[0]);
    return tipo;
  }, [preencherFila]);

  const pararRepeticaoLateral = useCallback(() => {
    if (timeoutLateralRef.current) {
      window.clearTimeout(timeoutLateralRef.current);
      timeoutLateralRef.current = null;
    }
    if (intervaloLateralRef.current) {
      window.clearInterval(intervaloLateralRef.current);
      intervaloLateralRef.current = null;
    }
    lateralAtivoRef.current = 0;
  }, []);

  const iniciarPartida = useCallback(
    (manterConcluido = false) => {
      pararRepeticaoLateral();
      filaRef.current = [];
      preencherFila();

      const tabuleiroInicial = criarTabuleiroVazio();
      setTabuleiro(tabuleiroInicial);
      tabuleiroRef.current = tabuleiroInicial;

      setPontuacao(0);
      pontosRef.current = 0;
      setLinhas(0);
      linhasRef.current = 0;
      setNivel(1);
      setQuedaSuaveAtiva(false);
      setGameOver(false);
      gameOverRef.current = false;

      if (manterConcluido) {
        setMetaAtingida(true);
        metaRef.current = true;
        setPecaAtiva(null);
        pecaRef.current = null;
        setStatus("Fragmento 20 já coletado.");
        return;
      }

      setMetaAtingida(false);
      metaRef.current = false;
      setStatus("Alcance 2010 pontos para liberar o fragmento 20.");

      const tipo = retirarTipoDaFila();
      const peca = criarPeca(tipo);
      setPecaAtiva(peca);
      pecaRef.current = peca;
    },
    [pararRepeticaoLateral, preencherFila, retirarTipoDaFila]
  );

  useEffect(() => {
    iniciarPartida(false);
    return () => {
      pararRepeticaoLateral();
    };
  }, [iniciarPartida, pararRepeticaoLateral]);

  useEffect(() => {
    if (!done) {
      return;
    }
    sucessoRef.current = true;
  }, [done]);

  const travarPeca = useCallback(
    (peca: PecaAtiva) => {
      const comPeca = mesclarPeca(tabuleiroRef.current, peca);
      const { tabuleiro: tabuleiroLimpo, removidas } = limparLinhas(comPeca);
      const novaPontuacao = pontosRef.current + removidas * 100;
      const novasLinhas = linhasRef.current + removidas;
      const novoNivel = Math.floor(novasLinhas / 10) + 1;

      setTabuleiro(tabuleiroLimpo);
      tabuleiroRef.current = tabuleiroLimpo;
      setPontuacao(novaPontuacao);
      pontosRef.current = novaPontuacao;
      setLinhas(novasLinhas);
      linhasRef.current = novasLinhas;
      setNivel(novoNivel);

      if (novaPontuacao >= META_PONTOS) {
        setMetaAtingida(true);
        metaRef.current = true;
        setQuedaSuaveAtiva(false);
        setPecaAtiva(null);
        pecaRef.current = null;
        pararRepeticaoLateral();
        setStatus("2010 pontos alcançados. Fragmento 20 desbloqueado.");

        if (!sucessoRef.current && !doneRef.current) {
          sucessoRef.current = true;
          onSuccess();
        }
        return;
      }

      const tipoSeguinte = retirarTipoDaFila();
      const novaPeca = criarPeca(tipoSeguinte);

      if (!posicaoValida(novaPeca, tabuleiroLimpo)) {
        setGameOver(true);
        gameOverRef.current = true;
        setPecaAtiva(null);
        pecaRef.current = null;
        setStatus("Fim de jogo. Toque em Reiniciar para jogar novamente.");
        return;
      }

      setPecaAtiva(novaPeca);
      pecaRef.current = novaPeca;
    },
    [doneRef, onSuccess, pararRepeticaoLateral, retirarTipoDaFila]
  );

  const moverLateral = useCallback((direcao: -1 | 1) => {
    if (gameOverRef.current || metaRef.current) {
      return;
    }
    const atual = pecaRef.current;
    if (!atual) {
      return;
    }
    const candidata = { ...atual, x: atual.x + direcao };
    if (posicaoValida(candidata, tabuleiroRef.current)) {
      setPecaAtiva(candidata);
      pecaRef.current = candidata;
    }
  }, []);

  const rotacionar = useCallback(() => {
    if (gameOverRef.current || metaRef.current) {
      return;
    }
    const atual = pecaRef.current;
    if (!atual) {
      return;
    }

    const proximaRotacao = (atual.rotacao + 1) % 4;
    for (const [kickX, kickY] of KICKS_ROTACAO) {
      const candidata: PecaAtiva = {
        ...atual,
        rotacao: proximaRotacao,
        x: atual.x + kickX,
        y: atual.y + kickY,
      };
      if (posicaoValida(candidata, tabuleiroRef.current)) {
        setPecaAtiva(candidata);
        pecaRef.current = candidata;
        return;
      }
    }
  }, []);

  const descerPasso = useCallback(() => {
    if (gameOverRef.current || metaRef.current) {
      return;
    }
    const atual = pecaRef.current;
    if (!atual) {
      return;
    }
    const candidata = { ...atual, y: atual.y + 1 };
    if (posicaoValida(candidata, tabuleiroRef.current)) {
      setPecaAtiva(candidata);
      pecaRef.current = candidata;
      return;
    }
    travarPeca(atual);
  }, [travarPeca]);

  const hardDrop = useCallback(() => {
    if (gameOverRef.current || metaRef.current) {
      return;
    }
    const atual = pecaRef.current;
    if (!atual) {
      return;
    }

    let final = { ...atual };
    while (posicaoValida({ ...final, y: final.y + 1 }, tabuleiroRef.current)) {
      final = { ...final, y: final.y + 1 };
    }
    travarPeca(final);
  }, [travarPeca]);

  const iniciarRepeticaoLateral = useCallback(
    (direcao: -1 | 1) => {
      if (gameOverRef.current || metaRef.current) {
        return;
      }
      pararRepeticaoLateral();
      lateralAtivoRef.current = direcao;
      moverLateral(direcao);
      timeoutLateralRef.current = window.setTimeout(() => {
        intervaloLateralRef.current = window.setInterval(() => {
          moverLateral(direcao);
        }, 78);
      }, 165);
    },
    [moverLateral, pararRepeticaoLateral]
  );

  useEffect(() => {
    if (gameOver || metaAtingida || !pecaAtiva) {
      return;
    }

    const velocidadeNormal = Math.max(120, 860 - (nivel - 1) * 70);
    const velocidade = quedaSuaveAtiva ? 52 : velocidadeNormal;
    const intervalo = window.setInterval(() => {
      descerPasso();
    }, velocidade);

    return () => window.clearInterval(intervalo);
  }, [descerPasso, gameOver, metaAtingida, nivel, pecaAtiva, quedaSuaveAtiva]);

  useEffect(() => {
    const aoPressionar = (event: KeyboardEvent) => {
      if (event.code === "ArrowLeft") {
        event.preventDefault();
        if (lateralAtivoRef.current !== -1) {
          iniciarRepeticaoLateral(-1);
        }
        return;
      }

      if (event.code === "ArrowRight") {
        event.preventDefault();
        if (lateralAtivoRef.current !== 1) {
          iniciarRepeticaoLateral(1);
        }
        return;
      }

      if (event.code === "ArrowUp") {
        event.preventDefault();
        rotacionar();
        return;
      }

      if (event.code === "ArrowDown") {
        event.preventDefault();
        setQuedaSuaveAtiva(true);
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        hardDrop();
      }
    };

    const aoSoltar = (event: KeyboardEvent) => {
      if (
        (event.code === "ArrowLeft" && lateralAtivoRef.current === -1) ||
        (event.code === "ArrowRight" && lateralAtivoRef.current === 1)
      ) {
        pararRepeticaoLateral();
        return;
      }

      if (event.code === "ArrowDown") {
        setQuedaSuaveAtiva(false);
      }
    };

    window.addEventListener("keydown", aoPressionar);
    window.addEventListener("keyup", aoSoltar);

    return () => {
      window.removeEventListener("keydown", aoPressionar);
      window.removeEventListener("keyup", aoSoltar);
      pararRepeticaoLateral();
      setQuedaSuaveAtiva(false);
    };
  }, [hardDrop, iniciarRepeticaoLateral, pararRepeticaoLateral, rotacionar]);

  const tabuleiroRender = useMemo(() => {
    const base = tabuleiro.map((linha) => [...linha]);
    if (!pecaAtiva) {
      return base;
    }
    celulasDaPeca(pecaAtiva).forEach(([cx, cy]) => {
      const x = pecaAtiva.x + cx;
      const y = pecaAtiva.y + cy;
      if (x >= 0 && x < LARGURA && y >= 0 && y < ALTURA) {
        base[y][x] = pecaAtiva.tipo;
      }
    });
    return base;
  }, [pecaAtiva, tabuleiro]);

  const preview = useMemo(() => {
    const grid: Celula[][] = Array.from({ length: 4 }, () =>
      Array.from({ length: 4 }, () => null)
    );
    const forma = FORMAS[proximaPeca][0];
    forma.forEach(([x, y]) => {
      if (x >= 0 && x < 4 && y >= 0 && y < 4) {
        grid[y][x] = proximaPeca;
      }
    });
    return grid;
  }, [proximaPeca]);

  return (
    <article className="painel painel-jogo">
      <header className="cabecalho-jogo">
        <h2>Jogo 1: Tetris real</h2>
        <p className="texto-apoio">
          7 peças oficiais, rotação, queda forte, queda suave, prévia e pontuação real.
        </p>
      </header>

      <div className="tetris-real">
        <div className="tetris-info">
          <div className="tetris-indicador">
            <small>Pontuação</small>
            <strong>{pontuacao}</strong>
          </div>
          <div className="tetris-indicador">
            <small>Linhas</small>
            <strong>{linhas}</strong>
          </div>
          <div className="tetris-indicador">
            <small>Nível</small>
            <strong>{nivel}</strong>
          </div>
          <div className="tetris-indicador">
            <small>Meta</small>
            <strong>{META_PONTOS}</strong>
          </div>
        </div>

        <div className="tetris-layout">
          <div className="tetris-quadro">
            <div className="tetris-grade" role="img" aria-label="Tabuleiro de Tetris">
              {tabuleiroRender.map((linha, y) => (
                <div key={`linha-${y}`} className="tetris-linha-real">
                  {linha.map((celula, x) => (
                    <span
                      key={`c-${y}-${x}`}
                      className={`tetris-celula-real ${celula ? "ocupada" : ""} ${classeCor(
                        celula
                      )}`}
                    />
                  ))}
                </div>
              ))}
            </div>

            {metaAtingida && (
              <div className="tetris-overlay tetris-overlay-meta">
                <p>2010 pontos alcançados</p>
                <strong>Fragmento 20 desbloqueado</strong>
              </div>
            )}

            {gameOver && !metaAtingida && (
              <div className="tetris-overlay tetris-overlay-gameover">
                <p>Fim de jogo</p>
                <strong>Toque em Reiniciar</strong>
              </div>
            )}
          </div>

          <aside className="tetris-lateral">
            <p className="tetris-titulo-preview">Próxima peça</p>
            <div className="tetris-preview-grade">
              {preview.map((linha, y) => (
                <div key={`p-linha-${y}`} className="tetris-preview-linha">
                  {linha.map((celula, x) => (
                    <span
                      key={`p-${y}-${x}`}
                      className={`tetris-preview-celula ${
                        celula ? `ocupada ${classeCor(celula)}` : ""
                      }`}
                    />
                  ))}
                </div>
              ))}
            </div>

            <button
              type="button"
              className="botao-secundario tetris-reiniciar"
              onClick={() => iniciarPartida(false)}
            >
              Reiniciar
            </button>
          </aside>
        </div>

        <div className="tetris-controles">
          <button
            type="button"
            className="botao-secundario tetris-botao-simbolo"
            onPointerDown={() => iniciarRepeticaoLateral(-1)}
            onPointerUp={pararRepeticaoLateral}
            onPointerLeave={pararRepeticaoLateral}
            onPointerCancel={pararRepeticaoLateral}
            aria-label="Mover para a esquerda"
            title="Mover para a esquerda"
          >
            {"\u2190"}
          </button>
          <button
            type="button"
            className="botao-secundario tetris-botao-simbolo"
            onClick={rotacionar}
            aria-label="Girar peça"
            title="Girar peça"
          >
            {"\u21BB"}
          </button>
          <button
            type="button"
            className="botao-secundario tetris-botao-simbolo"
            onPointerDown={() => setQuedaSuaveAtiva(true)}
            onPointerUp={() => setQuedaSuaveAtiva(false)}
            onPointerLeave={() => setQuedaSuaveAtiva(false)}
            onPointerCancel={() => setQuedaSuaveAtiva(false)}
            aria-label="Queda suave"
            title="Queda suave"
          >
            {"\u2193"}
          </button>
          <button
            type="button"
            className="botao-secundario tetris-botao-simbolo"
            onClick={hardDrop}
            aria-label="Queda forte"
            title="Queda forte"
          >
            {"\u21E3"}
          </button>
          <button
            type="button"
            className="botao-secundario tetris-botao-simbolo"
            onPointerDown={() => iniciarRepeticaoLateral(1)}
            onPointerUp={pararRepeticaoLateral}
            onPointerLeave={pararRepeticaoLateral}
            onPointerCancel={pararRepeticaoLateral}
            aria-label="Mover para a direita"
            title="Mover para a direita"
          >
            {"\u2192"}
          </button>
        </div>
      </div>

      <p className="status-jogo">{status}</p>
    </article>
  );
}

export default TetrisDropGame;
