const MB = 1024 * 1024;

export const MAX_FILE_SIZE_BYTES = 8 * MB;

export function assertFileSize(file: File) {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File exceeds 8MB limit (received ${(file.size / MB).toFixed(2)}MB).`);
  }
}

export function getExtension(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? '';
}
