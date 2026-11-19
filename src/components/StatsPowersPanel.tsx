// SPDX-License-Identifier: GPL-3.0-or-later

import React from 'react';
import {
  hasPower,
  ON_HIT_POWERS,
  ON_RIGHT_CLICK_POWERS,
  PASSIVE_HELD_POWERS,
  type SpecialPowerOption,
} from '../data/powersCatalog';
import type { Translations } from '../i18n/translations';
import type {
  ArmorSlot,
  AttackSpeedTier,
  EatStatusEffect,
  ItemCategory,
  ItemProject,
  ItemRarity,
  ItemStats,
  Language,
  PrimaryItemCategory,
  PrimaryItemRarity,
} from '../types/project';
import {
  clampAttackDamage,
  clampDurability,
  clampHungerRestored,
  clampMovementSpeed,
} from '../utils/voxelOps';
import { DrumstickIcon, HeartFullIcon, HeartHalfIcon } from './Icons';

interface StatsPowersPanelProps {
  project: ItemProject;
  lang: Language;
  t: Translations;
  onChangeName: (name: string) => void;
  onChangeRarity: (rarity: ItemRarity) => void;
  onChangeCategory: (category: ItemCategory) => void;
  onChangeArmorSlot: (slot: ArmorSlot) => void;
  onUpdateStats: (patch: Partial<ItemStats>) => void;
  onTogglePower: (option: SpecialPowerOption) => void;
  onOpenMcaddonExport: () => void;
}

const RARITY_OPTIONS: ReadonlyArray<{
  id: PrimaryItemRarity;
  dotColor: string;
}> = [
  { id: 'common', dotColor: '#F6F9FF' },
  { id: 'rare', dotColor: '#38F2FF' },
  { id: 'epic', dotColor: '#DA77FF' },
  { id: 'legendary', dotColor: '#FFD43B' },
];

const CATEGORY_OPTIONS: ReadonlyArray<{
  id: PrimaryItemCategory;
  icon: string;
}> = [
  { id: 'weapon', icon: '⚔️' },
  { id: 'tool', icon: '⛏️' },
  { id: 'armor', icon: '🛡️' },
  { id: 'consumable', icon: '🍎' },
  { id: 'artifact', icon: '🔮' },
];

const ARMOR_SLOT_OPTIONS: ReadonlyArray<{
  id: ArmorSlot;
  icon: string;
}> = [
  { id: 'helmet', icon: '🪖' },
  { id: 'chestplate', icon: '🛡️' },
  { id: 'leggings', icon: '🩳' },
  { id: 'boots', icon: '🥾' },
  { id: 'shield', icon: '🛡️' },
];

const SPEED_TIERS: readonly AttackSpeedTier[] = [
  'slow',
  'normal',
  'fast',
  'lightning',
];

const EAT_EFFECTS: readonly EatStatusEffect[] = [
  'regeneration',
  'absorption',
  'speed',
  'fire_resistance',
  'night_vision',
  'none',
];

export const StatsPowersPanel: React.FC<StatsPowersPanelProps> = ({
  project,
  lang,
  t,
  onChangeName,
  onChangeRarity,
  onChangeCategory,
  onChangeArmorSlot,
  onUpdateStats,
  onTogglePower,
  onOpenMcaddonExport,
}) => {
  const { stats, powers } = project;
  const fullHearts = Math.floor(stats.attackDamage / 2);
  const hasHalfHeart = stats.attackDamage % 2 === 1;
  const totalHeartsNumber = stats.attackDamage / 2;

  const normalizedCategory: PrimaryItemCategory =
    project.category === 'wand' ? 'artifact' : project.category;

  const normalizedRarity: PrimaryItemRarity =
    project.rarity === 'uncommon' ? 'common' : project.rarity;

  const formattedMoveSpeed =
    stats.movementSpeed > 0
      ? `+${stats.movementSpeed}%`
      : `${stats.movementSpeed}%`;

  const activePowerBadgeText = t.statsPanel.activePowersCount.replace(
    '{n}',
    String(powers.length)
  );

  return (
    <aside
      className="stats-powers-panel"
      aria-label={t.statsPanel.panelTitle}
      data-testid="stats-powers-panel"
    >
      <div className="stats-panel-header">
        <h2 className="pane-title">{t.statsPanel.panelTitle}</h2>
        <span className="powers-count-pill">{activePowerBadgeText}</span>
      </div>

      <div className="stats-scroll-body">
        {/* 1. Basic Info */}
        <section className="stats-card">
          <h3 className="section-heading">{t.statsPanel.basicInfoHeading}</h3>

          <label className="stats-field-block">
            <div className="field-label-row">
              <span>{t.statsPanel.displayNameLabel}</span>
              <code className="mini-slug">forjix:{project.slug}</code>
            </div>
            <input
              type="text"
              className="stats-text-input"
              value={project.name}
              maxLength={40}
              placeholder={t.statsPanel.displayNamePlaceholder}
              onChange={(e) => onChangeName(e.target.value)}
              data-testid="stats-name-input"
            />
          </label>

          {/* Rarity 2x2 Selector */}
          <div className="stats-field-block">
            <span className="sub-label">{t.statsPanel.rarityLabel}</span>
            <div className="rarity-grid">
              {RARITY_OPTIONS.map((rar) => {
                const isSelected = normalizedRarity === rar.id;
                return (
                  <button
                    key={rar.id}
                    type="button"
                    className={`rarity-chip rarity-border-${rar.id} ${
                      isSelected ? 'active' : ''
                    }`}
                    onClick={() => onChangeRarity(rar.id)}
                    aria-pressed={isSelected}
                    data-testid={`rarity-${rar.id}`}
                  >
                    <span
                      className="rarity-dot"
                      style={{ backgroundColor: rar.dotColor }}
                    />
                    <span>{t.rarityWithColor[rar.id]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category 2x2 Selector */}
          <div className="stats-field-block">
            <span className="sub-label">{t.statsPanel.categoryLabel}</span>
            <div className="category-grid">
              {CATEGORY_OPTIONS.map((cat) => {
                const isSelected = normalizedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`category-chip ${isSelected ? 'active' : ''}`}
                    onClick={() => onChangeCategory(cat.id)}
                    aria-pressed={isSelected}
                    data-testid={`category-${cat.id}`}
                  >
                    <span aria-hidden="true">{cat.icon}</span>
                    <span>{t.categories[cat.id]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Armor Slot Selector (only when armor category is active via full category) */}
          {project.category === 'armor' && (
            <div className="stats-field-block" data-testid="armor-slot-section">
              <span className="sub-label">{t.statsPanel.armorSlotLabel}</span>
              <div className="armor-slot-grid">
                {ARMOR_SLOT_OPTIONS.map((slot) => {
                  const isSelected = project.armorSlot === slot.id;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      className={`armor-slot-chip ${isSelected ? 'active' : ''}`}
                      onClick={() => onChangeArmorSlot(slot.id)}
                      aria-pressed={isSelected}
                      data-testid={`armor-slot-${slot.id}`}
                    >
                      <span aria-hidden="true">{slot.icon}</span>
                      <span>{t.armorSlots[slot.id]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* 2. Food / Consumable Dedicated Section (shown when Food/Consumable selected) */}
        {normalizedCategory === 'consumable' && (
          <section
            className="stats-card food-card"
            data-testid="food-consumable-section"
          >
            <h3 className="section-heading">🍗 {t.statsPanel.foodHeading}</h3>

            <div className="stats-field-block">
              <div className="field-label-row">
                <span>{t.statsPanel.hungerRestoredLabel}</span>
                <strong className="stat-value-highlight">
                  {stats.hungerRestored} / 10 {t.statsPanel.drumsticksUnit}
                </strong>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={stats.hungerRestored}
                className="forjix-slider"
                onChange={(e) =>
                  onUpdateStats({
                    hungerRestored: clampHungerRestored(Number(e.target.value)),
                  })
                }
                data-testid="hunger-slider"
              />
              <div className="icons-meter-row" aria-hidden="true">
                {Array.from({ length: 10 }, (_, idx) => (
                  <DrumstickIcon
                    key={idx}
                    size={16}
                    filled={idx < stats.hungerRestored}
                  />
                ))}
              </div>
            </div>

            <label className="stats-field-block">
              <span className="sub-label">{t.statsPanel.eatEffectLabel}</span>
              <select
                className="stats-select"
                value={stats.eatStatusEffect}
                onChange={(e) =>
                  onUpdateStats({
                    eatStatusEffect: e.target.value as EatStatusEffect,
                  })
                }
                data-testid="eat-effect-select"
              >
                {EAT_EFFECTS.map((eff) => (
                  <option key={eff} value={eff}>
                    {t.statsPanel.eatEffects[eff]}
                  </option>
                ))}
              </select>
            </label>
          </section>
        )}

        {/* 3. Combat & Utility Stats */}
        <section className="stats-card">
          <h3 className="section-heading">{t.statsPanel.combatHeading}</h3>

          {/* Attack Damage 1..50 + Visual Hearts */}
          <div className="stats-field-block">
            <div className="field-label-row">
              <span>⚔️ {t.statsPanel.attackDamageLabel}</span>
              <strong className="stat-value-highlight">
                {stats.attackDamage}{' '}
                <small>
                  ({totalHeartsNumber} {t.statsPanel.heartsUnit})
                </small>
              </strong>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              step={1}
              value={stats.attackDamage}
              className="forjix-slider"
              onChange={(e) =>
                onUpdateStats({
                  attackDamage: clampAttackDamage(Number(e.target.value)),
                })
              }
              data-testid="attack-damage-slider"
            />
            <div
              className="hearts-display-row"
              data-testid="visual-hearts-row"
              aria-label={`${totalHeartsNumber} ${t.statsPanel.heartsUnit}`}
            >
              {Array.from({ length: fullHearts }, (_, i) => (
                <HeartFullIcon key={`full-${i}`} size={13} />
              ))}
              {hasHalfHeart && <HeartHalfIcon size={13} />}
            </div>
          </div>

          {/* Durability 50..5000 + Unbreakable Toggle */}
          <div className="stats-field-block">
            <div className="field-label-row">
              <span>🛡️ {t.statsPanel.durabilityLabel}</span>
              <button
                type="button"
                className={`unbreakable-btn ${
                  stats.unbreakable ? 'active' : ''
                }`}
                onClick={() =>
                  onUpdateStats({ unbreakable: !stats.unbreakable })
                }
                aria-pressed={stats.unbreakable}
                data-testid="unbreakable-toggle"
              >
                ∞ {t.statsPanel.unbreakableToggle}
              </button>
            </div>

            {stats.unbreakable ? (
              <div className="unbreakable-banner">
                {t.statsPanel.unbreakableActive}
              </div>
            ) : (
              <>
                <div className="slider-with-readout">
                  <input
                    type="range"
                    min={50}
                    max={5000}
                    step={50}
                    value={stats.durability}
                    className="forjix-slider"
                    onChange={(e) =>
                      onUpdateStats({
                        durability: clampDurability(Number(e.target.value)),
                      })
                    }
                    data-testid="durability-slider"
                  />
                  <code className="slider-num-badge">{stats.durability}</code>
                </div>
              </>
            )}
          </div>

          {/* Attack Speed: Slow, Normal, Fast, Lightning */}
          <div className="stats-field-block">
            <span className="sub-label">⚡ {t.statsPanel.attackSpeedLabel}</span>
            <div className="speed-tier-grid">
              {SPEED_TIERS.map((tier) => {
                const isSelected = stats.attackSpeedTier === tier;
                return (
                  <button
                    key={tier}
                    type="button"
                    className={`speed-tier-btn ${isSelected ? 'active' : ''}`}
                    onClick={() => onUpdateStats({ attackSpeedTier: tier })}
                    aria-pressed={isSelected}
                    data-testid={`attack-speed-${tier}`}
                  >
                    {t.statsPanel.attackSpeeds[tier]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Movement Speed Modifier: -20% to +50% */}
          <div className="stats-field-block">
            <div className="field-label-row">
              <span>👟 {t.statsPanel.movementSpeedLabel}</span>
              <strong
                className={`stat-value-highlight ${
                  stats.movementSpeed > 0
                    ? 'pos-val'
                    : stats.movementSpeed < 0
                      ? 'neg-val'
                      : ''
                }`}
              >
                {formattedMoveSpeed}
              </strong>
            </div>
            <input
              type="range"
              min={-20}
              max={50}
              step={5}
              value={stats.movementSpeed}
              className="forjix-slider"
              onChange={(e) =>
                onUpdateStats({
                  movementSpeed: clampMovementSpeed(Number(e.target.value)),
                })
              }
              data-testid="movement-speed-slider"
            />
          </div>
        </section>

        {/* 4. Special Powers Multi-Select Badges */}
        <section className="stats-card">
          <h3 className="section-heading">✨ {t.statsPanel.powersHeading}</h3>

          <div className="powers-group">
            <span className="powers-group-title">
              {t.statsPanel.onHitHeading}
            </span>
            <div className="powers-badges-wrap">
              {ON_HIT_POWERS.map((opt) => {
                const active = hasPower(powers, opt.trigger, opt.effect);
                return (
                  <button
                    key={opt.effect}
                    type="button"
                    className={`power-badge-btn ${active ? 'active' : ''}`}
                    style={
                      active
                        ? {
                            borderColor: opt.badgeColor,
                            backgroundColor: `${opt.badgeColor}2B`,
                          }
                        : undefined
                    }
                    onClick={() => onTogglePower(opt)}
                    aria-pressed={active}
                    data-testid={`power-${opt.effect}`}
                  >
                    <span aria-hidden="true">{opt.iconSymbol}</span>
                    <span>{opt.label[lang]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="powers-group">
            <span className="powers-group-title">
              {t.statsPanel.passiveHeldHeading}
            </span>
            <div className="powers-badges-wrap">
              {PASSIVE_HELD_POWERS.map((opt) => {
                const active = hasPower(powers, opt.trigger, opt.effect);
                return (
                  <button
                    key={opt.effect}
                    type="button"
                    className={`power-badge-btn ${active ? 'active' : ''}`}
                    style={
                      active
                        ? {
                            borderColor: opt.badgeColor,
                            backgroundColor: `${opt.badgeColor}2B`,
                          }
                        : undefined
                    }
                    onClick={() => onTogglePower(opt)}
                    aria-pressed={active}
                    data-testid={`power-${opt.effect}`}
                  >
                    <span aria-hidden="true">{opt.iconSymbol}</span>
                    <span>{opt.label[lang]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="powers-group">
            <span className="powers-group-title">
              {t.statsPanel.onRightClickHeading}
            </span>
            <div className="powers-badges-wrap">
              {ON_RIGHT_CLICK_POWERS.map((opt) => {
                const active = hasPower(powers, opt.trigger, opt.effect);
                return (
                  <button
                    key={opt.effect}
                    type="button"
                    className={`power-badge-btn ${active ? 'active' : ''}`}
                    style={
                      active
                        ? {
                            borderColor: opt.badgeColor,
                            backgroundColor: `${opt.badgeColor}2B`,
                          }
                        : undefined
                    }
                    onClick={() => onTogglePower(opt)}
                    aria-pressed={active}
                    data-testid={`power-${opt.effect}`}
                  >
                    <span aria-hidden="true">{opt.iconSymbol}</span>
                    <span>{opt.label[lang]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* Prominent Export to Minecraft Bedrock / Education (.mcaddon) CTA */}
      <div className="stats-export-footer">
        <button
          type="button"
          className="mcaddon-cta-btn"
          onClick={onOpenMcaddonExport}
          data-testid="open-mcaddon-export-btn"
        >
          <span className="cta-icon" aria-hidden="true">
            🚀
          </span>
          <span className="cta-text">{t.mcaddonExport.ctaButton}</span>
        </button>
      </div>
    </aside>
  );
};
