import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { createApplication } from '../server/app.mjs'
import { initializeAuditionsDatabase } from '../server/db.mjs'

const databaseDirectory = await mkdtemp(join(tmpdir(), 'auditions-api-'))
const database = initializeAuditionsDatabase(join(databaseDirectory, 'auditions.sqlite3'))

after(async () => {
  database.close()
  await rm(databaseDirectory, { recursive: true, force: true })
})

test('supports the audition lifecycle end to end', async () => {
  const server = createApplication(database).listen(0, '127.0.0.1')

  try {
    await new Promise((resolve) => server.on('listening', resolve))
    const baseUrl = `http://127.0.0.1:${server.address().port}/api/auditions`

    const scheduledAt = '2026-11-09T15:00:00.000Z'
    const createResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        hamster_name: 'Pickle',
        dance_style: 'moonwalk',
        scheduled_at: scheduledAt,
      }),
    })
    assert.equal(createResponse.status, 201)
    const created = await createResponse.json()
    assert.equal(created.hamster_name, 'Pickle')
    assert.equal(created.status, 'draft')
    assert.match(created.created_at, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)

    const listResponse = await fetch(baseUrl)
    assert.equal(listResponse.status, 200)
    const auditions = await listResponse.json()
    assert.equal(auditions.length, 1)
    assert.equal(auditions[0].id, created.id)

    const scheduledResponse = await fetch(`${baseUrl}/${created.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'scheduled' }),
    })
    assert.equal(scheduledResponse.status, 200)
    assert.equal((await scheduledResponse.json()).status, 'scheduled')

    const draftPostResponse = await fetch(`${baseUrl}/999/post`, { method: 'POST' })
    assert.equal(draftPostResponse.status, 404)

    const postedResponse = await fetch(`${baseUrl}/${created.id}/post`, { method: 'POST' })
    assert.equal(postedResponse.status, 200)
    const posted = await postedResponse.json()
    assert.equal(posted.status, 'posted')

    const republishResponse = await fetch(`${baseUrl}/${created.id}/post`, { method: 'POST' })
    assert.equal(republishResponse.status, 409)
    assert.match((await republishResponse.json()).message, /Only scheduled auditions can be posted/)

    const deleteResponse = await fetch(`${baseUrl}/${created.id}`, { method: 'DELETE' })
    assert.equal(deleteResponse.status, 204)
    assert.equal((await fetch(`${baseUrl}/${created.id}`)).status, 404)
  } finally {
    server.close()
  }
})

test('rejects invalid audition payloads', async () => {
  const server = createApplication(database).listen(0, '127.0.0.1')

  try {
    await new Promise((resolve) => server.on('listening', resolve))
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/auditions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'scheduled' }),
    })
    assert.equal(response.status, 400)
    assert.match((await response.json()).message, /hamster_name must be a non-empty string/)
  } finally {
    server.close()
  }
})

test('guards the posted transition and filters the public list', async () => {
  const server = createApplication(database).listen(0, '127.0.0.1')

  try {
    await new Promise((resolve) => server.on('listening', resolve))
    const baseUrl = `http://127.0.0.1:${server.address().port}/api/auditions`
    const scheduleRequest = (hamsterName) => ({
      hamster_name: hamsterName,
      dance_style: 'moonwalk',
      scheduled_at: '2026-11-09T15:00:00.000Z',
    })

    const draftResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(scheduleRequest('Pickle')),
    })
    const draft = await draftResponse.json()

    const draftPostResponse = await fetch(`${baseUrl}/${draft.id}/post`, { method: 'POST' })
    assert.equal(draftPostResponse.status, 409)
    assert.match((await draftPostResponse.json()).message, /Only scheduled auditions can be posted/)

    const draftPatchResponse = await fetch(`${baseUrl}/${draft.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'posted' }),
    })
    assert.equal(draftPatchResponse.status, 400)
    assert.match(
      (await draftPatchResponse.json()).message,
      /Use POST \/api\/auditions\/:id\/post to post an audition/,
    )

    const scheduledResponse = await fetch(`${baseUrl}/${draft.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'scheduled' }),
    })
    const scheduled = await scheduledResponse.json()

    const publicBeforeResponse = await fetch(`${baseUrl}?status=posted`)
    assert.equal(publicBeforeResponse.status, 200)
    assert.deepEqual(await publicBeforeResponse.json(), [])

    const postedResponse = await fetch(`${baseUrl}/${scheduled.id}/post`, { method: 'POST' })
    assert.equal(postedResponse.status, 200)

    const publicAfterResponse = await fetch(`${baseUrl}?status=posted`)
    assert.equal(publicAfterResponse.status, 200)
    const postedAuditions = await publicAfterResponse.json()
    assert.deepEqual(
      postedAuditions.map(({ hamster_name, dance_style, scheduled_at, status }) => ({
        hamster_name,
        dance_style,
        scheduled_at,
        status,
      })),
      [{ hamster_name: 'Pickle', dance_style: 'moonwalk', scheduled_at: '2026-11-09T15:00:00.000Z', status: 'posted' }],
    )
  } finally {
    server.close()
  }
})
