import axios from 'axios'
import { Capacitor } from '@capacitor/core'

// Detect platform: native apps need the full production URL, web uses Vite proxy
const isNative = typeof window !== 'undefined' && (
  window.__TAURI__ ||             // Tauri desktop
  (Capacitor && Capacitor.isNativePlatform()) // Capacitor mobile
)

const API_BASE = isNative
  ? (import.meta.env.VITE_API_URL || 'https://bribox-bridge-app.fly.dev/api/v1')
  : '/api/v1'

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Intercept requests to add JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bribox_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Intercept responses to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('bribox_token')
      localStorage.removeItem('bribox_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth
export const register = (email, password, role) =>
  api.post('/register', { email, password, role })

export const login = (email, password) =>
  api.post('/login', { email, password })

// Chat
export const sendMessage = (message, sessionId) =>
  api.post('/chat', { message, session_id: sessionId })

export const getSessions = () =>
  api.get('/chats')

export const createSession = (title) =>
  api.post('/chats', { title })

export const updateSession = (id, data) =>
  api.patch(`/chats/${id}`, data)

export const deleteSession = (id) =>
  api.delete(`/chats/${id}`)

export const getSessionHistory = (id) =>
  api.get(`/chats/${id}/history`)

// Admin
export const getDashboardStats = () =>
  api.get('/admin/stats')

export const getDraftListings = () =>
  api.get('/admin/listings/drafts')

export const getActiveListings = () =>
  api.get('/admin/listings/active')

export const getPermissions = () =>
  api.get('/admin/permissions')

export const updateProperty = (id, data) =>
  api.put(`/admin/property/${id}`, data)

export const approveProperty = (id) =>
  api.post(`/admin/property/${id}/approve`)

export const deleteProperty = (id) =>
  api.delete(`/admin/property/${id}`)

export const approvePermission = (id) =>
  api.post(`/admin/permission/${id}/approve`)

export const denyPermission = (id) =>
  api.post(`/admin/permission/${id}/deny`)

// Bridge
export const scrapeProperty = (sourceUrl) =>
  api.post('/bridge/scrape', { source_url: sourceUrl })

export const refineDraft = (id, instruction) =>
  api.post(`/bridge/refine/${id}`, { instruction })

export const publishProperty = (id, platform) =>
  api.post(`/bridge/publish/${id}`, { platform })

export default api
