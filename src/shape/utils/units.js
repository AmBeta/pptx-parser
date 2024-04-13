/**
 * Transform extent in emus to pixel.
 * @param {number|string} emus extent in emus
 */
export function emu2px(emus) {
  if (!emus) return 0;

  const emusInt = parseInt(emus);
  if (Number.isNaN(emusInt)) {
    throw new Error(`expect emus to be a number while ${emus} received.`);
  }

  return emusInt * 96 / 914400;
}

/**
 * Transform ST_Angle type to degree.
 * @param {number|string} angle ST_Positive_Fixed_Angle
 */
export function angle2deg(angle) {
  if (!angle) return 0;

  const angleInt = parseInt(angle);
  if (Number.isNaN(angleInt)) return 0;

  return angle / 60000;
}
