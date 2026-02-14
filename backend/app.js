const express = require("express");
const cors = require("cors");
const path = require("path");
const biography = require("./data/biography");

require("dotenv").config({ path: path.resolve(process.cwd(), ".env") });
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 3001;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io";

app.use(cors());
app.use(express.json({ limit: "1mb" }));

function parseElevenLabsDetailStatus(detailsRaw) {
  if (typeof detailsRaw !== "string" || !detailsRaw.trim()) {
    return "";
  }

  try {
    const parsed = JSON.parse(detailsRaw);
    return typeof parsed?.detail?.status === "string"
      ? parsed.detail.status
      : "";
  } catch (_error) {
    return "";
  }
}

async function fetchElevenLabsSubscriptionSummary() {
  const response = await fetch(`${ELEVENLABS_BASE_URL}/v1/user/subscription`, {
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY
    }
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `subscription_request_failed:${response.status}:${details || "unknown"}`
    );
  }

  const data = await response.json();
  return {
    nextCharacterCountResetUnix:
      typeof data?.next_character_count_reset_unix === "number"
        ? data.next_character_count_reset_unix
        : null,
    characterCount:
      typeof data?.character_count === "number" ? data.character_count : null,
    characterLimit:
      typeof data?.character_limit === "number" ? data.character_limit : null
  };
}

// Endpoint principal consumido pelo frontend para renderizar a biografia completa.
app.get("/api/biography", (_req, res) => {
  res.json(biography);
});

app.get("/api/elevenlabs/voices", async (_req, res) => {
  if (!ELEVENLABS_API_KEY) {
    res.status(503).json({
      error:
        "Configure ELEVENLABS_API_KEY no backend para listar vozes do ElevenLabs."
    });
    return;
  }

  try {
    const headers = {
      "xi-api-key": ELEVENLABS_API_KEY
    };

    const voices = [];
    let nextPageToken = null;
    let hasMore = true;

    while (hasMore) {
      const params = new URLSearchParams({
        show_legacy: "true",
        page_size: "100"
      });
      if (nextPageToken) {
        params.set("next_page_token", nextPageToken);
      }

      const response = await fetch(
        `${ELEVENLABS_BASE_URL}/v1/voices?${params.toString()}`,
        { headers }
      );

      if (!response.ok) {
        const details = await response.text();
        res.status(response.status).json({
          error: "Falha ao consultar vozes do ElevenLabs.",
          details
        });
        return;
      }

      const data = await response.json();
      const currentVoices = Array.isArray(data?.voices) ? data.voices : [];

      voices.push(
        ...currentVoices.map((voice) => ({
          voiceId: voice.voice_id,
          name: voice.name,
          category: voice.category ?? "",
          previewUrl: voice.preview_url ?? "",
          labels:
            voice.labels && typeof voice.labels === "object" ? voice.labels : {}
        }))
      );

      nextPageToken =
        typeof data?.next_page_token === "string" ? data.next_page_token : null;
      hasMore = Boolean(nextPageToken);
    }

    res.json({ voices });
  } catch (error) {
    res.status(500).json({
      error: "Erro inesperado ao listar vozes do ElevenLabs.",
      details: error instanceof Error ? error.message : "unknown_error"
    });
  }
});

app.get("/api/elevenlabs/subscription", async (_req, res) => {
  if (!ELEVENLABS_API_KEY) {
    res.status(503).json({
      error:
        "Configure ELEVENLABS_API_KEY no backend para consultar assinatura do ElevenLabs."
    });
    return;
  }

  try {
    const summary = await fetchElevenLabsSubscriptionSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({
      error: "Erro inesperado ao consultar assinatura do ElevenLabs.",
      details: error instanceof Error ? error.message : "unknown_error"
    });
  }
});

app.post("/api/elevenlabs/speech", async (req, res) => {
  if (!ELEVENLABS_API_KEY) {
    res.status(503).json({
      error:
        "Configure ELEVENLABS_API_KEY no backend para gerar audio do ElevenLabs."
    });
    return;
  }

  const { text, voiceId, languageCode } = req.body ?? {};
  if (typeof text !== "string" || text.trim().length === 0) {
    res.status(400).json({ error: "Texto invalido." });
    return;
  }

  if (text.length > 15000) {
    res.status(400).json({ error: "Texto muito longo. Limite: 15000 caracteres." });
    return;
  }

  if (typeof voiceId !== "string" || voiceId.trim().length === 0) {
    res.status(400).json({ error: "voiceId invalido." });
    return;
  }

  try {
    const modelCandidates = ["eleven_flash_v2_5", "eleven_multilingual_v2"];
    let response = null;
    let lastErrorDetails = "";

    for (const modelId of modelCandidates) {
      const payload = {
        text,
        model_id: modelId,
        language_code: typeof languageCode === "string" ? languageCode : "pt"
      };

      const currentResponse = await fetch(
        `${ELEVENLABS_BASE_URL}/v1/text-to-speech/${encodeURIComponent(
          voiceId
        )}?output_format=mp3_44100_128&optimize_streaming_latency=3`,
        {
          method: "POST",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
            Accept: "audio/mpeg"
          },
          body: JSON.stringify(payload)
        }
      );

      if (currentResponse.ok) {
        response = currentResponse;
        break;
      }

      lastErrorDetails = await currentResponse.text();
      const detailStatus = parseElevenLabsDetailStatus(lastErrorDetails);
      if (detailStatus === "quota_exceeded") {
        const subscription = await fetchElevenLabsSubscriptionSummary().catch(
          () => null
        );
        res.status(429).json({
          error: "Falha ao gerar audio no ElevenLabs.",
          details: lastErrorDetails,
          nextCharacterCountResetUnix:
            subscription?.nextCharacterCountResetUnix ?? null
        });
        return;
      }

      if (currentResponse.status !== 400 && currentResponse.status !== 422) {
        res.status(currentResponse.status).json({
          error: "Falha ao gerar audio no ElevenLabs.",
          details: lastErrorDetails
        });
        return;
      }
    }

    if (!response) {
      const detailStatus = parseElevenLabsDetailStatus(lastErrorDetails);
      if (detailStatus === "quota_exceeded") {
        const subscription = await fetchElevenLabsSubscriptionSummary().catch(
          () => null
        );
        res.status(429).json({
          error: "Falha ao gerar audio no ElevenLabs.",
          details: lastErrorDetails,
          nextCharacterCountResetUnix:
            subscription?.nextCharacterCountResetUnix ?? null
        });
        return;
      }

      res.status(422).json({
        error: "Falha ao gerar audio no ElevenLabs.",
        details: lastErrorDetails || "Nenhum modelo de voz disponivel."
      });
      return;
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", String(audioBuffer.length));
    res.setHeader("Cache-Control", "no-store");
    res.send(audioBuffer);
  } catch (error) {
    res.status(500).json({
      error: "Erro inesperado ao sintetizar audio no ElevenLabs.",
      details: error instanceof Error ? error.message : "unknown_error"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend disponivel em http://localhost:${PORT}`);
});
