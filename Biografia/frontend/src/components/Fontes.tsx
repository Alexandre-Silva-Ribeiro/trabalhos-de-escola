const sourceLinks: ReadonlyArray<{ label: string; href: string }> = [
  {
    label: "Wikipedia - Enedina Alves Marques",
    href: "https://pt.wikipedia.org/wiki/Enedina_Alves_Marques"
  },
  {
    label: "UFPR - Primeira engenheira negra do país",
    href: "https://ufpr.br/primeira-engenheira-negra-do-pais-e-formada-pela-ufpr-recebe-homenagem-do-google/"
  },
  {
    label: "Plenarinho - Enedina Alves Marques",
    href: "https://plenarinho.leg.br/index.php/2023/09/enedina-alves-marques/"
  },
  {
    label: "Colégio Estadual do Paraná - Homenagem a Enedina",
    href: "https://www.cep.pr.gov.br/Noticia/Enedina-Alves-Marques-uma-mulher-frente-do-seu-tempo-foi-estudante-do-Ginasio-Paranaense"
  }
];

export default function Fontes() {
  return (
    <section className="route-page">
      <article className="route-page-card">
        <h1>Fontes</h1>
        <p>
          Referências utilizadas para consulta biográfica e contextualização
          histórica.
        </p>
        <ul className="sources-list">
          {sourceLinks.map((source) => (
            <li key={source.href}>
              <a href={source.href} target="_blank" rel="noreferrer">
                {source.label}
              </a>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
