import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import cors from "cors";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey ? new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  }) : null;

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/document/fetch-url", async (req, res) => {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "Yêu cầu cung cấp URL" });
    }
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36",
        },
      });
      if (!response.ok) {
        throw new Error(`Lỗi tải trang: ${response.status} ${response.statusText}`);
      }
      const html = await response.text();
      
      // Basic text extraction from HTML to prevent overhead, scripts, and styling tags
      let cleanText = html
        .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
        .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ') // Strip all HTML tags
        .replace(/\s+/g, ' ')     // Collapse whitespace
        .trim();
        
      if (cleanText.length > 150000) {
        cleanText = cleanText.substring(0, 150000) + "\n\n[Nội dung đã được rút gọn do quá dài...]";
      }
      
      res.json({ text: cleanText });
    } catch (e: any) {
      console.error("Fetch URL failed:", e);
      res.status(500).json({ error: e.message || "Không thể tải nội dung từ liên kết này." });
    }
  });

  app.post("/api/document/fetch-binary", async (req, res) => {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "Yêu cầu cung cấp URL" });
    }
    try {
      let targetUrl = url.trim();
      
      // Automatically normalize Google Drive files for raw download
      if (targetUrl.includes('drive.google.com')) {
        let fileId = "";
        if (targetUrl.includes('/file/d/')) {
          const match = targetUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
          if (match && match[1]) fileId = match[1];
        } else if (targetUrl.includes('?id=')) {
          const match = targetUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
          if (match && match[1]) fileId = match[1];
        }
        if (fileId) {
          targetUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        }
      }

      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36",
        },
      });
      
      if (!response.ok) {
        throw new Error(`Lỗi tải tệp: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      res.json({ base64 });
    } catch (e: any) {
      console.error("Fetch binary failed:", e);
      res.status(500).json({ error: e.message || "Không thể tải tệp tin từ liên kết này." });
    }
  });

  app.post("/api/gemini/generate", async (req, res) => {
    if (!ai) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
    }

    const { model, contents, config } = req.body;
    let selectedModel = model || "gemini-3.5-flash";

    // Map any legacy or overloaded models to the robust stable recommended gemini-3.5-flash
    if (selectedModel === "gemini-3-flash-preview") {
      selectedModel = "gemini-3.5-flash";
    }

    const maxRetries = 3;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: selectedModel,
          contents,
          config
        });
        
        return res.json({ text: response.text });
      } catch (error: any) {
        lastError = error;
        console.warn(`Gemini API attempt ${attempt} failed with error:`, error.message || error);
        
        const isTransient = error.message?.includes("503") || 
                            error.message?.includes("UNAVAILABLE") || 
                            error.message?.includes("429") ||
                            error.message?.includes("RESOURCE_EXHAUSTED") ||
                            error.status === 503 ||
                            error.status === 429;
                            
        if (isTransient && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // If error is code 503/429 or similar transient issue and we have exhausted retries for the requested model,
          // try a last-ditch attempt with gemini-3.5-flash
          if (isTransient && attempt === maxRetries && selectedModel !== "gemini-3.5-flash") {
            try {
              console.log("Attempting last-ditch fallback to gemini-3.5-flash...");
              const fallbackResponse = await ai.models.generateContent({
                model: "gemini-3.5-flash",
                contents,
                config
              });
              return res.json({ text: fallbackResponse.text });
            } catch (fallbackError: any) {
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
