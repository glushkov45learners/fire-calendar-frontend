export function AppFooter() {
  return (
    <footer className="foot">
      <a className="disc" href="https://github.com/glushkov45learners" target="_blank" rel="noopener" aria-label="Source code on GitHub">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 .2a8 8 0 0 0-2.5 15.6c.4.1.5-.2.5-.4v-1.4c-2.2.5-2.7-1-2.7-1-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.2 1.9.9 2.3.7.1-.5.3-.9.5-1.1-1.8-.2-3.6-.9-3.6-4a3 3 0 0 1 .8-2.1c-.1-.2-.4-1 .1-2.1 0 0 .7-.2 2.2.8a7.5 7.5 0 0 1 4 0c1.5-1 2.2-.8 2.2-.8.4 1.1.2 1.9.1 2.1.5.6.8 1.3.8 2.1 0 3.1-1.9 3.7-3.7 3.9.3.3.6.8.6 1.5v2.2c0 .2.1.5.6.4A8 8 0 0 0 8 .2z" />
        </svg>
      </a>
      <nav>
        <a href="https://firms.modaps.eosdis.nasa.gov/" target="_blank" rel="noopener">
          FIRMS archive
        </a>
        <a href="#calendar">Calendar</a>
        <a href="#sensors">Method</a>
      </nav>
      <small>Glushkov45learners, NASA Space Apps 2026. Data: NASA FIRMS</small>
    </footer>
  )
}
