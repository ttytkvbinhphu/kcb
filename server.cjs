var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_cors = __toESM(require("cors"), 1);
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use((0, import_cors.default)());
  app.use(import_express.default.json({ limit: "50mb" }));
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey ? new import_genai.GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  }) : null;
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });
  app.post("/api/document/fetch-url", async (req, res) => {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "Y\xEAu c\u1EA7u cung c\u1EA5p URL" });
    }
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36"
        }
      });
      if (!response.ok) {
        throw new Error(`L\u1ED7i t\u1EA3i trang: ${response.status} ${response.statusText}`);
      }
      const html = await response.text();
      let cleanText = html.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "").replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (cleanText.length > 15e4) {
        cleanText = cleanText.substring(0, 15e4) + "\n\n[N\u1ED9i dung \u0111\xE3 \u0111\u01B0\u1EE3c r\xFAt g\u1ECDn do qu\xE1 d\xE0i...]";
      }
      res.json({ text: cleanText });
    } catch (e) {
      console.error("Fetch URL failed:", e);
      res.status(500).json({ error: e.message || "Kh\xF4ng th\u1EC3 t\u1EA3i n\u1ED9i dung t\u1EEB li\xEAn k\u1EBFt n\xE0y." });
    }
  });
  app.post("/api/document/fetch-binary", async (req, res) => {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "Y\xEAu c\u1EA7u cung c\u1EA5p URL" });
    }
    try {
      let targetUrl = url.trim();
      if (targetUrl.includes("drive.google.com")) {
        let fileId = "";
        if (targetUrl.includes("/file/d/")) {
          const match = targetUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
          if (match && match[1]) fileId = match[1];
        } else if (targetUrl.includes("?id=")) {
          const match = targetUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
          if (match && match[1]) fileId = match[1];
        }
        if (fileId) {
          targetUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        }
      }
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36"
        }
      });
      if (!response.ok) {
        throw new Error(`L\u1ED7i t\u1EA3i t\u1EC7p: ${response.status} ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString("base64");
      res.json({ base64 });
    } catch (e) {
      console.error("Fetch binary failed:", e);
      res.status(500).json({ error: e.message || "Kh\xF4ng th\u1EC3 t\u1EA3i t\u1EC7p tin t\u1EEB li\xEAn k\u1EBFt n\xE0y." });
    }
  });
  app.post("/api/gemini/generate", async (req, res) => {
    if (!ai) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
    }
    const { model, contents, config } = req.body;
    let selectedModel = model || "gemini-3.5-flash";
    if (selectedModel === "gemini-3-flash-preview") {
      selectedModel = "gemini-3.5-flash";
    }
    const maxRetries = 3;
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: selectedModel,
          contents,
          config
        });
        return res.json({ text: response.text });
      } catch (error) {
        lastError = error;
        console.warn(`Gemini API attempt ${attempt} failed with error:`, error.message || error);
        const isTransient = error.message?.includes("503") || error.message?.includes("UNAVAILABLE") || error.message?.includes("429") || error.message?.includes("RESOURCE_EXHAUSTED") || error.status === 503 || error.status === 429;
        if (isTransient && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1e3;
          console.log(`Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          if (isTransient && attempt === maxRetries && selectedModel !== "gemini-3.5-flash") {
            try {
              console.log("Attempting last-ditch fallback to gemini-3.5-flash...");
              const fallbackResponse = await ai.models.generateContent({
                model: "gemini-3.5-flash",
                contents,
                config
              });
              return res.json({ text: fallbackResponse.text });
            } catch (fallbackError) {
              lastError = fallbackError;
            }
          }
          break;
        }
      }
    }
    console.error("Gemini Error after retries:", lastError);
    res.status(503).json({
      error: lastError?.message || "Model is currently experiencing high demand. Spikes in demand are temporary, please try again."
    });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
