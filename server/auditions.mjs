import { AUDITION_STATUSES } from './db.mjs'

export class ValidationError extends Error {}

export class NotAllowedError extends Error {}

function assertRequestObject(input, action) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError(`Request body must be a JSON object for ${action}`)
  }
  return input
}

function trimRequiredString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(`${field} must be a non-empty string`)
  }
  return value.trim()
}

function parseScheduledAt(value) {
  const scheduledAt = trimRequiredString(value, 'scheduled_at')
  if (Number.isNaN(new Date(scheduledAt).getTime())) {
    throw new ValidationError('scheduled_at must be a valid timestamp')
  }
  return scheduledAt
}

function parseStatus(value, { required = false } = {}) {
  if (!required && value === undefined) return undefined
  if (!AUDITION_STATUSES.includes(value)) {
    throw new ValidationError(`status must be one of: ${AUDITION_STATUSES.join(', ')}`)
  }
  return value
}

function parseId(id) {
  if (!/^\d+$/.test(id)) {
    throw new ValidationError('Audition id must be a positive integer')
  }
  return Number.parseInt(id, 10)
}

function assertAllowedFields(input, allowedFields) {
  const unknownFields = Object.keys(input).filter((field) => !allowedFields.has(field))
  if (unknownFields.length > 0) {
    throw new ValidationError(`Unknown request fields: ${unknownFields.join(', ')}`)
  }
}

export function listAuditions(database, { status } = {}) {
  if (status === undefined) {
    return database
      .prepare(
        `SELECT id, hamster_name, dance_style, scheduled_at, status, created_at
         FROM auditions
         ORDER BY created_at, id`,
      )
      .all()
  }

  return database
    .prepare(
      `SELECT id, hamster_name, dance_style, scheduled_at, status, created_at
       FROM auditions
       WHERE status = ?
       ORDER BY created_at, id`,
    )
    .all(parseStatus(status, { required: true }))
}

export function createAudition(database, input) {
  const request = assertRequestObject(input, 'create')
  assertAllowedFields(request, new Set(['hamster_name', 'dance_style', 'scheduled_at', 'status']))
  return database
    .prepare(
      `INSERT INTO auditions (hamster_name, dance_style, scheduled_at, status)
       VALUES (?, ?, ?, ?)
       RETURNING id, hamster_name, dance_style, scheduled_at, status, created_at`,
    )
    .get(
      trimRequiredString(request.hamster_name, 'hamster_name'),
      trimRequiredString(request.dance_style, 'dance_style'),
      parseScheduledAt(request.scheduled_at),
      parseStatus(request.status) ?? 'draft',
    )
}

export function getAudition(database, id) {
  const auditionId = parseId(id)
  return database
    .prepare(
      `SELECT id, hamster_name, dance_style, scheduled_at, status, created_at
       FROM auditions
       WHERE id = ?`,
    )
    .get(auditionId)
}

export function updateAudition(database, id, input) {
  const request = assertRequestObject(input, 'update')
  assertAllowedFields(request, new Set(['hamster_name', 'dance_style', 'scheduled_at', 'status']))
  if (Object.keys(request).length === 0) {
    throw new ValidationError('Request body must contain at least one field to update')
  }

  const changes = {}
  if (request.hamster_name !== undefined) {
    changes.hamster_name = trimRequiredString(request.hamster_name, 'hamster_name')
  }
  if (request.dance_style !== undefined) {
    changes.dance_style = trimRequiredString(request.dance_style, 'dance_style')
  }
  if (request.scheduled_at !== undefined) {
    changes.scheduled_at = parseScheduledAt(request.scheduled_at)
  }
  if (request.status !== undefined) {
    if (request.status === 'posted') {
      throw new ValidationError('Use POST /api/auditions/:id/post to post an audition')
    }
    changes.status = parseStatus(request.status, { required: true })
  }

  const auditionId = parseId(id)
  const assignments = Object.keys(changes).map((field) => `${field} = ?`)
  if (assignments.length === 0) return getAudition(database, auditionId)

  return database
    .prepare(
      `UPDATE auditions
       SET ${assignments.join(', ')}
       WHERE id = ?
       RETURNING id, hamster_name, dance_style, scheduled_at, status, created_at`,
    )
    .get(...Object.values(changes), auditionId)
}

export function deleteAudition(database, id) {
  const auditionId = parseId(id)
  return database.prepare('DELETE FROM auditions WHERE id = ?').run(auditionId)
}

export function postAudition(database, id) {
  const auditionId = parseId(id)
  const audition = getAudition(database, auditionId)
  if (audition === undefined) return undefined
  if (audition.status !== 'scheduled') {
    throw new NotAllowedError('Only scheduled auditions can be posted')
  }

  return database
    .prepare(
      `UPDATE auditions
       SET status = 'posted'
       WHERE id = ? AND status = 'scheduled'
       RETURNING id, hamster_name, dance_style, scheduled_at, status, created_at`,
    )
    .get(auditionId)
}
