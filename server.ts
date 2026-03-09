import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("data.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    title TEXT,
    date TEXT,
    content TEXT
  );
  CREATE TABLE IF NOT EXISTS stats (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    students INTEGER DEFAULT 1850
  );
  CREATE TABLE IF NOT EXISTS user_links (
    id TEXT PRIMARY KEY,
    title TEXT,
    url TEXT,
    instructions TEXT,
    bidang TEXT,
    date TEXT
  );
  CREATE TABLE IF NOT EXISTS takwim (
    id TEXT PRIMARY KEY,
    title TEXT,
    date TEXT,
    type TEXT,
    description TEXT,
    category TEXT
  );
`);

// Seed stats if not exists
const statsCount = db.prepare("SELECT COUNT(*) as count FROM stats").get() as { count: number };
if (statsCount.count === 0) {
  db.prepare("INSERT INTO stats (id, students) VALUES (1, 1850)").run();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get("/api/announcements", (req, res) => {
    const rows = db.prepare("SELECT * FROM announcements ORDER BY date DESC").all();
    res.json(rows);
  });

  app.post("/api/announcements", (req, res) => {
    const { announcements } = req.body;
    
    const deleteStmt = db.prepare("DELETE FROM announcements");
    const insertStmt = db.prepare("INSERT INTO announcements (id, title, date, content) VALUES (?, ?, ?, ?)");

    const transaction = db.transaction((data) => {
      deleteStmt.run();
      for (const ann of data) {
        insertStmt.run(ann.id, ann.title, ann.date, ann.content);
      }
    });

    try {
      transaction(announcements);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/stats", (req, res) => {
    const row = db.prepare("SELECT students FROM stats WHERE id = 1").get();
    res.json(row);
  });

  app.post("/api/stats", (req, res) => {
    const { students } = req.body;
    try {
      db.prepare("UPDATE stats SET students = ? WHERE id = 1").run(students);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/user-links", (req, res) => {
    const rows = db.prepare("SELECT * FROM user_links ORDER BY date DESC").all();
    res.json(rows);
  });

  app.post("/api/user-links", (req, res) => {
    const { id, title, url, instructions, bidang, date } = req.body;
    try {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO user_links (id, title, url, instructions, bidang, date)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(id, title, url, instructions, bidang, date);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete("/api/user-links/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM user_links WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/takwim", (req, res) => {
    const rows = db.prepare("SELECT * FROM takwim ORDER BY date ASC").all();
    res.json(rows);
  });

  app.post("/api/takwim", (req, res) => {
    const { events } = req.body;
    
    const deleteStmt = db.prepare("DELETE FROM takwim");
    const insertStmt = db.prepare("INSERT INTO takwim (id, title, date, type, description, category) VALUES (?, ?, ?, ?, ?, ?)");

    const transaction = db.transaction((data) => {
      deleteStmt.run();
      for (const event of data) {
        insertStmt.run(event.id, event.title, event.date, event.type, event.description, event.category);
      }
    });

    try {
      transaction(events);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
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
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
