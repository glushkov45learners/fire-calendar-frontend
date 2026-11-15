import { SubscribeForm } from '@/features/subscribe-digest'

/** The last chapter of the page: what the monthly letter is, and the form to get it. */
export function MonthlyDigest() {
  return (
    <section className="chapter" id="digest" aria-labelledby="digest-h">
      <div className="split">
        <div>
          <h2 id="digest-h">Monthly digest</h2>
          <p>
            At the start of each month, one letter: <strong>how much of Ukraine burned last month</strong>, how that compares with the norm for the
            month, the peak day, and the last twelve months at a glance.
          </p>
        </div>
        <SubscribeForm />
      </div>
    </section>
  )
}
