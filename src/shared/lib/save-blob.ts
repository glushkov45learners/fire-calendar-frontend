export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  // Revoking in the same tick can cancel the download in Firefox and Safari.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
