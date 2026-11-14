import fs from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const certificatesDirectory = process.cwd();

const certificatePath = path.resolve(certificatesDirectory, "localhost+ip.pem");

const certificateKeyPath = path.resolve(
  certificatesDirectory,
  "localhost+ip-key.pem",
);

const hasLocalCertificates =
  fs.existsSync(certificatePath) && fs.existsSync(certificateKeyPath);

const localHttps = hasLocalCertificates
  ? {
      cert: fs.readFileSync(certificatePath),
      key: fs.readFileSync(certificateKeyPath),
    }
  : undefined;

export default defineConfig({
  plugins: [react()],

  server: {
    host: "0.0.0.0",
    port: 5173,

    ...(localHttps ? { https: localHttps } : {}),
  },
});
