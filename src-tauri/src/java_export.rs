// SPDX-License-Identifier: GPL-3.0-or-later

use crate::mcaddon::{
    build_item_rgba_image, greedy_mesh_voxels_16, render_pack_icon_png, MergedCuboid,
};
use crate::models::{
    EatStatusEffect, EditorMode, ItemCategory, ItemProject, ItemRarity, PowerTrigger,
};
use image::codecs::png::PngEncoder;
use image::{ExtendedColorType, ImageEncoder, Rgba, RgbaImage};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::fs::File;
use std::io::Write;
use std::path::Path;
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipWriter};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct JavaExportResult {
    pub resource_pack_path: String,
    pub data_pack_path: String,
    pub give_command: String,
    pub function_command: String,
}

fn encode_png_bytes(img: &RgbaImage) -> Result<Vec<u8>, String> {
    let mut buf = Vec::new();
    let encoder = PngEncoder::new(&mut buf);
    encoder
        .write_image(
            img.as_raw(),
            img.width(),
            img.height(),
            ExtendedColorType::Rgba8,
        )
        .map_err(|e| format!("PNG encoding failed: {e}"))?;
    Ok(buf)
}

fn java_rarity_color_name(rarity: ItemRarity) -> &'static str {
    match rarity {
        ItemRarity::Common | ItemRarity::Uncommon => "white",
        ItemRarity::Rare => "aqua",
        ItemRarity::Epic => "light_purple",
        ItemRarity::Legendary => "gold",
    }
}

fn java_base_item_id(category: ItemCategory) -> &'static str {
    match category {
        ItemCategory::Weapon => "minecraft:diamond_sword",
        ItemCategory::Tool => "minecraft:diamond_pickaxe",
        ItemCategory::Consumable => "minecraft:golden_apple",
        ItemCategory::Armor => "minecraft:shield",
        ItemCategory::Wand | ItemCategory::Artifact => "minecraft:blaze_rod",
    }
}

fn write_zip_entry<W: Write + std::io::Seek>(
    zip: &mut ZipWriter<W>,
    entry_path: &str,
    bytes: &[u8],
) -> Result<(), String> {
    let opts = SimpleFileOptions::default()
        .compression_method(CompressionMethod::Deflated)
        .unix_permissions(0o644);
    zip.start_file(entry_path, opts)
        .map_err(|e| format!("Failed starting zip entry '{entry_path}': {e}"))?;
    zip.write_all(bytes)
        .map_err(|e| format!("Failed writing zip entry '{entry_path}': {e}"))?;
    Ok(())
}

fn write_zip_json<W: Write + std::io::Seek>(
    zip: &mut ZipWriter<W>,
    entry_path: &str,
    val: &Value,
) -> Result<(), String> {
    let pretty = serde_json::to_vec_pretty(val)
        .map_err(|e| format!("Failed serializing '{entry_path}': {e}"))?;
    write_zip_entry(zip, entry_path, &pretty)
}

/// Builds a greedy-meshed 3D Java Edition item model (`assets/forjix/models/item/<slug>.json`)
/// and its bleed-proof UV palette PNG (`assets/forjix/textures/item/<slug>_voxel.png`).
pub fn build_java_voxel_model_and_atlas(
    slug: &str,
    cuboids: &[MergedCuboid],
) -> Result<(Vec<u8>, Value), String> {
    let mut color_to_idx: HashMap<[u8; 3], usize> = HashMap::new();
    let mut palette: Vec<[u8; 3]> = Vec::new();

    for c in cuboids {
        color_to_idx.entry(c.color).or_insert_with(|| {
            let idx = palette.len();
            palette.push(c.color);
            idx
        });
    }
    if palette.is_empty() {
        palette.push([255, 224, 84]);
        color_to_idx.insert([255, 224, 84], 0);
    }

    let cells_per_row: u32 = if palette.len() <= 256 { 16 } else { 32 };
    let atlas_size: u32 = cells_per_row * 4;
    let mut atlas = RgbaImage::from_pixel(atlas_size, atlas_size, Rgba([0, 0, 0, 0]));

    for (idx, &[r, g, b]) in palette.iter().enumerate() {
        let col = (idx as u32) % cells_per_row;
        let row = (idx as u32) / cells_per_row;
        let bx = col * 4;
        let by = row * 4;
        for dy in 0..4 {
            for dx in 0..4 {
                atlas.put_pixel(bx + dx, by + dy, Rgba([r, g, b, 255]));
            }
        }
    }

    // Java Edition UVs are normalized to 0.0..16.0 across the texture
    let uv_scale = 16.0 / (atlas_size as f32);
    let mut elements = Vec::with_capacity(cuboids.len());

    for c in cuboids {
        let idx = color_to_idx[&c.color] as u32;
        let px_u0 = ((idx % cells_per_row) * 4 + 1) as f32;
        let px_v0 = ((idx / cells_per_row) * 4 + 1) as f32;
        let u1 = px_u0 * uv_scale;
        let v1 = px_v0 * uv_scale;
        let u2 = (px_u0 + 2.0) * uv_scale;
        let v2 = (px_v0 + 2.0) * uv_scale;

        let face_def = json!({
            "uv": [u1, v1, u2, v2],
            "texture": "#atlas"
        });

        elements.push(json!({
            "from": [c.x as f32, c.y as f32, c.z as f32],
            "to": [(c.x + c.w) as f32, (c.y + c.h) as f32, (c.z + c.d) as f32],
            "faces": {
                "north": face_def,
                "south": face_def,
                "east": face_def,
                "west": face_def,
                "up": face_def,
                "down": face_def
            }
        }));
    }

    let model_json = json!({
        "textures": {
            "atlas": format!("forjix:item/{slug}_voxel"),
            "particle": format!("forjix:item/{slug}")
        },
        "elements": elements,
        "display": {
            "thirdperson_righthand": {
                "rotation": [75, 45, 0],
                "translation": [0.0, 2.5, 0.0],
                "scale": [0.55, 0.55, 0.55]
            },
            "thirdperson_lefthand": {
                "rotation": [75, 225, 0],
                "translation": [0.0, 2.5, 0.0],
                "scale": [0.55, 0.55, 0.55]
            },
            "firstperson_righthand": {
                "rotation": [0, 45, 0],
                "translation": [1.1, 2.6, 0.5],
                "scale": [0.5, 0.5, 0.5]
            },
            "firstperson_lefthand": {
                "rotation": [0, 225, 0],
                "translation": [1.1, 2.6, 0.5],
                "scale": [0.5, 0.5, 0.5]
            },
            "gui": {
                "rotation": [30, 225, 0],
                "translation": [0.0, 0.0, 0.0],
                "scale": [0.68, 0.68, 0.68]
            },
            "ground": {
                "rotation": [0, 0, 0],
                "translation": [0.0, 3.0, 0.0],
                "scale": [0.35, 0.35, 0.35]
            },
            "fixed": {
                "rotation": [0, 0, 0],
                "translation": [0.0, 0.0, 0.0],
                "scale": [0.6, 0.6, 0.6]
            }
        }
    });

    let atlas_png = encode_png_bytes(&atlas)?;
    Ok((atlas_png, model_json))
}

pub fn build_java_2d_model_json(project: &ItemProject) -> Value {
    let slug = &project.slug;
    let parent = if project.category == ItemCategory::Consumable {
        "minecraft:item/generated"
    } else {
        "minecraft:item/handheld"
    };

    json!({
        "parent": parent,
        "textures": {
            "layer0": format!("forjix:item/{slug}")
        },
        "display": {
            "thirdperson_righthand": {
                "rotation": [0, -90, 55],
                "translation": [0.0, 4.0, 0.5],
                "scale": [0.85, 0.85, 0.85]
            },
            "firstperson_righthand": {
                "rotation": [0, -90, 25],
                "translation": [1.13, 3.2, 1.13],
                "scale": [0.68, 0.68, 0.68]
            },
            "gui": {
                "rotation": [0, 0, 0],
                "translation": [0.0, 0.0, 0.0],
                "scale": [1.0, 1.0, 1.0]
            }
        }
    })
}

/// Constructs the exact Minecraft Java 1.21+ `/give @p <item>[components...] 1` command.
pub fn build_java_121_give_command(project: &ItemProject) -> String {
    let slug = &project.slug;
    let base_item = java_base_item_id(project.category);
    let is_food = project.category == ItemCategory::Consumable;

    let display_name = if project.name.trim().is_empty() {
        "Forjix Item"
    } else {
        project.name.trim()
    };

    let custom_name_json = json!({
        "text": display_name,
        "color": java_rarity_color_name(project.rarity),
        "italic": false
    })
    .to_string();
    // Escape single quotes inside single-quoted SNBT string
    let escaped_custom_name = custom_name_json.replace('\'', "\\'");

    let mut comps: Vec<String> = Vec::new();
    comps.push(format!("minecraft:item_model=\"forjix:{slug}\""));
    comps.push(format!("minecraft:custom_name='{escaped_custom_name}'"));
    comps.push(format!("minecraft:custom_data={{forjix_item:\"{slug}\"}}"));

    if !is_food {
        if project.stats.unbreakable {
            comps.push("minecraft:unbreakable={}".to_string());
        } else {
            comps.push(format!("minecraft:max_damage={}", project.stats.durability));
        }

        // Attribute modifiers for Attack Damage, Attack Speed, and Movement Speed
        let atk_bonus = (project.stats.attack_damage as f64 - 1.0).max(0.0);
        let spd_delta = (project.stats.attack_speed as f64) - 4.0;
        let mut modifiers: Vec<String> = Vec::new();

        modifiers.push(format!(
            "{{id:\"forjix:attack_damage\",type:\"minecraft:generic.attack_damage\",amount:{atk_bonus:.1},operation:\"add_value\",slot:\"mainhand\"}}"
        ));
        modifiers.push(format!(
            "{{id:\"forjix:attack_speed\",type:\"minecraft:generic.attack_speed\",amount:{spd_delta:.2},operation:\"add_value\",slot:\"mainhand\"}}"
        ));

        if project.stats.movement_speed != 0 {
            let move_frac = (project.stats.movement_speed as f64) / 100.0;
            modifiers.push(format!(
                "{{id:\"forjix:movement_speed\",type:\"minecraft:generic.movement_speed\",amount:{move_frac:.2},operation:\"add_multiplied_base\",slot:\"mainhand\"}}"
            ));
        }

        comps.push(format!(
            "minecraft:attribute_modifiers=[{}]",
            modifiers.join(",")
        ));
    } else {
        let nutrition = (project.stats.hunger_restored as u32) * 2;
        let saturation = (nutrition as f32) * 0.6;
        if project.stats.eat_status_effect != EatStatusEffect::None {
            let (eff_id, ticks, amp) = match project.stats.eat_status_effect {
                EatStatusEffect::Regeneration => ("minecraft:regeneration", 200, 1),
                EatStatusEffect::Absorption => ("minecraft:absorption", 1200, 1),
                EatStatusEffect::Speed => ("minecraft:speed", 300, 1),
                EatStatusEffect::FireResistance => ("minecraft:fire_resistance", 600, 0),
                EatStatusEffect::NightVision => ("minecraft:night_vision", 600, 0),
                EatStatusEffect::None => ("minecraft:regeneration", 1, 0),
            };
            comps.push(format!(
                "minecraft:food={{nutrition:{nutrition},saturation:{saturation:.1},can_always_eat:true,effects:[{{effect:{{id:\"{eff_id}\",amplifier:{amp},duration:{ticks}}},probability:1.0f}}]}}"
            ));
        } else {
            comps.push(format!(
                "minecraft:food={{nutrition:{nutrition},saturation:{saturation:.1},can_always_eat:true}}"
            ));
        }
    }

    let has_fire_res_power = project
        .powers
        .iter()
        .any(|p| p.trigger == PowerTrigger::PassiveHeld && p.effect == "fire_resistance");
    if has_fire_res_power || matches!(project.rarity, ItemRarity::Legendary) {
        comps.push("minecraft:fire_resistant={}".to_string());
    }

    if matches!(project.rarity, ItemRarity::Epic | ItemRarity::Legendary) {
        comps.push("minecraft:enchantment_glint_override=true".to_string());
    }

    format!("/give @p {base_item}[{}] 1", comps.join(","))
}

fn build_on_hit_advancement_json(slug: &str) -> Value {
    json!({
        "criteria": {
            "struck_target": {
                "trigger": "minecraft:player_hurt_entity",
                "conditions": {
                    "player": [
                        {
                            "condition": "minecraft:entity_properties",
                            "entity": "this",
                            "predicate": {
                                "equipment": {
                                    "mainhand": {
                                        "predicates": {
                                            "minecraft:custom_data": {
                                                "forjix_item": slug
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    ]
                }
            }
        },
        "rewards": {
            "function": format!("forjix:on_hit_{slug}")
        }
    })
}

fn build_on_hit_mcfunction(project: &ItemProject) -> String {
    let slug = &project.slug;
    let has_on_hit = |eff: &str| {
        project
            .powers
            .iter()
            .any(|p| p.trigger == PowerTrigger::OnHit && p.effect == eff)
    };

    let target_sel = "@e[distance=0.1..7,nbt={HurtTime:10s},limit=1,sort=nearest]";
    let mut lines: Vec<String> = vec![
        format!("# Auto-generated On-Hit handler for forjix:{slug}"),
        format!("advancement revoke @s only forjix:on_hit_{slug}"),
    ];

    if has_on_hit("lightning_bolt") {
        lines.push(format!(
            "execute at {target_sel} run summon minecraft:lightning_bolt ~ ~ ~"
        ));
    }
    if has_on_hit("set_fire") {
        lines.push(format!(
            "execute as {target_sel} run data merge entity @s {{Fire:100s}}"
        ));
        lines.push(format!(
            "execute at {target_sel} run particle minecraft:flame ~ ~1 ~ 0.3 0.4 0.3 0.02 18"
        ));
    }
    if has_on_hit("freeze_slowness") {
        lines.push(format!(
            "effect give {target_sel} minecraft:slowness 4 2 true"
        ));
        lines.push(format!(
            "execute at {target_sel} run particle minecraft:snowflake ~ ~1 ~ 0.3 0.4 0.3 0.02 16"
        ));
    }
    if has_on_hit("poison") {
        lines.push(format!(
            "effect give {target_sel} minecraft:poison 5 1 true"
        ));
    }
    if has_on_hit("super_knockback") {
        lines.push(format!(
            "execute at {target_sel} run particle minecraft:gust ~ ~1 ~ 0.2 0.2 0.2 0.05 4"
        ));
    }
    if has_on_hit("lifesteal") {
        lines.push("effect give @s minecraft:instant_health 1 0 true".to_string());
        lines.push("particle minecraft:heart ~ ~1.5 ~ 0.3 0.3 0.3 0.02 5".to_string());
    }

    lines.join("\n") + "\n"
}

fn build_passive_tick_mcfunction(project: &ItemProject) -> String {
    let slug = &project.slug;
    let has_passive = |eff: &str| {
        project
            .powers
            .iter()
            .any(|p| p.trigger == PowerTrigger::PassiveHeld && p.effect == eff)
    };

    let holder_sel = format!(
        "@a[nbt={{SelectedItem:{{components:{{\"minecraft:custom_data\":{{forjix_item:\"{slug}\"}}}}}}}}]"
    );

    let mut lines: Vec<String> = vec![format!(
        "# Auto-generated Passive Held effects for forjix:{slug}"
    )];

    if has_passive("speed_boost") {
        lines.push(format!("effect give {holder_sel} minecraft:speed 2 1 true"));
    }
    if has_passive("super_jump") {
        lines.push(format!(
            "effect give {holder_sel} minecraft:jump_boost 2 2 true"
        ));
    }
    if has_passive("night_vision") {
        lines.push(format!(
            "effect give {holder_sel} minecraft:night_vision 13 0 true"
        ));
    }
    if has_passive("fire_resistance") {
        lines.push(format!(
            "effect give {holder_sel} minecraft:fire_resistance 2 0 true"
        ));
    }
    if has_passive("glowing_aura") {
        lines.push(format!(
            "effect give {holder_sel} minecraft:glowing 2 0 true"
        ));
    }

    lines.join("\n") + "\n"
}

pub fn build_java_edition_packs(
    mut project: ItemProject,
    output_dir: &str,
) -> Result<JavaExportResult, String> {
    project.validate_and_normalize()?;

    let out_dir = Path::new(output_dir.trim());
    if !out_dir.exists() {
        std::fs::create_dir_all(out_dir).map_err(|e| {
            format!(
                "Failed creating output directory '{}': {e}",
                out_dir.display()
            )
        })?;
    }

    let slug = project.slug.clone();
    let display_name = if project.name.trim().is_empty() {
        "Forjix Item".to_string()
    } else {
        project.name.trim().to_string()
    };

    let rp_path = out_dir.join(format!("{slug}_java_resourcepack.zip"));
    let dp_path = out_dir.join(format!("{slug}_java_datapack.zip"));

    let item_rgba = build_item_rgba_image(&project)?;
    let item_png_bytes = encode_png_bytes(&item_rgba)?;
    let pack_icon_bytes = render_pack_icon_png(&item_rgba)?;

    // =========================================================================
    // 1. Write Java 1.21+ Resource Pack (<slug>_java_resourcepack.zip)
    // =========================================================================
    {
        let rp_file = File::create(&rp_path).map_err(|e| {
            format!(
                "Could not create Java Resource Pack '{}': {e}",
                rp_path.display()
            )
        })?;
        let mut rp_zip = ZipWriter::new(rp_file);

        let rp_mcmeta = json!({
            "pack": {
                "pack_format": 34,
                "supported_formats": {
                    "min_inclusive": 34,
                    "max_inclusive": 64
                },
                "description": format!("Forjix Resource Pack — {display_name}")
            }
        });
        write_zip_json(&mut rp_zip, "pack.mcmeta", &rp_mcmeta)?;
        write_zip_entry(&mut rp_zip, "pack.png", &pack_icon_bytes)?;

        // Always include the crisp item PNG texture at assets/forjix/textures/item/<slug>.png
        write_zip_entry(
            &mut rp_zip,
            &format!("assets/forjix/textures/item/{slug}.png"),
            &item_png_bytes,
        )?;

        if project.mode == EditorMode::Voxel && !project.voxels.is_empty() {
            let cuboids = greedy_mesh_voxels_16(&project.voxels)?;
            let (atlas_png, model_json) = build_java_voxel_model_and_atlas(&slug, &cuboids)?;
            write_zip_entry(
                &mut rp_zip,
                &format!("assets/forjix/textures/item/{slug}_voxel.png"),
                &atlas_png,
            )?;
            write_zip_json(
                &mut rp_zip,
                &format!("assets/forjix/models/item/{slug}.json"),
                &model_json,
            )?;
        } else {
            let model_json = build_java_2d_model_json(&project);
            write_zip_json(
                &mut rp_zip,
                &format!("assets/forjix/models/item/{slug}.json"),
                &model_json,
            )?;
        }

        // Modern 1.21.2+/1.21.4+ client item definition referencing `forjix:item/<slug>`
        let client_item_def = json!({
            "model": {
                "type": "minecraft:model",
                "model": format!("forjix:item/{slug}")
            }
        });
        write_zip_json(
            &mut rp_zip,
            &format!("assets/forjix/items/{slug}.json"),
            &client_item_def,
        )?;

        rp_zip
            .finish()
            .map_err(|e| format!("Failed finalizing Java Resource Pack zip: {e}"))?;
    }

    // =========================================================================
    // 2. Write Java 1.21+ Data Pack (<slug>_java_datapack.zip)
    // =========================================================================
    let give_command = build_java_121_give_command(&project);
    let function_command = format!("/function forjix:give_{slug}");

    {
        let dp_file = File::create(&dp_path).map_err(|e| {
            format!(
                "Could not create Java Data Pack '{}': {e}",
                dp_path.display()
            )
        })?;
        let mut dp_zip = ZipWriter::new(dp_file);

        let dp_mcmeta = json!({
            "pack": {
                "pack_format": 48,
                "supported_formats": {
                    "min_inclusive": 48,
                    "max_inclusive": 71
                },
                "description": format!("Forjix Data Pack — {display_name}")
            }
        });
        write_zip_json(&mut dp_zip, "pack.mcmeta", &dp_mcmeta)?;
        write_zip_entry(&mut dp_zip, "pack.png", &pack_icon_bytes)?;

        // .mcfunction files omit leading '/'
        let mcfunction_give_line = format!(
            "# Forged in Forjix (GNU GPLv3) — Grants {display_name}\n{}\n",
            give_command.trim_start_matches('/')
        );
        write_zip_entry(
            &mut dp_zip,
            &format!("data/forjix/function/give_{slug}.mcfunction"),
            mcfunction_give_line.as_bytes(),
        )?;

        let any_on_hit = project
            .powers
            .iter()
            .any(|p| p.trigger == PowerTrigger::OnHit);
        if any_on_hit {
            let adv_json = build_on_hit_advancement_json(&slug);
            let on_hit_fn = build_on_hit_mcfunction(&project);
            write_zip_json(
                &mut dp_zip,
                &format!("data/forjix/advancement/on_hit_{slug}.json"),
                &adv_json,
            )?;
            write_zip_entry(
                &mut dp_zip,
                &format!("data/forjix/function/on_hit_{slug}.mcfunction"),
                on_hit_fn.as_bytes(),
            )?;
        }

        let any_passive = project
            .powers
            .iter()
            .any(|p| p.trigger == PowerTrigger::PassiveHeld);
        if any_passive {
            let tick_fn = build_passive_tick_mcfunction(&project);
            let tick_tag = json!({
                "values": [format!("forjix:tick_{slug}")]
            });
            write_zip_entry(
                &mut dp_zip,
                &format!("data/forjix/function/tick_{slug}.mcfunction"),
                tick_fn.as_bytes(),
            )?;
            write_zip_json(
                &mut dp_zip,
                "data/minecraft/tags/function/tick.json",
                &tick_tag,
            )?;
        }

        dp_zip
            .finish()
            .map_err(|e| format!("Failed finalizing Java Data Pack zip: {e}"))?;
    }

    Ok(JavaExportResult {
        resource_pack_path: rp_path.to_string_lossy().into_owned(),
        data_pack_path: dp_path.to_string_lossy().into_owned(),
        give_command,
        function_command,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{AttackSpeedTier, ItemPower, ItemStats, Voxel};
    use std::io::Read;
    use zip::ZipArchive;

    #[test]
    fn exports_java_121_resourcepack_and_datapack_with_components_and_advancement() {
        let mut temp_dir = std::env::temp_dir();
        temp_dir.push("forjix_phase4_java_export_test");

        let project = ItemProject {
            id: "java-test-01".to_string(),
            name: "Sabia de Fulger".to_string(),
            slug: String::new(),
            mode: EditorMode::Voxel,
            grid_size: 16,
            pixels: vec![None; 256],
            voxels: vec![
                Voxel {
                    x: 7,
                    y: 4,
                    z: 7,
                    color: "#FFE054".to_string(),
                },
                Voxel {
                    x: 8,
                    y: 4,
                    z: 7,
                    color: "#FFE054".to_string(),
                },
            ],
            category: ItemCategory::Weapon,
            rarity: ItemRarity::Legendary,
            stats: ItemStats {
                attack_damage: 25.0,
                attack_speed: 4.0,
                attack_speed_tier: AttackSpeedTier::Lightning,
                durability: 2000,
                unbreakable: false,
                movement_speed: 15,
                mining_speed: 1.0,
                defense: 0.0,
                enchantability: 20,
                hunger_restored: 4,
                eat_status_effect: EatStatusEffect::None,
            },
            powers: vec![
                ItemPower {
                    id: "on_hit:lightning_bolt".to_string(),
                    trigger: PowerTrigger::OnHit,
                    effect: "lightning_bolt".to_string(),
                    amplifier: 1,
                    duration_seconds: 1,
                },
                ItemPower {
                    id: "on_hit:lifesteal".to_string(),
                    trigger: PowerTrigger::OnHit,
                    effect: "lifesteal".to_string(),
                    amplifier: 1,
                    duration_seconds: 1,
                },
            ],
        };

        let result = build_java_edition_packs(project, &temp_dir.to_string_lossy())
            .expect("export java packs");

        assert!(result
            .resource_pack_path
            .ends_with("sabia_de_fulger_java_resourcepack.zip"));
        assert!(result
            .data_pack_path
            .ends_with("sabia_de_fulger_java_datapack.zip"));
        assert!(result
            .give_command
            .starts_with("/give @p minecraft:diamond_sword["));
        assert!(result
            .give_command
            .contains("minecraft:item_model=\"forjix:sabia_de_fulger\""));
        assert!(result
            .give_command
            .contains("minecraft:attribute_modifiers="));
        assert!(result.give_command.contains("minecraft:fire_resistant={}"));

        // Verify Resource Pack zip contents & pack_format 34
        let rp_file = File::open(&result.resource_pack_path).unwrap();
        let mut rp_zip = ZipArchive::new(rp_file).unwrap();
        assert!(rp_zip
            .by_name("assets/forjix/textures/item/sabia_de_fulger.png")
            .is_ok());
        assert!(rp_zip
            .by_name("assets/forjix/models/item/sabia_de_fulger.json")
            .is_ok());
        let mut rp_mcmeta_raw = String::new();
        rp_zip
            .by_name("pack.mcmeta")
            .unwrap()
            .read_to_string(&mut rp_mcmeta_raw)
            .unwrap();
        let rp_mcmeta: Value = serde_json::from_str(&rp_mcmeta_raw).unwrap();
        assert_eq!(rp_mcmeta["pack"]["pack_format"], json!(34));

        // Verify Data Pack zip contents & pack_format 48
        let dp_file = File::open(&result.data_pack_path).unwrap();
        let mut dp_zip = ZipArchive::new(dp_file).unwrap();
        assert!(dp_zip
            .by_name("data/forjix/function/give_sabia_de_fulger.mcfunction")
            .is_ok());
        assert!(dp_zip
            .by_name("data/forjix/advancement/on_hit_sabia_de_fulger.json")
            .is_ok());
        assert!(dp_zip
            .by_name("data/forjix/function/on_hit_sabia_de_fulger.mcfunction")
            .is_ok());

        let mut dp_mcmeta_raw = String::new();
        dp_zip
            .by_name("pack.mcmeta")
            .unwrap()
            .read_to_string(&mut dp_mcmeta_raw)
            .unwrap();
        let dp_mcmeta: Value = serde_json::from_str(&dp_mcmeta_raw).unwrap();
        assert_eq!(dp_mcmeta["pack"]["pack_format"], json!(48));

        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}
