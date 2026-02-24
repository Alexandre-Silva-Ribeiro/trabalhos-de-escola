import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"

import { config } from "./config.js"

let initError = null

function parsePrivateKey(raw) {
  if (!raw) {
    return ""
  }
  return raw.replace(/\\n/g, "\n")
}

function getFirebaseOptions() {
  const options = {}

  if (config.firebase.projectId) {
    options.projectId = config.firebase.projectId
  }

  if (config.firebase.clientEmail && config.firebase.privateKey) {
    options.credential = cert({
      projectId: config.firebase.projectId,
      clientEmail: config.firebase.clientEmail,
      privateKey: parsePrivateKey(config.firebase.privateKey)
    })
  }

  return options
}

function ensureFirebaseApp() {
  if (getApps().length) {
    return getApps()[0]
  }

  if (!config.firebase.projectId) {
    throw new Error("firebase_project_id_missing")
  }

  try {
    return initializeApp(getFirebaseOptions())
  } catch (error) {
    initError = error
    throw error
  }
}

export function getFirebaseAdminAuth() {
  if (initError) {
    throw new Error(`firebase_admin_init_failed:${String(initError.message || initError)}`)
  }

  const app = ensureFirebaseApp()
  return getAuth(app)
}

export function isFirebaseConfigured() {
  return Boolean(config.firebase.projectId)
}

