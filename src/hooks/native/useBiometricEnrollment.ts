import { useState, useEffect, useCallback } from 'react';
import {
  checkBiometricAvailability,
  isCustomerBiometricsEnabledOnDevice,
  deleteCustomerBiometricCredentials,
} from '@/services/authService';

/**
 * Reads and controls MEMBER biometric enrolment on this device.
 * `enabled` reflects the real keystore state (flag AND stored credentials), not a
 * localStorage key, so the switch in Settings / Profile can never disagree with
 * what actually unlocks the account.
 */
export function useCustomerBiometricEnrollment() {
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const avail = await checkBiometricAvailability();
      setAvailable(avail.isAvailable);
      setEnabled(avail.isAvailable && (await isCustomerBiometricsEnabledOnDevice()));
    } catch (err) {
      console.warn('[useCustomerBiometricEnrollment] refresh failed:', err);
      setEnabled(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Really removes the keystore credentials and the opt-in flag. */
  const disable = useCallback(async () => {
    const ok = await deleteCustomerBiometricCredentials();
    await refresh();
    return ok;
  }, [refresh]);

  return { available, enabled, refresh, disable };
}
