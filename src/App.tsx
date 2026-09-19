import { useMemo, useState } from 'react'
import { dummyEvents, type CalendarEvent, type RegistrationStatus } from './data/events'

const statusLabels: Record<RegistrationStatus, string> = {
  open: 'Anmeldung offen',
  full: 'Ausgebucht',
  external: 'Externe Anmeldung',
  unavailable: 'Keine Online-Anmeldung',
}

function formatDate(event: CalendarEvent) {
  const start = new Date(`${event.startDate}T12:00:00`)
  const end = new Date(`${event.endDate}T12:00:00`)
  const formatter = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const shortFormatter = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' })

  if (event.startDate === event.endDate) return formatter.format(start)
  if (start.getFullYear() === end.getFullYear()) {
    return `${shortFormatter.format(start)} – ${formatter.format(end)}`
  }
  return `${formatter.format(start)} – ${formatter.format(end)}`
}

function formatPrice(price: number) {
  if (price === 0) return 'Kostenlos'
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price)
}

function EventCard({ event }: { event: CalendarEvent }) {
  return (
    <article className="event-card">
      <div className="event-card-topline">
        <span className="event-category">{event.category}</span>
        <span className={`status-badge status-${event.registrationStatus}`}>
          {statusLabels[event.registrationStatus]}
        </span>
      </div>

      <div className="event-date">{formatDate(event)}</div>
      <h2>{event.title}</h2>
      <p className="event-description">{event.shortDescription}</p>

      <dl className="event-facts">
        <div>
          <dt>Ort</dt>
          <dd>{event.city}, {event.country}</dd>
        </div>
        <div>
          <dt>Zielgruppe</dt>
          <dd>{event.targetGroups.join(' · ')}</dd>
        </div>
        <div>
          <dt>Preis</dt>
          <dd>
            {formatPrice(event.price)}
            {event.priceDescription && <small>{event.priceDescription}</small>}
          </dd>
        </div>
      </dl>

      <div className="event-card-footer">
        <button type="button" className="details-button">Details ansehen</button>
        {event.registrationStatus === 'open' && (
          <button type="button" className="register-button">Anmelden</button>
        )}
      </div>
    </article>
  )
}

function App() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Alle')
  const [country, setCountry] = useState('Alle')
  const [onlyOpen, setOnlyOpen] = useState(false)

  const categories = useMemo(
    () => ['Alle', ...Array.from(new Set(dummyEvents.map((event) => event.category))).sort()],
    [],
  )
  const countries = useMemo(
    () => ['Alle', ...Array.from(new Set(dummyEvents.map((event) => event.country))).sort()],
    [],
  )

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('de-DE')

    return dummyEvents.filter((event) => {
      const matchesQuery =
        !normalizedQuery ||
        [event.title, event.city, event.country, event.shortDescription, ...event.targetGroups]
          .join(' ')
          .toLocaleLowerCase('de-DE')
          .includes(normalizedQuery)

      const matchesCategory = category === 'Alle' || event.category === category
      const matchesCountry = country === 'Alle' || event.country === country
      const matchesStatus = !onlyOpen || event.registrationStatus === 'open'

      return matchesQuery && matchesCategory && matchesCountry && matchesStatus
    })
  }, [category, country, onlyOpen, query])

  const resetFilters = () => {
    setQuery('')
    setCategory('Alle')
    setCountry('Alle')
    setOnlyOpen(false)
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="RC Kalender Startseite">
          <span className="brand-mark">RC</span>
          <span>
            <strong>RC Kalender</strong>
            <small>Frontend PoC</small>
          </span>
        </a>
        <span className="demo-pill">Demo-Daten</span>
      </header>

      <main id="top">
        <section className="hero">
          <p className="eyebrow">VERANSTALTUNGEN</p>
          <h1>Was steht demnächst an?</h1>
          <p>
            Ein erster Frontend-Prototyp mit realistisch aufgebauten Demo-Veranstaltungen.
            Später werden dieselben Daten direkt aus dem bestehenden Backend geladen.
          </p>
        </section>

        <section className="calendar-layout" aria-label="Veranstaltungskalender">
          <aside className="filter-panel">
            <div className="filter-heading">
              <div>
                <p className="eyebrow">FILTER</p>
                <h2>Veranstaltungen finden</h2>
              </div>
              <button type="button" className="reset-button" onClick={resetFilters}>Zurücksetzen</button>
            </div>

            <label className="field">
              <span>Suche</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Titel, Ort, Zielgruppe …"
              />
            </label>

            <label className="field">
              <span>Kategorie</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {categories.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>

            <label className="field">
              <span>Land</span>
              <select value={country} onChange={(event) => setCountry(event.target.value)}>
                {countries.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>

            <label className="check-field">
              <input
                type="checkbox"
                checked={onlyOpen}
                onChange={(event) => setOnlyOpen(event.target.checked)}
              />
              <span>Nur Veranstaltungen mit offener Anmeldung</span>
            </label>
          </aside>

          <section className="event-results">
            <div className="results-heading">
              <div>
                <p className="eyebrow">ERGEBNISSE</p>
                <h2>{filteredEvents.length} Veranstaltungen</h2>
              </div>
              <p className="source-note">Öffentliche RC-Veranstaltungen · Stand 19.09.2026</p>
            </div>

            {filteredEvents.length > 0 ? (
              <div className="event-grid">
                {filteredEvents.map((event) => <EventCard key={event.id} event={event} />)}
              </div>
            ) : (
              <div className="empty-state">
                <h2>Keine Veranstaltung gefunden</h2>
                <p>Ändere die Filter oder setze sie zurück.</p>
                <button type="button" onClick={resetFilters}>Alle Veranstaltungen anzeigen</button>
              </div>
            )}
          </section>
        </section>
      </main>

      <footer>
        <span>RC Kalender · Frontend PoC</span>
        <span>Demo-Daten aus öffentlich sichtbaren Veranstaltungen, ohne Kontaktdaten</span>
      </footer>
    </div>
  )
}

export default App
