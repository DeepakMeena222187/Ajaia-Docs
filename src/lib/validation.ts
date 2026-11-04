import { z } from "zod";

// Strips control characters (except newline/tab) that can break layouts or logs.
const clean = (s: string) => s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
const text = (min: number, max: number, label: string) =>
  z
    .string({ error: `${label} is required` })
    .transform(clean)
    .pipe(
      z
        .string()
        .trim()
        .min(min, `${label} must be at least ${min} characters`)
        .max(max, `${label} must be at most ${max} characters`),
    );

export const emailSchema = z
  .string({ error: "Email is required" })
  .trim()
  .toLowerCase()
  .max(254, "Email is too long")
  .pipe(z.email("Enter a valid email address"));

export const passwordSchema = z
  .string({ error: "Password is required" })
  .min(10, "Password must be at least 10 characters")
  .max(128, "Password must be at most 128 characters");

export const signupSchema = z.object({
  name: text(2, 60, "Name"),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(128, "Invalid credentials"),
});

export const changePasswordSchema = z.object({
  current: z.string().min(1, "Current password is required").max(128),
  password: passwordSchema,
});

export const shippingSchema = z.object({
  name: text(2, 80, "Full name"),
  phone: z
    .string()
    .trim()
    .transform((s) => s.replace(/[\s-]/g, "").replace(/^\+91/, ""))
    .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number")),
  address: text(10, 300, "Address"),
  city: text(2, 60, "City"),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit PIN code"),
  payment: z.enum(["cod", "upi_on_delivery"], { error: "Choose a payment method" }),
});

export const MAX_QTY_PER_LINE = 20;
export const MAX_CART_LINES = 30;

export const cartLineSchema = z.object({
  variantId: z.coerce.number().int().positive().max(2_147_483_647),
  qty: z.coerce.number().int().min(1).max(MAX_QTY_PER_LINE),
});

export const FORUM_CATEGORIES = ["Plant Care", "Pests & Problems", "Show Your Garden", "Shop & Orders", "General"] as const;

export const threadSchema = z.object({
  category: z.enum(FORUM_CATEGORIES, { error: "Choose a category" }),
  title: text(5, 120, "Title"),
  body: text(10, 5000, "Post"),
});

export const replySchema = z.object({
  body: text(2, 5000, "Reply"),
});

export const BOOKING_SERVICES = {
  consultation: "Video plant-care consultation (30 min)",
  nursery_visit: "Guided nursery visit (1 hr)",
  home_setup: "Home garden setup visit",
} as const;
export const BOOKING_SLOTS = ["10:00", "11:30", "14:00", "15:30", "17:00"] as const;

export const bookingSchema = z.object({
  service: z.enum(Object.keys(BOOKING_SERVICES) as [keyof typeof BOOKING_SERVICES], {
    error: "Choose a service",
  }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
  time: z.enum(BOOKING_SLOTS, { error: "Choose a time slot" }),
  notes: z
    .string()
    .optional()
    .default("")
    .transform(clean)
    .pipe(z.string().trim().max(500, "Notes must be at most 500 characters")),
});

export const imageUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine((s) => {
    if (s === "") return true;
    try {
      return new URL(s).protocol === "https:";
    } catch {
      return false;
    }
  }, "Image URL must be an https:// link");

export const plantSchema = z.object({
  name: text(2, 80, "Name"),
  scientific_name: text(2, 120, "Scientific name"),
  category: text(2, 40, "Category"),
  summary: text(10, 200, "Summary"),
  description: text(10, 3000, "Description"),
  benefits: z
    .string()
    .max(2000)
    .transform((s) =>
      clean(s)
        .split("\n")
        .map((b) => b.trim())
        .filter(Boolean)
        .slice(0, 10),
    ),
  light: text(2, 80, "Light"),
  water: text(2, 80, "Water"),
  difficulty: z.enum(["Easy", "Moderate", "Expert"]),
  art: z.enum(["monstera", "snake", "trailing", "flower", "palm", "leafy", "tree", "fern", "succulent", "cactus", "herb"]),
  hue: z.coerce.number().int().min(0).max(360),
  image_url: imageUrlSchema,
  pet_safe: z.boolean(),
  air_purifying: z.boolean(),
  featured: z.boolean(),
  active: z.boolean(),
});

/** First human-readable message from a failed parse. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
