import fs from "fs";

async function doFetch(...args) {
  if (typeof globalThis.fetch === "function") return globalThis.fetch(...args);
  const nf = await import("node-fetch");
  return nf.default(...args);
}

export default async function handler(req, res) {
  try {
    const token = process.env.GITHUB_TOKEN || null;
    const owner = process.env.GITHUB_OWNER || null;
    const repo = process.env.GITHUB_REPO || null;
    const branch = process.env.GITHUB_BRANCH || "main";

    const out = { env: { hasToken: !!token, owner, repo, branch } };

    if (!token) {
      out.note = "No GITHUB_TOKEN set in environment.";
      return res.status(200).json(out);
    }

    try {
      const u = await doFetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "zbirTaxi-admin",
        },
      });
      out.userStatus = u.status;
      out.userBody = await u.json().catch(() => null);
    } catch (e) {
      out.userError = String(e);
    }

    if (!owner || !repo) {
      out.note = (out.note || "") + " GITHUB_OWNER or GITHUB_REPO not set.";
      return res.status(200).json(out);
    }

    try {
      const repoRes = await doFetch(
        `https://api.github.com/repos/${owner}/${repo}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "User-Agent": "zbirTaxi-admin",
          },
        }
      );
      out.repoStatus = repoRes.status;
      out.repoBody = await repoRes.json().catch(async () => {
        const t = await repoRes.text().catch(() => null);
        return t;
      });
    } catch (e) {
      out.repoError = String(e);
    }

    try {
      const path = "src/data/questions.json";
      const contRes = await doFetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "User-Agent": "zbirTaxi-admin",
          },
        }
      );
      out.contentsStatus = contRes.status;
      out.contentsBody = await contRes.json().catch(async () => {
        const t = await contRes.text().catch(() => null);
        return t;
      });
    } catch (e) {
      out.contentsError = String(e);
    }

    return res.status(200).json(out);
  } catch (err) {
    console.error("diagnose error", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
