import express from 'express'
import {
  createAudition,
  deleteAudition,
  getAudition,
  listAuditions,
  NotAllowedError,
  postAudition,
  updateAudition,
  ValidationError,
} from './auditions.mjs'

export function createApplication(database) {
  const application = express()
  application.use(express.json({ limit: '1mb' }))

  application.get('/api/healthz', (_request, response) => {
    response.json({ ok: true })
  })

  application.get('/api/auditions', (request, response) => {
    const status = request.query.status
    response.json(listAuditions(database, { status: typeof status === 'string' ? status : undefined }))
  })

  application.post('/api/auditions', (request, response) => {
    response.status(201).json(createAudition(database, request.body))
  })

  application.get('/api/auditions/:id', (request, response) => {
    const audition = getAudition(database, request.params.id)
    if (audition === undefined) return response.sendStatus(404)
    response.json(audition)
  })

  application.patch('/api/auditions/:id', (request, response) => {
    const audition = updateAudition(database, request.params.id, request.body)
    if (audition === undefined) return response.sendStatus(404)
    response.json(audition)
  })

  application.post('/api/auditions/:id/post', (request, response) => {
    const audition = postAudition(database, request.params.id)
    if (audition === undefined) return response.sendStatus(404)
    response.json(audition)
  })

  application.delete('/api/auditions/:id', (request, response) => {
    const result = deleteAudition(database, request.params.id)
    if (result.changes === 0) return response.sendStatus(404)
    response.sendStatus(204)
  })

  application.use((_request, response) => {
    response.sendStatus(404)
  })

  application.use((error, _request, response, _next) => {
    if (error instanceof ValidationError) return response.status(400).json({ message: error.message })
    if (error instanceof NotAllowedError) return response.status(409).json({ message: error.message })
    response.status(500).json({ message: 'Internal server error' })
  })

  return application
}
