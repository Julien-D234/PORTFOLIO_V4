import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email().max(254),
  name: z.string().min(1).max(120),
});

export const welcomeSchema = z.object({
  token: z.string().min(1).max(128),
  password: z.string().min(1).max(256),
});
