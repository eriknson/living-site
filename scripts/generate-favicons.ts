import sharp from "sharp";
import { readFileSync } from "fs";
import { join } from "path";

const publicDir = join(process.cwd(), "public");
const svgPath = join(publicDir, "favicon.svg");

async function generateFavicons() {
  const svg = readFileSync(svgPath);

  // Generate 32x32 favicon.png
  await sharp(svg).resize(32, 32).png().toFile(join(publicDir, "favicon.png"));
  console.log("Created favicon.png (32x32)");

  // Generate 180x180 apple-touch-icon.png
  const appleSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">
  <polygon points="124,90 107,119.4 73,119.4 56,90 73,60.6 107,60.6" fill="#1a1a1a"/>
</svg>`);

  await sharp(appleSvg)
    .resize(180, 180)
    .png()
    .toFile(join(publicDir, "apple-touch-icon.png"));
  console.log("Created apple-touch-icon.png (180x180)");

  // Generate OG image (1200x630)
  const ogSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f5f5f5"/>
  <polygon points="624,260 612,280.8 588,280.8 576,260 588,239.2 612,239.2" fill="#1a1a1a"/>
  <text x="600" y="360" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="48" font-weight="500" fill="#1a1a1a" text-anchor="middle">Erik's Website</text>
  <text x="600" y="410" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="20" fill="#666666" text-anchor="middle">A living site that regenerates daily</text>
</svg>`);

  await sharp(ogSvg).png().toFile(join(publicDir, "og-image.png"));
  console.log("Created og-image.png (1200x630)");

  console.log("Done!");
}

generateFavicons().catch(console.error);

