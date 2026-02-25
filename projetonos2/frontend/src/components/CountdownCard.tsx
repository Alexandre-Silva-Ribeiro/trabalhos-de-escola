import { useRef } from "react";

type CountdownData = {
  horas: string;
  minutos: string;
  segundos: string;
};

type CountdownCardProps = {
  countdown: CountdownData;
  onTripleTapTitle: () => void;
};

function CountdownCard({ countdown, onTripleTapTitle }: CountdownCardProps) {
  const toquesRef = useRef<number[]>([]);

  const registrarToque = () => {
    const agora = Date.now();
    const recentes = toquesRef.current.filter((tempo) => agora - tempo < 900);
    recentes.push(agora);
    toquesRef.current = recentes;

    if (recentes.length >= 3) {
      toquesRef.current = [];
      onTripleTapTitle();
    }
  };

  return (
    <section className="painel painel-contagem">
      <button type="button" className="titulo-contagem" onClick={registrarToque}>
        Contando cada segundo para celebrar você.
      </button>

      <div className="contador">
        <div className="contador-item">
          <strong>{countdown.horas}</strong>
          <span>Horas</span>
        </div>
        <div className="contador-separador">:</div>
        <div className="contador-item">
          <strong>{countdown.minutos}</strong>
          <span>Minutos</span>
        </div>
        <div className="contador-separador">:</div>
        <div className="contador-item">
          <strong>{countdown.segundos}</strong>
          <span>Segundos</span>
        </div>
      </div>

      <p className="texto-apoio">
        Toque 3 vezes no título para abrir o terminal secreto.
      </p>
    </section>
  );
}

export default CountdownCard;
