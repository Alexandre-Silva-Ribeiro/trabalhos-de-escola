import { useEffect, useMemo, useRef, useState } from "react";
import AppRoutes from "./Routes";
import { apiUrl } from "./apiBase";
import Footer from "./components/Footer";
import Header from "./components/Header";
import type { Biography, FloatingProfile, SpeechSettings } from "./types";

const projectName = "Enciclopedia Brasileira de Engenharia";
const femaleVoicePattern =
  /(female|femin|mulher|maria|helena|luciana|vitoria|camila|ana|sofia|isabela|paula|sabrina)/i;

const floatingProfile: FloatingProfile = {
  fullName: "Enedina Alves Marques",
  dates: "1913-1981",
  quote: "Competencia tecnica tambem e um ato de justica social.",
  portrait: "https://plenarinho.leg.br/wp-content/uploads/2023/09/Enedina-Alves-Marques.jpg"
};

const defaultSpeechSettings: SpeechSettings = {
  engine: "browser",
  languageCode: "pt",
  browserVoiceURI: null,
  elevenVoiceId: null,
  elevenVoiceName: null
};

function selectPreferredFemaleVoice(
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  const ptBrVoices = voices.filter((voice) => voice.lang.toLowerCase() === "pt-br");
  const ptVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("pt"));

  const femalePtBr = ptBrVoices.find((voice) => femaleVoicePattern.test(voice.name));
  if (femalePtBr) {
    return femalePtBr;
  }

  const femalePt = ptVoices.find((voice) => femaleVoicePattern.test(voice.name));
  if (femalePt) {
    return femalePt;
  }

  if (ptBrVoices.length > 0) {
    return ptBrVoices[0];
  }

  if (ptVoices.length > 0) {
    return ptVoices[0];
  }

  const femaleAny = voices.find((voice) => femaleVoicePattern.test(voice.name));
  return femaleAny ?? null;
}

function toSpeechLangCode(languageCode: string) {
  const languageMap: Record<string, string> = {
    pt: "pt-BR",
    en: "en-US",
    es: "es-ES",
    fr: "fr-FR",
    de: "de-DE",
    it: "it-IT",
    ja: "ja-JP"
  };

  if (languageCode.includes("-")) {
    return languageCode;
  }

  return languageMap[languageCode] ?? "pt-BR";
}

function buildSpeechSegments(biography: Biography | null): string[] {
  if (!biography) {
    return [];
  }

  const paragraphs = biography.sections
    .filter((section) => section.type === "paragraph")
    .map((section) => section.content.trim())
    .filter(Boolean);
  const leadSegment = [biography.title, biography.intro, paragraphs[0] ?? ""]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(". ");
  const remainingText = paragraphs.slice(1).join(" ").trim();

  // Mantem inicio rapido sem pulverizar em muitas chamadas (cada request consome creditos).
  return [leadSegment, remainingText].filter(Boolean);
}

function splitTextForBrowserSpeech(text: string, maxChunkLength = 220): string[] {
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
      punctuationBreak > Math.floor(maxChunkLength * 0.45)
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

function voiceMatchesLanguage(voice: SpeechSynthesisVoice, languageCode: string) {
  const voiceLang = voice.lang.toLowerCase();
  const targetLang = toSpeechLangCode(languageCode).toLowerCase();
  const targetBase = targetLang.split("-")[0];
  return (
    voiceLang === targetLang ||
    voiceLang === targetBase ||
    voiceLang.startsWith(`${targetBase}-`)
  );
}

function selectBrowserVoiceForLanguage(
  voices: SpeechSynthesisVoice[],
  browserVoiceURI: string | null,
  languageCode: string
): SpeechSynthesisVoice | null {
  const selectedByURI = browserVoiceURI
    ? voices.find((voice) => voice.voiceURI === browserVoiceURI)
    : null;
  if (selectedByURI) {
    return selectedByURI;
  }

  const targetFemaleVoice = voices.find(
    (voice) =>
      voiceMatchesLanguage(voice, languageCode) &&
      femaleVoicePattern.test(voice.name)
  );
  if (targetFemaleVoice) {
    return targetFemaleVoice;
  }

  const targetVoice = voices.find((voice) =>
    voiceMatchesLanguage(voice, languageCode)
  );
  if (targetVoice) {
    return targetVoice;
  }

  return selectPreferredFemaleVoice(voices);
}

function parseElevenLabsErrorMessage(detailsRaw: string): string {
  if (!detailsRaw.trim()) {
    return "";
  }

  try {
    const details = JSON.parse(detailsRaw);
    const detail = details?.detail;
    if (typeof detail?.message === "string" && detail.message.trim()) {
      return detail.message.trim();
    }
  } catch (_error) {
    // no-op
  }

  return detailsRaw.trim();
}

function parseElevenLabsErrorStatus(detailsRaw: string): string {
  if (!detailsRaw.trim()) {
    return "";
  }

  try {
    const details = JSON.parse(detailsRaw);
    return typeof details?.detail?.status === "string" ? details.detail.status : "";
  } catch (_error) {
    return "";
  }
}

function formatResetDateLabel(resetUnix: number): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "medium"
  }).format(new Date(resetUnix * 1000));
}

function formatCountdownLabel(remainingMs: number): { clock: string; hours: string } {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return {
    clock: `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
    hours: (remainingMs / 3_600_000).toFixed(2)
  };
}

class ElevenLabsQuotaExceededError extends Error {
  resetUnix: number | null;

  constructor(resetUnix: number | null) {
    super("Sem creditos no ElevenLabs.");
    this.name = "ElevenLabsQuotaExceededError";
    this.resetUnix = resetUnix;
  }
}

export default function App() {
  const [biography, setBiography] = useState<Biography | null>(null);
  const [error, setError] = useState<string>("");
  const [runtimeMessage, setRuntimeMessage] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [elevenLabsResetUnix, setElevenLabsResetUnix] = useState<number | null>(
    null
  );
  const [countdownNowMs, setCountdownNowMs] = useState(() => Date.now());
  const [speechSettings, setSpeechSettings] =
    useState<SpeechSettings>(defaultSpeechSettings);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const requestAbortRef = useRef<AbortController | null>(null);
  const speechSessionRef = useRef(0);

  useEffect(() => {
    async function loadBiography() {
      try {
        const apiResponse = await fetch(apiUrl("/api/biography"));
        if (apiResponse.ok) {
          const apiData: Biography = await apiResponse.json();
          setBiography(apiData);
          return;
        }

        const staticResponse = await fetch(`${import.meta.env.BASE_URL}biography.json`);
        if (!staticResponse.ok) {
          throw new Error("Nao foi possivel carregar a biografia.");
        }

        const staticData: Biography = await staticResponse.json();
        setBiography(staticData);
      } catch (loadError) {
        const message =
          loadError instanceof Error ? loadError.message : "Erro inesperado.";
        setError(message);
      }
    }

    loadBiography();
  }, []);

  useEffect(() => {
    setIsSpeechSupported(
      typeof window !== "undefined" && "speechSynthesis" in window
    );
  }, []);

  useEffect(() => {
    if (!isSpeechSupported || typeof window === "undefined") {
      return;
    }

    const synthesis = window.speechSynthesis;

    function refreshBrowserVoices() {
      const voices = synthesis.getVoices();
      setBrowserVoices(voices);

      setSpeechSettings((previous) => {
        if (previous.browserVoiceURI) {
          return previous;
        }

        const preferred = selectPreferredFemaleVoice(voices);
        if (!preferred) {
          return previous;
        }

        return {
          ...previous,
          browserVoiceURI: preferred.voiceURI
        };
      });
    }

    refreshBrowserVoices();
    synthesis.addEventListener("voiceschanged", refreshBrowserVoices);
    return () => {
      synthesis.removeEventListener("voiceschanged", refreshBrowserVoices);
    };
  }, [isSpeechSupported]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      requestAbortRef.current?.abort();
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.stop();
        } catch (_error) {
          // no-op
        }
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!elevenLabsResetUnix || typeof window === "undefined") {
      return;
    }

    const interval = window.setInterval(() => {
      setCountdownNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [elevenLabsResetUnix]);

  const speechSegments = useMemo(() => buildSpeechSegments(biography), [biography]);
  const fullBiographyText = useMemo(
    () => speechSegments.join(" "),
    [speechSegments]
  );
  const quotaCountdown = useMemo(() => {
    if (!elevenLabsResetUnix) {
      return null;
    }

    const remainingMs = Math.max(0, elevenLabsResetUnix * 1000 - countdownNowMs);
    const countdown = formatCountdownLabel(remainingMs);
    return {
      resetLabel: formatResetDateLabel(elevenLabsResetUnix),
      clock: countdown.clock,
      hours: countdown.hours
    };
  }, [countdownNowMs, elevenLabsResetUnix]);

  function nextSpeechSessionId() {
    speechSessionRef.current += 1;
    return speechSessionRef.current;
  }

  function isSpeechSessionActive(sessionId: number) {
    return speechSessionRef.current === sessionId;
  }

  function updateSpeechSettings(patch: Partial<SpeechSettings>) {
    const changesSpeechPipeline =
      typeof patch.engine !== "undefined" ||
      typeof patch.languageCode !== "undefined" ||
      typeof patch.elevenVoiceId !== "undefined" ||
      typeof patch.browserVoiceURI !== "undefined";
    const shouldResetBrowserVoice =
      typeof patch.languageCode !== "undefined" &&
      typeof patch.browserVoiceURI === "undefined";

    if (changesSpeechPipeline && (isSpeaking || isGeneratingSpeech)) {
      stopSpeech();
      setRuntimeMessage(
        "Leitura interrompida para aplicar a nova configuracao de voz."
      );
    }
    if (changesSpeechPipeline) {
      setElevenLabsResetUnix(null);
    }

    setSpeechSettings((previous) => ({
      ...previous,
      ...patch,
      browserVoiceURI: shouldResetBrowserVoice
        ? null
        : typeof patch.browserVoiceURI === "undefined"
          ? previous.browserVoiceURI
          : patch.browserVoiceURI
    }));
  }

  function cleanupAudioPlayback(options?: { abortRequest?: boolean }) {
    if (options?.abortRequest ?? true) {
      requestAbortRef.current?.abort();
      requestAbortRef.current = null;
    }

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (_error) {
        // no-op
      }
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
  }

  async function fetchElevenLabsSubscriptionResetUnix(): Promise<number | null> {
    try {
      const response = await fetch(apiUrl("/api/elevenlabs/subscription"));
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        return null;
      }

      return typeof payload?.nextCharacterCountResetUnix === "number"
        ? payload.nextCharacterCountResetUnix
        : null;
    } catch (_error) {
      return null;
    }
  }

  async function requestElevenLabsAudio(
    text: string,
    signal: AbortSignal,
    settingsSnapshot: { elevenVoiceId: string; languageCode: string }
  ): Promise<ArrayBuffer> {
    const response = await fetch(apiUrl("/api/elevenlabs/speech"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text,
        voiceId: settingsSnapshot.elevenVoiceId,
        languageCode: settingsSnapshot.languageCode
      }),
      signal
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const detailStatus =
        typeof payload?.details === "string"
          ? parseElevenLabsErrorStatus(payload.details)
          : "";
      const providerDetails =
        typeof payload?.details === "string"
          ? parseElevenLabsErrorMessage(payload.details)
          : "";

      if (detailStatus === "quota_exceeded") {
        const resetUnixFromSpeech =
          typeof payload?.nextCharacterCountResetUnix === "number"
            ? payload.nextCharacterCountResetUnix
            : null;
        const resetUnix =
          resetUnixFromSpeech ?? (await fetchElevenLabsSubscriptionResetUnix());
        throw new ElevenLabsQuotaExceededError(resetUnix);
      }

      throw new Error(
        [
          typeof payload?.error === "string"
            ? payload.error
            : "Falha ao gerar leitura no ElevenLabs.",
          providerDetails
        ]
          .filter(Boolean)
          .join(" ")
      );
    }

    return response.arrayBuffer();
  }

  async function playDecodedAudioBuffer(
    context: AudioContext,
    audioArrayBuffer: ArrayBuffer,
    signal: AbortSignal
  ) {
    const decodedBuffer = await context.decodeAudioData(audioArrayBuffer.slice(0));
    if (signal.aborted) {
      return;
    }

    await new Promise<void>((resolve) => {
      const source = context.createBufferSource();
      source.buffer = decodedBuffer;
      source.connect(context.destination);
      sourceNodeRef.current = source;

      const finalize = () => {
        signal.removeEventListener("abort", handleAbort);
        source.onended = null;
        source.disconnect();
        if (sourceNodeRef.current === source) {
          sourceNodeRef.current = null;
        }
        resolve();
      };

      const handleAbort = () => {
        try {
          source.stop();
        } catch (_error) {
          // no-op
        }
        finalize();
      };

      source.onended = finalize;
      signal.addEventListener("abort", handleAbort, { once: true });
      source.start(0);
    });
  }

  async function ensureAudioContext() {
    if (typeof window === "undefined") {
      throw new Error("AudioContext indisponivel neste ambiente.");
    }

    const Ctx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) {
      throw new Error("Seu navegador nao suporta AudioContext.");
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new Ctx();
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }

  function stopSpeech() {
    nextSpeechSessionId();
    setIsGeneratingSpeech(false);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    cleanupAudioPlayback();
    setIsSpeaking(false);
  }

  function speakWithBrowser(
    text: string,
    sessionId: number,
    settingsSnapshot: { browserVoiceURI: string | null; languageCode: string }
  ) {
    if (!isSpeechSupported || typeof window === "undefined") {
      return;
    }

    const chunks = splitTextForBrowserSpeech(text);
    if (chunks.length === 0) {
      return;
    }

    const synthesis = window.speechSynthesis;
    const voices = synthesis.getVoices();
    let activeVoice = selectBrowserVoiceForLanguage(
      voices,
      settingsSnapshot.browserVoiceURI,
      settingsSnapshot.languageCode
    );
    let retriedWithAutomaticVoice = false;
    const fallbackLang = toSpeechLangCode(settingsSnapshot.languageCode);

    const speakChunk = (index: number) => {
      if (!isSpeechSessionActive(sessionId)) {
        return;
      }

      if (index >= chunks.length) {
        setIsSpeaking(false);
        return;
      }

      let isChunkFinished = false;
      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      if (activeVoice) {
        utterance.voice = activeVoice;
        utterance.lang = activeVoice.lang;
      } else {
        utterance.lang = fallbackLang;
      }
      utterance.rate = 1;
      const watchdog = window.setTimeout(() => {
        if (isChunkFinished || !isSpeechSessionActive(sessionId)) {
          return;
        }

        synthesis.cancel();
        if (settingsSnapshot.browserVoiceURI && !retriedWithAutomaticVoice) {
          retriedWithAutomaticVoice = true;
          activeVoice = selectBrowserVoiceForLanguage(
            synthesis.getVoices(),
            null,
            settingsSnapshot.languageCode
          );
          window.setTimeout(() => speakChunk(index), 120);
          return;
        }

        setRuntimeMessage(
          "Falha na leitura por voz do navegador. Tente outro navegador ou ElevenLabs."
        );
        setIsSpeaking(false);
      }, 15000);

      utterance.onend = () => {
        isChunkFinished = true;
        window.clearTimeout(watchdog);
        if (!isSpeechSessionActive(sessionId)) {
          return;
        }

        window.setTimeout(() => speakChunk(index + 1), 10);
      };
      utterance.onerror = () => {
        isChunkFinished = true;
        window.clearTimeout(watchdog);
        if (!isSpeechSessionActive(sessionId)) {
          return;
        }

        synthesis.cancel();
        if (settingsSnapshot.browserVoiceURI && !retriedWithAutomaticVoice) {
          retriedWithAutomaticVoice = true;
          activeVoice = selectBrowserVoiceForLanguage(
            synthesis.getVoices(),
            null,
            settingsSnapshot.languageCode
          );
          window.setTimeout(() => speakChunk(index), 120);
          return;
        }

        setRuntimeMessage(
          "Falha na leitura por voz do navegador. Tente outro navegador ou ElevenLabs."
        );
        setIsSpeaking(false);
      };

      synthesis.resume();
      synthesis.speak(utterance);
    };

    synthesis.cancel();
    synthesis.resume();
    setIsSpeaking(true);
    speakChunk(0);
  }

  async function speakWithElevenLabs(
    segments: string[],
    sessionId: number,
    settingsSnapshot: { elevenVoiceId: string; languageCode: string }
  ): Promise<boolean> {
    if (!settingsSnapshot.elevenVoiceId) {
      return false;
    }

    const sanitizedSegments = segments
      .map((segment) => segment.trim())
      .filter(Boolean);
    if (sanitizedSegments.length === 0) {
      return false;
    }

    cleanupAudioPlayback();
    const controller = new AbortController();
    requestAbortRef.current = controller;
    setIsGeneratingSpeech(true);
    setIsSpeaking(true);

    try {
      const context = await ensureAudioContext();
      let nextAudioRequest: Promise<ArrayBuffer> | null = requestElevenLabsAudio(
        sanitizedSegments[0],
        controller.signal,
        settingsSnapshot
      );

      for (let index = 0; index < sanitizedSegments.length; index += 1) {
        if (
          controller.signal.aborted ||
          !nextAudioRequest ||
          !isSpeechSessionActive(sessionId)
        ) {
          return false;
        }

        const currentAudio = await nextAudioRequest;
        const hasNext = index + 1 < sanitizedSegments.length;
        nextAudioRequest = hasNext
          ? requestElevenLabsAudio(
              sanitizedSegments[index + 1],
              controller.signal,
              settingsSnapshot
            )
          : null;

        if (index === 0) {
          if (!isSpeechSessionActive(sessionId)) {
            return false;
          }
          setIsGeneratingSpeech(false);
        }

        await playDecodedAudioBuffer(context, currentAudio, controller.signal);
      }

      if (!isSpeechSessionActive(sessionId)) {
        return false;
      }
      setIsSpeaking(false);
      return true;
    } catch (speechError) {
      if (controller.signal.aborted || !isSpeechSessionActive(sessionId)) {
        return false;
      }

      if (speechError instanceof ElevenLabsQuotaExceededError) {
        setElevenLabsResetUnix(speechError.resetUnix);
        setRuntimeMessage("");
        cleanupAudioPlayback({ abortRequest: false });
        setIsSpeaking(false);
        return false;
      }

      setRuntimeMessage(
        speechError instanceof Error
          ? speechError.message
          : "Erro ao usar voz do ElevenLabs."
      );
      setElevenLabsResetUnix(null);
      cleanupAudioPlayback({ abortRequest: false });
      setIsSpeaking(false);
      return false;
    } finally {
      if (requestAbortRef.current === controller) {
        requestAbortRef.current = null;
      }

      if (isSpeechSessionActive(sessionId)) {
        setIsGeneratingSpeech(false);
      }
    }
  }

  function toggleSpeech() {
    if (isSpeaking) {
      stopSpeech();
      return;
    }

    if (!fullBiographyText) {
      return;
    }

    setRuntimeMessage("");
    setElevenLabsResetUnix(null);
    if (speechSettings.engine === "elevenlabs") {
      if (!speechSettings.elevenVoiceId) {
        setRuntimeMessage("Selecione uma voz do ElevenLabs para iniciar a leitura.");
        return;
      }

      const sessionId = nextSpeechSessionId();
      const settingsSnapshot = {
        elevenVoiceId: speechSettings.elevenVoiceId,
        languageCode: speechSettings.languageCode
      };

      void (async () => {
        await speakWithElevenLabs(speechSegments, sessionId, settingsSnapshot);
      })();
      return;
    }

    const sessionId = nextSpeechSessionId();
    const settingsSnapshot = {
      browserVoiceURI: speechSettings.browserVoiceURI,
      languageCode: speechSettings.languageCode
    };
    speakWithBrowser(fullBiographyText, sessionId, settingsSnapshot);
  }

  const canSpeak =
    !!biography &&
    !error &&
    (speechSettings.engine === "browser"
      ? isSpeechSupported
      : Boolean(speechSettings.elevenVoiceId));

  return (
    <div id="inicio">
      <Header
        isSpeaking={isSpeaking}
        isSpeechEnabled={canSpeak}
        onToggleSpeech={toggleSpeech}
      />

      {quotaCountdown && (
        <section className="status-message quota-countdown" aria-live="polite">
          <p className="quota-title">Data da recarga: {quotaCountdown.resetLabel}</p>
          <p className="quota-timer">{quotaCountdown.clock}</p>
          <p className="quota-note">
            Faltam {quotaCountdown.hours} horas para a recarga dos creditos.
          </p>
        </section>
      )}
      {!quotaCountdown && runtimeMessage && (
        <p className="status-message">Aviso: {runtimeMessage}</p>
      )}
      {isGeneratingSpeech && (
        <p className="status-message">Gerando audio no ElevenLabs...</p>
      )}

      <AppRoutes
        biography={biography}
        error={error}
        profile={floatingProfile}
        speechSettings={speechSettings}
        onUpdateSpeechSettings={updateSpeechSettings}
        browserVoices={browserVoices}
        isSpeechSupported={isSpeechSupported}
        isSpeechBusy={isSpeaking || isGeneratingSpeech}
      />

      <Footer projectName={projectName} />
    </div>
  );
}
