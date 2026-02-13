import type { Biography, FloatingProfile } from "../types";
import BiographyContent from "./BiographyContent";
import FloatingCard from "./FloatingCard";

interface LayoutProps {
  biography: Biography;
  profile: FloatingProfile;
}

export default function Layout({ biography, profile }: LayoutProps) {
  return (
    <main className="page-grid">
      <section className="main-column">
        <BiographyContent biography={biography} />
      </section>
      {/* Coluna lateral mantida separada para facilitar o modo responsivo. */}
      <aside className="side-column">
        <FloatingCard profile={profile} />
      </aside>
    </main>
  );
}
