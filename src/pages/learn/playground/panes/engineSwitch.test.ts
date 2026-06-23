import { describe, expect, it } from 'vitest';

import { detectEngineSwitch } from './engineSwitch';

describe('detectEngineSwitch (D-3D-08 — explicit 2D⇄3D switch intent)', () => {
  it('fires on a clear switch request to the other engine', () => {
    expect(detectEngineSwitch('Make the game 3D', 'phaser')).toBe('three');
    expect(detectEngineSwitch('turn this into a 3D game', 'phaser')).toBe('three');
    expect(detectEngineSwitch('switch to 3d', 'phaser')).toBe('three');
    expect(detectEngineSwitch('convert it back to 2D', 'three')).toBe('phaser');
    expect(detectEngineSwitch('rebuild this in three.js', 'phaser')).toBe('three');
  });

  it('does NOT fire without a switch verb (ordinary edits keep the engine)', () => {
    expect(detectEngineSwitch('add 3D-looking shadows', 'phaser')).toBeNull();
    expect(detectEngineSwitch('give it more 3d depth and overlap', 'phaser')).toBeNull();
  });

  it('does NOT fire when already on the requested engine', () => {
    expect(detectEngineSwitch('make it 3D', 'three')).toBeNull();
    expect(detectEngineSwitch('turn it 2D', 'phaser')).toBeNull();
  });

  it('does NOT fire on ambiguous or no dimension', () => {
    expect(detectEngineSwitch('make it 2D or 3D, your choice', 'phaser')).toBeNull();
    expect(detectEngineSwitch('make the player jump higher', 'phaser')).toBeNull();
    expect(detectEngineSwitch('', 'phaser')).toBeNull();
  });
});
