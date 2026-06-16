import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/analyze-video", async (req, res) => {
    try {
      const { title, videoUrl } = req.body;
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Assume you are a creative writer for a Netflix-style streaming platform. You have to write a dramatic 2-3 sentence description for a memory video to be added to the platform.
You are given the following context: ${title ? 'Title: ' + title : ''} ${videoUrl ? 'URL or ID: ' + videoUrl : ''}.

CRITICAL: DO NOT say you cannot watch the video or need more context. You MUST creatively INFER and invent a compelling, emotional, and dramatic description based PURELY on the provided Title text. Keep it dramatic and engaging, no quotes. Also provide a suggested short Title. 

Format strictly as JSON without markdown: {"title": "Suggested Title", "description": "The description..."}`,
        config: {
          responseMimeType: "application/json"
        }
      });
      const out = JSON.parse(response.text);
      res.json(out);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to analyze video." });
    }
  });

  app.post('/api/youtube-meta', async (req, res) => {
    try {
      const { videoId } = req.body;
      const oembedRes = await fetch('https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=' + videoId + '&format=json');
      if (!oembedRes.ok) {
          return res.status(500).json({ error: 'Failed to fetch' });
      }
      const data = await oembedRes.json();
      res.json(data);
    } catch(e: any) {
      res.status(500).json({ error: e.message });
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
