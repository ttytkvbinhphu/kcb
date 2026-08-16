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

  const normalizeAndValidateUrl = (inputUrl: string): string => {
    let url = inputUrl.trim();
    if (!url) return "";

    // If it's a raw Google Drive ID or matches alphanumeric layout without dots/slashes
    const driveIdRegex = /^[a-zA-Z0-9_-]{15,100}$/;
    if (driveIdRegex.test(url) && !url.includes('.') && !url.includes('/')) {
      return `https://drive.google.com/uc?export=download&id=${url}`;
    }

    // Check if it's already a Google Drive URL
    if (url.includes('drive.google.com')) {
      let fileId = "";
      if (url.includes('/file/d/')) {
        const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) fileId = match[1];
      } else if (url.includes('?id=')) {
        const match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) fileId = match[1];
      }
      if (fileId) {
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
      }
    }

    // Prepend https:// if it looks like a domain but has no protocol
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }

    try {
      // Validate structure
      new URL(url);
    } catch (_) {
      throw new Error("Đường dẫn liên kết (URL) không đúng định dạng. Vui lòng kiểm tra lại.");
    }

    return url;
  };

  app.post("/api/document/fetch-url", async (req, res) => {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "Yêu cầu cung cấp URL" });
    }
    try {
      const validatedUrl = normalizeAndValidateUrl(url);
      const response = await fetch(validatedUrl, {
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
      const validatedUrl = normalizeAndValidateUrl(url);

      const response = await fetch(validatedUrl, {
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
      return res.json({ error: "GEMINI_API_KEY is not configured" });
    }

    const { model, contents, config } = req.body;
    let selectedModel = model || "gemini-3.5-flash";

    // Map any legacy or overloaded models to the robust stable recommended gemini-3.5-flash
    if (selectedModel === "gemini-3-flash-preview") {
      selectedModel = "gemini-3.5-flash";
    }

    // Prioritized list of models to try (prioritize gemini-flash-latest as first fallback)
    const candidates = [selectedModel, "gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-3.1-pro-preview"];
    // Deduplicate candidate list
    const modelPool = Array.from(new Set(candidates));

    const maxRetriesPerModel = 3;
    let lastError: any = null;

    // Helper for robustly diagnosing transient / overloaded errors
    const isErrorTransient = (err: any): boolean => {
      if (!err) return false;
      let msg = "";
      try {
        if (typeof err === "string") {
          msg = err;
        } else {
          msg = err.message || JSON.stringify(err) || "";
        }
      } catch (e) {
        msg = String(err);
      }
      
      const lowerMsg = msg.toLowerCase();
      if (
        lowerMsg.includes("503") ||
        lowerMsg.includes("unavailable") ||
        lowerMsg.includes("429") ||
        lowerMsg.includes("resource_exhausted") ||
        lowerMsg.includes("limit") ||
        lowerMsg.includes("overloaded") ||
        lowerMsg.includes("busy") ||
        lowerMsg.includes("demand") ||
        lowerMsg.includes("temporary") ||
        lowerMsg.includes("try again later") ||
        lowerMsg.includes("fetch failed") ||
        lowerMsg.includes("econnreset") ||
        lowerMsg.includes("socket") ||
        lowerMsg.includes("timeout") ||
        lowerMsg.includes("network") ||
        lowerMsg.includes("connect") ||
        lowerMsg.includes("dns") ||
        lowerMsg.includes("service description")
      ) {
        return true;
      }

      const code = err.status || err.statusCode || err.code || err.error?.code || err.error?.status;
      if (code === 503 || code === 429 || code === "UNAVAILABLE" || code === "RESOURCE_EXHAUSTED") {
        return true;
      }
      return false;
    };

    // Try models one by one from the prioritized pool.
    // We retry transient errors (like 503/429) a few times with incremental backoff 
    // to give the primary model the best chance before falling back to alternative models.
    for (const currentModel of modelPool) {
      lastError = null; // Reset for each model candidate
      const isPrimary = (currentModel === selectedModel);
      const maxAttempts = isPrimary ? 3 : 2; // Primary model gets 3 attempts, backups get 2 attempts
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          console.log(`Trying Gemini API call (Model: ${currentModel}, Attempt: ${attempt}/${maxAttempts})...`);
          const response = await ai.models.generateContent({
            model: currentModel,
            contents,
            config
          });
          
          console.log(`Gemini call succeeded with model: ${currentModel} on attempt ${attempt}!`);
          return res.json({ text: response.text });
        } catch (error: any) {
          lastError = error;
          let errMsg = "";
          try {
            errMsg = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
          } catch (_) {
            errMsg = error?.message || String(error);
          }
          console.log(`Gemini API call failed with model ${currentModel} on attempt ${attempt}/${maxAttempts}: ${errMsg}`);
          
          const isTransient = isErrorTransient(error);
          // If it is transient and we have more attempts for this model, wait and retry
          if (isTransient && attempt < maxAttempts) {
            const delay = Math.pow(1.5, attempt) * 300 + Math.floor(Math.random() * 100);
            console.log(`Transient error detected on ${currentModel}. Retrying in ${Math.round(delay)}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            // Non-transient errors or maximum attempts reached: exit the retry loop and try the next model candidate
            break;
          }
        }
      }
      
      console.log(`Model ${currentModel} failed completely. Moving to next model candidate if available...`);
    }

    console.error("Gemini Error after all model candidates failed:", lastError);
    let readableErrorMsg = "Hệ thống AI đang quá tải tạm thời do lượt truy cập tăng cao. Vui lòng bấm thử lại sau 1-2 phút.";
    if (lastError && typeof lastError === 'object') {
      const errDetail = lastError.message || lastError.error?.message;
      if (errDetail) {
        readableErrorMsg += ` (Chi tiết: ${errDetail})`;
      }
    }
    
    return res.json({ error: readableErrorMsg });
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
    app.use((req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
