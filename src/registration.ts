export type RegistrationPayload = {
  eventId: string
  adults: Array<{
    firstName: string
    lastName: string
    birthDate: string
    email: string
    street: string
    postalCode: string
    city: string
    country: string
  }>
  children: Array<{
    firstName: string
    lastName: string
    birthDate: string
    email: string
  }>
  guardian: {
    firstName: string
    lastName: string
    birthDate: string
    email: string
    street: string
    postalCode: string
    city: string
    country: string
  } | null
  privacyAccepted: boolean
}

export async function submitRegistration(_payload: RegistrationPayload) {
  await new Promise((resolve) => window.setTimeout(resolve, 700))
  return { accepted: true }
}
