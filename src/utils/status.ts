import type { Status } from '../types'

export const STATUS_CLASS: Record<Status, string> = {
  'Phone screen': 's-phone',
  'Technical Interview': 's-technical',
  'Final Interview': 's-final',
  'Offer': 's-offer',
  'Rejected': 's-rejected',
  'Ghosted': 's-ghosted',
}

export function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}
