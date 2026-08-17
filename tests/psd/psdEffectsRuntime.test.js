import { describe, expect, it } from 'vitest';
import { runtimePsdEffectSpecs } from '../../src/logic/psd-effects.js';

const source = (kind, properties = {}) => ({ kind, enabled: true,
  opacity: 0.5, properties });

describe('PSD runtime effect mapping', () => {
  it('renders every self-contained family and names approximation boundaries', () => {
    const warnings = new Set();
    const effects = runtimePsdEffectSpecs([
      source('dropShadow'), source('innerShadow'), source('outerGlow'),
      source('innerGlow'), source('bevel'), source('solidFill'), source('satin'),
      source('stroke', { position: 'inside', fillType: 'gradient' }),
      source('gradientOverlay', { gradient: { type: 'noise' } }),
      source('patternOverlay'),
    ], warnings);
    expect(effects.map(({ type }) => type)).toEqual([
      'dropShadow', 'innerShadow', 'glow', 'innerShadow', 'innerShadow',
      'innerShadow', 'colorOverlay', 'innerShadow', 'stroke', 'gradientOverlay',
    ]);
    expect([...warnings]).toEqual(expect.arrayContaining([
      'effect.innerGlow.approximate', 'effect.bevel.approximate',
      'effect.satin.approximate', 'effect.stroke.gradient',
      'effect.stroke.inside', 'effect.gradient.noise.approximate',
      'effect.patternOverlay.resource',
    ]));
  });

  it('does not activate disabled Photoshop effects', () => {
    expect(runtimePsdEffectSpecs([{ ...source('dropShadow'), enabled: false }])).toEqual([]);
  });
});
