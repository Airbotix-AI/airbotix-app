import { describe, expect, it } from 'vitest';

import { teacherListPath } from './teacherApi';

describe('teacherListPath', () => {
  it('encodes supported discovery filters', () => {
    expect(
      teacherListPath({
        city: 'Gold Coast',
        course: 'story-blocks',
        age: 7,
        language: 'Mandarin Chinese',
      }),
    ).toBe(
      '/teachers?city=Gold+Coast&course=story-blocks&age=7&language=Mandarin+Chinese',
    );
  });

  it('omits empty filters', () => {
    expect(teacherListPath({ city: '', age: 0 })).toBe('/teachers');
  });
});
