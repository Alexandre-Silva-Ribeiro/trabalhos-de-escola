const aboutParagraphs: ReadonlyArray<string> = [
  "Comecei com programação aos 11 anos. Não era nada sério, sabe? Só curiosidade mesmo, tipo eu sempre assim: abrir as coisas, ver o que acontecia, tentar entender como funcionava por dentro. Não tinha objetivo, nem queria mostrar pra ninguém. Depois de um tempo parei, como criança faz. Aos 14 voltei, explorando outras áreas, tentando descobrir o que realmente me interessava. Só com 15 percebi que programar era algo que me prendia de verdade. Não é paixão exagerada, é mais que isso: quando tô programando, o tempo passa sem eu perceber, e eu me sinto livre pra fazer oque eu quiser, é quase como pintar um quadro mas no meu caso eu dou vida pras minhas obras.",
  "Programar me ajuda a organizar o que penso já que minha cabeça vive cheia de ideia solta, e escrever código dá um jeito de colocar ordem nelas. Cada linha é consequência de algo que posso controlar sozinho, sem depender de ninguém. Não importa se alguém vai ver ou aprovar. É quase um exercício de paciência comigo mesmo, uma forma de testar meus limites e ver até onde consigo ir. Pequenos erros acontecem, mas cada um deixa alguma coisa. Não é sobre exibir, é sobre praticar e entender.",
  "Crio coisa útil, planejada, organizada, automatizada, mas também crio coisa inútil como passa tempo só pra me desafiar. Quando algo funciona, fico satisfeito, mesmo que nem eu mesmo vá usar, mas não preciso sair mostrando pra ninguém além de mim mesmo. Pequeno avanço já basta. Experimento falha direto, e tá tudo bem. Faz parte. Aprender com cada tentativa, mesmo sem resultado aparente, virou rotina. Pequenas derrotas não são fracassos, só mostram onde ainda posso melhorar.",
  "Treinei futebol, musculação e calistenia por uns cinco ou seis anos. Queria melhorar, sabe? Parte de mim queria não me sentir tão pequeno, ocupar mais espaço, não passar despercebido. Mas com o tempo percebi que esforço intenso não vence facilidade natural em médio prazo. A diferença que você consegue em alguns anos é pequena, às vezes quase nada. É frustrante. Dói admitir, mas é verdade. Para mim, é irritante se esforçar e não alcançar o esperado parece uma facada pelas costas. Mas quando olho de perto, vejo que foi consequência das minhas próprias escolhas. É desconfortável, mas é só mais um aprendizado sobre causa e efeito.",
  "Cheguei a jogar basquete também, mas parei quando meu círculo social mudou (e de novo, graças a mim). As pessoas com quem jogava se afastaram, e sozinho o jogo perdeu a graça. Esporte depende de outras pessoas, então sozinho não faz muito sentido. Não foi dramático, a vontade só foi sumiu de forma repentina.",
  "Sempre fui, e ainda sou aquele cara quieto no canto da sala. No colégio, nos grupos, nas casas, eu passava despercebido. Quando me notavam, às vezes era pra encher o saco ou fazer amizade falsa que depois desaparecia. Com o tempo, passei a preferir trabalhar completamente sozinho. Não é só preferência, é que funciona melhor: o ritmo é meu, os erros são meus, as correções são minhas. Não preciso me preocupar com mais ninguém.",
  "Por fora, sei que pareço meio lento até porque vivo mais tempo na minha própria cabeça do que na vida real, sempre pensando em algo novo. Demoro pra processar algumas coisas, às vezes me atrapalho pra explicar o que penso. Não falo muito. Mas quando algo me interessa de verdade, posso passar horas num detalhe que ninguém mais ligaria ou até meses em coisas que já funcionam. Não é perfeccionismo, é que gosto de entender até o fundo, como foi feito, como funciona.",
  "Além de programar, gosto de ouvir música, fuçar tecnologia, testar experimentos pequenos, aprender alguma coisa nova por conta. Nada muito ambicioso, só coisas que ocupam a cabeça e distraem. Não tenho pressa de virar especialista em nada.",
  "Ainda tenho coisas que quero melhorar: condicionamento físico, postura, manter hábitos com mais constância. Sei que algumas mudanças levam tempo, outras exigem prática. Nem toda tentativa que não deu certo foi tempo perdido, sempre fica alguma coisa, mesmo que pequena. Cada esforço me ajuda a entender meus limites e potencial, sem exagero.",
  "No fim, o que ficou foi o que continuei fazendo mesmo sem ninguém ver: programação, meus interesses pessoais, observar como reajo às coisas. Não sou personagem de história, nem protagonista de nada. Só um cara tentando entender o próprio ritmo das coisas e seguir em frente."
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
