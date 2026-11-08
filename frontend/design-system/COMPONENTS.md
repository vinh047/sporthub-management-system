# Component Standards

## Library organization

- `src/components/ui`: generic visual primitives.
- `src/components/shared`: application-level states, headers, and semantic status helpers.
- `src/components/booking`: reusable booking-domain components.
- Existing components such as `CourtTimeGrid`, `HoldCountdownTimer`, `AuthShell`, and `FormField` remain in place. Do not duplicate them; improve or wrap them only when a concrete reuse need exists.

## Generic primitives

| Component | Purpose / key props | States and accessibility |
|---|---|---|
| `Button` | `variant` (`primary`, `secondary`, `outline`, `ghost`, `danger`), `size`, `loading` | Native button semantics; loading announces `aria-busy`, disables duplicate submission |
| `Input` | Native input props plus `label`, `hint`, `error` | Label association, invalid state, described hint/error |
| `Select` | Native select props plus `label`, `hint`, `error` | Native keyboard behavior and associated label |
| `Badge` | `neutral`, `primary`, `success`, `warning`, `error`, `info` | Text remains present; color is supplementary |
| `Card` | Semantic section wrapper; `interactive` only when appropriate | Use a heading in content; avoid nested card surfaces |
| `Dialog` | Controlled `open`, `title`, `description`, `onOpenChange` | Native modal dialog, Escape and backdrop dismissal, labelled title, close control |
| `Skeleton` | `width`, `height`, class/style | Hidden from assistive technology; pair with an announced loading state |

The first iteration intentionally does not add a generic dropdown, table, tabs, or tooltip abstraction. Use native HTML and existing patterns until repeated requirements justify a reusable API.

## Shared components

| Component | Purpose |
|---|---|
| `PageHeader` | Consistent page title, description, and actions |
| `EmptyState` | Informative no-data state with optional icon and action |
| `ErrorState` | Visible error message and optional recovery action |
| `LoadingState` | Announced loading indicator |
| `BookingStatusBadge` / `PaymentStatusBadge` | Consistent Vietnamese labels and semantic variants |
| `ConfirmDialog` | Confirmation flow built on `Dialog` and `Button` |

## Booking domain components

### `BookingSlot`

`status` is `Available | Selected | Held | Confirmed | Social | Maintenance | Disabled`; `time` is required; `price` and `onSelect` are optional. Only `Available` and `Selected` can be activated. The slot includes a spoken label and visible status text for occupied states. Never map `Held`, `Confirmed`, `Social`, or `Maintenance` to an available action.

### `CourtTimeGrid`

The existing matrix accepts `selectedCourtId`, `selectedSlotIds`, `onToggleSlot`, and `onDragSelect`. Click/tap toggles one available slot; pointer drag selects a continuous available range within the same court. Selected state is conveyed with visible text and `aria-pressed`, not color alone. The parent owns selection state and enforces booking constraints.

### `CourtBookingCart`

The booking cart displays one court/date selection, slot prices, peak labels, and total amount. Props include `courtName`, `playDate`, `slots`, `totalAmount`, `selectionIsContiguous`, `allSlotsAvailable`, `holding`, `onRemove`, and `onHold`. Desktop uses a sticky sidebar; small screens use a fixed cart summary and native modal bottom sheet. It displays the prices supplied by availability and does not compute membership discounts or independently recalculate prices.

### Status badges

`BookingStatusBadge` supports `Held`, `Confirmed`, `Cancelled`, `Completed`, and `NoShow`. `PaymentStatusBadge` supports `Unpaid`, `Paid`, `Failed`, and `Refunded`. Labels and semantic variants are centralized in `shared/StatusBadge.tsx`.

### `PriceBreakdown`

Accepts `basePrice`, `totalPrice`, optional `isPeakHour`, `discountAmount`, and `currencyLabel`. Rendered totals must be calculated by the business flow; this display component does not calculate pricing.

## Examples

```tsx
import { Button, Input } from '../components/ui';
import { EmptyState, PageHeader } from '../components/shared';
import { BookingSlot, PriceBreakdown } from '../components/booking';

<PageHeader title="Chọn sân" description="Xem các khung giờ còn trống." />
<BookingSlot status="Available" time="18:00" price={120000} onSelect={selectSlot} />
<PriceBreakdown basePrice={120000} totalPrice={120000} isPeakHour />
<Input label="Tên sân" required />
<Button loading={saving}>Lưu</Button>
<EmptyState title="Chưa có đơn" description="Đơn đặt sân của bạn sẽ hiển thị tại đây." />
```

## Extension policy

Before adding a component, search this library and existing `src/components`. Add only components that have a concrete reusable use case. Document public props, variants, states, and accessibility behavior here.
