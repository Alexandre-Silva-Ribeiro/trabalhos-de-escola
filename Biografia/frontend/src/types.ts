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
