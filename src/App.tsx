import { FormEvent, useEffect, useMemo, useState } from 'react'
import { dummyEvents, type CalendarEvent, type RegistrationStatus } from './data/events'
import { submitRegistration, type RegistrationPayload } from './registration'

const statusLabels: Record<RegistrationStatus, string> = {
  open: 'Anmeldung offen',
  full: 'Ausgebucht',
  external: 'Externe Anmeldung',
  unavailable: 'Keine Online-Anmeldung',
}

const countries = ['Deutschland', 'Österreich', 'Schweiz', 'Italien', 'Luxemburg', 'Anderes Land']

type PersonData = {
  id: string
  firstName: string
  lastName: string
  birthDate: string
  email: string
  street: string
  postalCode: string
  city: string
  country: string
}

type ChildData = PersonData & {
  useDifferentEmail: boolean
}

type SavedPerson = Omit<PersonData, 'id'>

type RegistrationDraft = {
  adults: PersonData[]
  children: ChildData[]
  guardianSource: 'adult' | 'separate'
  guardianAdultIndex: number
  guardian: PersonData
  privacyAccepted: boolean
  rememberPeople: boolean
}

type RegistrationStep = 'participants' | 'details' | 'review' | 'success'

const emptyPerson = (): PersonData => ({
  id: crypto.randomUUID(),
  firstName: '',
  lastName: '',
  birthDate: '',
  email: '',
  street: '',
  postalCode: '',
  city: '',
  country: 'Deutschland',
})

const emptyChild = (): ChildData => ({
  ...emptyPerson(),
  useDifferentEmail: false,
})

function formatDate(event: CalendarEvent) {
  const start = new Date(`${event.startDate}T12:00:00`)
  const end = new Date(`${event.endDate}T12:00:00`)
  const formatter = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const shortFormatter = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' })

  if (event.startDate === event.endDate) return formatter.format(start)
  if (start.getFullYear() === end.getFullYear()) return `${shortFormatter.format(start)} – ${formatter.format(end)}`
  return `${formatter.format(start)} – ${formatter.format(end)}`
}

function formatPrice(price: number) {
  if (price === 0) return 'Kostenlos'
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(price)
}

function ageAtDate(birthDate: string, referenceDate: string) {
  if (!birthDate) return null
  const birth = new Date(`${birthDate}T12:00:00`)
  const reference = new Date(`${referenceDate}T12:00:00`)
  let age = reference.getFullYear() - birth.getFullYear()
  const month = reference.getMonth() - birth.getMonth()
  if (month < 0 || (month === 0 && reference.getDate() < birth.getDate())) age -= 1
  return age
}

function resizePeople<T extends PersonData>(people: T[], count: number, factory: () => T) {
  if (count <= people.length) return people.slice(0, count)
  return [...people, ...Array.from({ length: count - people.length }, factory)]
}

function loadSavedPeople(): SavedPerson[] {
  try {
    return JSON.parse(localStorage.getItem('rc-calendar-saved-people') ?? '[]') as SavedPerson[]
  } catch {
    return []
  }
}

function savePeople(people: SavedPerson[]) {
  const unique = Array.from(
    new Map(
      people.map((person) => [
        [person.firstName, person.lastName, person.birthDate].join('|').toLowerCase(),
        person,
      ]),
    ).values(),
  )
  localStorage.setItem('rc-calendar-saved-people', JSON.stringify(unique))
}

function personLabel(person: SavedPerson) {
  return [person.firstName, person.lastName, person.birthDate ? `(${new Intl.DateTimeFormat('de-DE').format(new Date(`${person.birthDate}T12:00:00`))})` : '']
    .filter(Boolean)
    .join(' ')
}

function DetailBlock({ event }: { event: CalendarEvent }) {
  return (
    <div className="event-detail">
      <div className="detail-copy">
        <p>{event.shortDescription}</p>
        <div className="detail-grid">
          <div>
            <span>Termin</span>
            <strong>{formatDate(event)}</strong>
            {(event.startTime || event.endTime) && (
              <small>{event.startTime ?? ''}{event.endTime ? ` – ${event.endTime}` : ''} Uhr</small>
            )}
          </div>
          <div>
            <span>Ort</span>
            <strong>{event.venue?.name ?? event.city}</strong>
            <small>
              {[event.venue?.street, event.venue?.postalCode, event.venue?.city ?? event.city, event.country]
                .filter(Boolean)
                .join(' · ')}
            </small>
          </div>
          <div>
            <span>Zielgruppe</span>
            <strong>{event.targetGroups.join(' · ')}</strong>
          </div>
          <div>
            <span>Preis</span>
            <strong>{formatPrice(event.price)}</strong>
            {event.priceDescription && <small>{event.priceDescription}</small>}
          </div>
        </div>
      </div>
    </div>
  )
}

function EventRow({
  event,
  expanded,
  onToggle,
  onRegister,
}: {
  event: CalendarEvent
  expanded: boolean
  onToggle: () => void
  onRegister: () => void
}) {
  return (
    <article className={`event-row${expanded ? ' is-expanded' : ''}`} id={`event-${event.id}`}>
      <button className="event-row-main" type="button" onClick={onToggle} aria-expanded={expanded}>
        <span className="event-date-compact">{formatDate(event)}</span>
        <span className="event-title-group">
          <strong>{event.title}</strong>
          <small>{event.city} · {event.targetGroups.join(' · ')}</small>
        </span>
        <span className="event-price">{formatPrice(event.price)}</span>
        <span className={`status-badge status-${event.registrationStatus}`}>{statusLabels[event.registrationStatus]}</span>
        <span className="expand-icon" aria-hidden="true">{expanded ? '−' : '+'}</span>
      </button>

      {expanded && (
        <div className="event-expanded">
          <DetailBlock event={event} />
          <div className="event-actions">
            {event.registrationStatus === 'open' ? (
              <button type="button" className="primary-button" onClick={onRegister}>Jetzt anmelden</button>
            ) : (
              <span className="registration-note">{statusLabels[event.registrationStatus]}</span>
            )}
          </div>
        </div>
      )}
    </article>
  )
}

function Counter({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="counter">
      <span>{label}</span>
      <div>
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))} aria-label={`${label} verringern`}>−</button>
        <strong>{value}</strong>
        <button type="button" onClick={() => onChange(Math.min(10, value + 1))} aria-label={`${label} erhöhen`}>+</button>
      </div>
    </div>
  )
}

function SavedPersonSelect({
  savedPeople,
  onSelect,
}: {
  savedPeople: SavedPerson[]
  onSelect: (person: SavedPerson) => void
}) {
  if (!savedPeople.length) return null
  return (
    <label className="saved-person-select">
      <span>Gespeicherte Person übernehmen</span>
      <select
        defaultValue=""
        onChange={(event) => {
          const selected = savedPeople[Number(event.target.value)]
          if (selected) onSelect(selected)
          event.currentTarget.value = ''
        }}
      >
        <option value="">Person auswählen …</option>
        {savedPeople.map((person, index) => (
          <option key={`${person.firstName}-${person.lastName}-${person.birthDate}-${index}`} value={index}>
            {personLabel(person)}
          </option>
        ))}
      </select>
    </label>
  )
}

function PersonFields({
  person,
  onChange,
  savedPeople,
  addressRequired = true,
  emailValue,
  onEmailChange,
}: {
  person: PersonData
  onChange: (person: PersonData) => void
  savedPeople: SavedPerson[]
  addressRequired?: boolean
  emailValue?: string
  onEmailChange?: (email: string) => void
}) {
  const patch = (values: Partial<PersonData>) => onChange({ ...person, ...values })

  return (
    <>
      <SavedPersonSelect
        savedPeople={savedPeople}
        onSelect={(saved) => onChange({ ...person, ...saved })}
      />
      <div className="form-grid">
        <label>
          <span>Vorname</span>
          <input required value={person.firstName} onChange={(e) => patch({ firstName: e.target.value })} autoComplete="given-name" />
        </label>
        <label>
          <span>Nachname</span>
          <input required value={person.lastName} onChange={(e) => patch({ lastName: e.target.value })} autoComplete="family-name" />
        </label>
        <label>
          <span>Geburtsdatum</span>
          <input required type="date" max={new Date().toISOString().slice(0, 10)} value={person.birthDate} onChange={(e) => patch({ birthDate: e.target.value })} />
        </label>
        <label>
          <span>E-Mail</span>
          <input
            required
            type="email"
            value={emailValue ?? person.email}
            onChange={(e) => onEmailChange ? onEmailChange(e.target.value) : patch({ email: e.target.value })}
            autoComplete="email"
          />
        </label>
        {addressRequired && (
          <>
            <label className="span-2">
              <span>Straße und Hausnummer</span>
              <input required value={person.street} onChange={(e) => patch({ street: e.target.value })} autoComplete="street-address" />
            </label>
            <label>
              <span>PLZ</span>
              <input required value={person.postalCode} onChange={(e) => patch({ postalCode: e.target.value })} autoComplete="postal-code" />
            </label>
            <label>
              <span>Ort</span>
              <input required value={person.city} onChange={(e) => patch({ city: e.target.value })} autoComplete="address-level2" />
            </label>
            <label className="span-2">
              <span>Land</span>
              <select required value={person.country} onChange={(e) => patch({ country: e.target.value })} autoComplete="country-name">
                {countries.map((country) => <option key={country}>{country}</option>)}
              </select>
            </label>
          </>
        )}
      </div>
    </>
  )
}

function RegistrationFlow({
  event,
  onClose,
}: {
  event: CalendarEvent
  onClose: () => void
}) {
  const [step, setStep] = useState<RegistrationStep>('participants')
  const [adultCount, setAdultCount] = useState(1)
  const [childCount, setChildCount] = useState(0)
  const [savedPeople, setSavedPeople] = useState<SavedPerson[]>(() => loadSavedPeople())
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [draft, setDraft] = useState<RegistrationDraft>({
    adults: [emptyPerson()],
    children: [],
    guardianSource: 'adult',
    guardianAdultIndex: 0,
    guardian: emptyPerson(),
    privacyAccepted: false,
    rememberPeople: false,
  })

  const setCounts = (nextAdults: number, nextChildren: number) => {
    setAdultCount(nextAdults)
    setChildCount(nextChildren)
    setDraft((current) => ({
      ...current,
      adults: resizePeople(current.adults, nextAdults, emptyPerson),
      children: resizePeople(current.children, nextChildren, emptyChild),
      guardianSource: nextChildren > 0 && nextAdults === 0 ? 'separate' : current.guardianSource,
      guardianAdultIndex: Math.min(current.guardianAdultIndex, Math.max(0, nextAdults - 1)),
    }))
  }

  const guardianEmail = draft.guardianSource === 'adult'
    ? draft.adults[draft.guardianAdultIndex]?.email ?? ''
    : draft.guardian.email

  const validateAges = () => {
    for (const adult of draft.adults) {
      const age = ageAtDate(adult.birthDate, event.startDate)
      if (age !== null && age < 18) return 'Als Erwachsene angemeldete Personen müssen zum Veranstaltungsbeginn mindestens 18 Jahre alt sein.'
    }
    for (const child of draft.children) {
      const age = ageAtDate(child.birthDate, event.startDate)
      if (age !== null && age >= 18) return 'Als Kinder angemeldete Personen müssen zum Veranstaltungsbeginn minderjährig sein.'
    }
    if (draft.children.length > 0 && draft.guardianSource === 'separate') {
      const age = ageAtDate(draft.guardian.birthDate, event.startDate)
      if (age !== null && age < 18) return 'Der Erziehungsberechtigte muss volljährig sein.'
    }
    return ''
  }

  const goToDetails = () => {
    if (adultCount + childCount === 0) {
      setError('Bitte mindestens einen Teilnehmer auswählen.')
      return
    }
    setError('')
    setStep('details')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDetailsSubmit = (formEvent: FormEvent) => {
    formEvent.preventDefault()
    const ageError = validateAges()
    if (ageError) {
      setError(ageError)
      return
    }
    if (!draft.privacyAccepted) {
      setError('Bitte die Datenschutzhinweise bestätigen.')
      return
    }
    setError('')
    setStep('review')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async () => {
    setSubmitting(true)
    setError('')
    const payload: RegistrationPayload = {
      eventId: event.id,
      adults: draft.adults,
      children: draft.children.map((child) => ({
        ...child,
        email: child.useDifferentEmail ? child.email : guardianEmail,
      })),
      guardian: draft.children.length
        ? draft.guardianSource === 'adult'
          ? draft.adults[draft.guardianAdultIndex]
          : draft.guardian
        : null,
      privacyAccepted: draft.privacyAccepted,
    }

    try {
      await submitRegistration(payload)
      if (draft.rememberPeople) {
        const peopleToSave: SavedPerson[] = [
          ...draft.adults.map(({ id: _id, ...person }) => person),
          ...(draft.guardianSource === 'separate' && draft.children.length ? [draft.guardian] : [])
            .map(({ id: _id, ...person }) => person),
          ...draft.children.map(({ id: _id, useDifferentEmail: _useDifferentEmail, ...person }) => ({
            ...person,
            email: person.email || guardianEmail,
          })),
        ]
        savePeople([...savedPeople, ...peopleToSave])
        setSavedPeople(loadSavedPeople())
      }
      setStep('success')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setError('Die Anmeldung konnte im Demo-Flow nicht abgeschlossen werden. Bitte erneut versuchen.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="registration-page">
      <div className="registration-header">
        <button type="button" className="back-link" onClick={onClose}>← Zur Veranstaltungsliste</button>
        <p className="eyebrow">ANMELDUNG</p>
        <h1>{event.title}</h1>
        <p>{formatDate(event)} · {event.city}</p>
      </div>

      <div className="stepper" aria-label="Anmeldeschritte">
        {[
          ['participants', '1', 'Teilnehmer'],
          ['details', '2', 'Daten'],
          ['review', '3', 'Prüfen'],
          ['success', '4', 'Fertig'],
        ].map(([key, number, label]) => (
          <div key={key} className={step === key ? 'is-active' : ''}>
            <span>{number}</span><small>{label}</small>
          </div>
        ))}
      </div>

      <section className="registration-card">
        {step === 'participants' && (
          <>
            <p className="eyebrow">SCHRITT 1</p>
            <h2>Wer nimmt teil?</h2>
            <p className="intro-copy">Wähle zuerst aus, wie viele Erwachsene und Minderjährige angemeldet werden.</p>
            <div className="counter-grid">
              <Counter label="Erwachsene" value={adultCount} onChange={(value) => setCounts(value, childCount)} />
              <Counter label="Kinder / Minderjährige" value={childCount} onChange={(value) => setCounts(adultCount, value)} />
            </div>

            {childCount > 0 && adultCount > 0 && (
              <div className="guardian-choice">
                <h3>Erziehungsberechtigter</h3>
                <label className="radio-card">
                  <input
                    type="radio"
                    name="guardian-source"
                    checked={draft.guardianSource === 'adult'}
                    onChange={() => setDraft((current) => ({ ...current, guardianSource: 'adult' }))}
                  />
                  <span>Ein angemeldeter Erwachsener ist erziehungsberechtigt</span>
                </label>
                {draft.guardianSource === 'adult' && (
                  <label className="inline-select">
                    <span>Welcher Erwachsene?</span>
                    <select
                      value={draft.guardianAdultIndex}
                      onChange={(e) => setDraft((current) => ({ ...current, guardianAdultIndex: Number(e.target.value) }))}
                    >
                      {draft.adults.map((_, index) => <option key={index} value={index}>Erwachsener {index + 1}</option>)}
                    </select>
                  </label>
                )}
                <label className="radio-card">
                  <input
                    type="radio"
                    name="guardian-source"
                    checked={draft.guardianSource === 'separate'}
                    onChange={() => setDraft((current) => ({ ...current, guardianSource: 'separate' }))}
                  />
                  <span>Der Erziehungsberechtigte nimmt nicht an der Veranstaltung teil</span>
                </label>
              </div>
            )}

            {error && <p className="form-error">{error}</p>}
            <div className="form-actions">
              <button type="button" className="primary-button" onClick={goToDetails}>Weiter</button>
            </div>
          </>
        )}

        {step === 'details' && (
          <form onSubmit={handleDetailsSubmit}>
            <p className="eyebrow">SCHRITT 2</p>
            <h2>Personendaten</h2>
            <p className="intro-copy">Alle Felder sind erforderlich. PLZ und Adresse werden bewusst nicht auf ein deutsches Format beschränkt.</p>

            {draft.adults.map((adult, index) => (
              <fieldset key={adult.id} className="person-section">
                <legend>Erwachsener {index + 1}</legend>
                <PersonFields
                  person={adult}
                  savedPeople={savedPeople}
                  onChange={(person) => setDraft((current) => ({
                    ...current,
                    adults: current.adults.map((item, itemIndex) => itemIndex === index ? person : item),
                  }))}
                />
              </fieldset>
            ))}

            {draft.children.length > 0 && draft.guardianSource === 'separate' && (
              <fieldset className="person-section guardian-section">
                <legend>Erziehungsberechtigter</legend>
                <p className="field-hint">Diese Person wird nicht als Teilnehmer angemeldet.</p>
                <PersonFields
                  person={draft.guardian}
                  savedPeople={savedPeople}
                  onChange={(guardian) => setDraft((current) => ({ ...current, guardian }))}
                />
              </fieldset>
            )}

            {draft.children.map((child, index) => (
              <fieldset key={child.id} className="person-section">
                <legend>Kind / Minderjähriger {index + 1}</legend>
                <SavedPersonSelect
                  savedPeople={savedPeople}
                  onSelect={(saved) => setDraft((current) => ({
                    ...current,
                    children: current.children.map((item, itemIndex) => itemIndex === index ? { ...item, ...saved } : item),
                  }))}
                />
                <div className="form-grid">
                  <label>
                    <span>Vorname</span>
                    <input required value={child.firstName} onChange={(e) => setDraft((current) => ({
                      ...current,
                      children: current.children.map((item, itemIndex) => itemIndex === index ? { ...item, firstName: e.target.value } : item),
                    }))} />
                  </label>
                  <label>
                    <span>Nachname</span>
                    <input required value={child.lastName} onChange={(e) => setDraft((current) => ({
                      ...current,
                      children: current.children.map((item, itemIndex) => itemIndex === index ? { ...item, lastName: e.target.value } : item),
                    }))} />
                  </label>
                  <label>
                    <span>Geburtsdatum</span>
                    <input required type="date" max={new Date().toISOString().slice(0, 10)} value={child.birthDate} onChange={(e) => setDraft((current) => ({
                      ...current,
                      children: current.children.map((item, itemIndex) => itemIndex === index ? { ...item, birthDate: e.target.value } : item),
                    }))} />
                  </label>
                  <div className="child-email-block">
                    <label className="check-field">
                      <input
                        type="checkbox"
                        checked={child.useDifferentEmail}
                        onChange={(e) => setDraft((current) => ({
                          ...current,
                          children: current.children.map((item, itemIndex) => itemIndex === index ? { ...item, useDifferentEmail: e.target.checked } : item),
                        }))}
                      />
                      <span>Andere E-Mail-Adresse verwenden</span>
                    </label>
                    {child.useDifferentEmail ? (
                      <label>
                        <span>E-Mail</span>
                        <input required type="email" value={child.email} onChange={(e) => setDraft((current) => ({
                          ...current,
                          children: current.children.map((item, itemIndex) => itemIndex === index ? { ...item, email: e.target.value } : item),
                        }))} />
                      </label>
                    ) : (
                      <p className="inherited-value">E-Mail des Erziehungsberechtigten: <strong>{guardianEmail || 'wird automatisch übernommen'}</strong></p>
                    )}
                  </div>
                </div>
              </fieldset>
            ))}

            <div className="consent-box">
              <label className="check-field">
                <input
                  required
                  type="checkbox"
                  checked={draft.privacyAccepted}
                  onChange={(e) => setDraft((current) => ({ ...current, privacyAccepted: e.target.checked }))}
                />
                <span>Ich bestätige die Datenschutzhinweise und stimme der Verarbeitung der angegebenen Daten für diese Anmeldung zu.</span>
              </label>
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={draft.rememberPeople}
                  onChange={(e) => setDraft((current) => ({ ...current, rememberPeople: e.target.checked }))}
                />
                <span>Personendaten auf diesem Gerät für spätere Anmeldungen speichern (PoC: lokal im Browser).</span>
              </label>
            </div>

            {error && <p className="form-error">{error}</p>}
            <div className="form-actions split">
              <button type="button" className="secondary-button" onClick={() => setStep('participants')}>Zurück</button>
              <button type="submit" className="primary-button">Weiter zur Prüfung</button>
            </div>
          </form>
        )}

        {step === 'review' && (
          <>
            <p className="eyebrow">SCHRITT 3</p>
            <h2>Anmeldung prüfen</h2>
            <p className="intro-copy">Bitte kontrolliere die Angaben. Der Absende-Button simuliert im PoC den späteren Backend-Aufruf.</p>

            <div className="review-event">
              <strong>{event.title}</strong>
              <span>{formatDate(event)} · {event.city} · {formatPrice(event.price)}</span>
            </div>

            <div className="review-list">
              {draft.adults.map((adult, index) => (
                <div key={adult.id}>
                  <span>Erwachsener {index + 1}</span>
                  <strong>{adult.firstName} {adult.lastName}</strong>
                  <small>{adult.email} · {adult.street}, {adult.postalCode} {adult.city}, {adult.country}</small>
                </div>
              ))}
              {draft.children.map((child, index) => (
                <div key={child.id}>
                  <span>Kind / Minderjähriger {index + 1}</span>
                  <strong>{child.firstName} {child.lastName}</strong>
                  <small>{child.useDifferentEmail ? child.email : guardianEmail}</small>
                </div>
              ))}
              {draft.children.length > 0 && draft.guardianSource === 'separate' && (
                <div>
                  <span>Erziehungsberechtigter (kein Teilnehmer)</span>
                  <strong>{draft.guardian.firstName} {draft.guardian.lastName}</strong>
                  <small>{draft.guardian.email}</small>
                </div>
              )}
            </div>

            {error && <p className="form-error">{error}</p>}
            <div className="form-actions split">
              <button type="button" className="secondary-button" onClick={() => setStep('details')}>Daten ändern</button>
              <button type="button" className="primary-button" onClick={submit} disabled={submitting}>
                {submitting ? 'Wird gesendet …' : 'Anmeldung absenden'}
              </button>
            </div>
          </>
        )}

        {step === 'success' && (
          <div className="success-state">
            <span className="success-icon">✓</span>
            <p className="eyebrow">ANMELDUNG GESENDET</p>
            <h2>Danke für deine Anmeldung.</h2>
            <p>Der PoC simuliert eine erfolgreiche Annahme durch das Backend. Im echten System folgt hier die Bestätigungs-E-Mail.</p>
            <button type="button" className="primary-button" onClick={onClose}>Zurück zum Kalender</button>
          </div>
        )}
      </section>
    </main>
  )
}

function App() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Alle')
  const [country, setCountry] = useState('Alle')
  const [onlyOpen, setOnlyOpen] = useState(false)
  const [expandedEventId, setExpandedEventId] = useState<string | null>(() => new URLSearchParams(window.location.search).get('event'))
  const [registrationEventId, setRegistrationEventId] = useState<string | null>(null)

  useEffect(() => {
    const onPopState = () => setExpandedEventId(new URLSearchParams(window.location.search).get('event'))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const categories = useMemo(
    () => ['Alle', ...Array.from(new Set(dummyEvents.map((event) => event.category))).sort()],
    [],
  )

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('de-DE')
    return dummyEvents.filter((event) => {
      const matchesQuery = !normalizedQuery || [event.title, event.city, event.country, event.shortDescription, ...event.targetGroups]
        .join(' ')
        .toLocaleLowerCase('de-DE')
        .includes(normalizedQuery)
      return matchesQuery
        && (category === 'Alle' || event.category === category)
        && (country === 'Alle' || event.country === country)
        && (!onlyOpen || event.registrationStatus === 'open')
    })
  }, [category, country, onlyOpen, query])

  const registrationEvent = registrationEventId
    ? dummyEvents.find((event) => event.id === registrationEventId) ?? null
    : null

  const toggleEvent = (eventId: string) => {
    const next = expandedEventId === eventId ? null : eventId
    setExpandedEventId(next)
    const url = new URL(window.location.href)
    if (next) url.searchParams.set('event', next)
    else url.searchParams.delete('event')
    window.history.pushState({}, '', url)
  }

  const resetFilters = () => {
    setQuery('')
    setCategory('Alle')
    setCountry('Alle')
    setOnlyOpen(false)
  }

  if (registrationEvent) {
    return <RegistrationFlow event={registrationEvent} onClose={() => setRegistrationEventId(null)} />
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="RC Kalender Startseite">
          <span className="brand-mark">RC</span>
          <span><strong>Regnum Christi</strong><small>Veranstaltungen</small></span>
        </a>
        <span className="demo-pill">Frontend PoC</span>
      </header>

      <main id="top">
        <section className="hero">
          <p className="eyebrow">VERANSTALTUNGEN</p>
          <h1>Demnächst</h1>
          <p>Veranstaltungen finden, Details direkt in der Liste öffnen und den kompletten Anmeldeweg testen.</p>
        </section>

        <section className="calendar-layout" aria-label="Veranstaltungskalender">
          <aside className="filter-panel">
            <div className="filter-heading">
              <div><p className="eyebrow">FILTER</p><h2>Finden</h2></div>
              <button type="button" className="reset-button" onClick={resetFilters}>Zurücksetzen</button>
            </div>
            <label className="field">
              <span>Suche</span>
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Titel, Ort, Zielgruppe …" />
            </label>
            <label className="field">
              <span>Kategorie</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Land</span>
              <select value={country} onChange={(e) => setCountry(e.target.value)}>
                <option>Alle</option>
                {countries.filter((item) => item !== 'Anderes Land').map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="check-field">
              <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />
              <span>Nur offene Anmeldung</span>
            </label>
          </aside>

          <section className="event-results">
            <div className="results-heading">
              <div><p className="eyebrow">ERGEBNISSE</p><h2>{filteredEvents.length} Veranstaltungen</h2></div>
              <p className="source-note">Demo-Daten · Stand 19.09.2026</p>
            </div>

            {filteredEvents.length > 0 ? (
              <div className="event-list">
                {filteredEvents.map((event) => (
                  <EventRow
                    key={event.id}
                    event={event}
                    expanded={expandedEventId === event.id}
                    onToggle={() => toggleEvent(event.id)}
                    onRegister={() => setRegistrationEventId(event.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <h2>Keine Veranstaltung gefunden</h2>
                <p>Ändere die Filter oder setze sie zurück.</p>
                <button type="button" className="primary-button" onClick={resetFilters}>Alle anzeigen</button>
              </div>
            )}
          </section>
        </section>
      </main>

      <footer>
        <span>RC Kalender · Frontend PoC</span>
        <span>Realistische Demo-Daten, noch ohne Backend-Anbindung</span>
      </footer>
    </div>
  )
}

export default App
