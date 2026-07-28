# Security Specification & zero-trust Test Plan

## 1. Data Invariants
* **Orders are permanent**: Orders can be created, viewed, and updated, but they must never be deleted.
* **Customer fields are immutable**: Customer identity and core request details (`name`, `email`, `contact`, `location`, `quantity`, `meals`, `createdAt`) must never be modified once created.
* **Tighter transition bounds**: Order status transitions can only move from `pending` to `approved` (by admin adding prices) to `billed` (when invoice is sent), or to `cancelled` / `rejected`.
* **Timestamp enforcement**: `createdAt` must be strictly set to the server-side `request.time`.
* **String limit guards**: All text fields must have length bounds to prevent resource-exhaustion/Denial-of-Wallet attacks.

---

## 2. The "Dirty Dozen" Attack Payloads

### Payload 1: Unauthorized Deletion
* **Goal**: Delete an existing order to cover tracks or disrupt service.
* **Method**: Send `DELETE` request to `/orders/{orderId}`.
* **Expected Result**: `PERMISSION_DENIED`

### Payload 2: Customer Identity Theft (Spoofing name on update)
* **Goal**: Change the customer's name on an existing order.
* **Payload**: `{ "name": "Hacker Spoof" }`
* **Expected Result**: `PERMISSION_DENIED`

### Payload 3: Unbounded String Injection (Resource Exhaustion)
* **Goal**: Write a 10MB string to the `notes` field.
* **Payload**: `{ "notes": "<10MB string>" }`
* **Expected Result**: `PERMISSION_DENIED`

### Payload 4: Invalid Status Transition (Skipping steps)
* **Goal**: Direct status change to an unsupported state like `refunded`.
* **Payload**: `{ "status": "refunded" }`
* **Expected Result**: `PERMISSION_DENIED`

### Payload 5: Zero Pax Injection
* **Goal**: Order with `0` or negative quantity of pax.
* **Payload**: `{ "quantity": 0 }`
* **Expected Result**: `PERMISSION_DENIED`

### Payload 6: Fake Creation Timestamps
* **Goal**: Client provides an arbitrary old or future `createdAt` value.
* **Payload**: `{ "createdAt": "2020-01-01T00:00:00Z" }`
* **Expected Result**: `PERMISSION_DENIED`

### Payload 7: Update of Immutable Creation Date
* **Goal**: Change the order's `createdAt` date on update.
* **Payload**: `{ "createdAt": "2026-12-31T23:59:59Z" }`
* **Expected Result**: `PERMISSION_DENIED`

### Payload 8: Excessive Meals Allocation
* **Goal**: Injecting 100 meal options into the meal list.
* **Payload**: `{ "meals": ["breakfast", "lunch", "dinner", "tea_break", "midnight_snack", "...x100"] }`
* **Expected Result**: `PERMISSION_DENIED`

### Payload 9: Unauthorized Write of `totalAmount` on Create
* **Goal**: Create a pre-billed order with a self-assigned `totalAmount` and `status: 'billed'`.
* **Payload**: `{ "status": "billed", "totalAmount": 1.00 }`
* **Expected Result**: `PERMISSION_DENIED`

### Payload 10: State Shortcut with Unapproved Prices
* **Goal**: Force status to `approved` without providing prices for selected meals.
* **Payload**: `{ "status": "approved", "prices": {} }`
* **Expected Result**: `PERMISSION_DENIED`

### Payload 11: Spoofed Contact Character Injection
* **Goal**: Inject long junk scripts into contact phone numbers.
* **Payload**: `{ "contact": "A" * 1000 }`
* **Expected Result**: `PERMISSION_DENIED`

### Payload 12: Invalid ID Poisoning (Shadow ID)
* **Goal**: Request order creation using a highly corrupted document ID containing special exploit symbols.
* **Path**: `/orders/../poison_id`
* **Expected Result**: `PERMISSION_DENIED`

---

## 3. Test Runner Structure
The corresponding testing suite validates that all 12 vectors fail as expected against the security engine.
