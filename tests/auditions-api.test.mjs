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

    const postedResponse = await fetch(`${baseUrl}/${created.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'posted' }),
    })
    assert.equal(postedResponse.status, 200)
    assert.equal((await postedResponse.json()).status, 'posted')

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
