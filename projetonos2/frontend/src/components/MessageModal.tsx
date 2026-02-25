type MessageModalProps = {
  title: string;
  message: string;
  onClose: () => void;
};

function MessageModal({ title, message, onClose }: MessageModalProps) {
  return (
    <div
      className="overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="modal-base modal-mensagem">
        <button type="button" className="botao-secundario botao-fechar" onClick={onClose}>
          Fechar
        </button>
        <h3>{title}</h3>
        <p>{message}</p>
      </section>
    </div>
  );
}

export default MessageModal;
