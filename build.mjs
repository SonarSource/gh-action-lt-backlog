/*
 * Bundles each GitHub Action into a single self-contained file under dist/.
 *
 * Each action is `<Action>/Index.ts` (beside its `action.yml`). esbuild inlines
 * every dependency (@actions/*, @octokit/*, undici, tunnel, lib/*) so the
 * committed dist/<Action>/Index.cjs runs on its own, without node_modules.
 *
 * Output is CommonJS (.cjs) so the CJS deps (undici, tunnel) need no ESM interop
 * shims and the file runs regardless of the repo's "type": "module".
 *
 * Note: esbuild does NOT type-check — `npm run build` runs `tsc --noEmit` first.
 */
import { build } from "esbuild";
import { readdirSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

if (process.argv.includes("--clean")) {
  rmSync("dist", { recursive: true, force: true });
  console.log("Removed dist/");
  process.exit(0);
}

// Discover action entry points: top-level dirs with both action.yml and Index.ts.
const entryPoints = readdirSync(".", { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .filter((name) => existsSync(join(name, "action.yml")) && existsSync(join(name, "Index.ts")))
  .map((name) => join(name, "Index.ts"));

if (entryPoints.length === 0) {
  console.error("No action entry points found (expected <Action>/Index.ts beside action.yml).");
  process.exit(1);
}

console.log(`Bundling ${entryPoints.length} action(s):`);
for (const e of entryPoints) console.log(`  ${e}`);

await build({
  entryPoints,
  bundle: true,
  platform: "node",
  target: "node24",
  format: "cjs",
  outdir: "dist",
  outbase: ".",
  outExtension: { ".js": ".cjs" },
  sourcemap: true,
  logLevel: "info",
});

console.log("Done.");
