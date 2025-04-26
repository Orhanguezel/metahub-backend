import { generateMeta as generateMetaInner } from "./generate";

export async function generateMeta() {
  try {
    await generateMetaInner();
  } catch (err) {
    console.error("❌ Meta generation failed:", err);
    process.exit(1);
  }
}
