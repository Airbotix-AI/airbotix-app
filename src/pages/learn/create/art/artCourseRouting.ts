/** The canvas route behind the Art Studio hub. */
export const ART_CANVAS_PATH = '/learn/create/image/canvas';

/**
 * Courses whose lesson tasks belong in Art Studio even when their older
 * mission records do not carry a `steps_json.art` configuration.
 *
 * `ai-comic-book` predates Mission Mode, so all four of its tasks otherwise
 * fall through to the retired generic `/learn/projects/new` setup form.
 */
const ART_STUDIO_COURSE_SLUGS = new Set(['ai-comic-book']);

export function opensInArtStudio(courseSlug: string, artConfig: unknown): boolean {
  return artConfig != null || ART_STUDIO_COURSE_SLUGS.has(courseSlug);
}
