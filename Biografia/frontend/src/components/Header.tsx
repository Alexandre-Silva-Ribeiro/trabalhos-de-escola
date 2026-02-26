import { useLocation, useNavigate } from "react-router-dom";

type ScrollTarget = "top" | "biografias";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHomeRoute = location.pathname === "/";

  function isRouteActive(path: string) {
    return location.pathname === path;
  }

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

        <nav className="header-nav-shell" aria-label="Navegação principal">
          <ul className="header-nav">
            <li>
              <button
                type="button"
                onClick={() => goToHomeAndScroll("top")}
                aria-current={isHomeRoute ? "page" : undefined}
              >
                Início
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => goToHomeAndScroll("biografias")}
                aria-current={isHomeRoute ? "page" : undefined}
              >
                Biografias
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => goToRoute("/mulheres-na-engenharia")}
                aria-current={
                  isRouteActive("/mulheres-na-engenharia") ? "page" : undefined
                }
              >
                Mulheres na Engenharia
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => goToRoute("/fontes")}
                aria-current={isRouteActive("/fontes") ? "page" : undefined}
              >
                Fontes
              </button>
            </li>
          </ul>
        </nav>

        <div className="header-actions">
          <button
            type="button"
            className="header-action-button"
            onClick={() => goToRoute("/sobre")}
            aria-current={isRouteActive("/sobre") ? "page" : undefined}
          >
            Sobre o Criador
          </button>
        </div>
      </div>

      <div className="institutional-banner">
        <h2 className="institutional-title">
          Enedina Alves Marques: Primeira Engenheira Negra do Brasil e Primeira
          Engenheira do Sul do País
        </h2>
        <ul className="institutional-points">
          <li>Formada em Engenharia Civil pela UFPR (1945)</li>
          <li>Líder na construção da Usina Hidrelétrica Capivari-Cachoeira</li>
          <li>Conhecida como "A Dama do Capivari"</li>
          <li>Nascida em Curitiba, Paraná</li>
        </ul>
      </div>
    </header>
  );
}
