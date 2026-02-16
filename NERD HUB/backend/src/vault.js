import { randomUUID } from "node:crypto";
import { z } from "zod";

const hexColor = /^#[0-9a-fA-F]{6}$/;

const ruleSchema = z.object({
  replyLimitHours: z.number().int().min(1).max(168),
  initiativeDays: z.number().int().min(1).max(30),
  expectedAction: z.string().min(1).max(180)
});

const timelineSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.string().min(1).max(40),
  actor: z.string().min(1).max(40),
  title: z.string().min(1).max(180),
  details: z.string().max(2000).default(""),
  occurredAt: z.string().min(8).max(60),
  createdAt: z.string().min(8).max(60)
});

const questSchema = z.object({
  id: z.string().min(1).max(64),
  owner: z.string().min(1).max(40),
  action: z.string().min(1).max(240),
  dueAt: z.string().min(8).max(60),
  done: z.boolean(),
  createdAt: z.string().min(8).max(60),
  doneAt: z.string().nullable().optional()
});

const noteSchema = z.object({
  id: z.string().min(1).max(64),
  owner: z.string().min(1).max(40),
  title: z.string().min(1).max(180),
  tags: z.array(z.string().min(1).max(40)).max(20),
  content: z.string().min(1).max(12000),
  createdAt: z.string().min(8).max(60)
});

const calendarSchema = z.object({
  id: z.string().min(1).max(64),
  date: z.string().min(8).max(40),
  mode: z.string().min(1).max(40),
  title: z.string().min(1).max(180),
  notes: z.string().max(1200),
  done: z.boolean(),
  createdAt: z.string().min(8).max(60)
});

const vaultSchema = z.object({
  version: z.number().int().min(1).max(20),
  createdAt: z.string().min(8).max(60),
  updatedAt: z.string().min(8).max(60),
  settings: z.object({
    theme: z.enum(["dark", "light"]),
    accent: z.string().regex(hexColor)
  }),
  timeline: z.array(timelineSchema).max(5000),
  reciprocityRules: z.object({
    alexandre: ruleSchema,
    iris: ruleSchema
  }),
  quests: z.array(questSchema).max(1000),
  notes: z.array(noteSchema).max(1000),
  calendar: z.array(calendarSchema).max(1000)
});

export function createDefaultVault() {
  const now = new Date();
  const boot = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const sync = new Date(now.getTime() - 10 * 60 * 1000).toISOString();

  return {
    version: 1,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    settings: {
      theme: "dark",
      accent: "#45a4ff"
    },
    timeline: [
      {
        id: randomUUID(),
        type: "mensagem",
        actor: "alexandre",
        title: "Boot da base NERD HUB",
        details: "Estrutura online inicializada.",
        occurredAt: boot,
        createdAt: boot
      },
      {
        id: randomUUID(),
        type: "momento",
        actor: "iris",
        title: "Vault sincronizado",
        details: "Agora com persistencia em backend.",
        occurredAt: sync,
        createdAt: sync
      }
    ],
    reciprocityRules: {
      alexandre: {
        replyLimitHours: 8,
        initiativeDays: 2,
        expectedAction: "Mandar update noturno curto"
      },
      iris: {
        replyLimitHours: 10,
        initiativeDays: 2,
        expectedAction: "Check-in rapido apos aulas"
      }
    },
    quests: [],
    notes: [],
    calendar: []
  };
}

export function sanitizeVaultInput(value) {
  const parsed = vaultSchema.safeParse(value);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(issue ? `invalid_vault:${issue.path.join(".")}` : "invalid_vault");
  }

  return {
    ...parsed.data,
    updatedAt: new Date().toISOString()
  };
}
