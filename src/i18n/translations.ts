// SPDX-License-Identifier: GPL-3.0-or-later

import type {
  ArmorSlot,
  ArmStyle,
  AttackSpeedTier,
  EatStatusEffect,
  ItemCategory,
  ItemRarity,
  Language,
  StarterTemplateId,
  ToolId,
  VoxelPresetId,
} from '../types/project';

export type PaletteCategoryId =
  | 'metals'
  | 'gems'
  | 'wood'
  | 'fire'
  | 'magic'
  | 'nature';

export interface Translations {
  appName: string;
  appSubtitle: string;
  offlineBadge: string;
  languageToggleHint: string;
  soundOnHint: string;
  soundMutedHint: string;

  modeSwitcher: {
    extruded2d: string;
    voxel3d: string;
  };

  persistence: {
    saveProject: string;
    loadProject: string;
    savedToast: string;
    loadedToast: string;
  };

  mcaddonExport: {
    ctaButton: string;
    modalTitle: string;
    modalSubtitle: string;
    targetBedrock: string;
    targetJava: string;
    targetBoth: string;
    compatibilityBadge: string;
    javaVersionBadge: string;
    mode2dBadge: string;
    mode3dBadge: string;
    howToTitle: string;
    step1Title: string;
    step1Body: string;
    step2Title: string;
    step2Body: string;
    step3Title: string;
    step3Body: string;
    javaHowToTitle: string;
    javaStep1Title: string;
    javaStep1Body: string;
    javaStep2Title: string;
    javaStep2Body: string;
    javaGiveLabel: string;
    copyGiveBtn: string;
    giveCommandLabel: string;
    copyBtn: string;
    copiedBtn: string;
    exportBedrockBtn: string;
    exportJavaBtn: string;
    exportBothBtn: string;
    exportingBtn: string;
    closeBtn: string;
    successBanner: string;
  };

  categories: Record<ItemCategory, string>;
  rarities: Record<ItemRarity, string>;
  armorSlots: Record<ArmorSlot, string>;
  rarityWithColor: {
    common: string;
    rare: string;
    epic: string;
    legendary: string;
  };

  toolbar: {
    toolsHeading: string;
    tools: Record<ToolId, { name: string; hint: string }>;
    symmetryHeading: string;
    mirrorX: string;
    mirrorY: string;
    historyHeading: string;
    undo: string;
    redo: string;
    gridSizeHeading: string;
    palettesHeading: string;
    paletteNames: Record<PaletteCategoryId, string>;
    customColor: string;
    pickCustomColor: string;
    recentColors: string;
  };

  canvas2d: {
    paneTitle: string;
    gridLines: string;
    clearCanvas: string;
    templatesLabel: string;
    templates: Record<StarterTemplateId, string>;
    pixelCoords: string;
    paintingStatus: string;
    canvasHint: string;
  };

  viewport3d: {
    paneTitle: string;
    heldInHand: string;
    armStyleLabel: string;
    armStyles: Record<ArmStyle, string>;
    resetCamera: string;
    cameraFrozenBadge: string;
    voxelsCount: string;
    emptyCanvasTitle: string;
    emptyCanvasSubtitle: string;
    orbitHint: string;
  };

  voxel3d: {
    paneTitle: string;
    presetsLabel: string;
    presets: Record<VoxelPresetId, string>;
    layerSlicerLabel: string;
    allLayersBtn: string;
    layerStatus: string;
    symmetryX: string;
    sculptHint: string;
    emptyPlateTitle: string;
    emptyPlateSubtitle: string;
  };

  statsPanel: {
    panelTitle: string;
    basicInfoHeading: string;
    displayNameLabel: string;
    displayNamePlaceholder: string;
    rarityLabel: string;
    categoryLabel: string;
    armorSlotLabel: string;

    combatHeading: string;
    attackDamageLabel: string;
    heartsUnit: string;
    durabilityLabel: string;
    unbreakableToggle: string;
    unbreakableActive: string;
    attackSpeedLabel: string;
    attackSpeeds: Record<AttackSpeedTier, string>;
    movementSpeedLabel: string;

    foodHeading: string;
    hungerRestoredLabel: string;
    drumsticksUnit: string;
    eatEffectLabel: string;
    eatEffects: Record<EatStatusEffect, string>;

    powersHeading: string;
    onHitHeading: string;
    passiveHeldHeading: string;
    onRightClickHeading: string;
    activePowersCount: string;
  };

  footer: {
    licenseNotice: string;
    projectStateReady: string;
    activeFileLabel: string;
    statsSummary: string;
  };
}

export const TRANSLATIONS: Record<Language, Translations> = {
  ro: {
    appName: 'Forjix',
    appSubtitle: 'Atelierul de Făurit Obiecte',
    offlineBadge: '100% Offline',
    languageToggleHint: 'Schimbă limba în Engleză (EN)',
    soundOnHint: 'Sunete Forjă Active (Click pt. Mut)',
    soundMutedHint: 'Sunete Oprite (Click pt. Activare)',

    modeSwitcher: {
      extruded2d: 'Obiect Pixel 2D (Extrudat)',
      voxel3d: 'Forjă Voxel 3D (16×16×16)',
    },

    persistence: {
      saveProject: 'Salvează .forjix.json',
      loadProject: 'Deschide .forjix.json',
      savedToast: 'Salvat!',
      loadedToast: 'Încărcat!',
    },

    mcaddonExport: {
      ctaButton: 'Făurește & Exportă în Minecraft',
      modalTitle: 'Făurește & Exportă în Minecraft',
      modalSubtitle:
        'Alege ediția ta de Minecraft: Bedrock / Education (.mcaddon), Java Edition 1.21+ sau ambele!',
      targetBedrock: 'Bedrock / Minecraft Education (.mcaddon)',
      targetJava: 'Java Edition (Resource Pack + Data Pack)',
      targetBoth: 'Exportă Ambele',
      compatibilityBadge: 'Bedrock & Education 1.20.80+',
      javaVersionBadge: 'Java Edition 1.21+ (RP 34 + DP 48)',
      mode2dBadge: 'Textură 2D + Obiect Extrudat',
      mode3dBadge: 'Geometrie 3D Voxel Optimizată (Greedy Mesh)',
      howToTitle: 'Instrucțiuni Bedrock & Education (.mcaddon):',
      step1Title: 'Salvează fișierul .mcaddon',
      step1Body:
        'Generează pachetul .mcaddon pe calculatorul tău cu un singur click.',
      step2Title: 'Dublu-click pentru import direct',
      step2Body:
        'Fă dublu-click pe fișierul .mcaddon salvat — Minecraft îl importă automat!',
      step3Title: 'Activează AMBELE pachete în Setările Lumii (Important!)',
      step3Body:
        'În World Settings (Setările Lumii), activează atât Resource Pack (Forjix RP) cât și Behavior Pack (Forjix BP)!',
      javaHowToTitle: 'Instrucțiuni Minecraft Java Edition 1.21+:',
      javaStep1Title: 'Activează Resource Pack-ul (_java_resourcepack.zip)',
      javaStep1Body:
        'Copiază fișierul _java_resourcepack.zip în folderul resourcepacks din Minecraft și activează-l din Options → Resource Packs.',
      javaStep2Title: 'Adaugă Data Pack-ul (_java_datapack.zip) în Lumea Ta',
      javaStep2Body:
        'Pune _java_datapack.zip în folderul saves/<LumeaTa>/datapacks (sau la crearea lumii → Data Packs), apoi scrie /reload în joc.',
      javaGiveLabel: 'Comanda Java 1.21+ /give (sau /function forjix:give_...):',
      copyGiveBtn: 'Copiază Comanda /give',
      giveCommandLabel: 'Comanda Bedrock în joc (Creative / Chat):',
      copyBtn: 'Copiază',
      copiedBtn: 'Copiat!',
      exportBedrockBtn: 'Exportă Bedrock / Education (.mcaddon)',
      exportJavaBtn: 'Exportă Java Edition (.zip RP + DP)',
      exportBothBtn: 'Exportă Ambele Ediții (.mcaddon + .zip)',
      exportingBtn: 'Se făurește pachetul...',
      closeBtn: 'Închide',
      successBanner: 'Export finalizat cu succes!',
    },

    categories: {
      weapon: 'Armă',
      tool: 'Unealtă',
      consumable: 'Mâncare / Consumabil',
      artifact: 'Artefact Magic',
      armor: 'Scut / Armură',
      wand: 'Baghetă',
    },

    rarities: {
      common: 'Comun',
      uncommon: 'Neobișnuit',
      rare: 'Rar',
      epic: 'Epic',
      legendary: 'Legendar',
    },

    armorSlots: {
      helmet: 'Cască',
      chestplate: 'Placoardă',
      leggings: 'Pantaloni',
      boots: 'Cizme',
      shield: 'Scut',
    },

    rarityWithColor: {
      common: 'Comun (Alb)',
      rare: 'Rar (Acvamarin)',
      epic: 'Epic (Mov)',
      legendary: 'Legendar (Auriu)',
    },

    toolbar: {
      toolsHeading: 'Unelte',
      tools: {
        pencil: {
          name: 'Creion',
          hint: 'Desenează pixeli / plasează voxeli (P)',
        },
        eraser: {
          name: 'Radieră',
          hint: 'Șterge pixeli sau voxeli (E)',
        },
        bucket: {
          name: 'Găleată',
          hint: 'Umple o zonă cu culoare (G)',
        },
        eyedropper: {
          name: 'Pipetă',
          hint: 'Alege o culoare existentă (I)',
        },
      },
      symmetryHeading: 'Simetrie',
      mirrorX: 'Oglindă X',
      mirrorY: 'Oglindă Y',
      historyHeading: 'Istoric (50 pași)',
      undo: 'Înapoi',
      redo: 'Înainte',
      gridSizeHeading: 'Mărime Grilă 2D',
      palettesHeading: 'Palete de Culori',
      paletteNames: {
        metals: 'Metale & Minereuri',
        gems: 'Nestemate & Cristale',
        wood: 'Lemn & Piele',
        fire: 'Foc & Lavă',
        magic: 'Magie & Arcană',
        nature: 'Natură',
      },
      customColor: 'Culoare Proprie',
      pickCustomColor: 'Alege orice culoare',
      recentColors: 'Recente',
    },

    canvas2d: {
      paneTitle: 'Pânză Pixel Art 2D',
      gridLines: 'Linii Grilă',
      clearCanvas: 'Golește',
      templatesLabel: 'Șabloane 2D',
      templates: {
        blank: 'Pânză Goală',
        classic_sword: 'Sabie Clasică',
        battle_axe: 'Topor de Luptă',
        pickaxe: 'Târnăcop',
        shield: 'Scut',
        magic_wand: 'Baghetă Magică',
        golden_apple: 'Măr de Aur',
      },
      pixelCoords: 'Pixel',
      paintingStatus: 'Se desenează...',
      canvasHint: 'Click-stânga: desenează • Click-dreapta: șterge',
    },

    viewport3d: {
      paneTitle: 'Previzualizare 3D Extrudată',
      heldInHand: 'Ținut în Mână',
      armStyleLabel: 'Model Braț',
      armStyles: {
        steve: 'Steve',
        alex: 'Alex',
      },
      resetCamera: 'Centrare',
      cameraFrozenBadge: 'Cameră înghețată la desenare',
      voxelsCount: 'voxeli',
      emptyCanvasTitle: 'Pânza este goală!',
      emptyCanvasSubtitle: 'Desenează pe grila 2D sau alege un șablon pentru a făuri obiectul 3D.',
      orbitHint: 'Trage pe fundal sau click-dreapta pt. rotire • Rotiță pt. zoom',
    },

    voxel3d: {
      paneTitle: 'Forjă Sculptor Voxel 3D (16×16×16)',
      presetsLabel: 'Modele 3D de Start',
      presets: {
        empty_plate: 'Platou Gol',
        war_hammer: 'Ciocan de Război 3D',
        royal_crown: 'Coroană Regală',
        champion_trophy: 'Trofeul Campionului',
        magic_totem: 'Totem Magic',
      },
      layerSlicerLabel: 'Feliere Straturi Y',
      allLayersBtn: 'Toate (16)',
      layerStatus: 'Straturi 1–{y} / 16',
      symmetryX: 'Simetrie X',
      sculptHint:
        'Click-stânga: pune voxel • Click-dreapta: șterge voxel • Trage mouse-ul: rotește camera',
      emptyPlateTitle: 'Platoul 16×16×16 este pregătit!',
      emptyPlateSubtitle:
        'Fă click pe platou pentru a pune voxeli colorați sau alege un model 3D de mai sus.',
    },

    statsPanel: {
      panelTitle: 'Statistici & Puteri',
      basicInfoHeading: 'Informații de Bază',
      displayNameLabel: 'Nume Afișat',
      displayNamePlaceholder: 'Ex: Sabia de Fulger',
      rarityLabel: 'Raritate',
      categoryLabel: 'Categorie',
      armorSlotLabel: 'Slot Armură',

      combatHeading: 'Statistici Luptă & Utilitate',
      attackDamageLabel: 'Putere de Atac',
      heartsUnit: 'inimi',
      durabilityLabel: 'Durabilitate',
      unbreakableToggle: 'Indestructibil',
      unbreakableActive: '∞ Nu se strică niciodată!',
      attackSpeedLabel: 'Viteză de Atac',
      attackSpeeds: {
        slow: 'Lent',
        normal: 'Normal',
        fast: 'Rapid',
        lightning: 'Fulger',
      },
      movementSpeedLabel: 'Viteză de Mișcare',

      foodHeading: 'Efecte Mâncare / Consumabil',
      hungerRestoredLabel: 'Foame Refăcută',
      drumsticksUnit: 'copănele',
      eatEffectLabel: 'Efect când Mănânci',
      eatEffects: {
        none: 'Fără efect extra',
        regeneration: 'Regenerare Viață',
        absorption: 'Inimi de Aur (Scut)',
        speed: 'Super Viteză',
        fire_resistance: 'Imunitate la Foc',
        night_vision: 'Vedere Nocturnă',
      },

      powersHeading: 'Puteri Speciale',
      onHitHeading: 'La lovire (On-Hit)',
      passiveHeldHeading: 'Când o ții în mână (Pasiv)',
      onRightClickHeading: 'La click dreapta (On-Right-Click)',
      activePowersCount: '{n} active',
    },

    footer: {
      licenseNotice: 'Licență GNU GPLv3',
      projectStateReady: 'Gata pt. salvare .forjix.json',
      activeFileLabel: 'Fișier',
      statsSummary: 'Atac {atk} • {dur} • Puteri: {pwr}',
    },
  },

  en: {
    appName: 'Forjix',
    appSubtitle: 'Item Forging Workshop',
    offlineBadge: '100% Offline',
    languageToggleHint: 'Switch language to Romanian (RO)',
    soundOnHint: 'Forge Sounds On (Click to Mute)',
    soundMutedHint: 'Forge Sounds Muted (Click to Unmute)',

    modeSwitcher: {
      extruded2d: '2D Pixel Item (Extruded)',
      voxel3d: '3D Voxel Forge (16×16×16)',
    },

    persistence: {
      saveProject: 'Save .forjix.json',
      loadProject: 'Load .forjix.json',
      savedToast: 'Saved!',
      loadedToast: 'Loaded!',
    },

    mcaddonExport: {
      ctaButton: 'Forge & Export to Minecraft',
      modalTitle: 'Forge & Export to Minecraft',
      modalSubtitle:
        'Choose your Minecraft edition: Bedrock / Education (.mcaddon), Java Edition 1.21+, or both!',
      targetBedrock: 'Bedrock / Minecraft Education (.mcaddon)',
      targetJava: 'Java Edition (Resource Pack + Data Pack)',
      targetBoth: 'Export Both',
      compatibilityBadge: 'Bedrock & Education 1.20.80+',
      javaVersionBadge: 'Java Edition 1.21+ (RP 34 + DP 48)',
      mode2dBadge: '2D Pixel Texture + Extruded Item',
      mode3dBadge: 'Optimized 3D Voxel Geometry (Greedy Mesh)',
      howToTitle: 'Bedrock & Education (.mcaddon) Instructions:',
      step1Title: 'Save the .mcaddon file',
      step1Body:
        'Generate the .mcaddon package on your computer with a single click.',
      step2Title: 'Double-click to import directly',
      step2Body:
        'Double-click the exported .mcaddon file — Minecraft launches and imports your item automatically!',
      step3Title: 'Enable BOTH packs in World Settings (Important!)',
      step3Body:
        'In your World Settings, make sure to activate BOTH the Resource Pack (Forjix RP) AND the Behavior Pack (Forjix BP)!',
      javaHowToTitle: 'Minecraft Java Edition 1.21+ Instructions:',
      javaStep1Title: 'Enable the Resource Pack (_java_resourcepack.zip)',
      javaStep1Body:
        'Place _java_resourcepack.zip into your Minecraft resourcepacks folder and enable it under Options → Resource Packs.',
      javaStep2Title: 'Add the Data Pack (_java_datapack.zip) to Your World',
      javaStep2Body:
        'Place _java_datapack.zip inside saves/<YourWorld>/datapacks (or add via Create New World → Data Packs), then run /reload.',
      javaGiveLabel: 'Java 1.21+ /give Command (or /function forjix:give_...):',
      copyGiveBtn: 'Copy /give Command',
      giveCommandLabel: 'Bedrock in-game command (Creative / Chat):',
      copyBtn: 'Copy',
      copiedBtn: 'Copied!',
      exportBedrockBtn: 'Export Bedrock / Education (.mcaddon)',
      exportJavaBtn: 'Export Java Edition (.zip RP + DP)',
      exportBothBtn: 'Export Both Editions (.mcaddon + .zip)',
      exportingBtn: 'Forging packages...',
      closeBtn: 'Close',
      successBanner: 'Export completed successfully!',
    },

    categories: {
      weapon: 'Weapon',
      tool: 'Tool',
      consumable: 'Food / Consumable',
      artifact: 'Magic Artifact',
      armor: 'Shield / Armor',
      wand: 'Wand',
    },

    rarities: {
      common: 'Common',
      uncommon: 'Uncommon',
      rare: 'Rare',
      epic: 'Epic',
      legendary: 'Legendary',
    },

    armorSlots: {
      helmet: 'Helmet',
      chestplate: 'Chestplate',
      leggings: 'Leggings',
      boots: 'Boots',
      shield: 'Shield',
    },

    rarityWithColor: {
      common: 'Common (White)',
      rare: 'Rare (Aqua)',
      epic: 'Epic (Light Purple)',
      legendary: 'Legendary (Gold)',
    },

    toolbar: {
      toolsHeading: 'Tools',
      tools: {
        pencil: {
          name: 'Pencil',
          hint: 'Paint pixels / place voxels (P)',
        },
        eraser: {
          name: 'Eraser',
          hint: 'Erase pixels or voxels (E)',
        },
        bucket: {
          name: 'Fill Bucket',
          hint: 'Flood-fill color (G)',
        },
        eyedropper: {
          name: 'Eyedropper',
          hint: 'Pick color from model (I)',
        },
      },
      symmetryHeading: 'Symmetry',
      mirrorX: 'Mirror X',
      mirrorY: 'Mirror Y',
      historyHeading: 'History (50 steps)',
      undo: 'Undo',
      redo: 'Redo',
      gridSizeHeading: '2D Grid Size',
      palettesHeading: 'Color Palettes',
      paletteNames: {
        metals: 'Metals & Ores',
        gems: 'Gems & Crystals',
        wood: 'Wood & Leather',
        fire: 'Fire & Lava',
        magic: 'Magic & Arcane',
        nature: 'Nature',
      },
      customColor: 'Custom Color',
      pickCustomColor: 'Pick any color',
      recentColors: 'Recent',
    },

    canvas2d: {
      paneTitle: '2D Pixel Art Canvas',
      gridLines: 'Grid Lines',
      clearCanvas: 'Clear',
      templatesLabel: '2D Templates',
      templates: {
        blank: 'Blank',
        classic_sword: 'Classic Sword',
        battle_axe: 'Battle Axe',
        pickaxe: 'Pickaxe',
        shield: 'Shield',
        magic_wand: 'Magic Wand',
        golden_apple: 'Golden Apple',
      },
      pixelCoords: 'Pixel',
      paintingStatus: 'Painting...',
      canvasHint: 'Left-click: active tool • Right-click: quick erase',
    },

    viewport3d: {
      paneTitle: 'Extruded 3D Preview',
      heldInHand: 'Held in Hand',
      armStyleLabel: 'Arm Style',
      armStyles: {
        steve: 'Steve',
        alex: 'Alex',
      },
      resetCamera: 'Reset View',
      cameraFrozenBadge: 'Camera frozen while painting',
      voxelsCount: 'voxels',
      emptyCanvasTitle: 'Canvas is blank!',
      emptyCanvasSubtitle: 'Paint on the 2D grid or pick a template to forge a 3D item.',
      orbitHint: 'Drag background or right-click drag to rotate • Scroll to zoom',
    },

    voxel3d: {
      paneTitle: '3D Voxel Forge Sculptor (16×16×16)',
      presetsLabel: 'Starter 3D Presets',
      presets: {
        empty_plate: 'Empty Plate',
        war_hammer: '3D War Hammer',
        royal_crown: 'Royal Crown',
        champion_trophy: 'Champion Trophy',
        magic_totem: 'Magic Totem',
      },
      layerSlicerLabel: 'Y-Layer Slicer',
      allLayersBtn: 'All (16)',
      layerStatus: 'Layers 1–{y} / 16',
      symmetryX: 'X-Symmetry',
      sculptHint:
        'Left-click: place voxel • Right-click: remove voxel • Drag mouse: orbit camera',
      emptyPlateTitle: '16×16×16 Build Plate Ready!',
      emptyPlateSubtitle:
        'Click on the build plate to place colored voxels or pick a 3D preset above.',
    },

    statsPanel: {
      panelTitle: 'Stats & Powers',
      basicInfoHeading: 'Basic Info',
      displayNameLabel: 'Display Name',
      displayNamePlaceholder: 'E.g. Lightning Blade',
      rarityLabel: 'Rarity',
      categoryLabel: 'Category',
      armorSlotLabel: 'Armor Slot',

      combatHeading: 'Combat & Utility Stats',
      attackDamageLabel: 'Attack Damage',
      heartsUnit: 'hearts',
      durabilityLabel: 'Durability',
      unbreakableToggle: 'Unbreakable',
      unbreakableActive: '∞ Never breaks!',
      attackSpeedLabel: 'Attack Speed',
      attackSpeeds: {
        slow: 'Slow',
        normal: 'Normal',
        fast: 'Fast',
        lightning: 'Lightning',
      },
      movementSpeedLabel: 'Movement Speed',

      foodHeading: 'Food / Consumable Effects',
      hungerRestoredLabel: 'Hunger Restored',
      drumsticksUnit: 'drumsticks',
      eatEffectLabel: 'Status Effect on Eat',
      eatEffects: {
        none: 'No extra effect',
        regeneration: 'Health Regeneration',
        absorption: 'Golden Hearts (Shield)',
        speed: 'Super Speed',
        fire_resistance: 'Fire Immunity',
        night_vision: 'Night Vision',
      },

      powersHeading: 'Special Powers',
      onHitHeading: 'On-Hit Effects',
      passiveHeldHeading: 'Passive Held Effects',
      onRightClickHeading: 'On-Right-Click Effects',
      activePowersCount: '{n} active',
    },

    footer: {
      licenseNotice: 'GNU GPLv3 License',
      projectStateReady: 'Ready for .forjix.json save',
      activeFileLabel: 'File',
      statsSummary: 'Attack {atk} • {dur} • Powers: {pwr}',
    },
  },
};
