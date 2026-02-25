type Imagem = {
  name: string;
  createdAt: number;
  url: string;
};

type ImageModalProps = {
  image: Imagem;
  onClose: () => void;
};

function ImageModal({ image, onClose }: ImageModalProps) {
  return (
    <div
      className="overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="modal-base modal-imagem">
        <button type="button" className="botao-secundario botao-fechar" onClick={onClose}>
          Fechar
        </button>
        <img src={image.url} alt="Visualização ampliada da imagem" />
      </section>
    </div>
  );
}

export default ImageModal;
