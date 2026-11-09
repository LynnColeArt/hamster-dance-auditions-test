import { useEffect, useState } from 'react'
import PublicAuditionsPage from './PublicAuditionsPage'
import type { Audition, AuditionStatus } from './types'

const publicAuditionsPath = '/auditions'

function isPublicAuditionsPage(): boolean {
  return window.location.pathname === publicAuditionsPath
}

export default function App() {
  const [auditions, setAuditions] = useState<Audition[]>([])
  const [error, setError] = useState('')
  const [hamsterName, setHamsterName] = useState('')
  const [danceStyle, setDanceStyle] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')

  async function loadAuditions() {
    const response = await fetch('/api/auditions')
    if (!response.ok) throw new Error(`List request failed (${response.status})`)
    setAuditions(await response.json())
  }

  useEffect(() => {
    loadAuditions().catch((error: unknown) => {
      setError(error instanceof Error ? error.message : 'Unable to load auditions')
    })
  }, [])

  if (isPublicAuditionsPage()) {
    return <PublicAuditionsPage auditions={auditions} />
  }

  async function postAudition(id: number) {
    setError('')
    const response = await fetch(`/api/auditions/${id}/post`, { method: 'POST' })
    if (response.ok) {
      await loadAuditions()
      return
    }
    setError(`Post request failed (${response.status})`)
  }

  async function submitAudition(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const response = await fetch('/api/auditions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        hamster_name: hamsterName,
        dance_style: danceStyle,
        scheduled_at: new Date(scheduledAt).toISOString(),
      }),
    })
    if (response.ok) {
      setHamsterName('')
      setDanceStyle('')
      setScheduledAt('')
      await loadAuditions()
      return
    }
    setError(`Create request failed (${response.status})`)
  }

  async function updateStatus(id: number, status: AuditionStatus) {
    setError('')
    const response = await fetch(`/api/auditions/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (response.ok) {
      await loadAuditions()
      return
    }
    setError(`Update request failed (${response.status})`)
  }

  async function deleteAudition(id: number) {
    setError('')
    const response = await fetch(`/api/auditions/${id}`, { method: 'DELETE' })
    if (response.ok) {
      await loadAuditions()
      return
    }
    setError(`Delete request failed (${response.status})`)
  }

  return (
    <main>
      <h1>Hamster Dance Auditions</h1>
      {error && <p role="alert">{error}</p>}

      <form onSubmit={submitAudition}>
        <label>
          Hamster
          <input
            value={hamsterName}
            onChange={(event) => setHamsterName(event.target.value)}
            required
          />
        </label>
        <label>
          Dance style
          <input
            value={danceStyle}
            onChange={(event) => setDanceStyle(event.target.value)}
            required
          />
        </label>
        <label>
          Scheduled at
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
            required
          />
        </label>
        <button type="submit">Create audition</button>
      </form>

      <ul>
        {auditions.map((audition) => (
          <li key={audition.id}>
            <strong>{audition.hamsterName}</strong> — {audition.danceStyle}
            <code>{new Date(audition.scheduledAt).toLocaleString()}</code>
            <span>{audition.status}</span>
            {audition.status === 'draft' && (
              <button type="button" onClick={() => updateStatus(audition.id, 'scheduled')}>
                Mark scheduled
              </button>
            )}
            {audition.status === 'scheduled' && (
              <button type="button" onClick={() => postAudition(audition.id)}>
                Post
              </button>
            )}
            <button type="button" onClick={() => deleteAudition(audition.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}
