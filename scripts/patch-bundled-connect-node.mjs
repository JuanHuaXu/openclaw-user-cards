import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "node_modules", "@connectrpc", "connect-node", "package.json");

try {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.dependencies ??= {};
  if (manifest.dependencies.undici !== "8.5.0") {
    manifest.dependencies.undici = "8.5.0";
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  }
} catch (error) {
  if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
    process.exit(0);
  }
  throw error;
}
