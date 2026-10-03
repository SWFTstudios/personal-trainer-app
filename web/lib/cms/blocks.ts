import { z } from "zod";

/** Image sources: uploaded media (/media/...) or an absolute https URL. Never javascript:, data:, etc. */
export const imageUrl = z
  .string()
  .trim()
  .max(1000)
  .refine((v) => v === "" || /^\/media\/[\w./-]+$/.test(v) || /^https:\/\/[^\s"'<>]+$/.test(v), "Image must be uploaded media or an https URL");

const text = (max: number) => z.string().max(max).default("");
const id = z.string().min(1).max(64);

export const BlockSchema = z.discriminatedUnion("type", [
  z.object({ id, type: z.literal("hero"), heading: text(160), subheading: text(400), image_url: imageUrl.default(""), button_label: text(40) }),
  z.object({ id, type: z.literal("text"), heading: text(160), body: text(20_000) }),
  z.object({ id, type: z.literal("image"), image_url: imageUrl.default(""), alt: text(200), caption: text(300) }),
  z.object({ id, type: z.literal("services"), heading: text(160), intro: text(1000) }),
  z.object({
    id,
    type: z.literal("testimonials"),
    heading: text(160),
    items: z.array(z.object({ quote: text(1200), name: text(120) })).max(30).default([]),
  }),
  z.object({
    id,
    type: z.literal("faq"),
    heading: text(160),
    items: z.array(z.object({ question: text(300), answer: text(3000) })).max(50).default([]),
  }),
  z.object({ id, type: z.literal("cta"), heading: text(160), body: text(1000), button_label: text(40) }),
  z.object({
    id,
    type: z.literal("gallery"),
    heading: text(160),
    images: z.array(z.object({ url: imageUrl, alt: text(200) })).max(40).default([]),
  }),
  z.object({
    id,
    type: z.literal("videos"),
    heading: text(160),
    source: z.enum(["latest", "collection", "category"]).default("latest"),
    value: text(100),
    limit: z.number().int().min(1).max(24).default(6),
  }),
]);

export const BlocksSchema = z.array(BlockSchema).max(60);

export type Block = z.infer<typeof BlockSchema>;
export type BlockType = Block["type"];
export type BlockOf<T extends BlockType> = Extract<Block, { type: T }>;

export const BLOCK_LABELS: Record<BlockType, string> = {
  hero: "Hero banner",
  text: "Text",
  image: "Image",
  services: "Services & prices",
  testimonials: "Testimonials",
  faq: "FAQ",
  cta: "Book-now banner",
  gallery: "Photo gallery",
  videos: "Videos",
};

export function newBlock(type: BlockType): Block {
  const id = crypto.randomUUID();
  switch (type) {
    case "hero":
      return { id, type, heading: "Train with me", subheading: "", image_url: "", button_label: "Book a session" };
    case "text":
      return { id, type, heading: "", body: "" };
    case "image":
      return { id, type, image_url: "", alt: "", caption: "" };
    case "services":
      return { id, type, heading: "Sessions", intro: "" };
    case "testimonials":
      return { id, type, heading: "What clients say", items: [{ quote: "", name: "" }] };
    case "faq":
      return { id, type, heading: "Questions", items: [{ question: "", answer: "" }] };
    case "cta":
      return { id, type, heading: "Ready to start?", body: "", button_label: "Book now" };
    case "gallery":
      return { id, type, heading: "", images: [] };
    case "videos":
      return { id, type, heading: "Free training tips", source: "latest", value: "", limit: 6 };
  }
}

/** Starting layout for a trainer's home page, filled from their profile. */
export function defaultHomeBlocks(profile: { display_name: string | null; headline: string | null; bio: string | null; hero_image_url: string | null }): Block[] {
  const blocks: Block[] = [
    {
      ...(newBlock("hero") as BlockOf<"hero">),
      heading: profile.headline ?? profile.display_name ?? "Personal training",
      image_url: profile.hero_image_url ?? "",
    },
  ];
  if (profile.bio) blocks.push({ ...(newBlock("text") as BlockOf<"text">), heading: "About", body: profile.bio });
  blocks.push(newBlock("services"), newBlock("cta"));
  return blocks;
}

export const RESERVED_PAGE_PATHS = new Set(["book", "blog", "media", "app", "icon", "manifest.webmanifest"]);
export const PAGE_PATH_RE = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;
