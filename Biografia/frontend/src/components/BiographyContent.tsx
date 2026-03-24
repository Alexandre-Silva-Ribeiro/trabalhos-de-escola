import type { Biography, BiographySection, FloatingProfile } from "../types";
import FloatingCard from "./FloatingCard";

interface BiographyContentProps {
  biography: Biography;
  profile: FloatingProfile;
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

  const contentLower = section.content.toLowerCase();
  if (contentLower.includes("contribu") && contentLower.includes("impacto social")) {
    return (
      <h2 key={`section-${index}`} className="impact-title">
        {section.content}
      </h2>
    );
  }

  return <p key={`section-${index}`}>{section.content}</p>;
}

export default function BiographyContent({ biography, profile }: BiographyContentProps) {
  let imageCounter = 0;

  return (
    <article className="biography-article">
      <h1>{biography.title}</h1>
      <div className="mobile-floating-wrapper">
        <FloatingCard profile={profile} />
      </div>
      <p className="intro">{biography.intro}</p>

      {biography.sections.map((section, index) => {
        const node = renderSection(section, index, imageCounter);
        if (section.type === "image") {
          imageCounter += 1;
        }
        return node;
      })}

      {/* Evita vazamento de elementos flutuantes para fora do artigo. */}
      <div className="clear-floats" />
    </article>
  );
}
