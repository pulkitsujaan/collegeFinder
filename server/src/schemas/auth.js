import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('That does not look like an email address.').max(200),
  // Eight characters is the floor, not a policy. No composition rules: they
  // push people towards "Password1!" and away from passphrases.
  password: z.string().min(8, 'Use at least 8 characters.').max(200),
  name: z.string().trim().max(120).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('That does not look like an email address.'),
  password: z.string().min(1, 'Enter your password.').max(200),
});

export const shortlistSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers and hyphens.'),
});

export default { registerSchema, loginSchema, shortlistSchema };
