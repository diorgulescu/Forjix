// SPDX-License-Identifier: GPL-3.0-or-later

import React, { useEffect, useState } from 'react';
import type { Translations } from '../i18n/translations';
import {
  buildJava121GiveCommandClient,
  exportBedrockMcaddon,
  exportBothEditions,
  exportJavaPacks,
  type JavaExportResult,
  rarityColorCode,
} from '../ipc/tauriBridge';
import type { ItemProject, ItemRarity } from '../types/project';
import { CelebrationBurst } from './CelebrationBurst';
import { Cube3DIcon, Pixel2DIcon } from './Icons';

export type ExportEditionTarget = 'bedrock' | 'java' | 'both';

interface McaddonExportModalProps {
  project: ItemProject;
  t: Translations;
  onClose: () => void;
  onExportSuccess: (savedPrimaryPath: string) => void;
}

function rarityCssColor(rarity: ItemRarity): string {
  switch (rarity) {
    case 'common':
    case 'uncommon':
      return '#F6F9FF';
    case 'rare':
      return '#38F2FF';
    case 'epic':
      return '#DA77FF';
    case 'legendary':
      return '#FFD43B';
  }
}

export const McaddonExportModal: React.FC<McaddonExportModalProps> = ({
  project,
  t,
  onClose,
  onExportSuccess,
}) => {
  const [targetEdition, setTargetEdition] =
    useState<ExportEditionTarget>('bedrock');
  const [isExporting, setIsExporting] = useState(false);
  const [exportedFiles, setExportedFiles] = useState<string[]>([]);
  const [javaExportRes, setJavaExportRes] = useState<JavaExportResult | null>(
    null
  );
  const [burstKey, setBurstKey] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedBedrock, setCopiedBedrock] = useState(false);
  const [copiedJava, setCopiedJava] = useState(false);

  const bedrockGiveCmd = `/give @s forjix:${project.slug}`;
  const javaGiveCmd =
    javaExportRes?.giveCommand ?? buildJava121GiveCommandClient(project);
  const mcColorPrefix = rarityColorCode(project.rarity);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleRunExport = async () => {
    setIsExporting(true);
    setErrorMsg(null);
    try {
      if (targetEdition === 'bedrock') {
        const saved = await exportBedrockMcaddon(project);
        if (saved) {
          setExportedFiles([saved]);
          setBurstKey((k) => k + 1);
          onExportSuccess(saved);
        }
      } else if (targetEdition === 'java') {
        const res = await exportJavaPacks(project);
        if (res) {
          setJavaExportRes(res);
          setExportedFiles([res.resourcePackPath, res.dataPackPath]);
          setBurstKey((k) => k + 1);
          onExportSuccess(res.resourcePackPath);
        }
      } else {
        const combined = await exportBothEditions(project);
        if (combined) {
          setJavaExportRes(combined.javaResult);
          setExportedFiles([
            combined.mcaddonPath,
            combined.javaResult.resourcePackPath,
            combined.javaResult.dataPackPath,
          ]);
          setBurstKey((k) => k + 1);
          onExportSuccess(combined.mcaddonPath);
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyText = async (
    text: string,
    setFlag: (val: boolean) => void
  ) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Ignore clipboard permission errors in headless browsers
    }
    setFlag(true);
    window.setTimeout(() => setFlag(false), 1800);
  };

  const showBedrockGuide =
    targetEdition === 'bedrock' || targetEdition === 'both';
  const showJavaGuide = targetEdition === 'java' || targetEdition === 'both';

  const primaryBtnLabel =
    targetEdition === 'bedrock'
      ? t.mcaddonExport.exportBedrockBtn
      : targetEdition === 'java'
        ? t.mcaddonExport.exportJavaBtn
        : t.mcaddonExport.exportBothBtn;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="mcaddon-export-modal"
    >
      <CelebrationBurst burstKey={burstKey} />

      <div
        className="mcaddon-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mcaddon-modal-title"
      >
        <div className="modal-header-row">
          <div>
            <h2 id="mcaddon-modal-title" className="modal-title">
              ⚒️ {t.mcaddonExport.modalTitle}
            </h2>
            <p className="modal-subtitle">{t.mcaddonExport.modalSubtitle}</p>
          </div>
          <button
            type="button"
            className="modal-close-x"
            onClick={onClose}
            aria-label={t.mcaddonExport.closeBtn}
            data-testid="mcaddon-modal-close"
          >
            ✕
          </button>
        </div>

        {/* 3-Way Edition Target Selector */}
        <div
          className="edition-target-tabs"
          role="tablist"
          data-testid="edition-target-tabs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={targetEdition === 'bedrock'}
            className={`edition-tab-btn ${
              targetEdition === 'bedrock' ? 'active-emerald' : ''
            }`}
            onClick={() => {
              setTargetEdition('bedrock');
              setExportedFiles([]);
            }}
            data-testid="export-target-bedrock"
          >
            <span>📱🎓</span>
            <span>{t.mcaddonExport.targetBedrock}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={targetEdition === 'java'}
            className={`edition-tab-btn ${
              targetEdition === 'java' ? 'active-cyan' : ''
            }`}
            onClick={() => {
              setTargetEdition('java');
              setExportedFiles([]);
            }}
            data-testid="export-target-java"
          >
            <span>☕💻</span>
            <span>{t.mcaddonExport.targetJava}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={targetEdition === 'both'}
            className={`edition-tab-btn ${
              targetEdition === 'both' ? 'active-gold' : ''
            }`}
            onClick={() => {
              setTargetEdition('both');
              setExportedFiles([]);
            }}
            data-testid="export-target-both"
          >
            <span>🌟</span>
            <span>{t.mcaddonExport.targetBoth}</span>
          </button>
        </div>

        {/* Item Preview Summary Card */}
        <div className="export-item-preview-card">
          <div className="preview-name-row">
            <span
              className="mc-formatted-name"
              style={{ color: rarityCssColor(project.rarity) }}
            >
              <code className="mc-code-tag">{mcColorPrefix}</code>
              {project.name}
            </span>
            <code className="preview-id-pill">forjix:{project.slug}</code>
          </div>

          <div className="preview-badges-row">
            {showBedrockGuide && (
              <span className="export-meta-badge emerald">
                ✓ {t.mcaddonExport.compatibilityBadge}
              </span>
            )}
            {showJavaGuide && (
              <span className="export-meta-badge gold">
                ✓ {t.mcaddonExport.javaVersionBadge}
              </span>
            )}
            <span className="export-meta-badge cyan">
              {project.mode === 'voxel' ? (
                <>
                  <Cube3DIcon size={14} /> {t.mcaddonExport.mode3dBadge}
                </>
              ) : (
                <>
                  <Pixel2DIcon size={14} /> {t.mcaddonExport.mode2dBadge}
                </>
              )}
            </span>
          </div>
        </div>

        {/* Bedrock / Education Instructions */}
        {showBedrockGuide && (
          <div className="export-steps-box">
            <h3 className="steps-heading">{t.mcaddonExport.howToTitle}</h3>

            <ol className="export-steps-list">
              <li className="export-step-item">
                <span className="step-num">1</span>
                <div>
                  <strong>{t.mcaddonExport.step2Title}</strong>
                  <p>{t.mcaddonExport.step2Body}</p>
                </div>
              </li>

              <li className="export-step-item highlight-warning">
                <span className="step-num gold">2</span>
                <div>
                  <strong>⚠️ {t.mcaddonExport.step3Title}</strong>
                  <p>{t.mcaddonExport.step3Body}</p>
                </div>
              </li>
            </ol>

            <div className="give-command-bar">
              <span className="give-label">
                {t.mcaddonExport.giveCommandLabel}
              </span>
              <div className="give-code-row">
                <code>{bedrockGiveCmd}</code>
                <button
                  type="button"
                  className="copy-cmd-btn"
                  onClick={() =>
                    handleCopyText(bedrockGiveCmd, setCopiedBedrock)
                  }
                >
                  {copiedBedrock
                    ? t.mcaddonExport.copiedBtn
                    : t.mcaddonExport.copyBtn}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Java Edition 1.21+ Instructions + 1-Click Copy /give Command */}
        {showJavaGuide && (
          <div className="export-steps-box java-steps-box">
            <h3 className="steps-heading">☕ {t.mcaddonExport.javaHowToTitle}</h3>

            <ol className="export-steps-list">
              <li className="export-step-item">
                <span className="step-num">1</span>
                <div>
                  <strong>{t.mcaddonExport.javaStep1Title}</strong>
                  <p>{t.mcaddonExport.javaStep1Body}</p>
                </div>
              </li>

              <li className="export-step-item">
                <span className="step-num">2</span>
                <div>
                  <strong>{t.mcaddonExport.javaStep2Title}</strong>
                  <p>{t.mcaddonExport.javaStep2Body}</p>
                </div>
              </li>
            </ol>

            <div className="give-command-bar java-give-bar">
              <div className="java-give-header">
                <span className="give-label">
                  {t.mcaddonExport.javaGiveLabel}
                </span>
                <button
                  type="button"
                  className="copy-java-give-cta"
                  onClick={() => handleCopyText(javaGiveCmd, setCopiedJava)}
                  data-testid="copy-java-give-btn"
                >
                  {copiedJava
                    ? `✓ ${t.mcaddonExport.copiedBtn}`
                    : `📋 ${t.mcaddonExport.copyGiveBtn}`}
                </button>
              </div>
              <code
                className="java-give-code-block"
                data-testid="java-give-command-text"
              >
                {javaGiveCmd}
              </code>
            </div>
          </div>
        )}

        {exportedFiles.length > 0 && (
          <div
            className="export-success-banner"
            data-testid="mcaddon-export-success"
          >
            <strong>🎉 {t.mcaddonExport.successBanner}</strong>
            {exportedFiles.map((f) => (
              <code key={f}>{f}</code>
            ))}
          </div>
        )}

        {errorMsg && <div className="export-error-banner">{errorMsg}</div>}

        <div className="modal-footer-actions">
          <button type="button" className="action-btn" onClick={onClose}>
            {t.mcaddonExport.closeBtn}
          </button>

          <button
            type="button"
            className="mcaddon-generate-btn"
            disabled={isExporting}
            onClick={handleRunExport}
            data-testid="confirm-export-mcaddon-btn"
          >
            {isExporting
              ? t.mcaddonExport.exportingBtn
              : `⚡ ${primaryBtnLabel}`}
          </button>
        </div>
      </div>
    </div>
  );
};
