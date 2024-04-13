let uid = 0;
export function genUID() {
  return uid++;
}

/**
 * Get target file's  extension, returns filename with file of no-extension.
 * @param {string} filename Target file's name
 */
export function getFileExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}
