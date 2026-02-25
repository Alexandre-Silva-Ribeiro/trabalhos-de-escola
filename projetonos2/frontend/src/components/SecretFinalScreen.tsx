type SecretFinalScreenProps = {
  onClose: () => void;
};

function SecretFinalScreen({ onClose }: SecretFinalScreenProps) {
  return (
    <div className="overlay tela-secreta">
      <section className="tela-secreta-conteudo">
        <p>
          Se você chegou até aqui,
          {"\n"}
          é porque você presta atenção.
          {"\n\n"}
          E é exatamente isso que eu gosto.
          {"\n\n"}
          Você percebe detalhes.
          {"\n"}
          Você observa.
          {"\n"}
          Você descobre.
          {"\n\n"}
          E, de algum jeito,
          {"\n"}
          você também me descobriu.
          {"\n\n"}
          Feliz aniversário.
        </p>
        <button type="button" className="botao-principal" onClick={onClose}>
          Continuar
        </button>
      </section>
    </div>
  );
}

export default SecretFinalScreen;
