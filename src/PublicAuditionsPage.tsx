import type { Audition } from './types'

interface PublicAuditionsPageProps {
  auditions: Audition[]
}

export default function PublicAuditionsPage({ auditions }: PublicAuditionsPageProps) {
  const postedAuditions = auditions.filter((audition) => audition.status === 'posted')

  return (
    <main>
      <h1>Posted Hamster Dance Auditions</h1>
      {postedAuditions.length === 0 ? (
        <p>No auditions have been posted yet.</p>
      ) : (
        <ul>
          {postedAuditions.map((audition) => (
            <li key={audition.id}>
              <strong>{audition.hamsterName}</strong> — {audition.danceStyle}
              <code>{new Date(audition.scheduledAt).toLocaleString()}</code>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
