import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/analyze-video", async (req, res) => {
    try {
      const { title, videoId } = req.body;
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `Analyze this video context: Title: "${title}" (YouTube ID: ${videoId}). Write a captivating 2-3 sentence Netflix-style documentary description or emotional romantic summary for this memory. Keep it dramatic and engaging, do not use quotes.`,
      });
      res.json({ description: response.text });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to analyze video." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    // @ts-ignore
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // @ts-ignore
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
