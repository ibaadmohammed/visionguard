
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react'

import {
  authAPI,
  clearToken,
  getToken,
  setToken
} from '../utils/services/api'

const AuthContext = createContext(null)

const normalizeUser = user => ({
  id: user.id,
  full_name: user.full_name || user.fullName || '',
  email: user.email,
  role: user.role
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  useEffect(() => {
    const restoreSession = async () => {
      if (!getToken()) {
        setLoading(false)
        return
      }

      try {
        const response = await authAPI.me()
        setUser(normalizeUser(response.user))
      } catch (error) {
        clearToken()
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    restoreSession()
  }, [])

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password })

    setToken(response.token)
    setUser(normalizeUser(response.user))

    return response
  }

  const register = async (fullName, email, password) => {
    const response = await authAPI.register({
      fullName,
      email,
      password
    })

    setToken(response.token)
    setUser(normalizeUser(response.user))

    return response
  }

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
