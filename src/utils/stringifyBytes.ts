const SIZE_UNIT_MAP = {
  B: 'Bytes',
  KB: 'KB',
  MB: 'MB',
  GB: 'GB',
  TB: 'TB',
  PB: 'PB',
  EB: 'EB',
  ZB: 'ZB',
  YB: 'YB',
} as const

type UnitRecord = typeof SIZE_UNIT_MAP
type Unit = UnitRecord[keyof UnitRecord]

// Define the array of unit suffixes
const SIZE_UNITS = Object.values(SIZE_UNIT_MAP) as Unit[]

/**
 * Converts a number of bytes into a human-readable string representation.
 *
 * @param bytes - The number of bytes to convert.
 * @param decimals - The number of decimal places to include in the output (default is 2).
 * @returns A string representing the number of bytes in a human-readable format.
 */
export function stringifyBytes(bytes: number, decimals = 2) {
  if (bytes === 0) {
    return `0 ${SIZE_UNIT_MAP.B}`
  }

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  // Calculate the index of the appropriate unit suffix
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  // Convert the number of bytes to the appropriate unit and format the output
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + SIZE_UNITS[i]
}
