import { useEffect, useMemo, useState, useRef } from "react";

function shuffle(array) {
  return [...array]
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

const DIFFICULTY_COLOR = {
  easy: "#10b981",
  medium: "#f59e0b",
  hard: "#ef4444",
  "very-hard": "#8b5cf6",
};

export default function Quiz({ questions: initialQuestions = null }) {
  const [questionsState, setQuestionsState] = useState(initialQuestions);
  const questions = questionsState || [];
  const total = questions.length;
  const [index, setIndex] = useState(0);
  const [shuffled, setShuffled] = useState([]);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const [lives, setLives] = useState(3);
  const maxLives = 3;
  const [bank, setBank] = useState(0);
  const ladder = [1, 5, 10, 50, 100, 150, 250, 500, 750, 1000];
  const checkpoints = [100, 1000];

  const [overlayVisible, setOverlayVisible] = useState(false);
  const [displayedMoney, setDisplayedMoney] = useState(0);
  const [lifeOverlayVisible, setLifeOverlayVisible] = useState(false);

  const current = questions[index];

  const animRef = useRef(null);
  const [seenCheckpoints, setSeenCheckpoints] = useState([]);
  const [checkpointVisible, setCheckpointVisible] = useState(null);
  const [pendingCheckpoints, setPendingCheckpoints] = useState([]);

  useEffect(() => {
    if (!current) return;
    setShuffled(shuffle(current.answers));
    setSelected(null);
  }, [index, current]);

  useEffect(() => {
    if (initialQuestions != null) return;
    let mounted = true;
    async function load() {
      try {
        const res = await fetch("/api/questions");
        const body = await res.json();
        if (body?.ok && Array.isArray(body.questions) && mounted) {
          setQuestionsState(body.questions);
        }
      } catch (err) {
        console.warn("Failed to load questions from API", err);
      }
    }
    load();
    function onUpdated() {
      load();
    }
    window.addEventListener("questionsUpdated", onUpdated);
    return () => {
      mounted = false;
      window.removeEventListener("questionsUpdated", onUpdated);
    };
  }, [initialQuestions]);

  useEffect(() => {
    checkpoints.forEach((cp) => {
      if (bank >= cp && !seenCheckpoints.includes(cp)) {
        setSeenCheckpoints((s) => [...s, cp]);
        setPendingCheckpoints((p) => [...p, cp]);
      }
    });
  }, [bank, checkpoints, seenCheckpoints]);

  const hasAnswered = selected !== null;
  const correctIndex = useMemo(() => {
    if (!hasAnswered) return null;
    return shuffled.findIndex((a) => a.correct);
  }, [hasAnswered, shuffled]);

  function lastCheckpointValue() {
    const safe = checkpoints.reduce((acc, cp) => (bank >= cp ? cp : acc), 0);
    return safe;
  }

  function getEarnedForIndex(i) {
    if (i < 0) return 0;
    if (i >= ladder.length) return ladder[ladder.length - 1];
    return ladder[i];
  }

  function animateMoneyTo(targetAmount) {
    if (animRef.current) {
      clearInterval(animRef.current);
      animRef.current = null;
    }
    const steps = ladder.filter((v) => v <= targetAmount);
    if (steps.length === 0) {
      setDisplayedMoney(0);
      return;
    }
    let i = 0;
    setDisplayedMoney(0);
    animRef.current = setInterval(() => {
      setDisplayedMoney(steps[i]);
      i += 1;
      if (i >= steps.length) {
        clearInterval(animRef.current);
        animRef.current = null;
      }
    }, 260);
  }

  function onAnswerClick(i) {
    if (hasAnswered) return;
    setSelected(i);
    const clicked = shuffled[i];
    let target = bank;

    if (clicked?.correct) {
      setScore((s) => s + 1);
      const pos = ladder.findIndex((v) => v === bank);
      let next = 0;
      if (pos === -1) {
        next = ladder[0];
      } else if (pos + 1 < ladder.length) {
        next = ladder[pos + 1];
      } else {
        next = ladder[ladder.length - 1];
      }
      setBank(next);
      target = next;
      setSelected(i);
    } else {
      const newLives = Math.max(0, lives - 1);
      setLives(newLives);
      if (newLives <= 0) {
        const cp = checkpoints.reduce((acc, c) => (bank >= c ? c : acc), 0);
        setBank(cp);
        target = cp;
      } else {
        target = bank;
      }
    }

    setOverlayVisible(true);
    animateMoneyTo(target);
  }

  function onOverlayClick() {
    if (!overlayVisible) return;
    setOverlayVisible(false);
    setLifeOverlayVisible(true);
  }

  function onLifeOverlayBackgroundClick() {
    if (!lifeOverlayVisible) return;
    setLifeOverlayVisible(false);
    if (lives <= 0) {
      setDone(true);
    } else {
      if (index + 1 < total) {
        setIndex((i) => i + 1);
      } else {
        setDone(true);
      }
    }
  }

  function onCheckpointBackgroundClick() {
    setPendingCheckpoints((p) => {
      if (!p || p.length === 0) return p;
      const next = p.slice(0, -1);
      return next;
    });
  }

  if (initialQuestions == null && questionsState == null) {
    return (
      <div className="quiz">
        <p>Se încarcă întrebările…</p>
      </div>
    );
  }

  if (!total) {
    return (
      <div className="quiz">
        <p>Nu există întrebări. Deschide Admin și adaugă întrebări.</p>
      </div>
    );
  }

  if (done) {
    const final = lives <= 0 ? lastCheckpointValue() : bank;
    return (
      <div className="quiz">
        <div className="results-card minimal">
          <h2>Rezultate</h2>
          <p>
            Ai răspuns corect la <strong>{score}</strong> din{" "}
            <strong>{total}</strong> întrebări.
          </p>
          <p>
            Suma finală: <strong>{final} lei</strong>
          </p>
        </div>
      </div>
    );
  }

  const progress = Math.round(((index + (hasAnswered ? 1 : 0)) / total) * 100);

  const bannerColor = current?.difficulty
    ? DIFFICULTY_COLOR[current.difficulty]
    : null;

  return (
    <div
      className={`quiz ${overlayVisible ? "faded" : ""}`}
      onClick={overlayVisible ? onOverlayClick : undefined}
    >
      <div className="progress">
        <div className="progress-bar" style={{ width: `${progress}%` }} />
        <div className="progress-info">
          Întrebarea {index + 1} / {total}
        </div>
      </div>

      <div
        className="question-banner"
        style={
          bannerColor
            ? {
                background: `linear-gradient(135deg, ${bannerColor}, ${bannerColor}cc 70%)`,
              }
            : undefined
        }
      >
        <h1 className="question" aria-live="polite">
          {current.prompt}
        </h1>
      </div>

      {pendingCheckpoints.length > 0 &&
        pendingCheckpoints.map((cp, idx) => {
          const isTop = idx === pendingCheckpoints.length - 1;
          return (
            <div
              key={cp}
              className="money-overlay checkpoint-overlay"
              onClick={isTop ? onCheckpointBackgroundClick : undefined}
              role="button"
              tabIndex={0}
              style={{ zIndex: 110 + idx }}
            >
              <div
                className="checkpoint-box"
                onClick={(e) => e.stopPropagation()}
                style={{
                  transform: `translateY(${
                    -(pendingCheckpoints.length - 1 - idx) * 12
                  }px)`,
                }}
              >
                <div className="money-value">
                  🏆 Checkpoint
                  <br />
                  {cp} lei
                </div>
              </div>
            </div>
          );
        })}

      <div className="answers-grid" role="list">
        {shuffled.map((ans, i) => {
          const isSelected = selected === i;
          const isCorrect = correctIndex === i;
          const state = hasAnswered
            ? isCorrect
              ? "correct"
              : isSelected
              ? "incorrect"
              : "idle"
            : "idle";
          return (
            <button
              key={i}
              role="listitem"
              className={`answer-btn ${state}`}
              onClick={() => onAnswerClick(i)}
              disabled={hasAnswered || overlayVisible}
            >
              {ans.text}
            </button>
          );
        })}
      </div>

      <div className="controls single">
        <button
          className="btn next-btn"
          onClick={() => {
            if (!hasAnswered || overlayVisible) return;
            const target = bank;
            setOverlayVisible(true);
            animateMoneyTo(target);
          }}
          disabled={!hasAnswered || overlayVisible}
        >
          {index + 1 === total ? "Finalizează" : "Next"}
        </button>
      </div>

      {overlayVisible && (
        <div
          className="money-overlay"
          onClick={onOverlayClick}
          role="button"
          tabIndex={0}
        >
          <div
            className="money-semicircle"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="money-value">{displayedMoney} lei</div>
          </div>
        </div>
      )}

      {lifeOverlayVisible && (
        <div
          className="money-overlay"
          onClick={onLifeOverlayBackgroundClick}
          role="button"
          tabIndex={0}
        >
          <div className="life-semicircle" onClick={(e) => e.stopPropagation()}>
            <div className="money-value">
              {lives}/{maxLives} ❤️
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
