import { useEffect, useState } from "react";
import AppRoutes from "./Routes";
import { apiUrl } from "./apiBase";
import Footer from "./components/Footer";
import Header from "./components/Header";
import type { Biography, FloatingProfile } from "./types";

const floatingProfile: FloatingProfile = {
  fullName: "Enedina Alves Marques",
  dates: "1913-1981",
  quote: "Ela provou, na prática, que talento não tem cor nem gênero.",
  portrait: "https://plenarinho.leg.br/wp-content/uploads/2023/09/Enedina-Alves-Marques.jpg"
};

type ThemeMode = "light" | "dark";

function resolveInitialTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  const savedMode = window.localStorage.getItem("theme-mode");
  if (savedMode === "light" || savedMode === "dark") {
    return savedMode;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export default function App() {
  const [biography, setBiography] = useState<Biography | null>(null);
  const [error, setError] = useState<string>("");
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => resolveInitialTheme());

  useEffect(() => {
    async function loadBiography() {
      try {
        const staticUrl = `${import.meta.env.BASE_URL}biography.json?v=${Date.now()}`;
        const staticResponse = await fetch(staticUrl, { cache: "no-store" });
        if (staticResponse.ok) {
          const staticData: Biography = await staticResponse.json();
          setBiography(staticData);
          return;
        }

        const apiResponse = await fetch(apiUrl("/api/biography"), { cache: "no-store" });
        if (!apiResponse.ok) {
          throw new Error("Nao foi possivel carregar a biografia.");
        }

        const apiData: Biography = await apiResponse.json();
        setBiography(apiData);
      } catch (loadError) {
        const message =
          loadError instanceof Error ? loadError.message : "Erro inesperado.";
        setError(message);
      }
    }

    loadBiography();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeMode);
    window.localStorage.setItem("theme-mode", themeMode);
  }, [themeMode]);

  function toggleTheme() {
    setThemeMode((current) => (current === "light" ? "dark" : "light"));
  }

  return (
    <div id="inicio">
      <Header />

      <button
        type="button"
        className="theme-toggle"
        aria-label={
          themeMode === "light"
            ? "Ativar modo escuro"
            : "Ativar modo claro"
        }
        title={themeMode === "light" ? "Ativar modo escuro" : "Ativar modo claro"}
        onClick={toggleTheme}
      >
        <span aria-hidden="true">{"\u2600"}</span>
      </button>

      <AppRoutes biography={biography} error={error} profile={floatingProfile} />

      <Footer />
    </div>
  );
}
