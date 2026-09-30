import { describe, expect, it } from 'vitest';
import { fuzzyMatch } from './fuzzySearch';

describe('fuzzyMatch', () => {
  it('matches skipped characters, multiple fields, and normalized accents', () => {
    expect(fuzzyMatch('agt', ['Build agent tools'])).toBe(true);
    expect(fuzzyMatch('pln local', ['Platform', 'Local task plan'])).toBe(true);
    expect(fuzzyMatch('gestion', ['Gestión de tareas'])).toBe(true);
    expect(fuzzyMatch('xyz', ['Build agent tools'])).toBe(false);
  });
});
