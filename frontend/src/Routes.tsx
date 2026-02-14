import { useEffect } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate
} from "react-router-dom";
import Fontes from "./components/Fontes";
import Layout from "./components/Layout";
import LegacySection from "./components/LegacySection";
import MulheresEngenharia from "./components/MulheresEngenharia";
import Sobre from "./components/Sobre";
import SobreProjeto from "./components/SobreProjeto";
import type { Biography, FloatingProfile } from "./types";

interface AppRoutesProps {
  biography: Biography | null;
  error: string;
  profile: FloatingProfile;
}

type HomeNavigationState = {
  scrollTo?: "top" | "biografias";
};

interface HomePageProps {
  biography: Biography | null;
  error: string;
  profile: FloatingProfile;
}

function HomePage({ biography, error, profile }: HomePageProps) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const state = location.state as HomeNavigationState | null;
    if (!state?.scrollTo) {
      return;
    }

    if (state.scrollTo === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      navigate(location.pathname, { replace: true, state: null });
      return;
    }

    if (!biography) {
      return;
    }

    document
      .getElementById("biografias")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    navigate(location.pathname, { replace: true, state: null });
  }, [biography, location.pathname, location.state, navigate]);

  if (error) {
    return <p className="status-message">Erro: {error}</p>;
  }

  if (!biography) {
    return <p className="status-message">Carregando conteúdo biográfico...</p>;
  }

  return (
    <>
      {/* Mantem o grid principal sem alteracoes estruturais. */}
      <section id="biografias">
        <Layout biography={biography} profile={profile} />
      </section>
      <LegacySection />
    </>
  );
}

export default function AppRoutes({
  biography,
  error,
  profile
}: AppRoutesProps) {
  return (
    <Routes>
      <Route
        path="/"
        element={<HomePage biography={biography} error={error} profile={profile} />}
      />
      <Route path="/mulheres-na-engenharia" element={<MulheresEngenharia />} />
      <Route path="/fontes" element={<Fontes />} />
      <Route path="/sobre" element={<Sobre />} />
      <Route path="/sobre-projeto" element={<SobreProjeto />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
