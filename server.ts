import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI Generation API Endpoint
  app.post("/api/generate-poster", async (req, res) => {
    try {
      const { title, description } = req.body;
      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }

      // Ensure API Key exists
      if (!process.env.GEMINI_API_KEY) {
        console.warn("Missing GEMINI_API_KEY");
        // For development fallback if no key is set yet
        return res.status(503).json({ error: "Gemini API Key is not configured." });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `An official, premium Netflix movie poster style artwork for a documentary titled '${title}'. ${description ? `Synopsis: ${description}. ` : ''}Dramatic cinematic lighting, high-contrast composition, hyper-realistic, 4K resolution presentation layer, deep atmospheric dark shadows, completely textless, no readable words.`;

      const response = await ai.models.generateImages({
        model: 'imagen-3.0-generate-002', // Using high quality imagine model
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '16:9',
        },
      });

      const base64EncodeString = response.generatedImages[0].image.imageBytes;
      const imageUrl = `data:image/jpeg;base64,${base64EncodeString}`;
      
      res.json({ imageUrl });

    } catch (error: any) {
      console.error("AI Generation Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate image" });
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
