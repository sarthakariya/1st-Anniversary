import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini cinematic description generator endpoint
  app.post("/api/generate-description", async (req, res) => {
    try {
      const { title, youtubeUrl } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not defined in server environment variables." });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `Write a heartwarming, elegant, and cinematic movie/series synopsis/description (around 2 to 3 sentences, maximum 40 words) for a beautiful romantic, nostalgic, or celebratory personal memory of ours.
      
Title of memory: "${title || 'Our Special Moment'}"
${youtubeUrl ? `YouTube Link of memory video: ${youtubeUrl}` : ''}

Style instructions:
- Write in the captivating tone of official Netflix series/movie summaries.
- It must draw the viewer in and make them feel the warmth, love, and joy of this beautiful milestone.
- Make it extremely premium, concise, and cinematic.
- Output ONLY the description itself. Do NOT wrap it in quotes, do NOT include any titles, markdown formatting, bullet points, introduction, conversational preamble, or follow-up notes. Just return the description text directly.`;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      const description = aiResponse.text?.trim() || "";
      res.json({ description });
    } catch (error: any) {
      console.error("Gemini description generation failed:", error);
      res.status(500).json({ error: error.message || "Failed to generate description" });
    }
  });

  // Alias for backward compatibility
  app.post("/api/gemini/generate-description", async (req, res) => {
    try {
      const { title, youtubeUrl } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not defined in server environment variables." });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `Write a heartwarming, elegant, and cinematic movie/series synopsis/description (around 2 to 3 sentences, maximum 40 words) for a beautiful romantic, nostalgic, or celebratory personal memory of ours.
      
Title of memory: "${title || 'Our Special Moment'}"
${youtubeUrl ? `YouTube Link of memory video: ${youtubeUrl}` : ''}

Style instructions:
- Write in the captivating tone of official Netflix series/movie summaries.
- It must draw the viewer in and make them feel the warmth, love, and joy of this beautiful milestone.
- Make it extremely premium, concise, and cinematic.
- Output ONLY the description itself. Do NOT wrap it in quotes, do NOT include any titles, markdown formatting, bullet points, introduction, conversational preamble, or follow-up notes. Just return the description text directly.`;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      const description = aiResponse.text?.trim() || "";
      res.json({ description });
    } catch (error: any) {
      console.error("Gemini description generation failed:", error);
      res.status(500).json({ error: error.message || "Failed to generate description" });
    }
  });

  // Serve static files / Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
