const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.env.PORT || 8080);
const upstream = "https://www.ktp-threads.com";
const analyticsDir = path.join(root, ".analytics");
const analyticsFile = path.join(analyticsDir, "generates.jsonl");
const adminUser = "pawn1";
const adminPass = "987654";

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/admin") {
      if (!isAdminAuthorized(req)) {
        res.writeHead(401, {
          "content-type": "text/plain; charset=utf-8",
          "www-authenticate": 'Basic realm="KTP Threads Admin"'
        });
        res.end("Login admin diperlukan.");
        return;
      }
      sendAdminPage(res);
      return;
    }

    if (url.pathname === "/api/ktp" && req.method === "POST") {
      const body = await readBody(req);
      const response = await fetch(`${upstream}/api/ktp`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "accept": "application/json",
          "user-agent": "Mozilla/5.0 KTP-Threads-Card"
        },
        body
      });
      const text = await response.text();
      if (response.ok) {
        logGenerate(body, text, req).catch((error) => {
          console.error("analytics log failed", error);
        });
      }
      res.writeHead(response.status, { "content-type": "application/json; charset=utf-8" });
      res.end(text);
      return;
    }

    if (url.pathname === "/api/avatar" && req.method === "GET") {
      const target = url.searchParams.get("url");
      if (!target || !/^https?:\/\//i.test(target)) {
        sendJson(res, 400, { message: "URL avatar tidak valid." });
        return;
      }
      const response = await fetch(target, {
        headers: {
          "user-agent": "Mozilla/5.0",
          "accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
        }
      });
      if (!response.ok) {
        res.writeHead(response.status);
        res.end();
        return;
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      res.writeHead(200, {
        "content-type": response.headers.get("content-type") || "image/jpeg",
        "cache-control": "public, max-age=86400"
      });
      res.end(buffer);
      return;
    }

    serveStatic(url.pathname, res);
  } catch (error) {
    sendJson(res, 500, { message: "Server kartu tidak bisa memproses permintaan." });
  }
});

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error("body too large"));
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function serveStatic(pathname, res) {
  const clean = pathname === "/" ? "/index.html" : decodeURIComponent(pathname);
  const filePath = path.normalize(path.join(root, clean));
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "content-type": mime[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
}

async function logGenerate(requestBody, responseText, req) {
  let requestedUsername = "";
  let generatedUsername = "";
  try {
    requestedUsername = JSON.parse(requestBody)?.username || "";
  } catch {}
  try {
    generatedUsername = JSON.parse(responseText)?.uname || "";
  } catch {}

  const username = cleanUsername(generatedUsername || requestedUsername);
  if (!username) return;

  await fs.promises.mkdir(analyticsDir, { recursive: true });
  const entry = {
    username,
    at: new Date().toISOString(),
    ip: getClientIp(req)
  };
  await fs.promises.appendFile(analyticsFile, `${JSON.stringify(entry)}\n`, "utf8");
}

function isAdminAuthorized(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Basic ")) return false;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator === -1) return false;
  const user = decoded.slice(0, separator);
  const pass = decoded.slice(separator + 1);
  return user === adminUser && pass === adminPass;
}

function sendAdminPage(res) {
  const entries = readAnalytics();
  const byUsername = new Map();
  for (const entry of entries) {
    const current = byUsername.get(entry.username) || { username: entry.username, count: 0, firstAt: entry.at, lastAt: entry.at };
    current.count += 1;
    if (entry.at < current.firstAt) current.firstAt = entry.at;
    if (entry.at > current.lastAt) current.lastAt = entry.at;
    byUsername.set(entry.username, current);
  }

  const rows = [...byUsername.values()]
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
    .map((row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>@${escapeHtml(row.username)}</td>
        <td>${row.count}</td>
        <td>${formatDate(row.lastAt)}</td>
        <td>${formatDate(row.firstAt)}</td>
      </tr>
    `)
    .join("");

  const recentRows = entries.slice(-100).reverse().map((entry, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>@${escapeHtml(entry.username)}</td>
      <td>${formatDate(entry.at)}</td>
    </tr>
  `).join("");

  const html = `<!doctype html>
  <html lang="id">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Admin KTP Threads</title>
      <style>
        :root { color-scheme: light; --ink:#172433; --muted:#35526e; --line:#99bdd4; --paper:#e7f3fb; }
        * { box-sizing: border-box; }
        body { margin:0; font-family: Arial, sans-serif; color:var(--ink); background:linear-gradient(135deg,#f7fcff,#d8edf8); }
        main { width:min(1100px, calc(100% - 28px)); margin:0 auto; padding:28px 0 42px; }
        header { display:flex; justify-content:space-between; gap:16px; align-items:end; margin-bottom:20px; }
        h1 { margin:0; font-size:28px; }
        p { margin:6px 0 0; color:var(--muted); font-weight:700; }
        .stat { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin:18px 0; }
        .box { background:rgba(255,255,255,.72); border:1px solid var(--line); border-radius:8px; padding:14px; }
        .num { font-size:28px; font-weight:900; }
        h2 { font-size:18px; margin:26px 0 10px; }
        table { width:100%; border-collapse:collapse; background:rgba(255,255,255,.76); border:1px solid var(--line); border-radius:8px; overflow:hidden; }
        th, td { padding:10px 12px; border-bottom:1px solid #c8ddea; text-align:left; font-size:14px; }
        th { color:var(--muted); text-transform:uppercase; letter-spacing:1px; font-size:12px; }
        tr:last-child td { border-bottom:0; }
        a { color:#6742d9; font-weight:800; }
        @media (max-width:700px){ header{display:block}.stat{grid-template-columns:1fr} th,td{font-size:12px;padding:8px} }
      </style>
    </head>
    <body>
      <main>
        <header>
          <div>
            <h1>Admin Generate Kartu</h1>
            <p>Daftar username yang pernah generate kartu.</p>
          </div>
          <a href="/">Kembali ke generator</a>
        </header>
        <section class="stat">
          <div class="box"><p>Total generate</p><div class="num">${entries.length}</div></div>
          <div class="box"><p>Username unik</p><div class="num">${byUsername.size}</div></div>
          <div class="box"><p>Generate terakhir</p><div class="num" style="font-size:18px">${entries.length ? formatDate(entries[entries.length - 1].at) : "-"}</div></div>
        </section>
        <h2>Username Unik</h2>
        <table>
          <thead><tr><th>No</th><th>Username</th><th>Jumlah</th><th>Terakhir</th><th>Pertama</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="5">Belum ada data.</td></tr>'}</tbody>
        </table>
        <h2>Riwayat Terbaru</h2>
        <table>
          <thead><tr><th>No</th><th>Username</th><th>Waktu</th></tr></thead>
          <tbody>${recentRows || '<tr><td colspan="3">Belum ada data.</td></tr>'}</tbody>
        </table>
      </main>
    </body>
  </html>`;
  res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
  res.end(html);
}

function readAnalytics() {
  try {
    return fs.readFileSync(analyticsFile, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .filter((entry) => entry && entry.username && entry.at);
  } catch {
    return [];
  }
}

function cleanUsername(value) {
  return String(value || "").trim().replace(/^@+/, "").replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 64);
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress || "";
}

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

server.listen(port, "0.0.0.0", () => {
  console.log(`KTP Threads card app listening on port ${port}`);
});
