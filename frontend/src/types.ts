export type BiographySection =
  | {
      type: "paragraph";
      content: string;
    }
  | {
      type: "image";
      src: string;
      alt: string;
    };

export interface Biography {
  title: string;
  intro: string;
  sections: BiographySection[];
}

export interface FloatingProfile {
  fullName: string;
  dates: string;
  quote: string;
  portrait: string;
}

export type SpeechEngine = "browser" | "elevenlabs";

export interface SpeechSettings {
  engine: SpeechEngine;
  languageCode: string;
  browserVoiceURI: string | null;
  elevenVoiceId: string | null;
  elevenVoiceName: string | null;
}

export interface ElevenVoice {
  voiceId: string;
  name: string;
  category: string;
  previewUrl: string;
  labels: Record<string, string>;
}
