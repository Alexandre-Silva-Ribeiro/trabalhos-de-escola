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
      <div className="floating-media">
        <img
          className="floating-portrait"
          src={profile.portrait}
          alt={`Retrato de ${profile.fullName}`}
        />
        <div className="floating-info">
          <h2 className="floating-name">{profile.fullName}</h2>
          <p className="floating-dates">{profile.dates}</p>
          <p className="floating-quote">{profile.quote}</p>
        </div>
      </div>
    </article>
  );
}
