// SPDX-License-Identifier: GPL-3.0-or-later

use crate::models::{
    ArmorSlot, EatStatusEffect, EditorMode, ItemCategory, ItemProject, ItemRarity, PowerTrigger,
    Voxel,
};
use image::codecs::png::PngEncoder;
use image::{ExtendedColorType, ImageEncoder, Rgba, RgbaImage};
use serde_json::{json, Map, Value};
use std::collections::HashMap;
use std::fs::File;
use std::io::Write;
use std::path::{Path, PathBuf};
use uuid::Uuid;
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipWriter};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MergedCuboid {
    pub x: usize,
    pub y: usize,
    pub z: usize,
    pub w: usize,
    pub h: usize,
    pub d: usize,
    pub color: [u8; 3],
}

pub fn parse_hex_rgb(hex: &str) -> Result<[u8; 3], String> {
    let clean = hex.trim().trim_start_matches('#');
    if clean.len() != 6 {
        return Err(format!("Invalid hex color '{hex}'"));
    }
    let r = u8::from_str_radix(&clean[0..2], 16).map_err(|_| format!("Bad R in '{hex}'"))?;
    let g = u8::from_str_radix(&clean[2..4], 16).map_err(|_| format!("Bad G in '{hex}'"))?;
    let b = u8::from_str_radix(&clean[4..6], 16).map_err(|_| format!("Bad B in '{hex}'"))?;
    Ok([r, g, b])
}

pub fn rarity_color_prefix(rarity: ItemRarity) -> &'static str {
    match rarity {
        ItemRarity::Common | ItemRarity::Uncommon => "§f",
        ItemRarity::Rare => "§b",
        ItemRarity::Epic => "§d",
        ItemRarity::Legendary => "§6",
    }
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

pub fn build_item_rgba_image(project: &ItemProject) -> Result<RgbaImage, String> {
    match project.mode {
        EditorMode::Extruded => {
            let size = project.grid_size as u32;
            let mut img = RgbaImage::from_pixel(size, size, Rgba([0, 0, 0, 0]));
            let mut any_opaque = false;

            for y in 0..size {
                for x in 0..size {
                    let idx = (y * size + x) as usize;
                    if let Some(Some(hex)) = project.pixels.get(idx) {
                        let [r, g, b] = parse_hex_rgb(hex)?;
                        img.put_pixel(x, y, Rgba([r, g, b, 255]));
                        any_opaque = true;
                    }
                }
            }

            if !any_opaque {
                let mid = size / 2;
                img.put_pixel(mid, mid, Rgba([255, 224, 84, 255]));
            }
            Ok(img)
        }
        EditorMode::Voxel => {
            // Front-lit Z-buffered 16x16 icon projection of the 3D voxel model
            let mut img = RgbaImage::from_pixel(16, 16, Rgba([0, 0, 0, 0]));
            let mut best_z = [[-1_i32; 16]; 16];
            let mut any_opaque = false;

            for v in &project.voxels {
                if (0..16).contains(&v.x) && (0..16).contains(&v.y) && (0..16).contains(&v.z) {
                    let px = v.x as usize;
                    let py = (15 - v.y) as usize;
                    if v.z >= best_z[py][px] {
                        best_z[py][px] = v.z;
                        let [r, g, b] = parse_hex_rgb(&v.color)?;
                        img.put_pixel(px as u32, py as u32, Rgba([r, g, b, 255]));
                        any_opaque = true;
                    }
                }
            }

            if !any_opaque {
                img.put_pixel(8, 8, Rgba([56, 242, 255, 255]));
            }
            Ok(img)
        }
    }
}

pub fn render_pack_icon_png(item_img: &RgbaImage) -> Result<Vec<u8>, String> {
    let out_size = 64_u32;
    let mut icon = RgbaImage::from_pixel(out_size, out_size, Rgba([21, 27, 44, 255]));

    // Golden frame border
    for i in 0..out_size {
        for t in 0..2 {
            icon.put_pixel(i, t, Rgba([255, 212, 59, 255]));
            icon.put_pixel(i, out_size - 1 - t, Rgba([255, 212, 59, 255]));
            icon.put_pixel(t, i, Rgba([255, 212, 59, 255]));
            icon.put_pixel(out_size - 1 - t, i, Rgba([255, 212, 59, 255]));
        }
    }

    let inner = 48_u32;
    let offset = (out_size - inner) / 2;
    let src_w = item_img.width().max(1);
    let src_h = item_img.height().max(1);

    for y in 0..inner {
        for x in 0..inner {
            let sx = (x * src_w) / inner;
            let sy = (y * src_h) / inner;
            let px = item_img.get_pixel(sx, sy);
            if px[3] > 0 {
                icon.put_pixel(offset + x, offset + y, *px);
            }
        }
    }

    encode_png_bytes(&icon)
}

/// Runs 3D greedy cuboid merging on the 16x16x16 voxel grid to minimize
/// the number of Bedrock geometry cubes while preserving exact voxel shapes & colors.
pub fn greedy_mesh_voxels_16(voxels: &[Voxel]) -> Result<Vec<MergedCuboid>, String> {
    let mut grid: [[[Option<[u8; 3]>; 16]; 16]; 16] = [[[None; 16]; 16]; 16];
    for v in voxels {
        if (0..16).contains(&v.x) && (0..16).contains(&v.y) && (0..16).contains(&v.z) {
            grid[v.x as usize][v.y as usize][v.z as usize] = Some(parse_hex_rgb(&v.color)?);
        }
    }

    let mut visited = [[[false; 16]; 16]; 16];
    let mut cuboids = Vec::new();

    for y in 0..16 {
        for z in 0..16 {
            for x in 0..16 {
                if visited[x][y][z] {
                    continue;
                }
                let Some(color) = grid[x][y][z] else {
                    continue;
                };

                // 1. Expand width along +X
                let mut w = 1;
                while x + w < 16 && !visited[x + w][y][z] && grid[x + w][y][z] == Some(color) {
                    w += 1;
                }

                // 2. Expand depth along +Z
                let mut d = 1;
                'depth: while z + d < 16 {
                    for ix in x..(x + w) {
                        if visited[ix][y][z + d] || grid[ix][y][z + d] != Some(color) {
                            break 'depth;
                        }
                    }
                    d += 1;
                }

                // 3. Expand height along +Y
                let mut h = 1;
                'height: while y + h < 16 {
                    for iz in z..(z + d) {
                        for ix in x..(x + w) {
                            if visited[ix][y + h][iz] || grid[ix][y + h][iz] != Some(color) {
                                break 'height;
                            }
                        }
                    }
                    h += 1;
                }

                // Mark merged region visited
                for plane_x in visited.iter_mut().skip(x).take(w) {
                    for row_y in plane_x.iter_mut().skip(y).take(h) {
                        for cell_z in row_y.iter_mut().skip(z).take(d) {
                            *cell_z = true;
                        }
                    }
                }

                cuboids.push(MergedCuboid {
                    x,
                    y,
                    z,
                    w,
                    h,
                    d,
                    color,
                });
            }
        }
    }

    Ok(cuboids)
}

pub fn build_voxel_uv_atlas_and_geo(
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

    // 4x4 texel block per color so inner 2x2 UV region has a 1px bleed-proof border
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

    let mut geo_cubes = Vec::with_capacity(cuboids.len());
    for c in cuboids {
        let idx = color_to_idx[&c.color] as u32;
        let u = (idx % cells_per_row) * 4 + 1;
        let v = (idx / cells_per_row) * 4 + 1;

        let face_uv = json!({
            "uv": [u, v],
            "uv_size": [2, 2]
        });

        geo_cubes.push(json!({
            "origin": [
                (c.x as f32) - 8.0,
                (c.y as f32),
                (c.z as f32) - 8.0
            ],
            "size": [c.w as f32, c.h as f32, c.d as f32],
            "uv": {
                "north": face_uv,
                "south": face_uv,
                "east": face_uv,
                "west": face_uv,
                "up": face_uv,
                "down": face_uv
            }
        }));
    }

    let geo_json = json!({
        "format_version": "1.12.0",
        "minecraft:geometry": [
            {
                "description": {
                    "identifier": format!("geometry.forjix_{slug}"),
                    "texture_width": atlas_size,
                    "texture_height": atlas_size,
                    "visible_bounds_width": 3.0,
                    "visible_bounds_height": 3.0,
                    "visible_bounds_offset": [0.0, 0.75, 0.0]
                },
                "bones": [
                    {
                        "name": "rightitem",
                        "pivot": [0.0, 0.0, 0.0],
                        "binding": "q.item_slot_to_bone_name(c.item_slot)",
                        "cubes": geo_cubes
                    }
                ]
            }
        ]
    });

    let png_bytes = encode_png_bytes(&atlas)?;
    Ok((png_bytes, geo_json))
}

fn build_attachable_animation_json(slug: &str) -> Value {
    json!({
        "format_version": "1.8.0",
        "animations": {
            format!("animation.forjix_{slug}.first_person_hold"): {
                "loop": true,
                "bones": {
                    "rightitem": {
                        "rotation": [12.0, 25.0, -10.0],
                        "position": [1.5, 1.0, -1.5],
                        "scale": 0.75
                    }
                }
            },
            format!("animation.forjix_{slug}.third_person_hold"): {
                "loop": true,
                "bones": {
                    "rightitem": {
                        "rotation": [75.0, 0.0, 0.0],
                        "position": [0.0, 2.0, -1.0],
                        "scale": 0.75
                    }
                }
            }
        }
    })
}

fn build_attachable_json(slug: &str) -> Value {
    json!({
        "format_version": "1.10.0",
        "minecraft:attachable": {
            "description": {
                "identifier": format!("forjix:{slug}"),
                "materials": {
                    "default": "entity_alphatest",
                    "enchanted": "entity_alphatest_glint"
                },
                "textures": {
                    "default": format!("textures/entity/{slug}_3d"),
                    "enchanted": "textures/misc/enchanted_item_glint"
                },
                "geometry": {
                    "default": format!("geometry.forjix_{slug}")
                },
                "animations": {
                    "first_person_hold": format!("animation.forjix_{slug}.first_person_hold"),
                    "third_person_hold": format!("animation.forjix_{slug}.third_person_hold")
                },
                "scripts": {
                    "animate": [
                        { "first_person_hold": "c.is_first_person" },
                        { "third_person_hold": "!c.is_first_person" }
                    ]
                },
                "render_controllers": [
                    "controller.render.item_default"
                ]
            }
        }
    })
}

pub fn needs_behavior_script(project: &ItemProject) -> bool {
    let has_powers = project.powers.iter().any(|p| {
        matches!(
            p.trigger,
            PowerTrigger::OnHit | PowerTrigger::PassiveHeld | PowerTrigger::OnRightClick
        )
    });
    let has_move_modifier = project.stats.movement_speed != 0;
    let has_food_effect = project.category == ItemCategory::Consumable
        && project.stats.eat_status_effect != EatStatusEffect::None;

    has_powers || has_move_modifier || has_food_effect
}

pub fn generate_behavior_script_js(project: &ItemProject) -> String {
    let item_id = format!("forjix:{}", project.slug);

    let has_on_hit = |eff: &str| {
        project
            .powers
            .iter()
            .any(|p| p.trigger == PowerTrigger::OnHit && p.effect == eff)
    };
    let has_passive = |eff: &str| {
        project
            .powers
            .iter()
            .any(|p| p.trigger == PowerTrigger::PassiveHeld && p.effect == eff)
    };

    let any_on_hit = project
        .powers
        .iter()
        .any(|p| p.trigger == PowerTrigger::OnHit);

    let any_passive = project
        .powers
        .iter()
        .any(|p| p.trigger == PowerTrigger::PassiveHeld)
        || project.stats.movement_speed != 0;

    let has_right_click = |eff: &str| {
        project
            .powers
            .iter()
            .any(|p| p.trigger == PowerTrigger::OnRightClick && p.effect == eff)
    };

    let any_right_click = project
        .powers
        .iter()
        .any(|p| p.trigger == PowerTrigger::OnRightClick);

    let mut js = String::new();
    js.push_str("// Auto-generated by Forjix (GNU GPLv3) for Minecraft Bedrock & Education\n");
    js.push_str("import { world, system, EquipmentSlot } from \"@minecraft/server\";\n\n");
    js.push_str(&format!("const FORJIX_ITEM_ID = {item_id:?};\n\n"));
    js.push_str(
        "function isHoldingForgedItem(entity) {\n\
         \x20 try {\n\
         \x20   const equip = entity.getComponent(\"minecraft:equippable\");\n\
         \x20   if (!equip) return false;\n\
         \x20   const mainhand = equip.getEquipment(EquipmentSlot.Mainhand);\n\
         \x20   return Boolean(mainhand && mainhand.typeId === FORJIX_ITEM_ID);\n\
         \x20 } catch {\n\
         \x20   return false;\n\
         \x20 }\n\
         }\n\n",
    );

    if any_on_hit {
        js.push_str("world.afterEvents.entityHitEntity.subscribe((event) => {\n");
        js.push_str("  const { damagingEntity, hitEntity } = event;\n");
        js.push_str("  if (!damagingEntity || !hitEntity || !isHoldingForgedItem(damagingEntity)) return;\n\n");

        if has_on_hit("set_fire") {
            js.push_str("  try { hitEntity.setOnFire(5, true); } catch {}\n");
        }
        if has_on_hit("lightning_bolt") {
            js.push_str("  try { hitEntity.dimension.spawnEntity(\"minecraft:lightning_bolt\", hitEntity.location); } catch {}\n");
        }
        if has_on_hit("freeze_slowness") {
            js.push_str("  try { hitEntity.addEffect(\"slowness\", 80, { amplifier: 2, showParticles: true }); } catch {}\n");
        }
        if has_on_hit("super_knockback") {
            js.push_str(
                "  try {\n\
                 \x20   const dx = hitEntity.location.x - damagingEntity.location.x;\n\
                 \x20   const dz = hitEntity.location.z - damagingEntity.location.z;\n\
                 \x20   const dist = Math.hypot(dx, dz) || 1;\n\
                 \x20   hitEntity.applyKnockback(dx / dist, dz / dist, 2.6, 0.55);\n\
                 \x20 } catch {}\n",
            );
        }
        if has_on_hit("poison") {
            js.push_str("  try { hitEntity.addEffect(\"poison\", 100, { amplifier: 1, showParticles: true }); } catch {}\n");
        }
        if has_on_hit("lifesteal") {
            js.push_str(
                "  try {\n\
                 \x20   const health = damagingEntity.getComponent(\"minecraft:health\");\n\
                 \x20   if (health) {\n\
                 \x20     health.setCurrentValue(Math.min(health.effectiveMax, health.currentValue + 4));\n\
                 \x20   }\n\
                 \x20 } catch {}\n",
            );
        }

        js.push_str("});\n\n");
    }

    if any_right_click {
        js.push_str("world.afterEvents.itemUse.subscribe((event) => {\n");
        js.push_str(
            "  if (!event.itemStack || event.itemStack.typeId !== FORJIX_ITEM_ID) return;\n",
        );
        js.push_str("  const player = event.source;\n");
        js.push_str("  if (!player) return;\n\n");

        if has_right_click("launch_fireball") {
            js.push_str(
                "  try {\n\
                 \x20   const viewDir = player.getViewDirection();\n\
                 \x20   const spawnLoc = {\n\
                 \x20     x: player.location.x + viewDir.x * 1.5,\n\
                 \x20     y: player.location.y + 1.2 + viewDir.y,\n\
                 \x20     z: player.location.z + viewDir.z * 1.5\n\
                 \x20   };\n\
                 \x20   const fireball = player.dimension.spawnEntity(\"minecraft:fireball\", spawnLoc);\n\
                 \x20   fireball.getComponent(\"minecraft:projectile\")?.shoot(viewDir, { speed: 2.2 });\n\
                 \x20 } catch {}\n",
            );
        }
        if has_right_click("teleport_forward") {
            js.push_str(
                "  try {\n\
                 \x20   const viewDir = player.getViewDirection();\n\
                 \x20   player.teleport({\n\
                 \x20     x: player.location.x + viewDir.x * 8,\n\
                 \x20     y: player.location.y + viewDir.y * 2 + 1,\n\
                 \x20     z: player.location.z + viewDir.z * 8\n\
                 \x20   }, { checkForBlocks: true });\n\
                 \x20 } catch {}\n",
            );
        }
        if has_right_click("heal_aura") {
            js.push_str(
                "  try {\n\
                 \x20   for (const ally of player.dimension.getPlayers({ location: player.location, maxDistance: 6 })) {\n\
                 \x20     const nh = ally.getComponent(\"minecraft:health\");\n\
                 \x20     const bonus = ally.id === player.id ? 6 : 4;\n\
                 \x20     if (nh) nh.setCurrentValue(Math.min(nh.effectiveMax, nh.currentValue + bonus));\n\
                 \x20   }\n\
                 \x20 } catch {}\n",
            );
        }

        js.push_str("});\n\n");
    }

    if any_passive {
        js.push_str("system.runInterval(() => {\n");
        js.push_str("  for (const player of world.getAllPlayers()) {\n");
        js.push_str("    if (!isHoldingForgedItem(player)) continue;\n");

        if has_passive("speed_boost") || project.stats.movement_speed > 0 {
            let amp = if has_passive("speed_boost") {
                1 + (project.stats.movement_speed.max(0) / 25)
            } else {
                (project.stats.movement_speed / 25).max(0)
            };
            js.push_str(&format!(
                "    try {{ player.addEffect(\"speed\", 45, {{ amplifier: {amp}, showParticles: false }}); }} catch {{}}\n"
            ));
        } else if project.stats.movement_speed < 0 {
            js.push_str("    try { player.addEffect(\"slowness\", 45, { amplifier: 0, showParticles: false }); } catch {}\n");
        }

        if has_passive("super_jump") {
            js.push_str("    try { player.addEffect(\"jump_boost\", 45, { amplifier: 2, showParticles: false }); } catch {}\n");
        }
        if has_passive("night_vision") {
            js.push_str("    try { player.addEffect(\"night_vision\", 260, { amplifier: 0, showParticles: false }); } catch {}\n");
        }
        if has_passive("fire_resistance") {
            js.push_str("    try { player.addEffect(\"fire_resistance\", 45, { amplifier: 0, showParticles: false }); } catch {}\n");
        }
        if has_passive("glowing_aura") {
            js.push_str(
                "    try {\n\
                 \x20     player.dimension.spawnParticle(\"minecraft:endrod\", {\n\
                 \x20       x: player.location.x,\n\
                 \x20       y: player.location.y + 1.0,\n\
                 \x20       z: player.location.z\n\
                 \x20     });\n\
                 \x20   } catch {}\n",
            );
        }

        js.push_str("  }\n");
        js.push_str("}, 20);\n\n");
    }

    if project.category == ItemCategory::Consumable
        && project.stats.eat_status_effect != EatStatusEffect::None
    {
        let (effect_id, ticks, amp) = match project.stats.eat_status_effect {
            EatStatusEffect::Regeneration => ("regeneration", 200, 1),
            EatStatusEffect::Absorption => ("absorption", 1200, 1),
            EatStatusEffect::Speed => ("speed", 300, 1),
            EatStatusEffect::FireResistance => ("fire_resistance", 600, 0),
            EatStatusEffect::NightVision => ("night_vision", 600, 0),
            EatStatusEffect::None => ("regeneration", 1, 0),
        };
        js.push_str("world.afterEvents.itemCompleteUse.subscribe((event) => {\n");
        js.push_str(
            "  if (!event.itemStack || event.itemStack.typeId !== FORJIX_ITEM_ID) return;\n",
        );
        js.push_str(&format!(
            "  try {{ event.source.addEffect({effect_id:?}, {ticks}, {{ amplifier: {amp}, showParticles: true }}); }} catch {{}}\n"
        ));
        js.push_str("});\n");
    }

    js
}

pub fn build_bp_item_json(project: &ItemProject) -> Value {
    let slug = &project.slug;
    let identifier = format!("forjix:{slug}");
    let is_food = project.category == ItemCategory::Consumable;

    let menu_category = match project.category {
        ItemCategory::Weapon => json!({
            "category": "equipment",
            "group": "minecraft:itemGroup.name.sword"
        }),
        ItemCategory::Tool => json!({
            "category": "equipment",
            "group": "minecraft:itemGroup.name.pickaxe"
        }),
        ItemCategory::Consumable => json!({
            "category": "nature",
            "group": "minecraft:itemGroup.name.crop"
        }),
        ItemCategory::Armor => json!({
            "category": "equipment",
            "group": match project.armor_slot {
                ArmorSlot::Helmet => "minecraft:itemGroup.name.helmet",
                ArmorSlot::Chestplate => "minecraft:itemGroup.name.chestplate",
                ArmorSlot::Leggings => "minecraft:itemGroup.name.leggings",
                ArmorSlot::Boots => "minecraft:itemGroup.name.boots",
                ArmorSlot::Shield => "minecraft:itemGroup.name.shield",
            }
        }),
        ItemCategory::Wand | ItemCategory::Artifact => json!({
            "category": "equipment"
        }),
    };

    let icon_key = format!("forjix_{slug}");
    let mut components = Map::new();
    components.insert(
        "minecraft:icon".to_string(),
        json!({
            "textures": {
                "default": icon_key
            }
        }),
    );
    components.insert(
        "minecraft:display_name".to_string(),
        json!({ "value": format!("item.forjix:{slug}.name") }),
    );
    components.insert(
        "minecraft:max_stack_size".to_string(),
        json!(if is_food { 64 } else { 1 }),
    );
    components.insert("minecraft:hand_equipped".to_string(), json!(!is_food));
    components.insert(
        "minecraft:damage".to_string(),
        json!({ "value": project.stats.attack_damage.round() as i32 }),
    );

    if !is_food && !project.stats.unbreakable {
        components.insert(
            "minecraft:durability".to_string(),
            json!({ "max_durability": project.stats.durability }),
        );
    }

    if !is_food {
        let slot = match project.category {
            ItemCategory::Tool => "pickaxe",
            ItemCategory::Armor => match project.armor_slot {
                ArmorSlot::Helmet => "armor_head",
                ArmorSlot::Chestplate => "armor_torso",
                ArmorSlot::Leggings => "armor_legs",
                ArmorSlot::Boots => "armor_feet",
                ArmorSlot::Shield => "shield",
            },
            _ => "sword",
        };
        components.insert(
            "minecraft:enchantable".to_string(),
            json!({
                "slot": slot,
                "value": project.stats.enchantability.clamp(1, 30)
            }),
        );

        if project.category == ItemCategory::Armor && project.armor_slot != ArmorSlot::Shield {
            let wearable_slot = match project.armor_slot {
                ArmorSlot::Helmet => "slot.armor.head",
                ArmorSlot::Chestplate => "slot.armor.chest",
                ArmorSlot::Leggings => "slot.armor.legs",
                ArmorSlot::Boots => "slot.armor.feet",
                ArmorSlot::Shield => "slot.weapon.offhand",
            };
            components.insert(
                "minecraft:wearable".to_string(),
                json!({
                    "slot": wearable_slot,
                    "protection": (project.stats.defense.round() as i32).clamp(1, 20)
                }),
            );
        }

        let any_right_click = project
            .powers
            .iter()
            .any(|p| p.trigger == PowerTrigger::OnRightClick);
        if any_right_click {
            components.insert(
                "minecraft:cooldown".to_string(),
                json!({
                    "category": format!("forjix_{slug}"),
                    "duration": 0.75
                }),
            );
        }
    }

    if is_food {
        let nutrition = (project.stats.hunger_restored as u32) * 2;
        components.insert(
            "minecraft:use_modifiers".to_string(),
            json!({
                "use_duration": 1.6,
                "movement_modifier": 0.35
            }),
        );
        components.insert("minecraft:use_animation".to_string(), json!("eat"));
        components.insert(
            "minecraft:food".to_string(),
            json!({
                "nutrition": nutrition,
                "saturation_modifier": 0.6,
                "can_always_eat": true
            }),
        );
    }

    if matches!(project.rarity, ItemRarity::Epic | ItemRarity::Legendary) {
        components.insert("minecraft:glint".to_string(), json!(true));
    }

    json!({
        "format_version": "1.20.80",
        "minecraft:item": {
            "description": {
                "identifier": identifier,
                "menu_category": menu_category
            },
            "components": components
        }
    })
}

fn ensure_mcaddon_extension(raw_path: &str) -> PathBuf {
    let trimmed = raw_path.trim();
    if trimmed.to_ascii_lowercase().ends_with(".mcaddon") {
        PathBuf::from(trimmed)
    } else {
        PathBuf::from(format!("{trimmed}.mcaddon"))
    }
}

fn write_zip_dir<W: Write + std::io::Seek>(
    zip: &mut ZipWriter<W>,
    dir_path: &str,
) -> Result<(), String> {
    let opts = SimpleFileOptions::default()
        .compression_method(CompressionMethod::Stored)
        .unix_permissions(0o755);
    zip.add_directory(dir_path, opts)
        .map_err(|e| format!("Failed adding zip directory '{dir_path}': {e}"))
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

fn write_stored_zip_entry<W: Write + std::io::Seek>(
    zip: &mut ZipWriter<W>,
    entry_path: &str,
    bytes: &[u8],
) -> Result<(), String> {
    let opts = SimpleFileOptions::default()
        .compression_method(CompressionMethod::Stored)
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

pub fn build_mcaddon_package(
    mut project: ItemProject,
    output_path: &str,
) -> Result<PathBuf, String> {
    project.validate_and_normalize()?;

    let final_path = ensure_mcaddon_extension(output_path);
    if let Some(parent) = Path::new(&final_path).parent() {
        if !parent.as_os_str().is_empty() && !parent.exists() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed creating output folder: {e}"))?;
        }
    }

    let slug = project.slug.clone();
    let display_name = if project.name.trim().is_empty() {
        "Forjix Item".to_string()
    } else {
        project.name.trim().to_string()
    };

    // Generate v4 UUIDs linking BP <-> RP manifests
    let bp_header_uuid = Uuid::new_v4().to_string();
    let bp_module_uuid = Uuid::new_v4().to_string();
    let bp_script_uuid = Uuid::new_v4().to_string();
    let rp_header_uuid = Uuid::new_v4().to_string();
    let rp_module_uuid = Uuid::new_v4().to_string();

    let use_scripts = needs_behavior_script(&project);

    // 1. Resource Pack Manifest
    let rp_manifest = json!({
        "format_version": 2,
        "header": {
            "name": format!("Forjix RP — {display_name}"),
            "description": format!("Resource Pack for {display_name} (forjix:{slug})"),
            "uuid": rp_header_uuid,
            "version": [1, 0, 0],
            "min_engine_version": [1, 20, 80]
        },
        "modules": [
            {
                "type": "resources",
                "description": "Forjix Item Textures & Geometry",
                "uuid": rp_module_uuid,
                "version": [1, 0, 0]
            }
        ],
        "dependencies": [
            {
                "uuid": bp_header_uuid,
                "version": [1, 0, 0]
            }
        ]
    });

    // 2. Behavior Pack Manifest
    let mut bp_modules = vec![json!({
        "type": "data",
        "description": "Forjix Item Behavior Data",
        "uuid": bp_module_uuid,
        "version": [1, 0, 0]
    })];
    let mut bp_dependencies = vec![json!({
        "uuid": rp_header_uuid,
        "version": [1, 0, 0]
    })];

    if use_scripts {
        bp_modules.push(json!({
            "type": "script",
            "language": "javascript",
            "uuid": bp_script_uuid,
            "entry": "scripts/main.js",
            "version": [1, 0, 0]
        }));
        bp_dependencies.push(json!({
            "module_name": "@minecraft/server",
            "version": "1.10.0"
        }));
    }

    let bp_manifest = json!({
        "format_version": 2,
        "header": {
            "name": format!("Forjix BP — {display_name}"),
            "description": format!("Behavior Pack for {display_name} (forjix:{slug})"),
            "uuid": bp_header_uuid,
            "version": [1, 0, 0],
            "min_engine_version": [1, 20, 80]
        },
        "modules": bp_modules,
        "dependencies": bp_dependencies
    });

    // 3. Item Icon PNG & Pack Icon PNG
    let item_rgba = build_item_rgba_image(&project)?;
    let item_png_bytes = encode_png_bytes(&item_rgba)?;
    let pack_icon_bytes = render_pack_icon_png(&item_rgba)?;

    let icon_key = format!("forjix_{slug}");
    let item_texture_json = json!({
        "resource_pack_name": "forjix_rp",
        "texture_name": "atlas.items",
        "texture_data": {
            icon_key: {
                "textures": format!("textures/items/{slug}")
            }
        }
    });

    // 4. Localization .lang files with Minecraft rarity color prefix
    let color_code = rarity_color_prefix(project.rarity);
    let lang_line = format!("item.forjix:{slug}.name={color_code}{display_name}\n");
    let languages_json = json!(["en_US", "ro_RO"]);

    // 5. Build standalone Resource Pack (<slug>_rp.mcpack) with root manifest.json
    let rp_mcpack_bytes = {
        let mut rp_zip = ZipWriter::new(std::io::Cursor::new(Vec::new()));
        write_zip_json(&mut rp_zip, "manifest.json", &rp_manifest)?;
        write_zip_entry(&mut rp_zip, "pack_icon.png", &pack_icon_bytes)?;

        write_zip_dir(&mut rp_zip, "textures/")?;
        write_zip_dir(&mut rp_zip, "textures/items/")?;
        write_zip_json(
            &mut rp_zip,
            "textures/item_texture.json",
            &item_texture_json,
        )?;
        write_zip_entry(
            &mut rp_zip,
            &format!("textures/items/{slug}.png"),
            &item_png_bytes,
        )?;

        write_zip_dir(&mut rp_zip, "texts/")?;
        write_zip_json(&mut rp_zip, "texts/languages.json", &languages_json)?;
        write_zip_entry(&mut rp_zip, "texts/en_US.lang", lang_line.as_bytes())?;
        write_zip_entry(&mut rp_zip, "texts/ro_RO.lang", lang_line.as_bytes())?;

        // 3D Voxel mode greedy-meshed geometry + UV atlas + attachable
        if project.mode == EditorMode::Voxel && !project.voxels.is_empty() {
            let merged = greedy_mesh_voxels_16(&project.voxels)?;
            let (atlas_png, geo_json) = build_voxel_uv_atlas_and_geo(&slug, &merged)?;
            let anim_json = build_attachable_animation_json(&slug);
            let attachable_json = build_attachable_json(&slug);

            write_zip_dir(&mut rp_zip, "textures/entity/")?;
            write_zip_dir(&mut rp_zip, "models/")?;
            write_zip_dir(&mut rp_zip, "models/entity/")?;
            write_zip_dir(&mut rp_zip, "animations/")?;
            write_zip_dir(&mut rp_zip, "attachables/")?;

            write_zip_entry(
                &mut rp_zip,
                &format!("textures/entity/{slug}_3d.png"),
                &atlas_png,
            )?;
            write_zip_json(
                &mut rp_zip,
                &format!("models/entity/{slug}.geo.json"),
                &geo_json,
            )?;
            write_zip_json(
                &mut rp_zip,
                &format!("animations/{slug}.attachable.animation.json"),
                &anim_json,
            )?;
            write_zip_json(
                &mut rp_zip,
                &format!("attachables/{slug}.json"),
                &attachable_json,
            )?;
        }

        rp_zip
            .finish()
            .map_err(|e| format!("Failed finalizing Resource Pack .mcpack: {e}"))?
            .into_inner()
    };

    // 6. Build standalone Behavior Pack (<slug>_bp.mcpack) with root manifest.json
    let bp_mcpack_bytes = {
        let mut bp_zip = ZipWriter::new(std::io::Cursor::new(Vec::new()));
        write_zip_json(&mut bp_zip, "manifest.json", &bp_manifest)?;
        write_zip_entry(&mut bp_zip, "pack_icon.png", &pack_icon_bytes)?;

        write_zip_dir(&mut bp_zip, "items/")?;
        let bp_item_json = build_bp_item_json(&project);
        write_zip_json(&mut bp_zip, &format!("items/{slug}.json"), &bp_item_json)?;

        if use_scripts {
            write_zip_dir(&mut bp_zip, "scripts/")?;
            let script_js = generate_behavior_script_js(&project);
            write_zip_entry(&mut bp_zip, "scripts/main.js", script_js.as_bytes())?;
        }

        bp_zip
            .finish()
            .map_err(|e| format!("Failed finalizing Behavior Pack .mcpack: {e}"))?
            .into_inner()
    };

    // 7. Bundle <slug>_rp.mcpack and <slug>_bp.mcpack at the root of <slug>.mcaddon
    //    per Microsoft's official Bedrock & Minecraft Education Add-On specification.
    let out_file = File::create(&final_path).map_err(|e| {
        format!(
            "Could not create .mcaddon file '{}': {e}",
            final_path.display()
        )
    })?;
    let mut zip = ZipWriter::new(out_file);
    write_stored_zip_entry(&mut zip, &format!("{slug}_rp.mcpack"), &rp_mcpack_bytes)?;
    write_stored_zip_entry(&mut zip, &format!("{slug}_bp.mcpack"), &bp_mcpack_bytes)?;

    zip.finish()
        .map_err(|e| format!("Failed finalizing .mcaddon archive: {e}"))?;

    Ok(final_path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{AttackSpeedTier, ItemPower, ItemStats};
    use std::io::Read;
    use zip::ZipArchive;

    #[test]
    fn greedy_mesher_merges_solid_4x4x4_cube_into_single_cuboid() {
        let mut voxels = Vec::new();
        for y in 2..6 {
            for z in 3..7 {
                for x in 4..8 {
                    voxels.push(Voxel {
                        x,
                        y,
                        z,
                        color: "#38F2FF".to_string(),
                    });
                }
            }
        }
        assert_eq!(voxels.len(), 64);
        let merged = greedy_mesh_voxels_16(&voxels).expect("greedy mesh");
        assert_eq!(merged.len(), 1);
        assert_eq!(
            merged[0],
            MergedCuboid {
                x: 4,
                y: 2,
                z: 3,
                w: 4,
                h: 4,
                d: 4,
                color: [0x38, 0xF2, 0xFF],
            }
        );
    }

    #[test]
    fn exports_complete_3d_voxel_mcaddon_with_scripts_and_attachables() {
        let mut temp_out = std::env::temp_dir();
        temp_out.push("forjix_phase3_voxel_test.mcaddon");

        let mut voxels = Vec::new();
        for x in 6..10 {
            voxels.push(Voxel {
                x,
                y: 5,
                z: 7,
                color: "#FFE054".to_string(),
            });
        }

        let project = ItemProject {
            id: "mcaddon-test-1".to_string(),
            name: "Sabia de Fulger".to_string(),
            slug: String::new(),
            mode: EditorMode::Voxel,
            grid_size: 16,
            pixels: vec![None; 256],
            voxels,
            category: ItemCategory::Weapon,
            rarity: ItemRarity::Legendary,
            armor_slot: crate::models::ArmorSlot::Chestplate,
            stats: ItemStats {
                attack_damage: 20.0,
                attack_speed: 4.0,
                attack_speed_tier: AttackSpeedTier::Lightning,
                durability: 1500,
                unbreakable: false,
                movement_speed: 20,
                mining_speed: 1.0,
                defense: 0.0,
                enchantability: 22,
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
                    id: "passive_held:speed_boost".to_string(),
                    trigger: PowerTrigger::PassiveHeld,
                    effect: "speed_boost".to_string(),
                    amplifier: 1,
                    duration_seconds: 2,
                },
            ],
        };

        let written_path =
            build_mcaddon_package(project, &temp_out.to_string_lossy()).expect("export .mcaddon");

        let file = File::open(&written_path).expect("open .mcaddon zip");
        let mut addon_archive = ZipArchive::new(file).expect("valid .mcaddon archive");
        assert_eq!(addon_archive.len(), 2);

        let mut rp_bytes = Vec::new();
        addon_archive
            .by_name("sabia_de_fulger_rp.mcpack")
            .expect("missing RP .mcpack at .mcaddon root")
            .read_to_end(&mut rp_bytes)
            .unwrap();
        let mut rp_archive =
            ZipArchive::new(std::io::Cursor::new(rp_bytes)).expect("valid RP .mcpack");

        let mut bp_bytes = Vec::new();
        addon_archive
            .by_name("sabia_de_fulger_bp.mcpack")
            .expect("missing BP .mcpack at .mcaddon root")
            .read_to_end(&mut bp_bytes)
            .unwrap();
        let mut bp_archive =
            ZipArchive::new(std::io::Cursor::new(bp_bytes)).expect("valid BP .mcpack");

        let expected_rp_entries = [
            "manifest.json",
            "pack_icon.png",
            "textures/items/sabia_de_fulger.png",
            "textures/item_texture.json",
            "texts/en_US.lang",
            "texts/ro_RO.lang",
            "models/entity/sabia_de_fulger.geo.json",
            "textures/entity/sabia_de_fulger_3d.png",
            "attachables/sabia_de_fulger.json",
        ];
        for entry in expected_rp_entries {
            assert!(
                rp_archive.by_name(entry).is_ok(),
                "Missing expected RP .mcpack entry: {entry}"
            );
        }

        let expected_bp_entries = [
            "manifest.json",
            "pack_icon.png",
            "items/sabia_de_fulger.json",
            "scripts/main.js",
        ];
        for entry in expected_bp_entries {
            assert!(
                bp_archive.by_name(entry).is_ok(),
                "Missing expected BP .mcpack entry: {entry}"
            );
        }

        // Verify rarity color code in ro_RO.lang
        let mut ro_lang = String::new();
        rp_archive
            .by_name("texts/ro_RO.lang")
            .unwrap()
            .read_to_string(&mut ro_lang)
            .unwrap();
        assert_eq!(
            ro_lang,
            "item.forjix:sabia_de_fulger.name=§6Sabia de Fulger\n"
        );

        // Verify BP/RP UUID cross-linking and min_engine_version [1, 20, 80]
        let mut bp_manifest_raw = String::new();
        bp_archive
            .by_name("manifest.json")
            .unwrap()
            .read_to_string(&mut bp_manifest_raw)
            .unwrap();
        let bp_val: Value = serde_json::from_str(&bp_manifest_raw).unwrap();
        assert_eq!(bp_val["header"]["min_engine_version"], json!([1, 20, 80]));

        let mut script_raw = String::new();
        bp_archive
            .by_name("scripts/main.js")
            .unwrap()
            .read_to_string(&mut script_raw)
            .unwrap();
        assert!(script_raw.contains("minecraft:lightning_bolt"));
        assert!(script_raw.contains("system.runInterval"));

        let _ = std::fs::remove_file(&written_path);
    }

    #[test]
    fn exports_2d_32x32_consumable_mcaddon_without_scripts_when_no_effects() {
        let mut temp_out = std::env::temp_dir();
        temp_out.push("forjix_phase3_food_32_test"); // also tests auto .mcaddon suffix

        let mut pixels = vec![None; 1024];
        pixels[0] = Some("#FFD83B".to_string());
        pixels[1023] = Some("#59E84F".to_string());

        let project = ItemProject {
            id: "mcaddon-test-2".to_string(),
            name: "Măr Magic".to_string(),
            slug: String::new(),
            mode: EditorMode::Extruded,
            grid_size: 32,
            pixels,
            voxels: vec![],
            category: ItemCategory::Consumable,
            rarity: ItemRarity::Rare,
            armor_slot: crate::models::ArmorSlot::Chestplate,
            stats: ItemStats {
                attack_damage: 1.0,
                attack_speed: 1.6,
                attack_speed_tier: AttackSpeedTier::Normal,
                durability: 50,
                unbreakable: false,
                movement_speed: 0,
                mining_speed: 1.0,
                defense: 0.0,
                enchantability: 10,
                hunger_restored: 7,
                eat_status_effect: EatStatusEffect::None,
            },
            powers: vec![],
        };

        let written_path = build_mcaddon_package(project, &temp_out.to_string_lossy())
            .expect("export 2D food .mcaddon");
        assert!(written_path.to_string_lossy().ends_with(".mcaddon"));

        let file = File::open(&written_path).expect("open .mcaddon zip");
        let mut addon_archive = ZipArchive::new(file).expect("valid .mcaddon zip");

        let mut rp_bytes = Vec::new();
        addon_archive
            .by_name("mar_magic_rp.mcpack")
            .unwrap()
            .read_to_end(&mut rp_bytes)
            .unwrap();
        let mut rp_archive = ZipArchive::new(std::io::Cursor::new(rp_bytes)).unwrap();

        let mut bp_bytes = Vec::new();
        addon_archive
            .by_name("mar_magic_bp.mcpack")
            .unwrap()
            .read_to_end(&mut bp_bytes)
            .unwrap();
        let mut bp_archive = ZipArchive::new(std::io::Cursor::new(bp_bytes)).unwrap();

        assert!(rp_archive.by_name("manifest.json").is_ok());
        assert!(rp_archive.by_name("textures/items/mar_magic.png").is_ok());
        assert!(bp_archive.by_name("manifest.json").is_ok());
        assert!(bp_archive.by_name("items/mar_magic.json").is_ok());
        // No powers or status effects -> scripts/main.js and 3D attachable should be omitted
        assert!(bp_archive.by_name("scripts/main.js").is_err());
        assert!(rp_archive.by_name("attachables/mar_magic.json").is_err());

        let mut en_lang = String::new();
        rp_archive
            .by_name("texts/en_US.lang")
            .unwrap()
            .read_to_string(&mut en_lang)
            .unwrap();
        assert_eq!(en_lang, "item.forjix:mar_magic.name=§bMăr Magic\n");

        let mut bp_item_raw = String::new();
        bp_archive
            .by_name("items/mar_magic.json")
            .unwrap()
            .read_to_string(&mut bp_item_raw)
            .unwrap();
        let item_val: Value = serde_json::from_str(&bp_item_raw).unwrap();
        assert_eq!(
            item_val["minecraft:item"]["description"]["menu_category"]["group"],
            json!("minecraft:itemGroup.name.crop")
        );
        assert_eq!(
            item_val["minecraft:item"]["components"]["minecraft:icon"]["textures"]["default"],
            json!("forjix_mar_magic")
        );
        assert_eq!(
            item_val["minecraft:item"]["components"]["minecraft:food"]["nutrition"],
            json!(14)
        );
        assert_eq!(
            item_val["minecraft:item"]["components"]["minecraft:max_stack_size"],
            json!(64)
        );

        let _ = std::fs::remove_file(&written_path);
    }

    #[test]
    fn bedrock_armor_uses_valid_enchantable_and_wearable_slots_and_right_click_cooldown() {
        let project = ItemProject {
            id: "armor-rc-test".to_string(),
            name: "Coroană Regală".to_string(),
            slug: "coroana_regala".to_string(),
            mode: EditorMode::Voxel,
            grid_size: 16,
            pixels: vec![None; 256],
            voxels: vec![],
            category: ItemCategory::Armor,
            rarity: ItemRarity::Legendary,
            armor_slot: ArmorSlot::Helmet,
            stats: ItemStats {
                attack_damage: 4.0,
                attack_speed: 1.6,
                attack_speed_tier: AttackSpeedTier::Normal,
                durability: 1200,
                unbreakable: false,
                movement_speed: 0,
                mining_speed: 1.0,
                defense: 6.0,
                enchantability: 25,
                hunger_restored: 4,
                eat_status_effect: EatStatusEffect::None,
            },
            powers: vec![ItemPower {
                id: "on_right_click:heal_aura".to_string(),
                trigger: PowerTrigger::OnRightClick,
                effect: "heal_aura".to_string(),
                amplifier: 1,
                duration_seconds: 1,
            }],
        };

        let item_val = build_bp_item_json(&project);
        let comps = &item_val["minecraft:item"]["components"];
        assert_eq!(comps["minecraft:enchantable"]["slot"], json!("armor_head"));
        assert_eq!(
            comps["minecraft:wearable"]["slot"],
            json!("slot.armor.head")
        );
        assert_eq!(comps["minecraft:wearable"]["protection"], json!(6));
        assert!(comps.get("minecraft:cooldown").is_some());

        let script = generate_behavior_script_js(&project);
        assert!(script.contains("getPlayers("));
        assert!(!script.contains("excludeTypes: []"));
    }
}
