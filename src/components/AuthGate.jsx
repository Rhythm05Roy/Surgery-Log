import { useEffect, useState } from 'react'
import { Scissors, Mail, Lock } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { init } from '../lib/db.js'

function Brand() {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-600/25">
        <Scissors className="w-7 h-7 text-white" />
      </div>
      <div className="mt-4">
        <div className="text-xl font-semibold text-slate-900">OT Log</div>
        <div className="text-sm text-slate-500">Surgery Records</div>
      </div>
    </div>
  )
}

function friendlyAuthError(message) {
  if (/invalid login credentials/i.test(message)) return 'Incorrect email or password.'
  if (/email not confirmed/i.test(message))
    return 'Please confirm your email first (check your inbox).'
  if (/rate limit/i.test(message)) return 'Too many attempts. Please wait a minute and try again.'
  if (/already registered/i.test(message)) return 'An account with that email already exists.'
  if (/password should be at least/i.test(message)) return 'Password must be at least 6 characters.'
  return message || 'Something went wrong.'
}

export default function AuthGate({ children }) {
  const [mode, setMode] = useState('loading')

  useEffect(() => {
    let cancelled = false
    let initialized = false

    const boot = async () => {
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      if (data.session) {
        try {
          await init()
          if (!cancelled && initialized === false) {
            initialized = true
            setMode('ok')
          }
        } catch {
          setMode('signin')
        }
      } else {
        setMode('signin')
      }
    }

    boot()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        init()
          .then(() => setMode('ok'))
          .catch(() => setMode('signin'))
      } else if (event === 'SIGNED_OUT') {
        setMode('signin')
      } else if (event === 'PASSWORD_RECOVERY') {
        setMode('recovery')
      } else if (event === 'INITIAL_SESSION' && !session) {
        setMode('signin')
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  if (mode === 'ok') return children

  if (mode === 'loading')
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Brand />
      </div>
    )

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <Brand />
        </div>
        <div className="card p-6 sm:p-7">
          {mode === 'signin' && <SignInScreen onSwitchToSignUp={() => setMode('signup')} />}
          {mode === 'signup' && <SignUpScreen onSwitchToSignIn={() => setMode('signin')} />}
          {mode === 'recovery' && <RecoveryScreen onDone={() => setMode('signin')} />}
        </div>
        <p className="text-center text-xs text-slate-400 mt-4">
          Your records are stored securely in the cloud
        </p>
      </div>
    </div>
  )
}

function EmailField({ value, onChange }) {
  return (
    <div className="relative">
      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="email"
        autoComplete="email"
        required
        className="input !pl-9"
        placeholder="doctor@example.com"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function PasswordField({ value, onChange, show, onToggle }) {
  return (
    <div className="relative">
      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type={show ? 'text' : 'password'}
        autoComplete="current-password"
        required
        className="input !pl-9 !pr-9"
        placeholder="Password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary-600 hover:text-primary-700"
      >
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}

function RecoveryScreen({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const save = async (e) => {
    e.preventDefault()
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    setError(null)
    const { error: upErr } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (upErr) {
      setError(friendlyAuthError(upErr.message))
      return
    }
    await supabase.auth.signOut()
    onDone()
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="text-center mb-1">
        <h2 className="text-base font-semibold text-slate-900">
          Set a new password
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">Choose a strong password</p>
      </div>
      <div>
        <label className="label">New password</label>
        <PasswordField
          value={password}
          onChange={setPassword}
          show={false}
          onToggle={() => {}}
        />
      </div>
      <div>
        <label className="label">Confirm new password</label>
        <PasswordField
          value={confirm}
          onChange={setConfirm}
          show={false}
          onToggle={() => {}}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? 'Saving…' : 'Save new password'}
      </button>
    </form>
  )
}

function SignInScreen({ onSwitchToSignUp }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)

  const signIn = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setError(friendlyAuthError(error.message))
  }

  const reset = async () => {
    if (!email) {
      setError('Enter your email first to receive a reset link.')
      return
    }
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    setBusy(false)
    if (error) setError(friendlyAuthError(error.message))
    else setNotice('If that email exists, a password reset link has been sent.')
  }

  return (
    <form onSubmit={signIn} className="space-y-4">
      <div className="text-center mb-1">
        <h2 className="text-base font-semibold text-slate-900">Sign in</h2>
        <p className="text-xs text-slate-500 mt-0.5">Welcome back to OT Log</p>
      </div>
      <div>
        <label className="label">Email</label>
        <EmailField value={email} onChange={setEmail} />
      </div>
      <div>
        <label className="label">Password</label>
        <PasswordField
          value={password}
          onChange={setPassword}
          show={show}
          onToggle={() => setShow((s) => !s)}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {notice && <p className="text-xs text-emerald-600">{notice}</p>}
      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
      <div className="text-center space-y-1.5">
        <button
          type="button"
          onClick={reset}
          className="text-xs text-slate-400 hover:text-primary-600 transition-colors"
        >
          Forgot password?
        </button>
        <div className="text-xs text-slate-400">
          New here?{' '}
          <button
            type="button"
            onClick={onSwitchToSignUp}
            className="font-semibold text-primary-600 hover:text-primary-700"
          >
            Create an account
          </button>
        </div>
      </div>
    </form>
  )
}

function SignUpScreen({ onSwitchToSignIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)

  const signUp = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    })
    setBusy(false)
    if (error) setError(friendlyAuthError(error.message))
    else setNotice('Account created. Check your email to confirm, then sign in.')
  }

  return (
    <form onSubmit={signUp} className="space-y-4">
      <div className="text-center mb-1">
        <h2 className="text-base font-semibold text-slate-900">Create account</h2>
        <p className="text-xs text-slate-500 mt-0.5">One account, secure & synced</p>
      </div>
      <div>
        <label className="label">Email</label>
        <EmailField value={email} onChange={setEmail} />
      </div>
      <div>
        <label className="label">Password</label>
        <PasswordField
          value={password}
          onChange={setPassword}
          show={show}
          onToggle={() => setShow((s) => !s)}
        />
        <p className="text-[11px] text-slate-400 mt-1">At least 6 characters.</p>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {notice && <p className="text-xs text-emerald-600">{notice}</p>}
      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? 'Creating…' : 'Create account'}
      </button>
      <div className="text-center">
        <div className="text-xs text-slate-400">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToSignIn}
            className="font-semibold text-primary-600 hover:text-primary-700"
          >
            Sign in
          </button>
        </div>
      </div>
    </form>
  )
}
