import fs from 'fs'
import path from 'path'

// Use global fetch when available (Node 18+/Vercel). Fall back to importing node-fetch dynamically.
async function doFetch(...args) {
  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch(...args)
  }
  const nf = await import('node-fetch')
  return nf.default(...args)
}

const DATA_PATH = path.join(process.cwd(), 'src', 'data', 'questions.json')

function readQuestionsSync() {
  const raw = fs.readFileSync(DATA_PATH, 'utf8')
  return JSON.parse(raw)
}

async function commitToGitHub(questions, { owner, repo, branch, token }) {
  const pathOnRepo = 'src/data/questions.json'
  const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${pathOnRepo}`

  // get current file to obtain sha (if exists)
  const getRes = await doFetch(apiBase, { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'zbirTaxi-admin' } })
  let sha
  if (getRes.status === 200) {
    const body = await getRes.json()
    sha = body.sha
  }

  const content = Buffer.from(JSON.stringify(questions, null, 2)).toString('base64')
  const putBody = { message: 'Update questions from Admin dashboard', content, branch: branch || 'main' }
  if (sha) putBody.sha = sha

  const putRes = await doFetch(apiBase, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'zbirTaxi-admin', 'Content-Type': 'application/json' },
    body: JSON.stringify(putBody),
  })

  if (!putRes.ok) {
    const t = await putRes.text()
    throw new Error('GitHub API error: ' + putRes.status + ' ' + t)
  }

  return await putRes.json()
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const questions = readQuestionsSync()
      return res.status(200).json({ ok: true, questions })
    }

    if (req.method === 'POST') {
      const body = req.body
      if (!body || !Array.isArray(body.questions)) {
        return res.status(400).json({ ok: false, error: 'Missing questions array in body' })
      }

      // If GITHUB_TOKEN available, commit to GitHub. Otherwise, fail with clear JSON (no HTML)
      const token = process.env.GITHUB_TOKEN
      const owner = process.env.GITHUB_OWNER
      const repo = process.env.GITHUB_REPO
      const branch = process.env.GITHUB_BRANCH || 'main'

      if (token && owner && repo) {
        try {
          await commitToGitHub(body.questions, { owner, repo, branch, token })
          return res.status(200).json({ ok: true })
        } catch (err) {
          console.error('GitHub commit failed', err)
          return res.status(500).json({ ok: false, error: 'GitHub commit failed: ' + String(err) })
        }
      }

      // Not configured for GitHub commits on this environment
      return res.status(501).json({ ok: false, error: 'Server not configured for commits. Set GITHUB_TOKEN, GITHUB_OWNER and GITHUB_REPO in environment.' })
    }

    res.setHeader('Allow', 'GET, POST')
    res.status(405).json({ ok: false, error: 'Method Not Allowed' })
  } catch (err) {
    console.error('API handler error', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
}
