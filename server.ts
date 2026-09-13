import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { history = [], prompt, videoContext = {} } = req.body;
      
      const systemInstruction = `You are a helpful and witty AI assistant inside a short-form video platform (like TikTok).
You just watched the full video/clip with the user.
Video Context:
- Description / Title: "${videoContext.description || 'Unknown'}"
- Creator: @${videoContext.creator || 'unknown'}
- Tags: ${videoContext.tags && videoContext.tags.length ? videoContext.tags.join(', ') : 'None'}
- Is YouTube Short: ${videoContext.isYouTube ? `Yes (ID: ${videoContext.youtubeId})` : 'No'}

Answer any questions the user has about this video, explain what is happening in the clip, or chat about off-topic subjects if requested. Keep your responses concise, conversational, and fun.`;

      const ai = getAiClient();
      if (ai) {
        // Construct contents array from history and new prompt
        const formattedHistory = Array.isArray(history) 
          ? history.map((m: any) => ({
              role: m.role === 'model' ? 'model' : 'user',
              parts: Array.isArray(m.parts) ? m.parts : [{ text: String(m.text || m.parts || '') }]
            }))
          : [];
        
        formattedHistory.push({ role: 'user', parts: [{ text: prompt }] });

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: formattedHistory,
          config: {
            systemInstruction,
          },
        });

        return res.json({ response: response.text });
      }

      // Intelligent local fallback if GEMINI_API_KEY is not yet supplied in settings
      const p = (prompt || '').toLowerCase();
      let fallbackText = `I watched "${videoContext.description || 'this video'}" by @${videoContext.creator || 'the creator'}. `;
      if (p.includes('summary') || p.includes('what happened') || p.includes('explain') || p.includes('initial impression')) {
        fallbackText += `In this ${videoContext.isYouTube ? 'YouTube Short' : 'video'}, the creator focuses on entertaining short-form content featuring ${videoContext.tags?.join(', ') || 'trending themes'}. It's captivating and quick-paced!`;
      } else if (p.includes('who') || p.includes('creator')) {
        fallbackText += `This video was published by @${videoContext.creator || 'the user'}.`;
      } else if (p.includes('joke')) {
        fallbackText = `Why did the video go viral? Because it couldn't stop buffering up laughs! What else can I help you with?`;
      } else {
        fallbackText += `Regarding "${prompt}": It's an interesting question! Whether you want to talk about details in the clip or discuss something off-topic, I'm all ears.`;
      }
      res.json({ response: fallbackText });
    } catch (error: any) {
      console.error('Chat API Error:', error);
      res.json({ 
        response: `I've watched the video! It's titled "${req.body?.videoContext?.description || 'Video'}" by @${req.body?.videoContext?.creator || 'creator'}. Ask me any detail about what happened or any general question!`
      });
    }
  });

  app.get("/api/youtube-shorts", async (req, res) => {
    try {
      const apiKeys = Array.from({length: 20}, (_, index) => process.env[`YOUTUBE_API_KEY_${index + 1}`]).filter(Boolean) as string[];
      if (apiKeys.length === 0) {
        return res.status(500).json({ error: "YOUTUBE_API_KEY_1 through YOUTUBE_API_KEY_20 are required" });
      }

      // We'll search for #shorts to get a list of YouTube Shorts.
      // Note: Getting random shorts repeatedly can be tricky with a single search.
      // We pass a pageToken if provided to allow paginating through results.
      const pageToken = req.query.pageToken as string || '';
      const fallbackQueries = ['funny shorts', 'gaming shorts', 'school shorts', 'viral shorts', 'music shorts', 'sports shorts'];
      const randomFallback = fallbackQueries[Math.floor(Math.random() * fallbackQueries.length)];
      const searchQuery = req.query.q as string || randomFallback;
      
      for (const apiKey of apiKeys) {
        const queryParams = new URLSearchParams({part: 'snippet', maxResults: '1', q: searchQuery, type: 'video', videoDuration: 'short', key: apiKey});
        if (pageToken) queryParams.append('pageToken', pageToken);
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${queryParams.toString()}`);
        if (response.ok) return res.json(await response.json());
      }
      res.status(503).json({error: 'The Servers are Overloaded, This will be fixed shortly'});
    } catch (error) {
      console.error('YouTube API Error:', error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Vite middleware for development
  if (process.env['NODE_ENV'] !== "production") {
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
