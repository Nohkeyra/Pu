/** Shared, dependency-free order submission policy. The server is authoritative. */
export type CustomerOrderIdentity = { uid: string; emailVerified: boolean } | null;
export type OrderAccessDecision =
  | { allowed: true; uid: string }
  | { allowed: false; status: 401 | 403; code: string; error: string };

export function evaluateVerifiedOrderAccess(
  identity: CustomerOrderIdentity,
  requestedOwner?: unknown,
): OrderAccessDecision {
  if (!identity?.uid) {
    return { allowed: false, status: 401, code: 'SIGN_IN_REQUIRED', error: 'Sign in to submit your catering request.' };
  }
  if (!identity.emailVerified) {
    return { allowed: false, status: 403, code: 'EMAIL_VERIFICATION_REQUIRED', error: 'Verify your email address before submitting an order.' };
  }
  if (requestedOwner !== undefined && requestedOwner !== null && requestedOwner !== identity.uid) {
    return { allowed: false, status: 403, code: 'ORDER_OWNER_MISMATCH', error: 'Order owner does not match the customer session.' };
  }
  return { allowed: true, uid: identity.uid };
}
