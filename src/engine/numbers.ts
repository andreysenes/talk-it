const ONES = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
]
const TENS = [
  '',
  '',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
]

function underThousand(n: number): string {
  if (n < 20) return ONES[n]
  if (n < 100) {
    const t = TENS[Math.floor(n / 10)]
    const o = n % 10
    return o ? `${t} ${ONES[o]}` : t
  }
  const h = Math.floor(n / 100)
  const rest = n % 100
  return rest
    ? `${ONES[h]} hundred ${underThousand(rest)}`
    : `${ONES[h]} hundred`
}

export function numberToEnglish(n: number): string {
  if (!Number.isFinite(n)) return 'number'
  if (n < 0) return `minus ${numberToEnglish(-n)}`
  if (n === 0) return 'zero'
  if (n >= 1_000_000_000) return String(n).split('').join(' ')
  const parts: string[] = []
  const millions = Math.floor(n / 1_000_000)
  const thousands = Math.floor((n % 1_000_000) / 1000)
  const rest = n % 1000
  if (millions) parts.push(`${underThousand(millions)} million`)
  if (thousands) parts.push(`${underThousand(thousands)} thousand`)
  if (rest || parts.length === 0) parts.push(underThousand(rest))
  return parts.join(' ')
}

const SPANISH_ONES = [
  'cero',
  'uno',
  'dos',
  'tres',
  'cuatro',
  'cinco',
  'seis',
  'siete',
  'ocho',
  'nueve',
  'diez',
  'once',
  'doce',
  'trece',
  'catorce',
  'quince',
  'dieciséis',
  'diecisiete',
  'dieciocho',
  'diecinueve',
  'veinte',
]
const SPANISH_TENS = [
  '',
  '',
  'veinti',
  'treinta',
  'cuarenta',
  'cincuenta',
  'sesenta',
  'setenta',
  'ochenta',
  'noventa',
]

function spanishUnderThousand(n: number): string {
  if (n < 21) return SPANISH_ONES[n]
  if (n < 30) {
    const o = n % 10
    return o ? `veinti${SPANISH_ONES[o]}` : 'veinte'
  }
  if (n < 100) {
    const t = SPANISH_TENS[Math.floor(n / 10)]
    const o = n % 10
    return o ? `${t} y ${SPANISH_ONES[o]}` : t
  }
  if (n === 100) return 'cien'
  const h = Math.floor(n / 100)
  const rest = n % 100
  const hundreds =
    h === 1
      ? 'ciento'
      : h === 5
        ? 'quinientos'
        : h === 7
          ? 'setecientos'
          : h === 9
            ? 'novecientos'
            : `${SPANISH_ONES[h]}cientos`
  return rest ? `${hundreds} ${spanishUnderThousand(rest)}` : hundreds
}

export function numberToSpanish(n: number): string {
  if (!Number.isFinite(n)) return 'número'
  if (n < 0) return `menos ${numberToSpanish(-n)}`
  if (n === 0) return 'cero'
  if (n >= 1_000_000) return String(n).split('').join(' ')
  const thousands = Math.floor(n / 1000)
  const rest = n % 1000
  if (!thousands) return spanishUnderThousand(rest)
  const head = thousands === 1 ? 'mil' : `${spanishUnderThousand(thousands)} mil`
  return rest ? `${head} ${spanishUnderThousand(rest)}` : head
}
