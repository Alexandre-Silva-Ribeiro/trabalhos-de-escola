import { config } from "./config.js"
import { getFirebaseAdminAuth, isFirebaseConfigured } from "./firebase.js"
import { isSupabaseConfigured, supabaseAdmin } from "./supabase.js"

function readBearerToken(req) {
  const header = req.headers.authorization
  if (!header || !header.startsWith("Bearer ")) {
    return ""
  }
  return header.slice("Bearer ".length).trim()
}

async function verifyFirebaseToken(token) {
  if (!isFirebaseConfigured()) {
    throw new Error("firebase_not_configured")
  }

  const firebaseAuth = getFirebaseAdminAuth()
  const decoded = await firebaseAuth.verifyIdToken(token, true)
  return {
    userId: decoded.uid,
    email: decoded.email || "",
    user: decoded,
    provider: "firebase"
  }
}

async function verifySupabaseToken(token) {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    throw new Error("supabase_not_configured")
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user) {
    throw new Error("invalid_supabase_token")
  }

  return {
    userId: data.user.id,
    email: data.user.email || "",
    user: data.user,
    provider: "supabase"
  }
}

export async function authMiddleware(req, res, next) {
  const token = readBearerToken(req)
  if (!token) {
    return res.status(401).json({ error: "Missing token" })
  }

  const primary = config.authProvider === "supabase" ? "supabase" : "firebase"
  const secondary = primary === "firebase" ? "supabase" : "firebase"

  const verifiers = {
    firebase: verifyFirebaseToken,
    supabase: verifySupabaseToken
  }

  try {
    req.auth = await verifiers[primary](token)
    return next()
  } catch (primaryError) {
    try {
      req.auth = await verifiers[secondary](token)
      return next()
    } catch {
      const message = String(primaryError?.message || "")
      if (message.includes("not_configured")) {
        return res.status(500).json({ error: `Auth provider not configured (${primary})` })
      }
      return res.status(401).json({ error: "Invalid token" })
    }
  }
}

