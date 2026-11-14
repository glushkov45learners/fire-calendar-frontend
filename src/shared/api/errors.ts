import { ApiError } from './client'

/** A sentence a person can act on, for any failure of the API. */
export function describeError(e: unknown): string {
  if (!(e instanceof ApiError)) return `Something went wrong: ${(e as Error)?.message ?? 'unknown error'}.`
  switch (e.code) {
    case 'invalid_aoi':
      return 'The server could not read this area. Draw it again, or pick a saved area.'
    case 'invalid_range':
      return 'The period is outside the archive. Choose years inside it.'
    case 'outside_coverage':
      return 'This area is outside Ukraine, the only country the archive covers.'
    case 'too_many_rows':
      return 'Over 500,000 points. Narrow the period or the area and try again.'
    case 'network':
      return 'The server could not be reached. Check the connection and retry.'
    default:
      return e.status >= 500 ? 'The server failed to answer. Try again in a minute.' : `Request failed: ${e.message}`
  }
}
