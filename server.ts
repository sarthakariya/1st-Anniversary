import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Generate Description directly using Gemini 3.5 Flash
  app.post("/api/generate-description", async (req, res) => {
    try {
      const { youtubeUrl, title } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.status(400).json({ 
          error: "Gemini API Key is not configured in Secrets. Please configure it in Settings > Secrets." 
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `Analyze this video resource link or memory title:
URL: "${youtubeUrl || 'None provided'}"
Current Title: "${title || 'Untitled'}"

Please generate a professional, high-fidelity, highly engaging Netflix-style title and a beautiful, romantic, emotional or documentary-style tagline synopsis description (under 30 words) for this memory.
Match the tone to the title (e.g. romantic, celebration party, special event, emotional).

You MUST respond with a valid JSON object matching this schema:
{
  "title": "A captivating cinematic title",
  "description": "A beautiful Netflix-style description"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 1.0,
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("No response content from Gemini.");
      }

      const parsed = JSON.parse(text.trim());
      return res.json({
        title: parsed.title || title || "Cinematic Memory",
        description: parsed.description || "A beautiful memory worth reliving."
      });

    } catch (error: any) {
      console.error("Gemini API generation error:", error);
      return res.status(500).json({ 
        error: error.message || "An error occurred while generating content with Gemini AI." 
      });
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
