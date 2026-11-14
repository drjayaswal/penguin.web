import crypto from 'crypto'

export const WORKFLOW_PALETTES: string[][] = [
  ['#92A1C6', '#146A7C', '#F0AB3D', '#C271B4', '#C20D90'],
  ['#264653', '#2A9D8F', '#E9C46A', '#F4A261', '#E76F51'],
  ['#E63946', '#F1FAEE', '#A8DADC', '#457B9D', '#1D3557'],
  ['#0081A7', '#00AFB9', '#FDFCDC', '#FED9B7', '#F07167'],
  ['#D8E2DC', '#FFE5D9', '#FFCAD4', '#F4ACB7', '#9D8189'],
  ['#B5E2FA', '#EDDEA4', '#F7A072', '#E18256', '#546A7B'],
  ['#CCD5AE', '#E9EDC9', '#FEFAE0', '#FAEDCD', '#D4A373'],
  ['#70D6FF', '#FF70A6', '#FF9770', '#FFD670', '#E9FF70'],
  ['#A3CEF1', '#274C77', '#6096BA', '#8B8C89', '#E7ECEF'],
  ['#F72585', '#7209B7', '#3A0CA3', '#4361EE', '#4CC9F0'],
  ['#DDA15E', '#BC6C25', '#283618', '#606C38', '#FEFAE0'],
  ['#9B5DE5', '#F15BB5', '#FEE440', '#00BBF9', '#00F5D4'],
]

export function generateAvatarSeed(): string {
  return crypto.randomBytes(8).toString('hex')
}

export function pickPalette(usedPalettes: string[][]): string[] {
  const usedSerialized = new Set(usedPalettes.map((p) => JSON.stringify(p)))
  const unused = WORKFLOW_PALETTES.filter((p) => !usedSerialized.has(JSON.stringify(p)))

  if (unused.length > 0) {
    const idx = Math.floor(Math.random() * unused.length)
    return unused[idx]
  }

  const idx = Math.floor(Math.random() * WORKFLOW_PALETTES.length)
  return WORKFLOW_PALETTES[idx]
}
