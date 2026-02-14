import { useEffect, useMemo, useState } from "react";
import { apiUrl } from "../apiBase";
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

interface BiographyResponse {
  title: string;
  intro: string;
  sections: Array<
    | {
        type: "paragraph";
        content: string;
      }
    | {
        type: "image";
        src: string;
        alt: string;
      }
  >;
}

function buildBiographySpeechText(biography: BiographyResponse): string {
  const paragraphs = biography.sections
    .filter(
      (section): section is Extract<BiographyResponse["sections"][number], { type: "paragraph" }> =>
        section.type === "paragraph"
    )
    .map((section) => section.content.trim())
    .filter(Boolean);

  return [biography.title, biography.intro, ...paragraphs]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(". ");
}

function splitTextForElevenLabs(text: string, maxChunkLength = 1200): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }

  const chunks: string[] = [];
  let remaining = normalized;

  while (remaining.length > maxChunkLength) {
    const candidate = remaining.slice(0, maxChunkLength);
    const punctuationBreak = Math.max(
      candidate.lastIndexOf(". "),
      candidate.lastIndexOf("! "),
      candidate.lastIndexOf("? "),
      candidate.lastIndexOf("; "),
      candidate.lastIndexOf(": ")
    );
    const whitespaceBreak = candidate.lastIndexOf(" ");
    const splitIndex =
      punctuationBreak > Math.floor(maxChunkLength * 0.5)
        ? punctuationBreak + 1
        : whitespaceBreak > 0
          ? whitespaceBreak
          : maxChunkLength;

    chunks.push(remaining.slice(0, splitIndex).trim());
    remaining = remaining.slice(splitIndex).trim();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks;
}

function parseSpeechError(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "Falha ao gerar MP3 no ElevenLabs.";
  }

  const maybePayload = payload as {
    error?: unknown;
    details?: unknown;
  };

  const errorText =
    typeof maybePayload.error === "string" ? maybePayload.error : "";
  const detailsText =
    typeof maybePayload.details === "string" ? maybePayload.details : "";

  return [errorText, detailsText].filter(Boolean).join(" ").trim() ||
    "Falha ao gerar MP3 no ElevenLabs.";
}

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
  const [isGeneratingMp3, setIsGeneratingMp3] = useState(false);
  const [mp3StatusMessage, setMp3StatusMessage] = useState("");

  useEffect(() => {
    async function loadVoices() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch(apiUrl("/api/elevenlabs/voices"));
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

  async function handleGenerateMp3() {
    setMp3StatusMessage("");

    if (!speechSettings.elevenVoiceId) {
      setMp3StatusMessage("Selecione uma voz do ElevenLabs para gerar o MP3.");
      return;
    }

    setIsGeneratingMp3(true);
    try {
      const biographyResponse = await fetch(apiUrl("/api/biography"));
      if (!biographyResponse.ok) {
        throw new Error("Nao foi possivel carregar o texto da biografia.");
      }

      const biographyPayload = (await biographyResponse.json()) as BiographyResponse;
      const fullText = buildBiographySpeechText(biographyPayload);
      const chunks = splitTextForElevenLabs(fullText);
      if (chunks.length === 0) {
        throw new Error("Texto biografico vazio para narracao.");
      }

      const audioParts: ArrayBuffer[] = [];
      for (const chunk of chunks) {
        const speechResponse = await fetch(apiUrl("/api/elevenlabs/speech"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            text: chunk,
            voiceId: speechSettings.elevenVoiceId,
            languageCode: speechSettings.languageCode
          })
        });

        if (!speechResponse.ok) {
          const payload = await speechResponse.json().catch(() => null);
          throw new Error(parseSpeechError(payload));
        }

        audioParts.push(await speechResponse.arrayBuffer());
      }

      const mp3Blob = new Blob(audioParts, { type: "audio/mpeg" });
      const fileUrl = URL.createObjectURL(mp3Blob);
      const anchor = document.createElement("a");
      anchor.href = fileUrl;
      anchor.download = "biografia-enedina-alves-marques.mp3";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 30_000);

      setMp3StatusMessage("MP3 gerado com sucesso. Download iniciado.");
    } catch (error) {
      setMp3StatusMessage(
        error instanceof Error ? error.message : "Erro inesperado ao gerar MP3."
      );
    } finally {
      setIsGeneratingMp3(false);
    }
  }

  return (
    <section className="route-page">
      <article className="route-page-card">
        <h1>Seletor de Voz</h1>
        <p>
          Escolha a voz e o idioma para gerar um MP3 da biografia com a API do
          ElevenLabs.
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

            <button
              type="button"
              className="header-action-button"
              disabled={isSpeechBusy || isGeneratingMp3 || !speechSettings.elevenVoiceId}
              onClick={handleGenerateMp3}
            >
              {isGeneratingMp3 ? "Gerando MP3..." : "Gerar MP3 da Biografia"}
            </button>

            {mp3StatusMessage && <p className="voice-note">{mp3StatusMessage}</p>}
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
