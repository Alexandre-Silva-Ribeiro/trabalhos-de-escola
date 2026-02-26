const aboutParagraphs: ReadonlyArray<string> = [
  "Comecei com programação aos 11 anos, movido principalmente por curiosidade. Gostava de abrir coisas, testar, entender como funcionavam por dentro. Não era nada planejado, apenas vontade de explorar. Depois de um tempo, parei, mas aos 14 voltei a experimentar outras áreas até perceber, aos 15, que programar realmente prendia minha atenção. Quando estou programando, o tempo passa sem que eu perceba, e me faz sentir produtivo e focado.",
  "A programação me ajuda a organizar meus pensamentos. Minha mente costuma estar cheia de ideias, e escrever código é uma forma de colocar ordem nelas. Gosto da sensação de resolver problemas por conta própria e de ver algo funcionando a partir de algo que eu mesmo construí. Nem sempre dá certo de primeira, mas aprender com os erros faz parte do processo.",
  "Crio coisas úteis, planejadas, organizadas, automatizadas, mas também crio coisas inúteis só para me desafiar. Quando algo funciona, fico satisfeito, mesmo que eu nem vá usar, e não preciso mostrar a ninguém além de mim mesmo. Pequenos avanços já bastam. Experimentos falham direto, e tudo bem. Faz parte. Aprender com cada tentativa, mesmo sem resultado aparente, virou rotina. Pequenas derrotas não são fracassos, apenas mostram onde ainda posso melhorar.",
  "Também já me dediquei bastante a esportes. Ao longo dos anos pratiquei futebol, basquete, musculação, calistenia, além de experimentar modalidades como vôlei e tênis de mesa. Sempre busquei melhorar meu desempenho físico e testar meus limites. Na musculação e calistenia, me esforcei bastante, mas pelo visto meu déficit calórico não ajudava muito — parece que quanto mais eu treino, mais fino eu fico kkk. Mesmo assim, cada experiência trouxe aprendizado sobre disciplina, constância e como o corpo responde a fatores além do esforço.",
  "Algumas atividades também estavam ligadas às amizades e momentos que eu vivia na época. Quando meu círculo social mudou, naturalmente algumas pararam de fazer parte da rotina. Entendi que certas experiências fazem mais sentido em determinados contextos, e isso é parte do crescimento.",
  "Sempre fui mais reservado. Prefiro observar antes de falar e gosto de trabalhar de forma independente. Funciona melhor para mim manter meu próprio ritmo e organizar minhas tarefas da maneira que considero mais eficiente. Não é isolamento, é apenas meu jeito de lidar com as coisas.",
  "Além da programação, gosto de ouvir música, explorar tecnologia, testar pequenos experimentos e aprender algo novo por conta própria. Nada ambicioso, apenas coisas que ocupam a mente e distraem. Não tenho pressa de me tornar especialista, mas valorizo evolução constante.",
  "Ainda tenho aspectos que quero melhorar: condicionamento físico, postura, manter hábitos com mais constância. Algumas mudanças levam tempo, outras exigem prática. Nem toda tentativa sem resultado foi inútil, já que sempre sobra algum aprendizado, mesmo que pequeno. Cada esforço me ajuda a entender meus limites e potencial, sem exagero.",
  "No final, sigo tentando aprimorar o que posso, aprendendo com cada tentativa e ajustando minhas escolhas de acordo com o que faz sentido para mim. É simples assim: testar, aprender e continuar."
];

export default function Sobre() {
  return (
    <section className="route-page">
      <article className="route-page-card">
        <h1>Alexandre da Silva Ribeiro</h1>
        <div className="creator-meta">
          <p>Turma: 2008</p>
          <p>Turno: Noite</p>
        </div>
        {aboutParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </article>
    </section>
  );
}
