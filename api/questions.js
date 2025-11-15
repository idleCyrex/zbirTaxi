const fs = require('fs')
const path = require('path')

const DATA_PATH = path.join(process.cwd(), 'src', 'data', 'questions.json')

function readQuestions() {
  const raw = fs.readFileSync(DATA_PATH, 'utf8')
  return JSON.parse(raw)
}

function writeQuestions(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8')
}

module.exports = function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const questions = readQuestions()
      return res.status(200).json({ ok: true, questions })
    }

    if (req.method === 'POST') {
      const body = req.body
      if (!body || !Array.isArray(body.questions)) {
        return res.status(400).json({ ok: false, error: 'Missing questions array in body' })
      }
      // basic validation could be added here
      writeQuestions(body.questions)
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', 'GET, POST')
    res.status(405).end('Method Not Allowed')
  } catch (err) {
    console.error(err)
    res.status(500).json({ ok: false, error: String(err) })
  }
}
