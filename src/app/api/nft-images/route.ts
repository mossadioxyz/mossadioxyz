import { readdir } from "fs/promises";
import { join } from "path";

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"]);

export const dynamic = "force-dynamic";

export async function GET() {
  const dir = join(process.cwd(), "public", "images", "nft-preview");

  try {
    const files = await readdir(dir);
    const images = files
      .filter((f) => {
        const ext = f.split(".").pop()?.toLowerCase() ?? "";
        return IMAGE_EXTENSIONS.has(ext);
      })
      .sort()
      .map((f) => `/images/nft-preview/${encodeURIComponent(f)}`);

    return Response.json(images);
  } catch {
    return Response.json([]);
  }
}
