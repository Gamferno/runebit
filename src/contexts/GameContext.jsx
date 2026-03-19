import { createContext, useContext, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'

const GameContext = createContext(null)

/* ---- Asset paths ---- */
const ASSETS = {
  player: '/assets/player-hero-inverted.png',
  // Per-difficulty villains: easy=small goblin, medium=demon warrior, boss=per-tier boss
  villainsByDifficulty: {
    easy: '/assets/villain-t1.png',
    medium: '/assets/villain-medium.png',
  },
  // Per-tier boss villains (used for 'boss' difficulty)
  villains: {
    1: '/assets/villain-t1.png',
    2: '/assets/villain-t2.png',
    3: '/assets/villain-t3.png',
    4: '/assets/villain-t4.png',
    5: '/assets/villain-t5.png',
    6: '/assets/villain-t6.png',
    7: '/assets/villain-t7.png',
  },
  victory: '/assets/victory-emblem.png',
  battleBg: '/assets/battle-bg.png',
}

export function GameProvider({ children }) {
  const { apiFetch, user } = useAuth()
  const [skillTree, setSkillTree] = useState(null)
  const [tierUnlocked, setTierUnlocked] = useState({})
  const [currentProblem, setCurrentProblem] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchTree = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch('/problems/tree')
      setSkillTree(data.tree)
      setTierUnlocked(data.tierUnlocked)
    } catch (err) {
      console.error('Failed to fetch tree:', err)
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  const fetchProblem = useCallback(async (id) => {
    const data = await apiFetch(`/problems/${id}`)
    setCurrentProblem(data.problem)
    return data.problem
  }, [apiFetch])

  const fetchStats = useCallback(async () => {
    const data = await apiFetch('/users/me/stats')
    setStats(data)
    return data
  }, [apiFetch])

  const runCode = useCallback(async (problemId, language, code) => {
    return await apiFetch('/submissions/run', {
      method: 'POST',
      body: JSON.stringify({ problemId, language, code }),
    })
  }, [apiFetch])

  const submitCode = useCallback(async (problemId, language, code, peeked = false) => {
    return await apiFetch('/submissions/submit', {
      method: 'POST',
      body: JSON.stringify({ problemId, language, code, peeked }),
    })
  }, [apiFetch])

  const revealSolution = useCallback(async (problemId) => {
    return await apiFetch(`/problems/${problemId}/solution`, {
      method: 'POST',
      body: JSON.stringify({}),
    })
  }, [apiFetch])

  return (
    <GameContext.Provider value={{
      skillTree, tierUnlocked, currentProblem, stats, loading,
      fetchTree, fetchProblem, fetchStats, runCode, submitCode, revealSolution,
      setCurrentProblem, assets: ASSETS, user,
    }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}

export { ASSETS }
