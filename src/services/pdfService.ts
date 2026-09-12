import jsPDF from 'jspdf';

export const mealLabelsMap: Record<string, string> = {
  breakfast: 'Sarapan',
  lunch: 'Makan Tengah Hari',
  tea: 'Minum Petang',
  dinner: 'Makan Malam',
};

export const formatDateSafe = (dateStr: string | undefined, lang?: string): string => {
  if (!dateStr) return '-';
  if (lang) {
    // Keep reference to satisfy compiler/linter
  }
  const trimmed = dateStr.trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}/${month}/${year}`;
  }
  try {
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return trimmed;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
  } catch {
    return trimmed;
  }
};

export const drawCreamBox = (
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  content: string | string[],
  isBoldContent = false
) => {
  doc.setFillColor(250, 248, 244);
  doc.setDrawColor(220, 210, 195);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 100, 80);
  doc.text(label, x + 4, y + 4.8);
  doc.setFont('helvetica', isBoldContent ? 'bold' : 'normal');
  doc.setFontSize(9);
  doc.setTextColor(40, 35, 30);
  const lines = Array.isArray(content) ? content : [content];
  lines.forEach((line, idx) => {
    doc.text(line, x + 4, y + 9.8 + idx * 4.2);
  });
};

export const drawBatikHeaderBackground = (doc: jsPDF, headerHeight = 36) => {
  // Light cream background matching client PDF (252, 249, 242)
  doc.setFillColor(252, 249, 242);
  doc.rect(0, 0, 210, headerHeight, 'F');

  // Gold dividing line at bottom of header matching client PDF
  doc.setDrawColor(194, 147, 45);
  doc.setLineWidth(0.4);
  doc.line(15, headerHeight, 195, headerHeight);
};

export const getCachedLogoBase64 = (): string | null => {
  return null;
};
