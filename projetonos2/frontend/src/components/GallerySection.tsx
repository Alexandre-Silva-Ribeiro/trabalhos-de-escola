import { FormEvent, useState } from "react";

type Imagem = {
  name: string;
  createdAt: number;
  url: string;
};

type ResultadoAcao = {
  ok: boolean;
  mensagem: string;
};

type GallerySectionProps = {
  images: Imagem[];
  loading: boolean;
  statusMessage: string;
  onUpload: (file: File | null, password: string) => Promise<ResultadoAcao>;
  onRemove: (name: string) => Promise<ResultadoAcao>;
  onOpenImage: (image: Imagem) => void;
};

function GallerySection({
  images,
  loading,
  statusMessage,
  onUpload,
  onRemove,
  onOpenImage,
}: GallerySectionProps) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [removendoNome, setRemovendoNome] = useState<string | null>(null);

  const enviar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (enviando) {
      return;
    }

    setEnviando(true);
    const resultado = await onUpload(arquivo, senha);

    if (resultado.ok) {
      setArquivo(null);
      setSenha("");
    }

    setEnviando(false);
  };

  const remover = async (nome: string) => {
    if (removendoNome) {
      return;
    }

    setRemovendoNome(nome);
    await onRemove(nome);
    setRemovendoNome(null);
  };

  return (
    <section className="painel painel-galeria">
      <header className="cabecalho-galeria">
        <h2>Nossa Galeria</h2>
        <p className="texto-apoio">
          Envie imagens com a senha compartilhada e mantenha esse espaço sempre
          vivo.
        </p>
      </header>

      <form className="form-upload" onSubmit={enviar}>
        <label className="campo-arquivo" htmlFor="arquivo-imagem">
          <span>{arquivo ? arquivo.name : "Selecionar imagem"}</span>
          <input
            id="arquivo-imagem"
            type="file"
            accept="image/*"
            onChange={(event) => {
              const proximoArquivo = event.target.files?.[0] || null;
              setArquivo(proximoArquivo);
            }}
          />
        </label>

        <input
          className="input-texto"
          type="password"
          value={senha}
          onChange={(event) => setSenha(event.target.value)}
          placeholder="Senha para enviar (2010)"
          autoComplete="off"
        />

        <button type="submit" className="botao-principal" disabled={enviando}>
          {enviando ? "Enviando..." : "Enviar imagem"}
        </button>
      </form>

      {statusMessage && <p className="status-jogo">{statusMessage}</p>}

      {loading && images.length === 0 && (
        <p className="estado-galeria">Carregando imagens...</p>
      )}

      {!loading && images.length === 0 && (
        <p className="estado-galeria">
          A galeria ainda está vazia. Envie a primeira imagem.
        </p>
      )}

      {images.length > 0 && (
        <div className="galeria-grade">
          {images.map((image) => (
            <article key={image.name} className="item-galeria">
              <button
                type="button"
                className="galeria-abrir"
                onClick={() => onOpenImage(image)}
                aria-label="Abrir imagem"
              >
                <img src={image.url} alt="Imagem da galeria compartilhada" loading="lazy" />
              </button>

              <button
                type="button"
                className="galeria-remover"
                onClick={() => remover(image.name)}
                disabled={removendoNome === image.name}
              >
                {removendoNome === image.name ? "Removendo..." : "Remover"}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default GallerySection;
