// SPDX-License-Identifier: GPL-3.0-or-later

import React from 'react';

interface ParticleSpec {
  dx: string;
  dy: string;
  color: string;
  size: number;
  delay: string;
}

const SPARK_PARTICLES: readonly ParticleSpec[] = Array.from(
  { length: 28 },
  (_, idx) => {
    const angle = (idx / 28) * Math.PI * 2;
    const radius = 110 + (idx % 4) * 55;
    const dx = `${Math.round(Math.cos(angle) * radius)}px`;
    const dy = `${Math.round(Math.sin(angle) * radius - 30)}px`;
    const colors = [
      '#FFD43B',
      '#38F2FF',
      '#38F27B',
      '#FF6B1A',
      '#DA77FF',
      '#FFFBE0',
    ];
    return {
      dx,
      dy,
      color: colors[idx % colors.length]!,
      size: idx % 3 === 0 ? 10 : 7,
      delay: `${(idx % 5) * 25}ms`,
    };
  }
);

export const CelebrationBurst: React.FC<{ burstKey: number }> = ({
  burstKey,
}) => {
  if (burstKey <= 0) return null;

  return (
    <div
      key={burstKey}
      className="celebration-burst-layer"
      aria-hidden="true"
      data-testid="celebration-burst"
    >
      {SPARK_PARTICLES.map((p, i) => (
        <span
          key={i}
          className="forge-spark-particle"
          style={
            {
              '--dx': p.dx,
              '--dy': p.dy,
              backgroundColor: p.color,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDelay: p.delay,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};
