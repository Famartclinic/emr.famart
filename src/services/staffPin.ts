/**
 * Clinic staff sign in with a 4-digit PIN.
 *
 * Supabase Auth enforces a 6-character password minimum, so the PIN is expanded
 * into a deterministic credential before it is handed to Auth. The effective
 * entropy is still the 4 digits of the PIN.
 *
 * Keep pinToPassword in sync with supabase/functions/staff-admin/index.ts.
 */
export const PIN_LENGTH = 4;

export const isValidPin = (pin: string): boolean => /^\d{4}$/.test(pin.trim());

export const pinToPassword = (pin: string): string => `famart-${pin.trim()}`;

/** Digits only, capped at the PIN length — used for the login inputs. */
export const sanitizePinInput = (value: string): string => value.replace(/\D/g, '').slice(0, PIN_LENGTH);
