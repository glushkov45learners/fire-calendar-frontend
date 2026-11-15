import { useState, type FormEvent } from 'react'
import { describeError, subscribe } from '@/shared/api'

/** The same loose shape the backend accepts: something@domain.tld, no spaces. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Problem = { field: 'email' | 'consent' | 'server'; text: string }

/** Sign-up for the monthly e-mail: an address and an explicit tick of consent, nothing else. */
export function SubscribeForm() {
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<Problem | null>(null)
  const [sentTo, setSentTo] = useState('')

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    const email = String(data.get('email') ?? '').trim()
    if (!EMAIL.test(email)) return setProblem({ field: 'email', text: 'Enter your email address, like name@example.org.' })
    if (data.get('consent') !== 'on') return setProblem({ field: 'consent', text: 'Tick the box to agree to the monthly letter.' })

    setProblem(null)
    setBusy(true)
    try {
      await subscribe(email)
      setSentTo(email)
      form.reset()
    } catch (err) {
      setProblem({ field: 'server', text: describeError(err) })
    } finally {
      setBusy(false)
    }
  }

  if (sentTo)
    return (
      <div className="digest-form" role="status">
        <p className="digest-done">You are subscribed</p>
        <p className="hint">
          The next letter goes to <strong>{sentTo}</strong> in the first days of next month. Every letter has an unsubscribe link.
        </p>
        <button type="button" className="action" onClick={() => setSentTo('')}>
          Add another address
        </button>
      </div>
    )

  return (
    <form className="digest-form" onSubmit={submit} noValidate aria-label="Subscribe to the monthly digest">
      <label className="field">
        <span>Email</span>
        <input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="name@example.org"
          aria-invalid={problem?.field === 'email' || undefined}
          aria-describedby={problem ? 'digest-problem' : undefined}
        />
      </label>
      <label className="consent">
        <input name="consent" type="checkbox" aria-invalid={problem?.field === 'consent' || undefined} />
        <span>I agree to receive the monthly Fire Calendar letter at this address.</span>
      </label>
      <button type="submit" className="action is-filled" disabled={busy}>
        {busy ? 'Subscribing…' : 'Subscribe'}
      </button>
      {problem ? (
        <p className="hint is-error" id="digest-problem" role="alert">
          {problem.text}
        </p>
      ) : (
        <p className="hint">One letter a month. Every letter has an unsubscribe link.</p>
      )}
    </form>
  )
}
