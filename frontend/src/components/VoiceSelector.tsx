import { useEffect, useMemo, useState } from "react";
import type { ElevenVoice, SpeechEngine, SpeechSettings } from "../types";

const languageOptions: ReadonlyArray<{ code: string; label: string }> = [
  { code: "pt", label: "Portugues" },
  { code: "en", label: "English" },
  { code: "es", label: "Espanol" },
  { code: "fr", label: "Francais" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "ja", label: "Japanese" }
];

interface VoiceSelectorProps {
  speechSettings: SpeechSettings;
  onUpdateSpeechSettings: (patch: Partial<SpeechSettings>) => void;
  browserVoices: SpeechSynthesisVoice[];
  isSpeechSupported: boolean;
  isSpeechBusy: boolean;
}

export default function VoiceSelector({
  speechSettings,
  onUpdateSpeechSettings,
  browserVoices,
  isSpeechSupported,
  isSpeechBusy
}: VoiceSelectorProps) {
  const [elevenVoices, setElevenVoices] = useState<ElevenVoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function loadVoices() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch("/api/elevenlabs/voices");
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            typeof payload?.error === "string"
              ? payload.error
              : "Nao foi possivel carregar vozes do ElevenLabs."
          );
        }

        const voices = Array.isArray(payload?.voices) ? payload.voices : [];
        setElevenVoices(voices);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Erro inesperado ao carregar vozes."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadVoices();
  }, []);

  const filteredVoices = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) {
      return elevenVoices;
    }

    return elevenVoices.filter((voice) => {
      const gender = String(voice.labels?.gender ?? "");
      return `${voice.name} ${gender} ${voice.category}`
        .toLowerCase()
        .includes(search);
    });
  }, [elevenVoices, searchTerm]);

  function handleEngineChange(engine: SpeechEngine) {
    onUpdateSpeechSettings({ engine });
  }

  return (
    <section className="route-page">
      <article className="route-page-card">
        <h1>Seletor de Voz</h1>
        <p>
          Escolha o motor de leitura, idioma e a voz desejada para ouvir o
          texto biografico.
        </p>

        <div className="voice-controls-grid">
          <label className="voice-label">
            Motor de voz
            <select
              value={speechSettings.engine}
              disabled={isSpeechBusy}
              onChange={(event) =>
                handleEngineChange(event.target.value as SpeechEngine)
              }
            >
              <option value="browser">Navegador</option>
              <option value="elevenlabs">ElevenLabs</option>
            </select>
          </label>

          <label className="voice-label">
            Idioma
            <select
              value={speechSettings.languageCode}
              disabled={isSpeechBusy}
              onChange={(event) =>
                onUpdateSpeechSettings({ languageCode: event.target.value })
              }
            >
              {languageOptions.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {speechSettings.engine === "browser" && (
          <div className="voice-browser-panel">
            {!isSpeechSupported && (
              <p className="voice-error">
                Seu navegador nao suporta SpeechSynthesis.
              </p>
            )}

            {isSpeechSupported && (
              <label className="voice-label">
                Voz do navegador
                <select
                  value={speechSettings.browserVoiceURI ?? ""}
                  disabled={isSpeechBusy}
                  onChange={(event) =>
                    onUpdateSpeechSettings({
                      browserVoiceURI: event.target.value || null
                    })
                  }
                >
                  <option value="">Selecionar automaticamente</option>
                  {browserVoices.map((voice) => (
                    <option key={voice.voiceURI} value={voice.voiceURI}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}

        {speechSettings.engine === "elevenlabs" && (
          <>
            <label className="voice-label voice-search">
              Buscar voz
              <input
                type="text"
                value={searchTerm}
                placeholder="Nome, categoria ou genero"
                disabled={isSpeechBusy}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>

            {isLoading && <p className="voice-note">Carregando vozes...</p>}
            {!isLoading && errorMessage && (
              <div>
                <p className="voice-error">{errorMessage}</p>
                <p className="voice-note">
                  Para listar vozes do ElevenLabs, configure a variavel
                  <code> ELEVENLABS_API_KEY </code> no backend e reinicie o servidor.
                </p>
              </div>
            )}

            {!isLoading && !errorMessage && filteredVoices.length === 0 && (
              <p className="voice-note">
                Nenhuma voz encontrada para o filtro informado.
              </p>
            )}

            {!isLoading && !errorMessage && filteredVoices.length > 0 && (
              <ul className="voice-list">
                {filteredVoices.map((voice) => {
                  const isSelected = speechSettings.elevenVoiceId === voice.voiceId;
                  return (
                    <li key={voice.voiceId} className="voice-item">
                      <button
                        type="button"
                        className={`voice-select-button${isSelected ? " selected" : ""}`}
                        disabled={isSpeechBusy}
                        onClick={() =>
                          onUpdateSpeechSettings({
                            engine: "elevenlabs",
                            elevenVoiceId: voice.voiceId,
                            elevenVoiceName: voice.name
                          })
                        }
                      >
                        <strong>{voice.name}</strong>
                        <span>
                          {voice.labels?.gender ? `${voice.labels.gender} | ` : ""}
                          {voice.category || "categoria nao informada"}
                        </span>
                      </button>

                      <p className="voice-note">
                        {isSelected
                          ? "Selecionada para leitura da biografia."
                          : "Clique para selecionar esta voz."}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}

        {isSpeechBusy && (
          <p className="voice-note">
            Leitura em andamento. Clique em "Parar Leitura" para trocar voz ou idioma.
          </p>
        )}
      </article>
    </section>
  );
}
