const aboutParagraphs: ReadonlyArray<string> = [
  "Comecei a programar aos 11 anos, muito por curiosidade. Eu gostava de testar, desmontar ideias e entender como as coisas funcionavam por dentro.",
  "Depois de um tempo eu dei uma pausa, mas aos 14 voltei a explorar tecnologia. Aos 15 ficou claro para mim: programar era algo que realmente prendia minha atenção.",
  "Programacao me ajuda a organizar a mente. Quando escrevo codigo, pego varias ideias soltas e transformo em algo funcional. Nem sempre da certo de primeira, mas esse processo de tentativa e erro faz parte do que eu gosto.",
  "Tambem passei por varios esportes, como futebol, basquete, musculacao e calistenia. Foi uma fase importante para aprender disciplina, constancia e paciencia com resultados que nem sempre aparecem na velocidade que a gente quer.",
  "Sou mais reservado e costumo trabalhar melhor no meu proprio ritmo. Gosto de aprender por conta propria, testar projetos, ouvir musica e seguir evoluindo um pouco por dia.",
  "No fim, minha linha e simples: testar, aprender, ajustar e continuar."
];

export default function Sobre() {
  return (
    <section className="route-page">
      <article className="route-page-card">
        <h1>Alexandre da Silva Ribeiro</h1>
        <div className="creator-meta">
          <p>Turma: 2008</p>
          <p>Turno: Noite</p>
          <p>Aluno do Colegio Estadual Olavo Bilac</p>
        </div>
        {aboutParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </article>
    </section>
  );
}
