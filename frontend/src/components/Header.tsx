import { useLocation, useNavigate } from "react-router-dom";

type ScrollTarget = "top" | "biografias";

interface HeaderProps {
  isSpeaking: boolean;
  isGeneratingSpeech: boolean;
  isSpeechEnabled: boolean;
  onToggleSpeech: () => void;
  isMobileAudioMode: boolean;
}

export default function Header({
  isSpeaking,
  isGeneratingSpeech,
  isSpeechEnabled,
  onToggleSpeech,
  isMobileAudioMode
}: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  function scrollOnHome(target: ScrollTarget) {
    if (target === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    document
      .getElementById("biografias")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function goToHomeAndScroll(target: ScrollTarget) {
    if (location.pathname === "/") {
      scrollOnHome(target);
      return;
    }

    navigate("/", { state: { scrollTo: target } });
  }

  function goToRoute(path: string) {
    navigate(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <header className="site-header">
      <div className="header-bar">
        <div className="header-spacer" />

        <nav className="header-nav-shell" aria-label="Navegacao principal">
          <ul className="header-nav">
            <li>
              <button type="button" onClick={() => goToHomeAndScroll("top")}>
                Inicio
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => goToHomeAndScroll("biografias")}
              >
                Biografias
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => goToRoute("/mulheres-na-engenharia")}
              >
                Mulheres na Engenharia
              </button>
            </li>
            <li>
              <button type="button" onClick={() => goToRoute("/fontes")}>
                Fontes
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => goToRoute("/seletor-de-voz")}
              >
                Seletor de Voz
              </button>
            </li>
          </ul>
        </nav>

        <div className="header-actions">
          <button
            type="button"
            className="header-action-button"
            disabled={!isSpeaking && !isGeneratingSpeech && !isSpeechEnabled}
            onClick={onToggleSpeech}
          >
            {isGeneratingSpeech && isMobileAudioMode
              ? "Gerando MP3..."
              : isSpeaking
                ? "Parar Leitura"
                : isMobileAudioMode
                  ? "Baixar Biografia MP3"
                  : "Ouvir Biografia"}
          </button>
          <button
            type="button"
            className="header-action-button"
            onClick={() => goToRoute("/sobre")}
          >
            Sobre o Criador
          </button>
        </div>
      </div>

      <div className="institutional-banner">
        <h2 className="institutional-title">
          Enedina Alves Marques: Primeira Engenheira Negra do Brasil e Primeira
          Engenheira do Sul do Pais
        </h2>
        <ul className="institutional-points">
          <li>Formada em Engenharia Civil pela UFPR (1945)</li>
          <li>Lider na construcao da Usina Hidreletrica Capivari-Cachoeira</li>
          <li>Conhecida como "A Dama do Capivari"</li>
          <li>Nascida em Curitiba, Parana</li>
        </ul>
      </div>
    </header>
  );
}
