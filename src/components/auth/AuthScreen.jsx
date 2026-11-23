
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'

export default function AuthScreen() {
  const { login, register } = useAuth()

  const [mode, setMode] = useState('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isRegister = mode === 'register'

  const handleSubmit = async event => {
    event.preventDefault()
    setError('')

    if (isRegister && fullName.trim().length < 2) {
      setError('Please enter your full name.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }

    if (password.length < 8) {
      setError('Password must contain at least 8 characters.')
      return
    }

    if (password.length > 72) {
      setError('Password cannot exceed 72 characters.')
      return
    }

    try {
      setLoading(true)

      if (isRegister) {
        await register(fullName.trim(), email.trim(), password)
      } else {
        await login(email.trim(), password)
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const changeMode = nextMode => {
    setMode(nextMode)
    setError('')
    setPassword('')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12 text-white">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl md:grid-cols-2">

        <section className="hidden flex-col justify-between bg-gradient-to-br from-orange-500/20 via-slate-900 to-slate-950 p-10 md:flex">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-400 text-xl font-black text-slate-950">
                V
              </span>
              <span className="text-2xl font-bold">
                Vision<span className="text-orange-400">Guard</span>
              </span>
            </div>

            <div className="mt-24">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-400">
                Multi-model computer vision
              </p>

              <h1 className="mt-5 text-4xl font-bold leading-tight">
                See beyond the
                <span className="text-orange-400"> image.</span>
              </h1>

              <p className="mt-5 leading-7 text-slate-400">
                Explore intelligent object detection, model benchmarking,
                dataset evaluation and real-time computer vision.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            VisionGuard · AI Computer Vision Laboratory
          </p>
        </section>

        <section className="p-7 sm:p-10">
          <div className="mb-8 md:hidden">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-400 font-black text-slate-950">
                V
              </span>
              <span className="text-xl font-bold">
                Vision<span className="text-orange-400">Guard</span>
              </span>
            </div>
          </div>

          <p className="text-sm font-semibold uppercase tracking-widest text-orange-400">
            Welcome to VisionGuard
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            {isRegister ? 'Create your account' : 'Welcome back'}
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            {isRegister
              ? 'Register to access your computer vision workspace.'
              : 'Sign in to continue to your AI workspace.'}
          </p>

          <div className="mt-7 grid grid-cols-2 rounded-xl bg-slate-950 p-1">
            <button
              type="button"
              onClick={() => changeMode('login')}
              className={`rounded-lg py-2.5 text-sm font-semibold transition ${
                !isRegister
                  ? 'bg-orange-400 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => changeMode('register')}
              className={`rounded-lg py-2.5 text-sm font-semibold transition ${
                isRegister
                  ? 'bg-orange-400 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            {isRegister && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Full name
                </label>
                <input
                  type="text"
                  autoComplete="name"
                  required
                  maxLength={120}
                  value={fullName}
                  onChange={event => setFullName(event.target.value)}
                  placeholder="Enter your full name"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition placeholder:text-slate-600 focus:border-orange-400"
                />
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Email address
              </label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition placeholder:text-slate-600 focus:border-orange-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Password
              </label>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  required
                  minLength={8}
                  maxLength={72}
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 pr-20 outline-none transition placeholder:text-slate-600 focus:border-orange-400"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(value => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-orange-400 hover:text-orange-300"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-300"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-orange-400 py-3.5 font-bold text-slate-950 transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? 'Please wait...'
                : isRegister
                  ? 'Create account'
                  : 'Sign in'}
            </button>
          </form>

          <p className="mt-7 text-center text-xs text-slate-500">
            Secure authentication powered by JWT and PostgreSQL.
          </p>
        </section>
      </div>
    </main>
  )
}
