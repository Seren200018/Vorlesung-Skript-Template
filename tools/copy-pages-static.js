import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const outDirArg = process.argv[2];
const distDir = path.resolve(root, outDirArg || "dist-pages");

const copyDir = async (source, target) => {
  await fs.mkdir(target, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) {
      await copyDir(from, to);
    } else {
      await fs.copyFile(from, to);
    }
  }
};

const main = async () => {
  const audioDir = path.resolve(root, "Audio");
  try {
    await copyDir(audioDir, path.join(distDir, "Audio"));
    console.log(`Copied Audio/ into ${path.relative(root, distDir)}/`);
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log("Audio/ not found; skipping static copy.");
      return;
    }
    throw error;
  }
};

main().catch((error) => {
  console.error("Static copy failed", error);
  process.exitCode = 1;
});
