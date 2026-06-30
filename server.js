const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

require("dotenv").config();

const app = express();

// In production the frontend is on Vercel — allow its origin via env var
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:4173",
  process.env.FRONTEND_URL,        // e.g. https://your-app.vercel.app
].filter(Boolean)

app.use(cors({ origin: allowedOrigins }));

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || "14iwDtu4Sg-GTvy7dQJKHSXXgVsLBIrIAI-XHfn-_g8M";

// Service account: prefer env var (production), fall back to file (local dev)
let credentials;
if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
  credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
} else {
  const keyPath = path.join(__dirname, "service-account.json");
  credentials = JSON.parse(fs.readFileSync(keyPath, "utf8"));
}
if (credentials.private_key) {
  credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
}

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

// Returns all sheet names
app.get("/sheets", async (req, res) => {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    res.json(meta.data.sheets.map((s) => s.properties.title));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

// Returns raw 2-D values array for one sheet
app.get("/data/:sheet", async (req, res) => {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: req.params.sheet,
    });
    res.json(response.data.values || []);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
