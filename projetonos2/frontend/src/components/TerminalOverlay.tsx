import { FormEvent, useState } from "react";

type TerminalOverlayProps = {
  onClose: () => void;
  onSuccess: () => void;
};

function TerminalOverlay({ onClose, onSuccess }: TerminalOverlayProps) {
  const [comando, setComando] = useState("");
  const [status, setStatus] = useState("");

  const executar = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const valor = comando.trim().toLowerCase();

    if (valor === "sexatombe") {
      setStatus("Comando aceito. Fragmento liberado.");
      onSuccess();
      window.setTimeout(() => {
        onClose();
      }, 700);
      return;
    }

    setStatus("Comando inválido. Tente novamente.");
  };

  return (
    <div
      className="overlay terminal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="terminal-janela">
        <header className="terminal-cabecalho">
          <h3>Terminal desbloqueado</h3>
          <button type="button" className="botao-secundario" onClick={onClose}>
            Fechar
          </button>
        </header>

        <div className="terminal-conteudo">
          <p>acesso concedido.</p>
          <p>às vezes o comando certo abre coisas inesperadas.</p>

          <form className="terminal-form" onSubmit={executar}>
            <label htmlFor="campo-comando">Digite o comando:</label>
            <input
              id="campo-comando"
              type="text"
              value={comando}
              onChange={(event) => setComando(event.target.value)}
              placeholder="sexatombe"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <button type="submit" className="botao-principal">
              Executar
            </button>
          </form>

          {status && <p className="status-jogo">{status}</p>}
        </div>
      </section>
    </div>
  );
}

export default TerminalOverlay;
