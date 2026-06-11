# Design tokens

## Color philosophy

Colors encode **meaning**, not sequence. The status color system maps directly to where a candidate stands in a hiring process.

## Status badge colors

| Status | Light bg | Light text | Dark bg | Dark text | Tailwind classes (approx) |
|---|---|---|---|---|---|
| Phone screen | `#E1F5EE` | `#0F6E56` | `#085041` | `#9FE1CB` | `bg-teal-50 text-teal-700` |
| Technical Interview | `#E6F1FB` | `#185FA5` | `#0C447C` | `#B5D4F4` | `bg-blue-50 text-blue-700` |
| Final Interview | `#EEEDFE` | `#3C3489` | `#3C3489` | `#CECBF6` | `bg-purple-50 text-purple-800` |
| Offer | `#EAF3DE` | `#3B6D11` | `#27500A` | `#C0DD97` | `bg-green-50 text-green-800` |
| Rejected | `#FCEBEB` | `#A32D2D` | `#791F1F` | `#F7C1C1` | `bg-red-50 text-red-700` |
| Ghosted | `#F1EFE8` | `#5F5E5A` | `#444441` | `#D3D1C7` | `bg-gray-100 text-gray-500` |

## Document type colors

| Type | Light bg | Light text | Dark bg | Dark text |
|---|---|---|---|---|
| Resume | `#EEEDFE` | `#3C3489` | `#3C3489` | `#CECBF6` |
| Cover letter | `#FAEEDA` | `#633806` | `#633806` | `#FAC775` |

## Layout tokens

| Token | Value |
|---|---|
| Card border radius | `12px` (`border-radius-lg`) |
| Component border radius | `8px` (`border-radius-md`) |
| Card border | `0.5px solid` border-tertiary |
| Card hover border | `0.5px solid` border-secondary |
| Card expanded border | `0.5px solid` border-primary |
| Card padding | `14px 16px` |
| Gap between cards | `10px` |

## Typography

| Role | Size | Weight |
|---|---|---|
| Page heading | 18px | 500 |
| Card title (role) | 15px | 500 |
| Card subtitle (company) | 13px | 400 |
| Label | 12px | 400 |
| Body / input text | 13px | 400 |
| Badge | 11px | 500 |
| Date / meta | 12px | 400 |

Only two weights: **400** (regular) and **500** (medium). Never 600 or 700.

## Stats bar

Four metric cards in a responsive grid (`repeat(auto-fit, minmax(100px, 1fr))`):
- Total
- Active (not Rejected or Ghosted)
- Offers
- Follow-ups due (overdue reminders for active applications — number shown in amber when > 0)

## Overdue follow-up state

When `job.followup < today()` AND status is not Offer/Rejected/Ghosted:
- Follow-up date input gets `border-color: var(--color-border-warning)`
- Bell icon gets `color: var(--color-text-warning)`
- Label gets ` ⚠` appended
- Stat card "Follow-ups due" value turns `color: var(--color-text-warning)`

## Icon set

Uses **Tabler Icons** (outline style). Key icons used:

| Element | Icon |
|---|---|
| App / jobs tab | `ti-briefcase` |
| Documents tab | `ti-files` |
| Resume document | `ti-file-text` |
| Cover letter document | `ti-mail` |
| Search | `ti-search` |
| Add | `ti-plus` |
| Delete | `ti-trash` |
| Interview date | `ti-calendar` |
| Follow-up reminder | `ti-bell` |
| Interview reminder row | `ti-calendar-event` |
| Empty state | `ti-inbox` |

React package: `@tabler/icons-react`
```tsx
import { IconBriefcase, IconFiles } from '@tabler/icons-react';
<IconBriefcase size={18} stroke={1.5} />
```
