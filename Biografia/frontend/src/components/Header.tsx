import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type ScrollTarget = "top";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHomeRoute = location.pathname === "/";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  function isRouteActive(path: string) {
    return location.pathname === path;
  }

  function scrollOnHome() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToHomeAndScroll(target: ScrollTarget) {
    if (location.pathname === "/") {
      scrollOnHome();
      return;
    }

    navigate("/", { state: { scrollTo: target } });
  }

  function goToRoute(path: string) {
    navigate(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function runMobileAction(action: () => void) {
    action();
    setIsMobileMenuOpen(false);
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

        <button
          type="button"
          className="menu-toggle"
          aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-menu"
          onClick={() => setIsMobileMenuOpen((current) => !current)}
        >
          ☰
        </button>

        <div
          id="mobile-menu"
          className={`header-mobile-menu ${isMobileMenuOpen ? "active" : ""}`}
        >
          <ul className="header-mobile-nav">
            <li>
              <button
                type="button"
                onClick={() => runMobileAction(() => goToHomeAndScroll("top"))}
                aria-current={isHomeRoute ? "page" : undefined}
              >
                Início
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => runMobileAction(() => goToRoute("/mulheres-na-engenharia"))}
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
                onClick={() => runMobileAction(() => goToRoute("/fontes"))}
                aria-current={isRouteActive("/fontes") ? "page" : undefined}
              >
                Fontes
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => runMobileAction(() => goToRoute("/sobre"))}
                aria-current={isRouteActive("/sobre") ? "page" : undefined}
              >
                Sobre o Criador
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div className="institutional-banner">
        <h2 className="institutional-title">
          Enedina Alves Marques: uma pioneira que abriu caminho na engenharia
        </h2>
        <ul className="institutional-points">
          <li>Formada em Engenharia Civil pela UFPR, em 1945</li>
          <li>Primeira mulher negra engenheira do Brasil</li>
          <li>Primeira engenheira do Sul do país</li>
          <li>Conhecida como "A Dama do Capivari"</li>
        </ul>
      </div>
    </header>
  );
}
