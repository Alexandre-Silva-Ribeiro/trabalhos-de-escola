export type ThemeMode = "dark" | "light";
export type UserKey = "alexandre" | "iris";
export type TimelineType = "mensagem" | "encontro" | "momento" | "sistema";

export interface UserSummary {
  id: string;
  username: string;
  email: string;
  emailVerified?: boolean;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReciprocityRule {
  replyLimitHours: number;
  initiativeDays: number;
  expectedAction: string;
}

export interface TimelineEntry {
  id: string;
  type: TimelineType | string;
  actor: UserKey | "ambos" | "sistema";
  title: string;
  details: string;
  occurredAt: string;
  createdAt: string;
}

export interface QuestEntry {
  id: string;
  owner: UserKey;
  action: string;
  dueAt: string;
  done: boolean;
  createdAt: string;
  doneAt: string | null;
}

export interface NoteEntry {
  id: string;
  owner: UserKey;
  title: string;
  tags: string[];
  content: string;
  createdAt: string;
}

export interface CalendarEntry {
  id: string;
  date: string;
  mode: string;
  title: string;
  notes: string;
  done: boolean;
  createdAt: string;
}

export interface VaultData {
  version: number;
  createdAt: string;
  updatedAt: string;
  settings: {
    theme: ThemeMode;
    accent: string;
  };
  timeline: TimelineEntry[];
  reciprocityRules: {
    alexandre: ReciprocityRule;
    iris: ReciprocityRule;
  };
  quests: QuestEntry[];
  notes: NoteEntry[];
  calendar: CalendarEntry[];
}

export interface AuthPayload {
  token: string;
  user: UserSummary;
  vault: VaultData;
  themePreference: ThemeMode;
}

export interface RegisterPayload {
  ok: boolean;
  needsVerification: boolean;
  email: string;
  message: string;
}

export interface VaultPayload {
  vault: VaultData;
  updatedAt: string;
  themePreference?: ThemeMode;
}

export interface UserPreferencesPayload {
  themePreference: ThemeMode;
  updatedAt: string;
}
