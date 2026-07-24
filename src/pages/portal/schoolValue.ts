/**
 * The parent-supplied school a kid attends. `acara_id` is set only when the
 * parent picked a suggestion from the ACARA directory (empty when free-typed),
 * which lets super-admin analytics dedupe cleanly. All fields optional.
 */
export interface SchoolValue {
  name: string;
  suburb: string;
  state: string;
  acara_id: string;
}

export const EMPTY_SCHOOL: SchoolValue = { name: '', suburb: '', state: '', acara_id: '' };
