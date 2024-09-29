require("esbuild").buildSync({
  entryPoints: ["src/index.ts"],
  bundle: true,
  minify: true,
  format: "esm",
  platform: "node",
  target: ["esnext"],
  loader: { ".html": "text" },
  tsconfig: "tsconfig.build.json",
  outfile: "dist/index.js",
});
