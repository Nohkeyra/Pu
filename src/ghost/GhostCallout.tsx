import React from 'react';
import { CalloutSpec } from './types';

export interface GhostCalloutProps {
  callout: CalloutSpec | null;
  targetRect: DOMRect | null;
}

export const GhostCallout: React.FC<GhostCalloutProps> = ({ callout, targetRect }) => {
  if (!callout || !targetRect) return null;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 360;

  const centerX = targetRect.left + targetRect.width / 2;
  const centerY = targetRect.top + targetRect.height / 2;

  const boxStyle: React.CSSProperties = {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: 99999,
    backgroundColor: '#111827',
    color: '#ffffff',
    padding: '10px 14px',
    borderRadius: '10px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
    maxWidth: '260px',
    width: 'max-content',
    animation: 'calloutIn 0.25s ease-out',
  };

  let arrowChar = '▼';
  const arrowStyle: React.CSSProperties = {
    position: 'absolute',
    color: '#111827',
    fontSize: '12px',
    lineHeight: 1,
  };

  if (callout.position === 'top') {
    const clampedLeft = Math.max(12, Math.min(vw - 272, centerX - 130));
    const arrowLeft = Math.max(16, Math.min(244, centerX - clampedLeft));
    boxStyle.left = `${clampedLeft}px`;
    boxStyle.top = `${targetRect.top - 12}px`;
    boxStyle.transform = 'translateY(-100%)';
    arrowChar = '▼';
    arrowStyle.bottom = '-9px';
    arrowStyle.left = `${arrowLeft}px`;
    arrowStyle.transform = 'translateX(-50%)';
  } else if (callout.position === 'bottom') {
    const clampedLeft = Math.max(12, Math.min(vw - 272, centerX - 130));
    const arrowLeft = Math.max(16, Math.min(244, centerX - clampedLeft));
    boxStyle.left = `${clampedLeft}px`;
    boxStyle.top = `${targetRect.bottom + 12}px`;
    arrowChar = '▲';
    arrowStyle.top = '-9px';
    arrowStyle.left = `${arrowLeft}px`;
    arrowStyle.transform = 'translateX(-50%)';
  } else if (callout.position === 'left') {
    boxStyle.left = `${Math.max(12, targetRect.left - 12)}px`;
    boxStyle.top = `${centerY}px`;
    boxStyle.transform = 'translate(-100%, -50%)';
    arrowChar = '▶';
    arrowStyle.right = '-9px';
    arrowStyle.top = '50%';
    arrowStyle.transform = 'translateY(-50%)';
  } else if (callout.position === 'right') {
    boxStyle.left = `${targetRect.right + 12}px`;
    boxStyle.top = `${centerY}px`;
    boxStyle.transform = 'translateY(-50%)';
    arrowChar = '◀';
    arrowStyle.left = '-9px';
    arrowStyle.top = '50%';
    arrowStyle.transform = 'translateY(-50%)';
  }

  return (
    <>
      <div role="status" style={boxStyle}>
        <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '2px' }}>
          {callout.title}
        </div>
        <div style={{ fontSize: '12px', opacity: 0.8, lineHeight: 1.4 }}>
          {callout.body}
        </div>
        <div style={arrowStyle} aria-hidden="true">
          {arrowChar}
        </div>
      </div>
      <div className="sr-only" aria-live="polite">
        {callout.title}. {callout.body}
      </div>
    </>
  );
};
