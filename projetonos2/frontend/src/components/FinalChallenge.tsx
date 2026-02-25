import { FormEvent, useState } from "react";

type FinalChallengeProps = {
  solved: boolean;
  onSolve: () => void;
};

function FinalChallenge({ solved, onSolve }: FinalChallengeProps) {
  const [senha, setSenha] = useState("");
  const [status, setStatus] = useState("");

  const validar = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (senha.trim() === "IRIS2010") {
      setStatus("Senha correta. Desafio final concluído.");
      onSolve();
      return;
    }

    setStatus("Senha incorreta. Observe os fragmentos com atenção.");
  };

  return (
    <section className="painel painel-desafio">
      <h2>Último desafio</h2>

      <p className="texto-trava">
        Obrigado por chegar até aqui, acho que meu esforço valeu a pena.
      </p>

      <form className="form-desafio" onSubmit={validar}>
        <label htmlFor="senha-final">Digite a senha completa:</label>
        <input
          id="senha-final"
          className="input-texto"
          type="text"
          value={senha}
          onChange={(event) => setSenha(event.target.value)}
          placeholder="IRIS2010"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <button type="submit" className="botao-principal">
          Validar senha
        </button>
      </form>

      <p className="status-jogo">
        {solved ? "Desafio final concluído." : status || "Colete todos os fragmentos."}
      </p>
    </section>
  );
}

export default FinalChallenge;
