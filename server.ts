import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import "dotenv/config";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/youtube-shorts", async (req, res) => {
    try {
      const apiKey = process.env.YOUTUBE_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "YOUTUBE_API_KEY environment variable is required" });
      }

      // We'll search for #shorts to get a list of YouTube Shorts.
      // Note: Getting random shorts repeatedly can be tricky with a single search.
      // We pass a pageToken if provided to allow paginating through results.
      const pageToken = req.query.pageToken as string || '';
      const queryParams = new URLSearchParams({
        part: 'snippet',
        maxResults: '10',
        q: '#shorts',
        type: 'video',
        videoDuration: 'short',
        key: apiKey
      });

      if (pageToken) {
        queryParams.append('pageToken', pageToken);
      }

      const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${queryParams.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        return res.status(response.status).json({ error: "YouTube API Error", details: errorData });
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('YouTube API Error:', error);
      res.status(500).json({ error: "Internal Server Error" });
    }
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
