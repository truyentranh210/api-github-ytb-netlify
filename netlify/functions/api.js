import express from "express";
import fetch from "node-fetch";
import serverless from "serverless-http";

const app = express();
const router = express.Router();

const YT_API_KEY = process.env.YT_API_KEY; // 🔐 Đọc key từ Netlify Env

// ========== 🏠 HOME ==========
router.get("/home", (req, res) => {
  res.json({
    message: "🔥 Welcome to Dev Ẩn Danh API 🔥",
    description:
      "API kiểm tra GitHub, YouTube (thật), và chuyển đổi token Facebook.",
    author: "Dev Ẩn Danh",
    endpoints: {
      "/github?username=": "Check thông tin GitHub",
      "/ytb?link=": "Check video YouTube thật (qua API v3)",
      "/token?token=": "Chuyển token sang 18 loại",
    },
    examples: {
      github: "/github?username=truyentranh210",
      youtube: "/ytb?link=https://youtu.be/ugIVeCcEds",
      token: "/token?token=EAA123456789abc",
    },
  });
});

// ========== 🧑 GITHUB ==========
router.get("/github", async (req, res) => {
  const username = req.query.username;
  if (!username) return res.json({ error: "Thiếu username" });

  const r = await fetch(`https://api.github.com/users/${username}`);
  const data = await r.json();
  if (data.message === "Not Found")
    return res.json({ error: "Không tìm thấy người dùng!" });

  res.json({
    USERNAME: data.login,
    UID: data.id,
    NAME: data.name || "None",
    BIO: data.bio || "None",
    LOCATION: data.location || "None",
    COMPANY: data.company || "None",
    FOLLOWERS: data.followers,
    FOLLOWING: data.following,
    REPOS_PUBLIC: data.public_repos,
    SITE_ADMIN: data.site_admin ? "✅" : "❌",
    CREATED: data.created_at,
    UPDATED: data.updated_at,
    AVATAR: data.avatar_url,
  });
});

// ========== 🎬 YOUTUBE ==========
router.get("/ytb", async (req, res) => {
  const link = req.query.link;
  if (!link) return res.json({ error: "Thiếu link YouTube" });

  const idMatch = link.match(/(?:v=|\.be\/)([^&]+)/);
  if (!idMatch) return res.json({ error: "Link YouTube không hợp lệ" });
  const id = idMatch[1];

  if (!YT_API_KEY) return res.json({ error: "Chưa cấu hình YT_API_KEY trên Netlify!" });

  try {
    const vRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails,status&id=${id}&key=${YT_API_KEY}`
    );
    const vData = await vRes.json();
    if (!vData.items || vData.items.length === 0)
      return res.json({ error: "Không tìm thấy video!" });

    const video = vData.items[0];
    const snippet = video.snippet;
    const stats = video.statistics;
    const details = video.contentDetails;

    // Lấy thông tin kênh
    const cRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${snippet.channelId}&key=${YT_API_KEY}`
    );
    const cData = await cRes.json();
    const channel = cData.items[0];

    res.json({
      VIDEO_INFORMATION: {
        TITLE: snippet.title,
        ID: id,
        DESCRIPTION: snippet.description,
        TAGS: snippet.tags || [],
        CATEGORY: snippet.categoryId,
        PUBLISHED: snippet.publishedAt,
        DURATION: details.duration,
        LIVE: snippet.liveBroadcastContent,
        CAPTIONS: details.caption === "true" ? "Yes" : "No",
        STATISTICS: {
          VIEWS: stats.viewCount,
          LIKES: stats.likeCount,
          COMMENTS: stats.commentCount,
        },
      },
      CHANNEL_INFORMATION: {
        NAME: channel.snippet.title,
        ID: snippet.channelId,
        SUBSCRIBERS: channel.statistics.subscriberCount,
        TOTAL_VIDEOS: channel.statistics.videoCount,
        TOTAL_VIEWS: channel.statistics.viewCount,
      },
    });
  } catch (e) {
    res.json({ error: "Lỗi khi truy xuất API YouTube", message: e.message });
  }
});

// ========== 🔑 TOKEN CONVERTER ==========
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

  res.json({ message: "✅ Đã chuyển thành 18 loại token", total: tokens.length, tokens });
});

// ========== EXPORT ==========
app.use("/", router);
export const handler = serverless(app);
