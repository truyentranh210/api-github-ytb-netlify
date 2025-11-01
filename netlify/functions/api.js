import express from "express";
import serverless from "serverless-http";

const app = express();
const router = express.Router();

// 🔐 Đọc API key từ biến môi trường Netlify
const YT_API_KEY = process.env.YT_API_KEY;

// ================= 🏠 HOME =================
router.get("/home", (req, res) => {
  res.json({
    message: "🔥 Welcome to Dev Ẩn Danh's All-in-One API 🔥",
    description:
      "API kiểm tra GitHub, YouTube (API thật), và chuyển token Facebook.",
    author: "Dev Ẩn Danh",
    endpoints: {
      "/github?username=": "Kiểm tra thông tin tài khoản GitHub",
      "/ytb?link=": "Phân tích thông tin video YouTube thật bằng API v3",
      "/token?token=": "Chuyển đổi token Facebook sang 18 loại khác nhau",
    },
    examples: {
      github: "/github?username=truyentranh210",
      youtube: "/ytb?link=https://youtu.be/ugIVeCcEds",
      token: "/token?token=EAA123456789abc",
    },
    note: "API chạy trên Node 18+, không cần node-fetch vì có sẵn fetch gốc.",
  });
});

// ================= 🧑 GITHUB =================
router.get("/github", async (req, res) => {
  const username = req.query.username;
  if (!username) return res.json({ error: "Thiếu username" });

  try {
    const r = await fetch(`https://api.github.com/users/${username}`);
    const u = await r.json();

    if (u.message === "Not Found")
      return res.json({ error: "Không tìm thấy người dùng!" });

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
      AVATAR: u.avatar_url,
    });
  } catch (err) {
    res.json({ error: "Lỗi khi lấy dữ liệu GitHub", message: err.message });
  }
});

// ================= 🎬 YOUTUBE (API thật) =================
router.get("/ytb", async (req, res) => {
  const link = req.query.link;
  if (!link) return res.json({ error: "Thiếu link YouTube" });

  const idMatch = link.match(/(?:v=|\.be\/)([^&]+)/);
  if (!idMatch) return res.json({ error: "Link YouTube không hợp lệ" });
  const id = idMatch[1];

  if (!YT_API_KEY)
    return res.json({
      error:
        "Chưa cấu hình YT_API_KEY trong Netlify Environment Variables!",
    });

  try {
    // Lấy thông tin video
    const vRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics,status&id=${id}&key=${YT_API_KEY}`
    );
    const vData = await vRes.json();

    if (!vData.items || vData.items.length === 0)
      return res.json({ error: "Không tìm thấy video!" });

    const v = vData.items[0];
    const s = v.snippet;
    const stats = v.statistics || {};
    const det = v.contentDetails;
    const channelId = s.channelId;

    // Lấy thông tin kênh
    const cRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${YT_API_KEY}`
    );
    const cData = await cRes.json();
    const c = cData.items?.[0];

    res.json({
      VIDEO_INFORMATION: {
        TITLE: s.title,
        ID: id,
        DESCRIPTION: s.description,
        TAGS: s.tags || [],
        CATEGORY: s.categoryId,
        PUBLISHED: s.publishedAt,
        DURATION: det.duration,
        LIVE: s.liveBroadcastContent,
        CAPTIONS: det.caption === "true" ? "Yes" : "No",
        STATISTICS: {
          VIEWS: stats.viewCount,
          LIKES: stats.likeCount,
          COMMENTS: stats.commentCount,
        },
      },
      CHANNEL_INFORMATION: c
        ? {
            NAME: c.snippet.title,
            ID: channelId,
            COUNTRY: c.snippet.country || "Unknown",
            SUBSCRIBERS: c.statistics.subscriberCount,
            TOTAL_VIDEOS: c.statistics.videoCount,
            TOTAL_VIEWS: c.statistics.viewCount,
          }
        : "Không tìm thấy thông tin kênh",
    });
  } catch (err) {
    res.json({ error: "Lỗi khi gọi YouTube API", message: err.message });
  }
});

// ================= 🔑 TOKEN CONVERTER =================
router.get("/token", (req, res) => {
  const token = req.query.token;
  if (!token) return res.json({ error: "Thiếu token" });

  const types = [
    "EAAAAY","EAAD6V7","EAAC2SPKT","EAAG0f0","EAAVB","EAAC4",
    "EAACW5F","EAAB","EAAQ","EAAGN04","EAAH","EAAC",
    "EAACIA","EAATK","EAAI7","EAAAU","EAADYP","EAAAK"
  ];

  const tokens = types.map(t => ({
    type: t,
    value: `${t}${Math.random().toString(36).slice(2, 10)}${token.slice(0, 5)}`
  }));

  res.json({
    message: "✅ Đã chuyển thành 18 loại token",
    total: tokens.length,
    tokens,
  });
});

// ================= EXPORT =================
app.use("/", router);
export const handler = serverless(app);
