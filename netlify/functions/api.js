import express from "express";
import serverless from "serverless-http";

const app = express();
const router = express.Router();

// 🌐 ENV VARS
const FB_APP_ID = process.env.FB_APP_ID || "";
const FB_APP_SECRET = process.env.FB_APP_SECRET || "";
const YT_API_KEY = process.env.YT_API_KEY || "";

// ===============================
// ⚙️ Helper Functions
// ===============================
async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: "Invalid JSON", raw: text, status: res.status };
  }
}

async function debugToken(inputToken) {
  const appToken = FB_APP_ID && FB_APP_SECRET ? `${FB_APP_ID}|${FB_APP_SECRET}` : inputToken;
  const url = `https://graph.facebook.com/debug_token?input_token=${inputToken}&access_token=${appToken}`;
  return await fetchJson(url);
}

async function exchangeForLongLived(token) {
  if (!FB_APP_ID || !FB_APP_SECRET) return { error: "Missing APP_ID/APP_SECRET" };
  const url = `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${FB_APP_ID}&client_secret=${FB_APP_SECRET}&fb_exchange_token=${token}`;
  return await fetchJson(url);
}

async function getPages(userToken) {
  const url = `https://graph.facebook.com/v18.0/me/accounts?access_token=${userToken}`;
  return await fetchJson(url);
}

async function getInstagramFromPage(pageId, token) {
  const url = `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${token}`;
  return await fetchJson(url);
}

function generateSimulatedTokens(baseToken, needed) {
  const prefixes = [
    "EAAAAY","EAAD6V7","EAAC2SPKT","EAAG0f0","EAAVB","EAAC4",
    "EAACW5F","EAAB","EAAQ","EAAGN04","EAAH","EAAC",
    "EAACIA","EAATK","EAAI7","EAAAU","EAADYP","EAAAK"
  ];
  const out = [];
  for (let i = 0; i < needed; i++) {
    const p = prefixes[i % prefixes.length];
    const suffix = baseToken.slice(0, 6);
    out.push({
      kind: "simulated",
      type: p,
      token: `${p}${suffix}${i}`,
      simulated: true,
      note: "Simulated placeholder token — NOT valid for Graph API"
    });
  }
  return out;
}

// ===============================
// 🏠 HOME
// ===============================
router.get("/home", (req, res) => {
  res.json({
    message: "🔥 Welcome to Dev Ẩn Danh’s All-in-One API 🔥",
    description: "API gồm: GitHub checker, YouTube analyzer, Facebook token converter (18 loại).",
    endpoints: {
      "/github?username=": "→ Kiểm tra thông tin GitHub",
      "/ytb?link=": "→ Lấy thông tin video YouTube (API thật)",
      "/token?token=": "→ Chuyển token Facebook thành 18 loại"
    },
    env_vars: {
      YT_API_KEY: !!YT_API_KEY,
      FB_APP_ID: !!FB_APP_ID,
      FB_APP_SECRET: !!FB_APP_SECRET
    },
    example: {
      github: "/github?username=truyentranh210",
      youtube: "/ytb?link=https://youtu.be/ugIVeCcEds",
      token: "/token?token=EAA123456789abc"
    }
  });
});

// ===============================
// 🧑 GITHUB
// ===============================
router.get("/github", async (req, res) => {
  const username = req.query.username;
  if (!username) return res.json({ error: "Thiếu username" });

  const r = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`);
  const u = await r.json();
  if (u.message === "Not Found") return res.json({ error: "Không tìm thấy người dùng!" });

  res.json({
    USERNAME: u.login,
    UID: u.id,
    NAME: u.name || "None",
    BIO: u.bio || "None",
    LOCATION: u.location || "None",
    COMPANY: u.company || "None",
    FOLLOWERS: u.followers,
    FOLLOWING: u.following,
    REPOS_PUBLIC: u.public_repos,
    SITE_ADMIN: u.site_admin ? "✅" : "❌",
    CREATED: u.created_at,
    UPDATED: u.updated_at,
    AVATAR: u.avatar_url
  });
});

// ===============================
// 🎬 YOUTUBE
// ===============================
router.get("/ytb", async (req, res) => {
  const link = req.query.link;
  if (!link) return res.json({ error: "Thiếu link YouTube" });
  const match = link.match(/(?:v=|\.be\/)([^&]+)/);
  if (!match) return res.json({ error: "Link YouTube không hợp lệ" });
  const id = match[1];

  if (!YT_API_KEY) return res.json({ error: "Thiếu YT_API_KEY trong Netlify env" });

  const vRes = await fetchJson(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics,status&id=${id}&key=${YT_API_KEY}`
  );

  if (!vRes.items || vRes.items.length === 0) return res.json({ error: "Không tìm thấy video!" });
  const v = vRes.items[0];
  const s = v.snippet;
  const st = v.statistics;
  const cd = v.contentDetails;

  const cRes = await fetchJson(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${s.channelId}&key=${YT_API_KEY}`
  );
  const c = cRes.items?.[0];

  res.json({
    VIDEO_INFORMATION: {
      TITLE: s.title,
      ID: id,
      DESCRIPTION: s.description,
      TAGS: s.tags || [],
      CATEGORY: s.categoryId,
      PUBLISHED: s.publishedAt,
      DURATION: cd.duration,
      LIVE: s.liveBroadcastContent,
      CAPTIONS: cd.caption === "true" ? "Yes" : "No",
      STATISTICS: {
        VIEWS: st.viewCount,
        LIKES: st.likeCount,
        COMMENTS: st.commentCount
      }
    },
    CHANNEL_INFORMATION: {
      NAME: c?.snippet?.title || "Unknown",
      ID: s.channelId,
      COUNTRY: c?.snippet?.country || "VN",
      SUBSCRIBERS: c?.statistics?.subscriberCount,
      TOTAL_VIDEOS: c?.statistics?.videoCount,
      TOTAL_VIEWS: c?.statistics?.viewCount
    }
  });
});

// ===============================
// 🔑 TOKEN CONVERTER (18 loại)
// ===============================
router.get("/token", async (req, res) => {
  const inputToken = (req.query.token || "").trim();
  if (!inputToken) return res.json({ error: "Thiếu token (query param 'token')" });

  const out = {
    requested_at: new Date().toISOString(),
    original_token: inputToken,
    found: [],
    notes: []
  };

  // 1️⃣ Debug token
  const dbg = await debugToken(inputToken);
  out.debug = dbg;

  // 2️⃣ Long-lived + App token
  if (FB_APP_ID && FB_APP_SECRET) {
    const long = await exchangeForLongLived(inputToken);
    if (long.access_token)
      out.found.push({ kind: "user_long_lived", token: long.access_token, simulated: false });
    out.found.push({ kind: "app_access_token", token: `${FB_APP_ID}|${FB_APP_SECRET}`, simulated: false });
  }

  // 3️⃣ Page tokens
  const userToken = out.found.find(t => t.kind === "user_long_lived")?.token || inputToken;
  const pages = await getPages(userToken);
  if (pages?.data?.length) {
    for (const p of pages.data) {
      out.found.push({
        kind: "page_access_token",
        page_id: p.id,
        page_name: p.name,
        token: p.access_token,
        simulated: false
      });
      const ig = await getInstagramFromPage(p.id, p.access_token || userToken);
      if (ig?.instagram_business_account)
        out.found.push({
          kind: "instagram_business_account",
          id: ig.instagram_business_account.id,
          simulated: false
        });
    }
  }

  // 4️⃣ Nếu ít hơn 18 → tạo thêm simulated
  const real = out.found.length;
  if (real < 18) {
    const sims = generateSimulatedTokens(inputToken, 18 - real);
    out.found.push(...sims);
  }

  res.json({
    requested_at: out.requested_at,
    total: out.found.length,
    tokens: out.found.slice(0, 18),
    debug: out.debug,
    notes: [
      "Chỉ token người dùng có quyền pages_show_list mới trả page token thật.",
      "Nếu không có FB_APP_ID/SECRET, sẽ chỉ sinh token giả lập."
    ]
  });
});

// ===============================
app.use("/", router);
export const handler = serverless(app);
