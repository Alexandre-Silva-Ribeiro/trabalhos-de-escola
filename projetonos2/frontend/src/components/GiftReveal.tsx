type GiftRevealProps = {
  onClose: () => void;
};

function GiftReveal({ onClose }: GiftRevealProps) {
  return (
    <div className="overlay presente-overlay">
      <div className="coracao-aura" aria-hidden="true" />

      <section className="presente-cartao">
        <h2>Feliz aniversário.</h2>
        <p>
          Que esse novo ano da sua vida seja leve,
          {"\n"}
          intenso na medida certa,
          {"\n"}
          e cheio de conquistas que façam sentido pra você.
          {"\n\n"}
          Você é detalhe.
          {"\n"}
          Você é percepção.
          {"\n"}
          Você é profundidade.
          {"\n\n"}
          E se eu puder fazer parte de pelo menos um capítulo disso,
          {"\n"}
          já vai ser algo que vale a pena.
        </p>

        <button type="button" className="botao-secundario" onClick={onClose}>
          Fechar mensagem
        </button>
      </section>
    </div>
  );
}

export default GiftReveal;
