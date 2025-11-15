import { useEffect, useState } from 'react'

export default function AdminDashboard() {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/questions')
        const body = await res.json()
        if (!body.ok) throw new Error(body.error || 'Failed to load')
        setQuestions(body.questions)
      } catch (err) {
        setError(String(err))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function updateQuestion(idx, patch) {
    setQuestions((q) => q.map((item, i) => (i === idx ? { ...item, ...patch } : item)))
  }

  function updateAnswer(qIdx, aIdx, patch) {
    setQuestions((q) => q.map((item, i) => {
      if (i !== qIdx) return item
      const answers = item.answers.map((a, j) => (j === aIdx ? { ...a, ...patch } : a))
      return { ...item, answers }
    }))
  }

  function setCorrectAnswer(qIdx, aIdx) {
    setQuestions((q) => q.map((item, i) => {
      if (i !== qIdx) return item
      const answers = item.answers.map((a, j) => ({ ...a, correct: j === aIdx }))
      return { ...item, answers }
    }))
  }

  function addQuestion() {
    setQuestions((q) => [...q, { id: `q-${Date.now()}`, prompt: 'New question', difficulty: 'easy', answers: [{ text: 'A', correct: true }, { text: 'B', correct: false }, { text: 'C', correct: false }, { text: 'D', correct: false }] }])
  }

  function removeQuestion(idx) {
    setQuestions((q) => q.filter((_, i) => i !== idx))
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions }),
      })
      const body = await res.json()
      if (!body.ok) throw new Error(body.error || 'Save failed')
      // notify other parts of the app to reload questions
      try { window.dispatchEvent(new Event('questionsUpdated')) } catch (e) {}
      alert('Salvat cu succes')
    } catch (err) {
      alert('Eroare la salvare: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="admin-root">Încărcare întrebări…</div>
  if (error) return <div className="admin-root">Eroare: {error}</div>

  return (
    <div className="admin-root">
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <h2>Admin Dashboard - Întrebări</h2>
        <button onClick={addQuestion} className="btn">Adaugă întrebare</button>
        <button onClick={save} className="btn" disabled={saving}>{saving ? 'Se salvează...' : 'Salvează'}</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {questions.map((q, qi) => (
          <div key={q.id} style={{ border: '1px solid rgba(255,255,255,0.06)', padding: 12, borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <input style={{ flex: 1, marginRight: 12 }} value={q.prompt} onChange={(e) => updateQuestion(qi, { prompt: e.target.value })} />
              <select value={q.difficulty} onChange={(e) => updateQuestion(qi, { difficulty: e.target.value })}>
                <option value="easy">easy</option>
                <option value="medium">medium</option>
                <option value="hard">hard</option>
                <option value="very-hard">very-hard</option>
              </select>
              <button style={{ marginLeft: 12 }} onClick={() => removeQuestion(qi)}>Șterge</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
              {q.answers.map((a, ai) => (
                <div key={ai} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="radio" name={`correct-${q.id}`} checked={a.correct} onChange={() => setCorrectAnswer(qi, ai)} />
                  <input style={{ flex: 1 }} value={a.text} onChange={(e) => updateAnswer(qi, ai, { text: e.target.value })} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
