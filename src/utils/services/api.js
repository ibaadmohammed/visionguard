
const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000'

// AUTH TOKEN MANAGEMENT
export const getToken = () => localStorage.getItem('visionguard_token')

export const setToken = token => {
  localStorage.setItem('visionguard_token', token)
}

export const clearToken = () => {
  localStorage.removeItem('visionguard_token')
}

// COMMON API REQUEST HANDLER
export const apiRequest = async (endpoint, options = {}) => {
  const token = getToken()

  const headers = {
    ...(options.body instanceof FormData
      ? {}
      : { 'Content-Type': 'application/json' }),
    ...options.headers
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong.')
  }

  return data
}

// AUTHENTICATION API
export const authAPI = {
  register: payload =>
    apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  login: payload =>
    apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  me: () => apiRequest('/api/auth/me')
}

// DETECTION HISTORY API
export const detectionAPI = {
  // SAVE A DETECTION SESSION
  create: payload =>
    apiRequest('/api/detections', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  // GET ALL DETECTION SESSIONS
  getAll: () =>
    apiRequest('/api/detections'),

  // GET A SINGLE DETECTION SESSION
  getById: id =>
    apiRequest(`/api/detections/${encodeURIComponent(id)}`),

  // DELETE A DETECTION SESSION
  delete: id =>
    apiRequest(`/api/detections/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    })
}
// PROJECT MANAGEMENT API
export const projectAPI = {
  create: payload =>
    apiRequest('/api/projects', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getAll: () =>
    apiRequest('/api/projects'),

  getById: id =>
    apiRequest(`/api/projects/${encodeURIComponent(id)}`),

  update: (id, payload) =>
    apiRequest(`/api/projects/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  delete: id =>
    apiRequest(`/api/projects/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    })
}

// DATASET MANAGEMENT API
export const datasetAPI = {
  create: payload =>
    apiRequest('/api/datasets', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getAll: () =>
    apiRequest('/api/datasets'),

  getByProject: projectId =>
    apiRequest(`/api/datasets/project/${encodeURIComponent(projectId)}`),

  update: (id, payload) =>
    apiRequest(`/api/datasets/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  delete: id =>
    apiRequest(`/api/datasets/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    })
}

// UPLOADED FILES API
export const uploadAPI = {
  create: formData =>
    apiRequest('/api/uploads', {
      method: 'POST',
      body: formData
    }),

  getAll: () =>
    apiRequest('/api/uploads'),

  delete: id =>
    apiRequest(`/api/uploads/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    })
}
export const dashboardAPI = {
  getStats: () => apiRequest('/api/dashboard')
}