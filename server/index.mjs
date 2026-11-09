import { createApplication } from './app.mjs'
import { DEFAULT_AUDITIONS_DATABASE_PATH, initializeAuditionsDatabase } from './db.mjs'

const host = process.env.HOST ?? '127.0.0.1'
const port = Number.parseInt(process.env.PORT ?? '4000', 10)
const databasePath = process.env.DATABASE_PATH ?? DEFAULT_AUDITIONS_DATABASE_PATH

const database = initializeAuditionsDatabase(databasePath)
createApplication(database).listen(port, host, () => {
  console.log(`API listening on http://${host}:${port}`)
})
