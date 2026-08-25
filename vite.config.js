import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        const error = new Error("payload too large");
        error.code = "TOO_LARGE";
        reject(error);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function leadApiPlugin() {
  return {
    name: "curbquote-lead-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split("?")[0];
        if (path !== "/api/lead") {
          next();
          return;
        }

        const { handleLeadRequest, MAX_BODY_BYTES } = await import("./api/lead.js");
        let raw = "";
        try {
          raw = await readBody(req, MAX_BODY_BYTES);
        } catch (error) {
          const tooLarge = error?.code === "TOO_LARGE";
          res.statusCode = tooLarge ? 413 : 400;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              ok: false,
              error: tooLarge ? "Request too large." : "Could not read body.",
            }),
          );
          return;
        }

        let body = {};
        try {
          body = raw ? JSON.parse(raw) : {};
        } catch {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: false, error: "JSON body required." }));
          return;
        }

        const result = await handleLeadRequest({
          method: req.method,
          origin: req.headers.origin,
          host: req.headers.host,
          contentLength: req.headers["content-length"] || Buffer.byteLength(raw),
          body,
          env: process.env,
        });
        res.statusCode = result.status;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(result.json));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), leadApiPlugin()],
});
