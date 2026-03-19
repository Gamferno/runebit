import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { java } from '@codemirror/lang-java'
import { cpp } from '@codemirror/lang-cpp'
import { oneDark } from '@codemirror/theme-one-dark'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import { useGame } from '../contexts/GameContext'
import HUD from '../components/HUD'
import { playCastSound, playHitSound, playFailSound, playCritSound, playVictoryFanfare } from '../utils/audio'
import { formatJs } from '../utils/formatCode'
import './BattleScreen.css'

const LANG_EXT = { javascript, python, java, cpp }
const LANG_LABELS = { javascript: 'JavaScript', python: 'Python', java: 'Java', cpp: 'C++' }

export default function BattleScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { fetchProblem, runCode, submitCode, revealSolution, currentProblem, assets } = useGame()

  const [language, setLanguage] = useState('javascript')
  const [code, setCode] = useState('')
  const [output, setOutput] = useState([])
  const [battleLog, setBattleLog] = useState([])
  const [enemyHp, setEnemyHp] = useState(100)
  const [maxHp, setMaxHp] = useState(100)
  const [turn, setTurn] = useState(0)
  const [running, setRunning] = useState(false)
  const [defeated, setDefeated] = useState(false)
  const [solutionVisible, setSolutionVisible] = useState(false)
  const [solutionCode, setSolutionCode] = useState(null)
  const [formattedSolutions, setFormattedSolutions] = useState({})

  // Player health
  const [playerHp, setPlayerHp] = useState(100)
  const [maxPlayerHp] = useState(100)
  const [heroHurt, setHeroHurt] = useState(false)
  
  // Animation & Audio State
  const [heroState, setHeroState] = useState('idle')
  const [enemyState, setEnemyState] = useState('idle')
  const [showHitMarker, setShowHitMarker] = useState(false)
  
  // New state for API integration
  const [advData, setAdvData] = useState(null)
  const [activeTab, setActiveTab] = useState('description') // 'description', 'testcases', 'hints'

  useEffect(() => {
    loadProblem()
  }, [id])

  useEffect(() => {
    if (currentProblem) {
      const starter = currentProblem.starterCode?.[language] || '// Write your solution'
      setCode(starter)
    }
  }, [language, currentProblem])

  async function loadProblem() {
    try {
      const prob = await fetchProblem(id)
      setEnemyHp(prob.enemyHp)
      setMaxHp(prob.enemyHp)
      setCode(prob.starterCode?.[language] || '')
      setBattleLog([
        { type: 'system', text: `⚔ A wild ${prob.enemyName} appeared!` },
        { type: 'info', text: `Realm: ${prob.topic.rpgName} — ${prob.difficulty.toUpperCase()}` },
        { type: 'tip', text: '💡 Write code, RUN to test, ATTACK to submit!' },
      ])

      // Fetch from LeetCode API
      const slug = prob.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      try {
        const lcRes = await fetch(`https://leetcode-api-pied.vercel.app/problem/${slug}`)
        if (lcRes.ok) {
          const lcData = await lcRes.json()
          setAdvData(lcData)
        }
      } catch (e) {
        console.warn('Failed to fetch LeetCode advanced data', e)
      }
    } catch (err) {
      setBattleLog([{ type: 'error', text: `Failed to load: ${err.message}` }])
    }
  }

  const handleRun = async () => {
    setRunning(true)
    setOutput([{ type: 'system', text: '▶ Running tests...' }])
    
    // Play spellcast animation and sound
    setHeroState('cast')
    playCastSound()
    setTimeout(() => setHeroState('idle'), 600)

    try {
      const result = await runCode(Number(id), language, code)
      
      if (result.passedCount > 0) {
        // Even 1 pass makes the enemy flinch
        setTimeout(() => {
          setEnemyState('hit')
          setShowHitMarker(true)
          playHitSound()
          setTimeout(() => { setEnemyState('idle'); setShowHitMarker(false) }, 500)
        }, 600)
      } else {
        setTimeout(() => playFailSound(), 600)
        // Failed run — player takes 15 damage
        setHeroHurt(true)
        setTimeout(() => setHeroHurt(false), 600)
        setPlayerHp(prev => Math.max(0, prev - 15))
        setBattleLog(log => [...log, { type: 'fail', text: `😤 All tests failed! -15 HP from careless spell!` }])
      }

      const lines = result.results.map((r, i) => ({
        type: r.passed ? 'pass' : 'fail',
        text: `Test ${i + 1}: ${r.passed ? '✅ PASSED' : '❌ FAILED'} | Input: ${r.input} | Expected: ${r.expected}${r.passed ? '' : ` | Got: ${r.actual || r.error}`}`,
      }))
      lines.push({ type: 'system', text: `${result.passedCount}/${result.totalCount} tests passed` })
      setOutput(lines)
    } catch (err) {
      setTimeout(() => playFailSound(), 600)
      setOutput([{ type: 'error', text: `Error: ${err.message}` }])
    } finally {
      setRunning(false)
    }
  }

  const handleAttack = async () => {
    if (defeated) return
    setRunning(true)
    setTurn(t => t + 1)
    setBattleLog(log => [...log, { type: 'action', text: `⚔ Turn ${turn + 1}: Submitting attack...` }])

    // Spellcast
    setHeroState('cast')
    playCastSound()
    setTimeout(() => setHeroState('idle'), 600)

    try {
      const result = await submitCode(Number(id), language, code, solutionVisible)

      if (result.status === 'passed') {
        setTimeout(() => {
          setEnemyHp(0)
          setDefeated(true)
          setEnemyState('death')
          playCritSound()
          
          setBattleLog(log => [
            ...log,
            { type: 'damage', text: `💥 Critical hit! All ${result.totalCount} tests passed!` },
            solutionVisible
              ? { type: 'info', text: `📖 Solution was peeked — XP reduced to 20%: +${result.xpGained} XP (${result.stars}★)` }
              : { type: 'victory', text: `🏆 Enemy defeated! +${result.xpGained} XP (${result.stars}★)` },
          ])
          setOutput([
            { type: 'pass', text: `✅ ALL TESTS PASSED — ${result.stars} stars earned!` },
            { type: 'system', text: `XP gained: +${result.xpGained}` },
          ])
          
          // Play fanfare before navigating
          setTimeout(() => playVictoryFanfare(), 500)
          setTimeout(() => navigate('/victory', { state: { stars: result.stars, xp: result.xpGained, problem: currentProblem } }), 3200)
        }, 600)
      } else {
        setTimeout(() => {
          const dmg = Math.floor((result.passedCount / result.totalCount) * maxHp * 0.3)
          if (dmg > 0) {
            setEnemyHp(prev => Math.max(0, prev - dmg))
            setEnemyState('hit')
            setShowHitMarker(true)
            playHitSound()
            setTimeout(() => { setEnemyState('idle'); setShowHitMarker(false) }, 500)
          } else {
            playFailSound()
          }

          setBattleLog(log => [
            ...log,
            { type: 'fail', text: `🛡 ${result.passedCount}/${result.totalCount} tests passed. The enemy fights back! -25 HP` },
          ])
          // Enemy counterattack — player takes 25 damage
          setHeroHurt(true)
          setTimeout(() => setHeroHurt(false), 600)
          setPlayerHp(prev => Math.max(0, prev - 25))
          const lines = result.results.map((r, i) => ({
            type: r.passed ? 'pass' : 'fail',
            text: `Test ${i + 1}: ${r.passed ? '✅' : '❌'} ${r.input} → ${r.passed ? r.expected : (r.actual || r.error)}`,
          }))
          setOutput(lines)
        }, 600)
      }
    } catch (err) {
      setBattleLog(log => [...log, { type: 'error', text: `Attack failed: ${err.message}` }])
      setOutput([{ type: 'error', text: err.message }])
    } finally {
      setRunning(false)
    }
  }

  const handleRevealSolution = async () => {
    if (solutionVisible) { setSolutionVisible(false); return }
    try {
      const data = await revealSolution(Number(id))
      setSolutionCode(data.solution)
      setSolutionVisible(true)
      setBattleLog(log => [...log, { type: 'info', text: `📖 Solution revealed! XP reward reduced to 20% if you submit.` }])
      // Pre-format JS solution
      if (data.solution?.javascript && data.solution.javascript !== 'N/A') {
        formatJs(data.solution.javascript).then(formatted => {
          setFormattedSolutions(prev => ({ ...prev, javascript: formatted }))
        })
      }
    } catch (err) {
      setBattleLog(log => [...log, { type: 'error', text: err.message }])
    }
  }

  if (!currentProblem) {
    return <div className="battle page-container"><HUD /><div className="battle__loading">⏳ Loading encounter...</div></div>
  }

  const hpPct = Math.max(0, (enemyHp / maxHp) * 100)

  return (
    <div className="battle page-container">
      <HUD />

      <div className="battle__layout">
        {/* Left: Arena + Info */}
        <div className="battle__left">
          <div className="battle__arena">
            <div className="battle__enemy-zone">
              <span className="battle__enemy-name">{currentProblem.enemyName}</span>
              <span className="battle__enemy-diff" data-diff={currentProblem.difficulty}>
                {currentProblem.difficulty.toUpperCase()}
              </span>
              <div className="battle__hp-bar">
                <div className="battle__hp-fill" style={{ width: `${hpPct}%` }} />
                <span className="battle__hp-text">{enemyHp} / {maxHp}</span>
              </div>
              <div className={`battle__enemy-sprite ${enemyState !== 'idle' ? `anim-enemy-${enemyState}` : ''}`}>
                <img src={
                  assets.villainsByDifficulty[currentProblem.difficulty]
                  || assets.villains[currentProblem.enemyTier]
                  || assets.villains[1]
                } alt={currentProblem.enemyName} onError={(e) => { e.target.style.display = 'none' }} />
                {showHitMarker && <span className="battle__hit-marker">💢</span>}
              </div>
            </div>

            <div className={`battle__hero-sprite ${heroState !== 'idle' ? `anim-hero-${heroState}` : ''} ${heroHurt ? 'anim-hero-hurt' : ''}`}>
              <img src={assets.player} alt="Hero" onError={(e) => { e.target.style.display = 'none' }} />
              {/* Player HP Bar */}
              <div className="battle__player-hp">
                <div className="battle__player-hp-label">HP</div>
                <div className="battle__player-hp-track">
                  <div
                    className="battle__player-hp-fill"
                    style={{
                      width: `${(playerHp / maxPlayerHp) * 100}%`,
                      background: playerHp > 50 ? 'linear-gradient(90deg,#39ff14,#00c853)'
                               : playerHp > 25 ? 'linear-gradient(90deg,#ffd600,#ff8f00)'
                               : 'linear-gradient(90deg,#ff1744,#b71c1c)',
                    }}
                  />
                </div>
                <span className="battle__player-hp-text">{playerHp}/{maxPlayerHp}</span>
              </div>
            </div>
          </div>

          {/* Problem info tabs */}
          <div className="battle__info pixel-panel">
            <h3 className="battle__title">{currentProblem.title} <span className="battle__xp">🏅 {currentProblem.xpReward} XP</span></h3>
            
            <div className="battle__tabs">
              <button className={`battle__tab ${activeTab === 'description' ? 'active' : ''}`} onClick={() => setActiveTab('description')}>Scrolls of Lore</button>
              {advData?.hints?.length > 0 && (
                <button className={`battle__tab ${activeTab === 'hints' ? 'active' : ''}`} onClick={() => setActiveTab('hints')}>Hints</button>
              )}
            </div>

            <div className="battle__tab-content">
              {activeTab === 'description' && (
                advData?.content ? (
                  <div className="leetcode-content" dangerouslySetInnerHTML={{ __html: advData.content }} />
                ) : (
                  <p className="battle__desc">{currentProblem.description}</p>
                )
              )}

              {activeTab === 'hints' && advData?.hints && (
                <div className="battle__hints">
                  {advData.hints.map((hint, i) => (
                    <div key={i} className="battle__hint" dangerouslySetInnerHTML={{ __html: `💡 ${hint}` }} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Battle log */}
          <div className="battle__log pixel-panel">
            <span className="battle__log-title">📜 Battle Log</span>
            <div className="battle__log-entries">
              {battleLog.slice(-6).map((l, i) => (
                <div key={i} className={`battle__log-entry battle__log-entry--${l.type}`}>{l.text}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Editor */}
        <div className="battle__right">
          <div className="battle__editor-header">
            <span className="battle__editor-title">⚡ The Forge</span>
            <div className="battle__editor-controls">
              <select
                className="battle__lang-select"
                value={language}
                onChange={e => setLanguage(e.target.value)}
              >
                {Object.entries(LANG_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <span className="battle__turn">Turn {turn}</span>
            </div>
          </div>

          <div className="battle__editor-wrapper">
            <CodeMirror
              value={code}
              height="280px"
              theme={oneDark}
              extensions={[LANG_EXT[language]?.() || javascript()]}
              onChange={setCode}
              className="battle__codemirror"
              editable={true}
            />
          </div>

          {solutionVisible && solutionCode && (
            <div className="battle__solution pixel-panel">
              <span className="battle__solution-title">📖 Solution Revealed</span>

              {/* Language tabs */}
              <div className="battle__solution-langtabs">
                {Object.entries(LANG_LABELS).map(([lang, label]) => (
                  <button
                    key={lang}
                    className={`battle__solution-langtab ${language === lang ? 'active' : ''}`}
                    onClick={() => setLanguage(lang)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Code viewer */}
              <div className="battle__solution-editor">
                {solutionCode[language] && solutionCode[language] !== 'N/A' ? (
                  <CodeMirror
                    value={formattedSolutions[language] || solutionCode[language]}
                    height="auto"
                    maxHeight="260px"
                    theme={oneDark}
                    extensions={[LANG_EXT[language]?.() || javascript()]}
                    editable={false}
                    basicSetup={{ lineNumbers: true, foldGutter: false }}
                    className="battle__solution-codemirror"
                  />
                ) : (
                  <div className="battle__solution-na">
                    <span>⚠ No solution available for {LANG_LABELS[language]} yet.</span>
                    <span>Try switching to JavaScript for the reference solution.</span>
                  </div>
                )}
              </div>


            </div>
          )}

          {/* Output */}
          <div className="battle__output pixel-panel">
            <span className="battle__output-title">📟 Output</span>
            <div className="battle__output-entries">
              {output.length === 0
                ? <div className="battle__output-entry battle__output-entry--system">Ready. Write your solution and click RUN to test...</div>
                : output.map((o, i) => (
                    <div key={i} className={`battle__output-entry battle__output-entry--${o.type}`}>{o.text}</div>
                  ))
              }
            </div>
          </div>

          {/* Action buttons */}
          <div className="battle__actions">
            <button className="pixel-btn pixel-btn--blue" onClick={handleRun} disabled={running}>
              {running ? '⏳...' : '▶ RUN'}
            </button>
            <button className="pixel-btn pixel-btn--gold" onClick={handleAttack} disabled={running || defeated}>
              {defeated ? '🏆 VICTORY' : '⚔ ATTACK'}
            </button>
            <button className="pixel-btn pixel-btn--outline" onClick={handleRevealSolution} disabled={running}>
              {solutionVisible ? '🙈 Hide' : '📖 Solution'}
            </button>
            <button className="pixel-btn pixel-btn--red" onClick={() => navigate('/map')} disabled={running}>
              🏃 Retreat
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
