import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.get("/api/comments", async (req, res) => {
    const { videoId } = req.query;
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!videoId) {
      return res.status(400).json({ error: "Video ID is required" });
    }

    if (!apiKey) {
      return res.status(500).json({ error: "YouTube API key is not configured on the server." });
    }

    try {
      // Fetch top 100 comments (max allowed in one request)
      const response = await axios.get(
        `https://www.googleapis.com/youtube/v3/commentThreads`,
        {
          params: {
            part: "snippet",
            videoId: videoId,
            maxResults: 100,
            textFormat: "plainText",
            key: apiKey,
          },
        }
      );

      const comments = response.data.items.map((item: any) => ({
        author: item.snippet.topLevelComment.snippet.authorDisplayName,
        text: item.snippet.topLevelComment.snippet.textDisplay,
        likeCount: item.snippet.topLevelComment.snippet.likeCount,
        publishedAt: item.snippet.topLevelComment.snippet.publishedAt,
      }));

      res.json({ comments });
    } catch (error: any) {
      console.error("Error fetching YouTube comments:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json({
        error: "Failed to fetch comments from YouTube API",
        details: error.response?.data?.error?.message || error.message,
      });
    }
  });

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

startServer();
