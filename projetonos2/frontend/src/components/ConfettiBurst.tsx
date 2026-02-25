import { useMemo } from "react";

type PecaConfete = {
  id: number;
  left: string;
  delay: string;
  duracao: string;
  tamanho: string;
  rotacao: string;
  cor: string;
};

const CORES = ["#c6d3ef", "#a8b6d5", "#8797bd", "#66779f", "#4e5f85"];

function ConfettiBurst() {
  const pecas = useMemo<PecaConfete[]>(
    () =>
      Array.from({ length: 110 }, (_, indice) => ({
        id: indice + 1,
        left: `${(indice * 3.9) % 100}%`,
        delay: `${(indice % 9) * 0.03}s`,
        duracao: `${3 + (indice % 7) * 0.35}s`,
        tamanho: `${6 + (indice % 4) * 2}px`,
        rotacao: `${(indice * 29) % 360}deg`,
        cor: CORES[indice % CORES.length],
      })),
    []
  );

  return (
    <div className="camada-confete" aria-hidden="true">
      {pecas.map((peca) => (
        <span
          key={peca.id}
          className="confete"
          style={{
            left: peca.left,
            animationDelay: peca.delay,
            animationDuration: peca.duracao,
            width: peca.tamanho,
            height: peca.tamanho,
            transform: `rotate(${peca.rotacao})`,
            backgroundColor: peca.cor,
          }}
        />
      ))}
    </div>
  );
}

export default ConfettiBurst;
