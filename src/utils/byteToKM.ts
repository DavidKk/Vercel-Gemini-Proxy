export const byteToKM = (byte: number) => {
  const units = ['B', 'K', 'M', 'G', 'T', 'P', 'E']

  let unitIndex = 0
  while (byte >= 1024 && unitIndex < units.length - 1) {
    byte /= 1024
    unitIndex++
  }

  return `${parseFloat(byte.toFixed(2))}${units[unitIndex]}`
}
