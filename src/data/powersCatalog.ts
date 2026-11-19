// SPDX-License-Identifier: GPL-3.0-or-later

import type {
  HexColor,
  ItemPower,
  Language,
  OnHitEffectId,
  PassiveHeldEffectId,
  PowerTrigger,
  SpecialPowerEffectId,
} from '../types/project';

export interface SpecialPowerOption {
  effect: SpecialPowerEffectId;
  trigger: PowerTrigger;
  badgeColor: HexColor;
  iconSymbol: string;
  defaultAmplifier: number;
  defaultDurationSeconds: number;
  label: Record<Language, string>;
}

export const ON_HIT_POWERS: readonly SpecialPowerOption[] = [
  {
    effect: 'set_fire',
    trigger: 'on_hit',
    badgeColor: '#FF6B1A',
    iconSymbol: '🔥',
    defaultAmplifier: 1,
    defaultDurationSeconds: 5,
    label: {
      ro: 'Incendiază Ținta',
      en: 'Set Target on Fire',
    },
  },
  {
    effect: 'lightning_bolt',
    trigger: 'on_hit',
    badgeColor: '#FFE054',
    iconSymbol: '⚡',
    defaultAmplifier: 1,
    defaultDurationSeconds: 1,
    label: {
      ro: 'Cheamă Fulgerul',
      en: 'Summon Lightning Bolt',
    },
  },
  {
    effect: 'freeze_slowness',
    trigger: 'on_hit',
    badgeColor: '#5CEEFF',
    iconSymbol: '❄️',
    defaultAmplifier: 2,
    defaultDurationSeconds: 4,
    label: {
      ro: 'Îngheț / Încetinire',
      en: 'Freeze / Slowness',
    },
  },
  {
    effect: 'super_knockback',
    trigger: 'on_hit',
    badgeColor: '#38F27B',
    iconSymbol: '💨',
    defaultAmplifier: 2,
    defaultDurationSeconds: 1,
    label: {
      ro: 'Super Împingere',
      en: 'Super Knockback',
    },
  },
  {
    effect: 'poison',
    trigger: 'on_hit',
    badgeColor: '#8CE93A',
    iconSymbol: '🧪',
    defaultAmplifier: 1,
    defaultDurationSeconds: 5,
    label: {
      ro: 'Otravă',
      en: 'Poison',
    },
  },
  {
    effect: 'lifesteal',
    trigger: 'on_hit',
    badgeColor: '#FF4769',
    iconSymbol: '❤️‍🩹',
    defaultAmplifier: 1,
    defaultDurationSeconds: 1,
    label: {
      ro: 'Vampirism (vindecă)',
      en: 'Lifesteal (heals player)',
    },
  },
] as const satisfies ReadonlyArray<SpecialPowerOption & { effect: OnHitEffectId }>;

export const PASSIVE_HELD_POWERS: readonly SpecialPowerOption[] = [
  {
    effect: 'speed_boost',
    trigger: 'passive_held',
    badgeColor: '#34E5DB',
    iconSymbol: '🏃',
    defaultAmplifier: 1,
    defaultDurationSeconds: 2,
    label: {
      ro: 'Super Viteză',
      en: 'Speed Boost',
    },
  },
  {
    effect: 'super_jump',
    trigger: 'passive_held',
    badgeColor: '#7DFCA8',
    iconSymbol: '🦘',
    defaultAmplifier: 2,
    defaultDurationSeconds: 2,
    label: {
      ro: 'Super Săritură',
      en: 'Super Jump',
    },
  },
  {
    effect: 'night_vision',
    trigger: 'passive_held',
    badgeColor: '#6B8AFF',
    iconSymbol: '🌙',
    defaultAmplifier: 1,
    defaultDurationSeconds: 12,
    label: {
      ro: 'Vedere Nocturnă',
      en: 'Night Vision',
    },
  },
  {
    effect: 'fire_resistance',
    trigger: 'passive_held',
    badgeColor: '#FFA214',
    iconSymbol: '🛡️',
    defaultAmplifier: 1,
    defaultDurationSeconds: 5,
    label: {
      ro: 'Rezistență la Foc',
      en: 'Fire Resistance',
    },
  },
  {
    effect: 'glowing_aura',
    trigger: 'passive_held',
    badgeColor: '#DA77FF',
    iconSymbol: '✨',
    defaultAmplifier: 1,
    defaultDurationSeconds: 5,
    label: {
      ro: 'Aură Strălucitoare',
      en: 'Glowing Aura',
    },
  },
] as const satisfies ReadonlyArray<
  SpecialPowerOption & { effect: PassiveHeldEffectId }
>;

export const ALL_SPECIAL_POWERS: readonly SpecialPowerOption[] = [
  ...ON_HIT_POWERS,
  ...PASSIVE_HELD_POWERS,
];

export function hasPower(
  powers: readonly ItemPower[],
  trigger: PowerTrigger,
  effect: string
): boolean {
  return powers.some((p) => p.trigger === trigger && p.effect === effect);
}

export function togglePowerInList(
  powers: readonly ItemPower[],
  option: SpecialPowerOption
): ItemPower[] {
  const exists = hasPower(powers, option.trigger, option.effect);
  if (exists) {
    return powers.filter(
      (p) => !(p.trigger === option.trigger && p.effect === option.effect)
    );
  }
  return [
    ...powers,
    {
      id: `${option.trigger}:${option.effect}`,
      trigger: option.trigger,
      effect: option.effect,
      amplifier: option.defaultAmplifier,
      durationSeconds: option.defaultDurationSeconds,
    },
  ];
}
