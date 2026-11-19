// SPDX-License-Identifier: GPL-3.0-or-later

pub mod java_export;
pub mod mcaddon;
pub mod models;

use java_export::{build_java_edition_packs, JavaExportResult};
use mcaddon::build_mcaddon_package;
use models::{slugify_name, ItemProject};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use tauri_plugin_dialog::DialogExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectFilePayload {
    pub path: String,
    pub project: ItemProject,
}

fn ensure_forjix_extension(path: PathBuf) -> PathBuf {
    let path_str = path.to_string_lossy();
    if path_str.ends_with(".forjix.json") || path_str.ends_with(".json") {
        path
    } else {
        PathBuf::from(format!("{path_str}.forjix.json"))
    }
}

pub fn write_forjix_file(
    path: &Path,
    mut project: ItemProject,
) -> Result<ProjectFilePayload, String> {
    project.validate_and_normalize()?;
    let serialized = serde_json::to_string_pretty(&project)
        .map_err(|e| format!("Failed to serialize project JSON: {e}"))?;

    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() && !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create parent directory: {e}"))?;
        }
    }

    fs::write(path, serialized).map_err(|e| format!("Failed to write project file: {e}"))?;

    Ok(ProjectFilePayload {
        path: path.to_string_lossy().into_owned(),
        project,
    })
}

pub fn read_forjix_file(path: &Path) -> Result<ProjectFilePayload, String> {
    let raw = fs::read_to_string(path).map_err(|e| format!("Failed to read project file: {e}"))?;
    let mut project: ItemProject =
        serde_json::from_str(&raw).map_err(|e| format!("Invalid .forjix.json format: {e}"))?;
    project.validate_and_normalize()?;

    Ok(ProjectFilePayload {
        path: path.to_string_lossy().into_owned(),
        project,
    })
}

#[tauri::command]
fn sync_project(mut project: ItemProject) -> Result<ItemProject, String> {
    project.validate_and_normalize()?;
    Ok(project)
}

#[tauri::command]
fn export_project_json(mut project: ItemProject) -> Result<String, String> {
    project.validate_and_normalize()?;
    serde_json::to_string_pretty(&project).map_err(|e| format!("Failed to serialize project: {e}"))
}

#[tauri::command]
fn import_project_json(raw_json: String) -> Result<ItemProject, String> {
    let mut project: ItemProject =
        serde_json::from_str(&raw_json).map_err(|e| format!("Invalid project JSON: {e}"))?;
    project.validate_and_normalize()?;
    Ok(project)
}

#[tauri::command]
fn format_item_slug(name: String) -> String {
    slugify_name(&name)
}

#[tauri::command]
async fn save_forjix_project(
    app: tauri::AppHandle,
    mut project: ItemProject,
    path: Option<String>,
) -> Result<Option<ProjectFilePayload>, String> {
    project.validate_and_normalize()?;

    let chosen_path: Option<PathBuf> = if let Some(explicit) = path {
        Some(PathBuf::from(explicit))
    } else {
        let default_filename = format!("{}.forjix.json", project.slug);
        let (tx, rx) = mpsc::channel();
        app.dialog()
            .file()
            .set_title("Forjix — Salvează Proiectul (.forjix.json)")
            .set_file_name(&default_filename)
            .add_filter("Forjix Item Project", &["forjix.json", "json"])
            .save_file(move |file_path| {
                let resolved = file_path.and_then(|fp| fp.into_path().ok());
                let _ = tx.send(resolved);
            });
        rx.recv()
            .map_err(|e| format!("File dialog channel error: {e}"))?
    };

    let Some(raw_path) = chosen_path else {
        return Ok(None);
    };

    let final_path = ensure_forjix_extension(raw_path);
    let saved = write_forjix_file(&final_path, project)?;
    Ok(Some(saved))
}

#[tauri::command]
async fn load_forjix_project(
    app: tauri::AppHandle,
    path: Option<String>,
) -> Result<Option<ProjectFilePayload>, String> {
    let chosen_path: Option<PathBuf> = if let Some(explicit) = path {
        Some(PathBuf::from(explicit))
    } else {
        let (tx, rx) = mpsc::channel();
        app.dialog()
            .file()
            .set_title("Forjix — Deschide Proiect (.forjix.json)")
            .add_filter("Forjix Item Project", &["forjix.json", "json"])
            .pick_file(move |file_path| {
                let resolved = file_path.and_then(|fp| fp.into_path().ok());
                let _ = tx.send(resolved);
            });
        rx.recv()
            .map_err(|e| format!("File dialog channel error: {e}"))?
    };

    let Some(target_path) = chosen_path else {
        return Ok(None);
    };

    let loaded = read_forjix_file(&target_path)?;
    Ok(Some(loaded))
}

/// Exports the forged item into a valid, double-click installable Minecraft Bedrock
/// & Minecraft Education `.mcaddon` archive containing linked `BP/` and `RP/` folders.
#[tauri::command(rename_all = "snake_case")]
fn export_bedrock_mcaddon(project: ItemProject, output_path: String) -> Result<String, String> {
    let written = build_mcaddon_package(project, &output_path)?;
    Ok(written.to_string_lossy().into_owned())
}

/// Exports Minecraft Java Edition 1.21+ Resource Pack (`<slug>_java_resourcepack.zip`)
/// and Data Pack (`<slug>_java_datapack.zip`) into `output_dir`, returning paths + `/give` command.
#[tauri::command(rename_all = "snake_case")]
fn export_java_packs(project: ItemProject, output_dir: String) -> Result<JavaExportResult, String> {
    build_java_edition_packs(project, &output_dir)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            sync_project,
            export_project_json,
            import_project_json,
            format_item_slug,
            save_forjix_project,
            load_forjix_project,
            export_bedrock_mcaddon,
            export_java_packs
        ])
        .run(tauri::generate_context!())
        .expect("error while running Forjix Tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use models::{
        AttackSpeedTier, EatStatusEffect, EditorMode, ItemCategory, ItemRarity, ItemStats, Voxel,
    };

    #[test]
    fn saves_and_reloads_forjix_json_via_std_fs() {
        let mut temp_file = std::env::temp_dir();
        temp_file.push("forjix_phase2_roundtrip_test.forjix.json");

        let project = ItemProject {
            id: "test-save-01".to_string(),
            name: "Sabia de Fulger".to_string(),
            slug: String::new(),
            mode: EditorMode::Voxel,
            grid_size: 16,
            pixels: vec![None; 256],
            voxels: vec![
                Voxel {
                    x: 7,
                    y: 2,
                    z: 7,
                    color: "#FFE054".to_string(),
                },
                Voxel {
                    x: 8,
                    y: 2,
                    z: 7,
                    color: "#38F2FF".to_string(),
                },
            ],
            category: ItemCategory::Weapon,
            rarity: ItemRarity::Legendary,
            armor_slot: crate::models::ArmorSlot::Chestplate,
            stats: ItemStats {
                attack_damage: 24.0,
                attack_speed: 2.4,
                attack_speed_tier: AttackSpeedTier::Fast,
                durability: 1800,
                unbreakable: false,
                movement_speed: 15,
                mining_speed: 1.5,
                defense: 0.0,
                enchantability: 22,
                hunger_restored: 4,
                eat_status_effect: EatStatusEffect::None,
            },
            powers: vec![],
        };

        let saved = write_forjix_file(&temp_file, project).expect("write .forjix.json");
        assert_eq!(saved.project.slug, "sabia_de_fulger");

        let loaded = read_forjix_file(&temp_file).expect("read .forjix.json");
        assert_eq!(loaded.project, saved.project);

        let _ = fs::remove_file(&temp_file);
    }
}
