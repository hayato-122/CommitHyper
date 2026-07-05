import { z } from "zod";

export const SelectRepoSchema = z.object({
  githubRepoId: z.number().int().positive(),
  name: z.string().min(1),
  owner: z.string().min(1),
  fullName: z.string().min(1),
  isPrivate: z.boolean().optional(),
});

export const ImproveMessageSchema = z.object({
  message: z.string().min(1).max(10000),
  branch: z.string().optional(),
});

export const CandidatesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  sortBy: z.enum(["score", "date"]).default("score"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
});

export const EvaluateCommitsQuerySchema = z.object({
  branch: z.string().optional(),
  refresh: z.coerce.boolean().default(false),
  limit: z.coerce.number().int().positive().max(500).default(200),
  status: z.coerce.boolean().default(false),
});
