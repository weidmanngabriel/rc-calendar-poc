import { useEffect, useMemo, useState, type FormEvent } from 'react'
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

type AgeFilter = 'children' | 'youth' | 'youngAdults' | 'adults' | 'families'
type GenderFilter = 'male' | 'female'
type ViewMode = 'list' | 'map'

const ageFilterOptions: Array<{ id: AgeFilter; label: string; range: string }> = [
  { id: 'children', label: 'Kinder', range: 'bis 10' },
  { id: 'youth', label: 'Jugend', range: '11–17' },
  { id: 'youngAdults', label: 'Junge Erwachsene', range: '18–27' },
  { id: 'adults', label: 'Erwachsene', range: '28+' },
  { id: 'families', label: 'Familien', range: '' },
]

const placeCatalog = [
  { name: 'München', lat: 48.137, lng: 11.575 },
  { name: 'Altötting', lat: 48.226, lng: 12.676 },
  { name: 'Neuötting-Alzgern', lat: 48.241, lng: 12.705 },
  { name: 'Aschau im Chiemgau', lat: 47.777, lng: 12.323 },
  { name: 'Ratingen', lat: 51.297, lng: 6.849 },
  { name: 'Düsseldorf', lat: 51.227, lng: 6.774 },
  { name: 'Köln', lat: 50.938, lng: 6.960 },
  { name: 'Berlin', lat: 52.520, lng: 13.405 },
  { name: 'Würzburg', lat: 49.791, lng: 9.954 },
  { name: 'Königstein im Taunus', lat: 50.179, lng: 8.466 },
  { name: 'Spital am Pyhrn', lat: 47.665, lng: 14.341 },
  { name: 'Rittershausen', lat: 50.723, lng: 8.275 },
]

function getEventCoordinates(event: CalendarEvent) {
  const city = event.city.toLocaleLowerCase('de-DE')
  return placeCatalog.find((place) => city.includes(place.name.toLocaleLowerCase('de-DE')))
}

function getTargetMeta(event: CalendarEvent) {
  const target = event.targetGroups.join(' ').toLocaleLowerCase('de-DE')
  const ages = new Set<AgeFilter>()
  if (/kinder|mädchen \(0|jungen \(0/.test(target)) ages.add('children')
  if (/jugend|11–|12–|13–|14–|15–|16–|17\)/.test(target)) ages.add('youth')
  if (/junge erwachsene|junge männer|junge frauen|18–|19–|20–|21–|22–|23–|24–|25–|26–|27\+/.test(target)) ages.add('youngAdults')
  if (/erwachsene|männer|frauen|paare|priester|27\+|28\+/.test(target)) ages.add('adults')
  if (/famil/.test(target)) ages.add('families')

  const genders = new Set<GenderFilter>()
  if (/jungen|männer|jugendliche m|junge männer|\bm\b/.test(target)) genders.add('male')
  if (/mädchen|frauen|jugendliche w|junge frauen|\bw\b/.test(target)) genders.add('female')
  if (genders.size === 0) {
    genders.add('male')
    genders.add('female')
  }

  return { ages, genders }
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (value: number) => value * Math.PI / 180
  const earthRadius = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng
  return 2 * earthRadius * Math.asin(Math.sqrt(h))
}

function MapView({
  events,
  onOpenEvent,
}: {
  events: CalendarEvent[]
  onOpenEvent: (eventId: string) => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(events[0]?.id ?? null)
  const selected = events.find((event) => event.id === selectedId) ?? null

  return (
    <div className="fake-map-shell" aria-label="Schematische Kartenansicht der Veranstaltungen">
      <div className="fake-map-grid" aria-hidden="true">
        <span className="map-label map-label-north">Berlin</span>
        <span className="map-label map-label-west">NRW</span>
        <span className="map-label map-label-south">Bayern</span>
        <span className="map-label map-label-east">Österreich</span>
      </div>
      {events.map((event) => {
        const coords = getEventCoordinates(event)
        if (!coords) return null
        const left = Math.max(5, Math.min(95, ((coords.lng - 6) / 8.8) * 100))
        const top = Math.max(6, Math.min(92, ((53.2 - coords.lat) / 6.1) * 100))
        return (
          <button
            key={event.id}
            type="button"
            className={`map-pin${selectedId === event.id ? ' is-selected' : ''}`}
            style={{ left: `${left}%`, top: `${top}%` }}
            aria-label={event.title}
            onClick={() => setSelectedId(event.id)}
          >
            <span />
          </button>
        )
      })}
      {selected && (
        <button type="button" className="map-event-card" onClick={() => onOpenEvent(selected.id)}>
          <span className="map-event-date">{formatDate(selected)}</span>
          <strong>{selected.title}</strong>
          <small>{selected.city} · {selected.targetGroups[0]}</small>
          <span className="map-card-arrow">›</span>
        </button>
      )}
      <div className="map-legend">Schematische Karte · PoC</div>
    </div>
  )
}

function App() {
  const [query, setQuery] = useState('')
  const [ageFilters, setAgeFilters] = useState<AgeFilter[]>([])
  const [genderFilters, setGenderFilters] = useState<GenderFilter[]>([])
  const [placeQuery, setPlaceQuery] = useState('')
  const [radiusKm, setRadiusKm] = useState(50)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [expandedEventId, setExpandedEventId] = useState<string | null>(() => new URLSearchParams(window.location.search).get('event'))
  const [registrationEventId, setRegistrationEventId] = useState<string | null>(null)

  useEffect(() => {
    const onPopState = () => setExpandedEventId(new URLSearchParams(window.location.search).get('event'))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const recognizedPlace = useMemo(() => {
    const normalized = placeQuery.trim().toLocaleLowerCase('de-DE')
    if (!normalized) return null
    return placeCatalog.find((place) =>
      place.name.toLocaleLowerCase('de-DE').includes(normalized)
      || normalized.includes(place.name.toLocaleLowerCase('de-DE')),
    ) ?? null
  }, [placeQuery])

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('de-DE')
    const normalizedPlace = placeQuery.trim().toLocaleLowerCase('de-DE')

    return dummyEvents.filter((event) => {
      const matchesQuery = !normalizedQuery || [event.title, event.city, event.country, event.shortDescription, ...event.targetGroups]
        .join(' ')
        .toLocaleLowerCase('de-DE')
        .includes(normalizedQuery)

      const meta = getTargetMeta(event)
      const matchesAge = ageFilters.length === 0 || ageFilters.some((filter) => meta.ages.has(filter))
      const matchesGender = genderFilters.length === 0 || genderFilters.some((filter) => meta.genders.has(filter))

      let matchesPlace = true
      if (normalizedPlace) {
        const eventCoords = getEventCoordinates(event)
        if (recognizedPlace && eventCoords) {
          matchesPlace = distanceKm(recognizedPlace, eventCoords) <= radiusKm
        } else {
          matchesPlace = [
            event.city,
            event.country,
            event.venue?.city,
            event.venue?.postalCode,
            event.venue?.street,
          ]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase('de-DE')
            .includes(normalizedPlace)
        }
      }

      return matchesQuery && matchesAge && matchesGender && matchesPlace
    })
  }, [ageFilters, genderFilters, placeQuery, query, radiusKm, recognizedPlace])

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

  const openEventFromMap = (eventId: string) => {
    setViewMode('list')
    setExpandedEventId(eventId)
    const url = new URL(window.location.href)
    url.searchParams.set('event', eventId)
    window.history.pushState({}, '', url)
    window.setTimeout(() => document.getElementById(`event-${eventId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0)
  }

  const toggleAge = (id: AgeFilter) => {
    setAgeFilters((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  const toggleGender = (id: GenderFilter) => {
    setGenderFilters((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  const resetFilters = () => {
    setQuery('')
    setAgeFilters([])
    setGenderFilters([])
    setPlaceQuery('')
    setRadiusKm(50)
  }

  if (registrationEvent) {
    return <RegistrationFlow event={registrationEvent} onClose={() => setRegistrationEventId(null)} />
  }

  const activeFilterCount = ageFilters.length + genderFilters.length + (placeQuery ? 1 : 0)

  const filterContent = (
    <>
      <div className="filter-heading">
        <div><p className="eyebrow">FILTER</p><h2>Veranstaltungen finden</h2></div>
        <button type="button" className="reset-button" onClick={resetFilters}>Zurücksetzen</button>
      </div>

      <div className="filter-section">
        <span className="filter-label">Altersgruppen</span>
        <div className="filter-chip-grid">
          {ageFilterOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`filter-chip${ageFilters.includes(option.id) ? ' is-active' : ''}`}
              onClick={() => toggleAge(option.id)}
            >
              <strong>{option.label}</strong>
              {option.range && <small>{option.range} Jahre</small>}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-section">
        <span className="filter-label">Geschlecht <small>Mehrfachauswahl möglich</small></span>
        <div className="gender-toggle">
          <button type="button" className={genderFilters.includes('male') ? 'is-active' : ''} onClick={() => toggleGender('male')}>männlich</button>
          <button type="button" className={genderFilters.includes('female') ? 'is-active' : ''} onClick={() => toggleGender('female')}>weiblich</button>
        </div>
      </div>

      <div className="filter-section">
        <span className="filter-label">Ort & Umkreis</span>
        <label className="place-search">
          <span aria-hidden="true">⌖</span>
          <input
            list="known-places"
            value={placeQuery}
            onChange={(event) => setPlaceQuery(event.target.value)}
            placeholder="PLZ oder Ort"
          />
        </label>
        <datalist id="known-places">
          {placeCatalog.map((place) => <option key={place.name} value={place.name} />)}
        </datalist>
        <div className="radius-row">
          <span>Umkreis</span>
          <strong>{radiusKm} km</strong>
        </div>
        <input
          className="radius-slider"
          type="range"
          min="5"
          max="200"
          step="5"
          value={radiusKm}
          onChange={(event) => setRadiusKm(Number(event.target.value))}
          disabled={!placeQuery}
        />
        <div className="radius-presets">
          {[5, 10, 25, 50, 100].map((value) => (
            <button key={value} type="button" className={radiusKm === value ? 'is-active' : ''} onClick={() => setRadiusKm(value)} disabled={!placeQuery}>
              {value}
            </button>
          ))}
        </div>
        {placeQuery && !recognizedPlace && (
          <small className="filter-hint">Im PoC wird bei unbekannten Orten nach Ortsname oder PLZ gesucht. Für bekannte Demo-Orte funktioniert der Umkreis.</small>
        )}
      </div>
    </>
  )

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
        <section className="hero mobile-first-hero">
          <p className="eyebrow">VERANSTALTUNGEN</p>
          <h1>Demnächst</h1>
          <p>Begegnung. Glaube. Mission.</p>
          <label className="hero-search">
            <span aria-hidden="true">⌕</span>
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Veranstaltungen suchen …" />
          </label>

          <div className="quick-age-chips" aria-label="Schnellfilter Altersgruppe">
            <button type="button" className={ageFilters.length === 0 ? 'is-active' : ''} onClick={() => setAgeFilters([])}>Alle</button>
            {ageFilterOptions.slice(0, 4).map((option) => (
              <button
                key={option.id}
                type="button"
                className={ageFilters.includes(option.id) ? 'is-active' : ''}
                onClick={() => toggleAge(option.id)}
              >
                <span>{option.label}</span>
                <small>{option.range}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="calendar-layout modern-calendar-layout" aria-label="Veranstaltungskalender">
          <aside className="filter-panel desktop-filter-panel">
            {filterContent}
          </aside>

          <section className="event-results">
            <div className="mobile-toolbar">
              <div className="view-switch" aria-label="Ansicht">
                <button type="button" className={viewMode === 'list' ? 'is-active' : ''} onClick={() => setViewMode('list')}>Liste</button>
                <button type="button" className={viewMode === 'map' ? 'is-active' : ''} onClick={() => setViewMode('map')}>Karte</button>
              </div>
              <button type="button" className="filter-open-button" onClick={() => setFiltersOpen(true)}>
                Filter{activeFilterCount ? ` · ${activeFilterCount}` : ''}
              </button>
            </div>

            <div className="results-heading">
              <div><p className="eyebrow">ERGEBNISSE</p><h2>{filteredEvents.length} Veranstaltungen</h2></div>
              <p className="source-note">Demo-Daten · Stand 19.09.2026</p>
            </div>

            {viewMode === 'map' ? (
              <MapView events={filteredEvents} onOpenEvent={openEventFromMap} />
            ) : filteredEvents.length > 0 ? (
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
                <p>Ändere die Filter oder erhöhe den Umkreis.</p>
                <button type="button" className="primary-button" onClick={resetFilters}>Alle anzeigen</button>
              </div>
            )}
          </section>
        </section>
      </main>

      {filtersOpen && (
        <div className="filter-sheet-backdrop" role="presentation" onClick={() => setFiltersOpen(false)}>
          <section className="filter-sheet" role="dialog" aria-modal="true" aria-label="Veranstaltungen filtern" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-handle" />
            {filterContent}
            <button type="button" className="primary-button sheet-apply-button" onClick={() => setFiltersOpen(false)}>
              {filteredEvents.length} Ergebnisse anzeigen
            </button>
          </section>
        </div>
      )}

      <footer>
        <span>RC Kalender · Frontend PoC</span>
        <span>Realistische Demo-Daten, noch ohne Backend-Anbindung</span>
      </footer>
    </div>
  )
}

export default App
