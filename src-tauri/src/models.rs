// SPDX-License-Identifier: GPL-3.0-or-later

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum EditorMode {
    Extruded,
    Voxel,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ItemCategory {
    Weapon,
    Tool,
    Armor,
    Wand,
    Consumable,
    Artifact,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ItemRarity {
    Common,
    Uncommon,
    Rare,
    Epic,
    Legendary,
}

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AttackSpeedTier {
    Slow,
    #[default]
    Normal,
    Fast,
    Lightning,
}

impl AttackSpeedTier {
    pub fn numeric_speed(self) -> f32 {
        match self {
            Self::Slow => 0.8,
            Self::Normal => 1.6,
            Self::Fast => 2.4,
            Self::Lightning => 4.0,
        }
    }
}

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum EatStatusEffect {
    None,
    #[default]
    Regeneration,
    Absorption,
    Speed,
    FireResistance,
    NightVision,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PowerTrigger {
    OnHit,
    OnRightClick,
    PassiveHeld,
    OnConsume,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Voxel {
    pub x: i32,
    pub y: i32,
    pub z: i32,
    pub color: String,
}

fn default_hunger_restored() -> u8 {
    4
}

fn default_mining_speed() -> f32 {
    1.0
}

fn default_enchantability() -> u32 {
    15
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ItemStats {
    pub attack_damage: f32,
    pub attack_speed: f32,
    #[serde(default)]
    pub attack_speed_tier: AttackSpeedTier,
    pub durability: u32,
    #[serde(default)]
    pub unbreakable: bool,
    #[serde(default)]
    pub movement_speed: i32,
    #[serde(default = "default_mining_speed")]
    pub mining_speed: f32,
    #[serde(default)]
    pub defense: f32,
    #[serde(default = "default_enchantability")]
    pub enchantability: u32,
    #[serde(default = "default_hunger_restored")]
    pub hunger_restored: u8,
    #[serde(default)]
    pub eat_status_effect: EatStatusEffect,
}

impl ItemStats {
    pub fn clamp_safe(&mut self) {
        self.attack_damage = self.attack_damage.clamp(1.0, 50.0).round();
        self.durability = self.durability.clamp(50, 5000);
        self.movement_speed = self.movement_speed.clamp(-20, 50);
        self.hunger_restored = self.hunger_restored.clamp(1, 10);
        self.attack_speed = self.attack_speed_tier.numeric_speed();
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ItemPower {
    pub id: String,
    pub trigger: PowerTrigger,
    pub effect: String,
    pub amplifier: u8,
    pub duration_seconds: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ItemProject {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub mode: EditorMode,
    pub grid_size: u8,
    pub pixels: Vec<Option<String>>,
    pub voxels: Vec<Voxel>,
    pub category: ItemCategory,
    pub rarity: ItemRarity,
    pub stats: ItemStats,
    pub powers: Vec<ItemPower>,
}

pub fn slugify_name(name: &str) -> String {
    let mut out = String::with_capacity(name.len());
    let mut prev_underscore = false;

    for ch in name.chars() {
        let mapped = match ch {
            'ă' | 'Ă' | 'â' | 'Â' => Some('a'),
            'î' | 'Î' => Some('i'),
            'ș' | 'Ș' | 'ş' | 'Ş' => Some('s'),
            'ț' | 'Ț' | 'ţ' | 'Ţ' => Some('t'),
            c if c.is_ascii_alphanumeric() => Some(c.to_ascii_lowercase()),
            _ => None,
        };

        if let Some(c) = mapped {
            out.push(c);
            prev_underscore = false;
        } else if !out.is_empty() && !prev_underscore {
            out.push('_');
            prev_underscore = true;
        }
    }

    while out.ends_with('_') {
        out.pop();
    }

    if out.is_empty() {
        "custom_item".to_string()
    } else {
        out
    }
}

pub fn is_valid_hex_color(color: &str) -> bool {
    let bytes = color.as_bytes();
    if bytes.len() != 7 || bytes[0] != b'#' {
        return false;
    }
    bytes[1..].iter().all(|b| b.is_ascii_hexdigit())
}

impl ItemProject {
    pub fn validate_and_normalize(&mut self) -> Result<(), String> {
        if self.grid_size != 16 && self.grid_size != 32 {
            return Err(format!(
                "Invalid gridSize {}: expected 16 or 32",
                self.grid_size
            ));
        }

        let expected_len = (self.grid_size as usize) * (self.grid_size as usize);
        if self.pixels.len() != expected_len {
            return Err(format!(
                "Invalid pixels length {}: expected {} for {}x{} grid",
                self.pixels.len(),
                expected_len,
                self.grid_size,
                self.grid_size
            ));
        }

        for hex in self.pixels.iter_mut().flatten() {
            if !is_valid_hex_color(hex) {
                return Err(format!("Invalid hex color '{}'", hex));
            }
            *hex = hex.to_ascii_uppercase();
        }

        self.slug = slugify_name(&self.name);
        self.stats.clamp_safe();

        match self.mode {
            EditorMode::Extruded => {
                self.rebuild_extruded_voxels();
            }
            EditorMode::Voxel => {
                self.normalize_sculpted_voxels()?;
            }
        }

        Ok(())
    }

    pub fn rebuild_extruded_voxels(&mut self) {
        let size = self.grid_size as usize;
        let mut voxels = Vec::new();
        for y in 0..size {
            for x in 0..size {
                if let Some(Some(color)) = self.pixels.get(y * size + x) {
                    voxels.push(Voxel {
                        x: x as i32,
                        y: (size - 1 - y) as i32,
                        z: 0,
                        color: color.clone(),
                    });
                }
            }
        }
        self.voxels = voxels;
    }

    pub fn normalize_sculpted_voxels(&mut self) -> Result<(), String> {
        let mut map: BTreeMap<(i32, i32, i32), String> = BTreeMap::new();
        for v in &self.voxels {
            if !(0..16).contains(&v.x) || !(0..16).contains(&v.y) || !(0..16).contains(&v.z) {
                continue;
            }
            if !is_valid_hex_color(&v.color) {
                return Err(format!("Invalid voxel hex color '{}'", v.color));
            }
            map.insert((v.x, v.y, v.z), v.color.to_ascii_uppercase());
        }

        self.voxels = map
            .into_iter()
            .map(|((x, y, z), color)| Voxel { x, y, z, color })
            .collect();
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn slugifies_romanian_and_english_names() {
        assert_eq!(slugify_name("Sabia de Fulger!"), "sabia_de_fulger");
        assert_eq!(
            slugify_name("Târnăcop de Foc & Gheață"),
            "tarnacop_de_foc_gheata"
        );
        assert_eq!(slugify_name("   "), "custom_item");
    }

    #[test]
    fn clamps_stats_and_preserves_3d_voxel_mode() {
        let pixels = vec![None; 256];
        let mut project = ItemProject {
            id: "voxel-001".to_string(),
            name: "Ciocan de Război".to_string(),
            slug: String::new(),
            mode: EditorMode::Voxel,
            grid_size: 16,
            pixels,
            voxels: vec![
                Voxel {
                    x: 7,
                    y: 0,
                    z: 7,
                    color: "#ffaa00".to_string(),
                },
                Voxel {
                    x: 99,
                    y: 0,
                    z: 0,
                    color: "#ffffff".to_string(),
                },
            ],
            category: ItemCategory::Weapon,
            rarity: ItemRarity::Legendary,
            stats: ItemStats {
                attack_damage: 95.0,
                attack_speed: 0.0,
                attack_speed_tier: AttackSpeedTier::Lightning,
                durability: 99999,
                unbreakable: true,
                movement_speed: 80,
                mining_speed: 1.0,
                defense: 0.0,
                enchantability: 20,
                hunger_restored: 25,
                eat_status_effect: EatStatusEffect::Absorption,
            },
            powers: vec![ItemPower {
                id: "on_hit:lightning_bolt".to_string(),
                trigger: PowerTrigger::OnHit,
                effect: "lightning_bolt".to_string(),
                amplifier: 1,
                duration_seconds: 3,
            }],
        };

        project
            .validate_and_normalize()
            .expect("valid voxel project");
        assert_eq!(project.slug, "ciocan_de_razboi");
        assert_eq!(project.voxels.len(), 1);
        assert_eq!(project.voxels[0].color, "#FFAA00");
        assert_eq!(project.stats.attack_damage, 50.0);
        assert_eq!(project.stats.durability, 5000);
        assert_eq!(project.stats.movement_speed, 50);
        assert_eq!(project.stats.hunger_restored, 10);
        assert_eq!(project.stats.attack_speed, 4.0);
        assert!(project.stats.unbreakable);
    }
}
