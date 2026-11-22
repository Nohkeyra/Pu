/** Scale the PDF viewport uniformly; never crop, stretch or change its aspect ratio. */
export function fitPdfPage(
  pageWidth: number,
  pageHeight: number,
  availableWidth: number,
  availableHeight: number
): number {
  if (
    ![pageWidth, pageHeight, availableWidth, availableHeight].every(
      (value) => Number.isFinite(value) && value > 0
    )
  ) return 1;
  return Math.min(availableWidth / pageWidth, availableHeight / pageHeight);
}

/** PDF viewport units at scale 1 are 72-dpi points, not CSS pixels or A4 guesses. */
export function pdfPageSizeLabel(widthPoints: number, heightPoints: number): string {
  const widthMm = Math.round(widthPoints * 25.4 / 72);
  const heightMm = Math.round(heightPoints * 25.4 / 72);
  const a4 = [widthMm, heightMm].sort((a, b) => a - b);
  if (Math.abs(a4[0] - 210) <= 2 && Math.abs(a4[1] - 297) <= 2) {
    return `A4 · ${widthMm} × ${heightMm} mm`;
  }
  return `${widthMm} × ${heightMm} mm`;
}
