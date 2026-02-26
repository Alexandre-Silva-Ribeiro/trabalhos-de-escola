import { Link } from "react-router-dom";

interface FooterProps {
  projectName: string;
}

const secondaryNavItems: ReadonlyArray<{ label: string; to: string }> = [
  { label: "Homenagens", to: "/mulheres-na-engenharia" },
  { label: "Fontes da Pesquisa", to: "/fontes" },
  { label: "Sobre o Projeto", to: "/sobre-projeto" }
];

const externalItems: ReadonlyArray<{ label: string; href: string }> = [
  { label: "UFPR", href: "https://www.ufpr.br/" },
  { label: "CREA-PR", href: "https://www.crea-pr.org.br/" },
  { label: "Revista ABPN", href: "https://abpnrevista.org.br/site/" }
];

export default function Footer({ projectName }: FooterProps) {
  return (
    <footer id="fontes" className="site-footer">
      <div className="footer-main">
        <section className="footer-block">
          <h2>Enedina Alves Marques (1913-1981)</h2>
          <p>Primeira Engenheira Negra do Brasil (Formada em 1945 pela UFPR)</p>
          <p className="footer-legacy-line">
            Legado: Construção da Usina Capivari-Cachoeira | Pioneira em Obras
            Públicas | Referência em Engenharia no Paraná
          </p>
        </section>

        <nav className="footer-block" aria-label="Navegação secundária">
          <h2>Navegação secundária</h2>
          <ul>
            {secondaryNavItems.map((item) => (
              <li key={item.label}>
                <Link to={item.to}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <section className="footer-block">
          <h2>Referências externas</h2>
          <ul>
            {externalItems.map((item) => (
              <li key={item.label}>
                <a href={item.href} target="_blank" rel="noreferrer">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <p className="footer-bottom">
        {projectName} - projeto escolar independente, sem vínculo institucional
        oficial com associações profissionais.
      </p>
    </footer>
  );
}
