import type { Biography, BiographySection } from "../types";

interface BiographyContentProps {
  biography: Biography;
}

function renderSection(section: BiographySection, index: number, imageIndex: number) {
  if (section.type === "image") {
    const alignmentClass = imageIndex % 2 === 0 ? "align-left" : "align-right";
    return (
      <figure key={`section-${index}`} className={`section-image ${alignmentClass}`}>
        <img src={section.src} alt={section.alt} loading="lazy" />
      </figure>
    );
  }

  if (section.content === "Contribuições e Impacto Social") {
    return (
      <h2 key={`section-${index}`} className="impact-title">
        {section.content}
      </h2>
    );
  }

  return <p key={`section-${index}`}>{section.content}</p>;
}

export default function BiographyContent({ biography }: BiographyContentProps) {
  let imageCounter = 0;

  return (
    <article className="biography-article">
      <h1>{biography.title}</h1>
      <p className="intro">{biography.intro}</p>

      {biography.sections.map((section, index) => {
        const node = renderSection(section, index, imageCounter);
        if (section.type === "image") {
          imageCounter += 1;
        }
        return node;
      })}

      {/* Garante que elementos flutuantes não vazem para fora do artigo. */}
      <div className="clear-floats" />
    </article>
  );
}
