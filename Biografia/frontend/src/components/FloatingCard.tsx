interface FloatingCardProps {
  profile: {
    fullName: string;
    dates: string;
    quote: string;
    portrait: string;
  };
}

export default function FloatingCard({ profile }: FloatingCardProps) {
  return (
    <article className="floating-card">
      <img
        className="floating-portrait"
        src={profile.portrait}
        alt={`Retrato de ${profile.fullName}`}
      />
      <h2 className="floating-name">{profile.fullName}</h2>
      <p className="floating-dates">{profile.dates}</p>
      <p className="floating-quote">{profile.quote}</p>
    </article>
  );
}
