// SPDX-License-Identifier: GPL-3.0-or-later

import React, { useState } from 'react';
import type { Translations } from '../i18n/translations';
import {
  loadForjixProject,
  saveForjixProject,
} from '../ipc/tauriBridge';
import type {
  EditorMode,
  ItemProject,
  Language,
} from '../types/project';
import {
  AnvilLogoIcon,
  Cube3DIcon,
  FolderOpenIcon,
  Pixel2DIcon,
  SaveFileIcon,
  VolumeMuteIcon,
  VolumeOnIcon,
} from './Icons';

interface HeaderProps {
  project: ItemProject;
  lang: Language;
  t: Translations;
  soundMuted: boolean;
  onToggleSoundMute: () => void;
  onSelectMode: (mode: EditorMode) => void;
  onToggleLanguage: () => void;
  onProjectSaved: (filePath: string) => void;
  onProjectLoaded: (project: ItemProject, filePath: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  lang,
  t,
  soundMuted,
  onToggleSoundMute,
  onSelectMode,
  onToggleLanguage,
  onProjectSaved,
  onProjectLoaded,
}) => {
  const [toastStatus, setToastStatus] = useState<'saved' | 'loaded' | null>(
    null
  );

  const showToast = (kind: 'saved' | 'loaded') => {
    setToastStatus(kind);
    window.setTimeout(() => setToastStatus(null), 2200);
  };

  const handleSaveProject = async () => {
    try {
      const res = await saveForjixProject(project);
      if (res) {
        onProjectSaved(res.path);
        showToast('saved');
      }
    } catch (err) {
      console.error('Failed to save .forjix.json project:', err);
    }
  };

  const handleLoadProject = async () => {
    try {
      const res = await loadForjixProject();
      if (res) {
        onProjectLoaded(res.project, res.path);
        showToast('loaded');
      }
    } catch (err) {
      console.error('Failed to load .forjix.json project:', err);
    }
  };

  return (
    <header className="app-header">
      <div className="brand-block">
        <div className="brand-logo" aria-hidden="true">
          <AnvilLogoIcon size={30} />
        </div>
        <div className="brand-text">
          <div className="brand-title-row">
            <h1 className="brand-title">{t.appName}</h1>
            <span className="offline-pill">{t.offlineBadge}</span>
          </div>
          <span className="brand-subtitle">{t.appSubtitle}</span>
        </div>
      </div>

      {/* Top Editor Mode Switcher */}
      <nav
        className="mode-switcher"
        aria-label="Editor Mode"
        data-testid="editor-mode-switcher"
      >
        <button
          type="button"
          className={`mode-switch-btn ${
            project.mode === 'extruded' ? 'active' : ''
          }`}
          onClick={() => onSelectMode('extruded')}
          aria-pressed={project.mode === 'extruded'}
          data-testid="mode-extruded-btn"
        >
          <Pixel2DIcon size={17} />
          <span>{t.modeSwitcher.extruded2d}</span>
        </button>

        <button
          type="button"
          className={`mode-switch-btn ${
            project.mode === 'voxel' ? 'active-voxel' : ''
          }`}
          onClick={() => onSelectMode('voxel')}
          aria-pressed={project.mode === 'voxel'}
          data-testid="mode-voxel-btn"
        >
          <Cube3DIcon size={17} />
          <span>{t.modeSwitcher.voxel3d}</span>
        </button>
      </nav>

      {/* Project Persistence + Sound Mute Toggle + 1-Click RO/EN Toggle */}
      <div className="header-actions">
        {toastStatus && (
          <span className="persistence-toast" data-testid="persistence-toast">
            {toastStatus === 'saved'
              ? t.persistence.savedToast
              : t.persistence.loadedToast}
          </span>
        )}

        <button
          type="button"
          className="action-btn save-btn"
          onClick={handleSaveProject}
          data-testid="save-project-btn"
        >
          <SaveFileIcon size={15} />
          <span>{t.persistence.saveProject}</span>
        </button>

        <button
          type="button"
          className="action-btn"
          onClick={handleLoadProject}
          data-testid="load-project-btn"
        >
          <FolderOpenIcon size={15} />
          <span>{t.persistence.loadProject}</span>
        </button>

        <button
          type="button"
          className={`sound-toggle-btn ${soundMuted ? 'muted' : ''}`}
          onClick={onToggleSoundMute}
          title={soundMuted ? t.soundMutedHint : t.soundOnHint}
          aria-label={soundMuted ? t.soundMutedHint : t.soundOnHint}
          aria-pressed={!soundMuted}
          data-testid="sound-mute-toggle"
        >
          {soundMuted ? (
            <VolumeMuteIcon size={17} />
          ) : (
            <VolumeOnIcon size={17} />
          )}
        </button>

        <button
          type="button"
          className="lang-toggle-btn"
          onClick={onToggleLanguage}
          title={t.languageToggleHint}
          aria-label={t.languageToggleHint}
          data-testid="lang-toggle"
        >
          <span className={`lang-pill ${lang === 'ro' ? 'active' : ''}`}>
            RO
          </span>
          <span className={`lang-pill ${lang === 'en' ? 'active' : ''}`}>
            EN
          </span>
        </button>
      </div>
    </header>
  );
};
