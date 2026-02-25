import { useEffect, useState } from "react";

type MidnightPortalProps = {
  onOpenGift: () => void;
};

function MidnightPortal({ onOpenGift }: MidnightPortalProps) {
  const [mostrarBotao, setMostrarBotao] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setMostrarBotao(true);
    }, 7000);

    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <div className="overlay portal-overlay">
      <section className="portal-conteudo">
        <h2>Portal Secreto 23:00</h2>

        <p>
          Chegou a hora exata.
          {"\n\n"}
          Nem tudo que importa faz barulho. Algumas coisas só aparecem quando alguém
          escolhe olhar com calma, sem pressa, sem distração.
          {"\n\n"}
          Você tem esse jeito raro de perceber o que passa despercebido: o tom de
          uma frase, a pausa antes de uma resposta, o detalhe que muda o sentido de
          tudo.
          {"\n\n"}
          Eu respeito isso em você. Respeito sua individualidade, seu ritmo, a forma
          como você não tenta caber em versões simplificadas de si mesma.
          {"\n\n"}
          Estar perto de alguém assim não é sobre exagero. É sobre presença.
          {"\n"}
          Sobre construir algo com lucidez, leveza e verdade.
          {"\n\n"}
          Se em algum capítulo da sua vida fizer sentido me deixar por perto, eu vou
          considerar isso uma escolha bonita.
          {"\n\n"}
          Feliz aniversário.
        </p>

        {mostrarBotao && (
          <button type="button" className="botao-principal" onClick={onOpenGift}>
            Abrir Presente
          </button>
        )}
      </section>
    </div>
  );
}

export default MidnightPortal;
