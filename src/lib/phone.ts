import { z } from 'zod';

/** Match the backend's accepted AU mobile formats and E.164 normalisation. */
export function normaliseAustralianMobile(input: string): string | null {
  const compact = input.trim().replace(/[\s()-]/g, '');
  const e164 = compact.startsWith('+61')
    ? compact
    : compact.startsWith('61')
      ? `+${compact}`
      : compact.startsWith('04')
        ? `+61${compact.slice(1)}`
        : compact.startsWith('4')
          ? `+61${compact}`
          : compact;
  return /^\+614\d{8}$/.test(e164) ? e164 : null;
}

export const australianMobileSchema = z
  .string()
  .min(1, 'Mobile number is required.')
  .refine((value) => normaliseAustralianMobile(value) !== null, {
    message: 'Enter a valid Australian mobile number.',
  });
