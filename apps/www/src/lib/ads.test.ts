import { describe, expect, it } from 'vitest';
import { adsAllowed } from './ads';

describe('adsAllowed', () => {
  it('allows the reading pages', () => {
    for (const path of [
      '/',
      '/guides',
      '/guides/install-mods',
      '/registry',
      '/registry/no-leash',
      '/c',
      '/c/qol',
      '/modding',
      '/guides/install-mods/',
    ]) {
      expect(adsAllowed(path), path).toBe(true);
    }
  });

  it('keeps ads off tool, download, account and form pages', () => {
    for (const path of [
      '/download',
      '/guides/new',
      '/c/new',
      '/publish',
      '/account',
      '/my-mods',
      '/my-mods/no-leash',
      '/my-guides',
      '/admin',
      '/notifications',
      '/auth/signin',
      '/l/abc123',
      '/u/42',
      '/about',
      '/registry/no-leash/edit',
    ]) {
      expect(adsAllowed(path), path).toBe(false);
    }
  });
});
