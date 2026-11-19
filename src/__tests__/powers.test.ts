// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest';
import {
  ALL_SPECIAL_POWERS,
  hasPower,
  ON_HIT_POWERS,
  ON_RIGHT_CLICK_POWERS,
  PASSIVE_HELD_POWERS,
  togglePowerInList,
} from '../data/powersCatalog';

describe('Special Powers Catalog', () => {
  it('has 6 on-hit + 5 passive-held + 3 on-right-click = 14 total powers', () => {
    expect(ON_HIT_POWERS).toHaveLength(6);
    expect(PASSIVE_HELD_POWERS).toHaveLength(5);
    expect(ON_RIGHT_CLICK_POWERS).toHaveLength(3);
    expect(ALL_SPECIAL_POWERS).toHaveLength(14);
  });

  it('toggles powers on and off correctly', () => {
    let list = togglePowerInList([], ON_HIT_POWERS[1]!); // lightning_bolt
    expect(hasPower(list, 'on_hit', 'lightning_bolt')).toBe(true);
    list = togglePowerInList(list, PASSIVE_HELD_POWERS[0]!); // speed_boost
    expect(list).toHaveLength(2);
    list = togglePowerInList(list, ON_HIT_POWERS[1]!);
    expect(hasPower(list, 'on_hit', 'lightning_bolt')).toBe(false);
    expect(list).toHaveLength(1);
  });
});
