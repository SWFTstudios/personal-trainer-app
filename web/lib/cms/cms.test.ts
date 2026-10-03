import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BlocksSchema, defaultHomeBlocks, newBlock } from "./blocks";
import { Markdown } from "./markdown";
import { sniffImage } from "./media";

const html = (source: string) => renderToStaticMarkup(Markdown({ source }));

describe("Markdown", () => {
  it("renders the supported subset", () => {
    expect(html("## Title\n\nHello **world** and *you*.\n\n- a\n- b\n\n1. one\n2. two")).toBe(
      "<h2>Title</h2><p>Hello <strong>world</strong> and <em>you</em>.</p><ul><li>a</li><li>b</li></ul><ol><li>one</li><li>two</li></ol>",
    );
  });

  it("escapes HTML and drops unsafe links", () => {
    const out = html('<script>alert(1)</script> [x](javascript:alert(1)) [ok](https://a.com)');
    expect(out).not.toContain("<script>");
    expect(out).toContain("&lt;script&gt;");
    expect(out).not.toContain("javascript:");
    expect(out).toContain('<a href="https://a.com" target="_blank" rel="noopener noreferrer">ok</a>');
  });
});

describe("blocks", () => {
  it("accepts every default block", () => {
    const blocks = (["hero", "text", "image", "services", "testimonials", "faq", "cta", "gallery"] as const).map(newBlock);
    expect(BlocksSchema.safeParse(blocks).success).toBe(true);
  });

  it("rejects unsafe image URLs and unknown types", () => {
    const hero = { ...newBlock("hero"), image_url: "javascript:alert(1)" };
    expect(BlocksSchema.safeParse([hero]).success).toBe(false);
    expect(BlocksSchema.safeParse([{ ...hero, image_url: "/media/t/abc.png" }]).success).toBe(true);
    expect(BlocksSchema.safeParse([{ id: "x", type: "html", html: "<b>" }]).success).toBe(false);
  });

  it("builds a home page from the trainer profile", () => {
    const blocks = defaultHomeBlocks({ display_name: "Jane", headline: null, bio: "Coach", hero_image_url: null });
    expect(blocks.map((b) => b.type)).toEqual(["hero", "text", "services", "cta"]);
    expect(blocks[0]).toMatchObject({ heading: "Jane" });
  });
});

describe("sniffImage", () => {
  const pad = (bytes: number[]) => new Uint8Array([...bytes, ...new Array(16).fill(0)]);
  it("detects by magic bytes", () => {
    expect(sniffImage(pad([0xff, 0xd8, 0xff]))?.type).toBe("image/jpeg");
    expect(sniffImage(pad([0x89, 0x50, 0x4e, 0x47]))?.ext).toBe("png");
    expect(sniffImage(pad([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))?.ext).toBe("webp");
  });
  it("rejects SVG and other files", () => {
    expect(sniffImage(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
  });
});
