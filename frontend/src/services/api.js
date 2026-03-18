import axios from 'axios'

const API_BASE = '/api/v1'

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
export const sendMessage = (message) =>
  api.post('/chat', { message })

export const getChatHistory = () =>
  api.get('/chat/history')

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

export default api
