import fs from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const certificatesDirectory = process.cwd();

export default defineConfig({
  plugins: [react()],

  server: {
    host: "0.0.0.0",
    port: 5173,

    https: {
      cert: fs.readFileSync(
        path.resolve(certificatesDirectory, "localhost+ip.pem"),
      ),
      key: fs.readFileSync(
        path.resolve(certificatesDirectory, "localhost+ip-key.pem"),
      ),
    },
  },
});
