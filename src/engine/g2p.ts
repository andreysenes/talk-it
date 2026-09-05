import { pronounce } from 'klattsch/pronounce'
import { numberToEnglish, numberToSpanish } from './numbers'
import type { Language } from './personalities'

export type Phone = { code: string; stressed: boolean }

const ABBREVIATIONS: Record<string, string> = {
  mr: 'mister',
  mrs: 'missus',
  ms: 'miz',
  dr: 'doctor',
  st: 'street',
  ave: 'avenue',
  vs: 'versus',
  etc: 'etcetera',
  usa: 'u s a',
  uk: 'u k',
  ok: 'okay',
  tv: 't v',
}

/** NRL-style letter-to-sound fallback when a word is missing from CMU. */
function guessEnglish(word: string): Phone[] {
  const w = word.toLowerCase().replace(/[^a-z']/g, '')
  if (!w) return []
  const out: string[] = []
  let i = 0
  const peek = (n: number) => w.slice(i, i + n)
  const isVowel = (c: string) => 'aeiouy'.includes(c)

  while (i < w.length) {
    const rest = w.slice(i)
    const prev = w[i - 1] ?? ''
    const next = w[i + 1] ?? ''
    const next2 = w[i + 2] ?? ''

    if (rest.startsWith('tion')) {
      out.push('SH', 'AH', 'N')
      i += 4
      continue
    }
    if (rest.startsWith('sion')) {
      out.push('ZH', 'AH', 'N')
      i += 4
      continue
    }
    if (rest.startsWith('cious') || rest.startsWith('tious')) {
      out.push('SH', 'AH', 'S')
      i += 5
      continue
    }
    if (rest.startsWith('ough')) {
      out.push('AO')
      i += 4
      continue
    }
    if (rest.startsWith('augh')) {
      out.push('AO')
      i += 4
      continue
    }
    if (rest.startsWith('eigh')) {
      out.push('EY')
      i += 4
      continue
    }
    if (peek(3) === 'igh') {
      out.push('AY')
      i += 3
      continue
    }
    if (peek(2) === 'ch') {
      out.push('CH')
      i += 2
      continue
    }
    if (peek(2) === 'sh') {
      out.push('SH')
      i += 2
      continue
    }
    if (peek(2) === 'th') {
      out.push(i === 0 || 'aeiou'.includes(prev) ? 'TH' : 'DH')
      i += 2
      continue
    }
    if (peek(2) === 'wh') {
      out.push('W')
      i += 2
      continue
    }
    if (peek(2) === 'ph') {
      out.push('F')
      i += 2
      continue
    }
    if (peek(2) === 'gh') {
      if (i === 0) out.push('G')
      i += 2
      continue
    }
    if (peek(2) === 'ng') {
      out.push('NG')
      i += 2
      continue
    }
    if (peek(2) === 'ck') {
      out.push('K')
      i += 2
      continue
    }
    if (peek(2) === 'qu') {
      out.push('K', 'W')
      i += 2
      continue
    }
    if (peek(2) === 'kn' && i === 0) {
      out.push('N')
      i += 2
      continue
    }
    if (peek(2) === 'gn' && i === 0) {
      out.push('N')
      i += 2
      continue
    }
    if (peek(2) === 'wr' && i === 0) {
      out.push('R')
      i += 2
      continue
    }
    if (peek(2) === 'ps' && i === 0) {
      out.push('S')
      i += 2
      continue
    }
    if (peek(2) === 'ee' || peek(2) === 'ea') {
      out.push('IY')
      i += 2
      continue
    }
    if (peek(2) === 'oo') {
      out.push('UW')
      i += 2
      continue
    }
    if (peek(2) === 'oa' || peek(2) === 'oe') {
      out.push('OW')
      i += 2
      continue
    }
    if (peek(2) === 'oi' || peek(2) === 'oy') {
      out.push('OY')
      i += 2
      continue
    }
    if (peek(2) === 'ou' || peek(2) === 'ow') {
      out.push('AW')
      i += 2
      continue
    }
    if (peek(2) === 'ai' || peek(2) === 'ay' || peek(2) === 'ey') {
      out.push('EY')
      i += 2
      continue
    }
    if (peek(2) === 'au' || peek(2) === 'aw') {
      out.push('AO')
      i += 2
      continue
    }
    if (peek(2) === 'ie') {
      out.push(i + 2 === w.length ? 'AY' : 'IY')
      i += 2
      continue
    }
    if (peek(2) === 'ui') {
      out.push('UW')
      i += 2
      continue
    }
    if (peek(2) === 'er' || peek(2) === 'ir' || peek(2) === 'ur') {
      out.push('ER')
      i += 2
      continue
    }
    if (peek(2) === 'ar') {
      out.push('AA', 'R')
      i += 2
      continue
    }
    if (peek(2) === 'or') {
      out.push('AO', 'R')
      i += 2
      continue
    }

    const ch = w[i]
    const magicE =
      isVowel(ch) &&
      next &&
      !isVowel(next) &&
      next2 === 'e' &&
      i + 3 >= w.length

    switch (ch) {
      case 'a':
        out.push(magicE ? 'EY' : next === 'l' ? 'AO' : 'AE')
        break
      case 'e':
        if (i === w.length - 1 && w.length > 2) {
          /* silent e */
        } else {
          out.push(magicE ? 'IY' : 'EH')
        }
        break
      case 'i':
      case 'y':
        if (i === 0 && ch === 'y') out.push('Y')
        else out.push(magicE || (ch === 'y' && i === w.length - 1) ? 'AY' : 'IH')
        break
      case 'o':
        out.push(magicE ? 'OW' : 'AA')
        break
      case 'u':
        out.push(magicE ? 'UW' : prev === 'q' ? 'W' : 'AH')
        break
      case 'b':
        out.push('B')
        break
      case 'c':
        out.push(next === 'e' || next === 'i' || next === 'y' ? 'S' : 'K')
        break
      case 'd':
        out.push('D')
        break
      case 'f':
        out.push('F')
        break
      case 'g':
        out.push(next === 'e' || next === 'i' || next === 'y' ? 'JH' : 'G')
        break
      case 'h':
        if (i !== 0 || prev !== '') out.push('HH')
        else out.push('HH')
        break
      case 'j':
        out.push('JH')
        break
      case 'k':
        out.push('K')
        break
      case 'l':
        out.push('L')
        break
      case 'm':
        out.push('M')
        break
      case 'n':
        out.push('N')
        break
      case 'p':
        out.push('P')
        break
      case 'q':
        out.push('K')
        break
      case 'r':
        out.push('R')
        break
      case 's':
        out.push(
          i > 0 && isVowel(prev) && i < w.length - 1 && isVowel(next) ? 'Z' : 'S',
        )
        break
      case 't':
        out.push('T')
        break
      case 'v':
        out.push('V')
        break
      case 'w':
        out.push('W')
        break
      case 'x':
        out.push('K', 'S')
        break
      case 'z':
        out.push('Z')
        break
      default:
        break
    }
    i += 1
    if (magicE) i += 2
  }

  const firstVowel = out.findIndex((p) =>
    [
      'AA',
      'AE',
      'AH',
      'AO',
      'AW',
      'AY',
      'EH',
      'ER',
      'EY',
      'IH',
      'IY',
      'OW',
      'OY',
      'UH',
      'UW',
    ].includes(p),
  )
  return out.map((code, idx) => ({ code, stressed: idx === firstVowel }))
}

function spanishWord(word: string): Phone[] {
  const w = word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ü/g, 'u')
  const out: Phone[] = []
  let i = 0
  const push = (code: string, stressed = false) => out.push({ code, stressed })

  while (i < w.length) {
    const ch = w[i]
    const n = w[i + 1] ?? ''
    const n2 = w[i + 2] ?? ''

    if (ch === 'c' && n === 'h') {
      push('CH')
      i += 2
      continue
    }
    if (ch === 'l' && n === 'l') {
      push('Y')
      i += 2
      continue
    }
    if (ch === 'r' && n === 'r') {
      push('R')
      i += 2
      continue
    }
    if (ch === 'q' && n === 'u') {
      push('K')
      i += 2
      continue
    }
    if (ch === 'g' && n === 'u' && (n2 === 'e' || n2 === 'i')) {
      push('G')
      i += 2
      continue
    }
    if ((ch === 'c' && (n === 'e' || n === 'i')) || ch === 'z') {
      push('S')
      i += 1
      continue
    }
    if (ch === 'g' && (n === 'e' || n === 'i')) {
      push('HH')
      i += 1
      continue
    }
    if (ch === 'ñ' || (ch === 'n' && n === 'y')) {
      push('N')
      push('Y')
      i += ch === 'ñ' ? 1 : 2
      continue
    }

    switch (ch) {
      case 'a':
        push('AA', true)
        break
      case 'e':
        push('EH', true)
        break
      case 'i':
      case 'y':
        if (ch === 'y' && i < w.length - 1 && !'aeiou'.includes(n)) push('Y')
        else push('IY', true)
        break
      case 'o':
        push('OW', true)
        break
      case 'u':
        push('UW', true)
        break
      case 'b':
      case 'v':
        push('B')
        break
      case 'c':
      case 'k':
      case 'q':
        push('K')
        break
      case 'd':
        push('D')
        break
      case 'f':
        push('F')
        break
      case 'g':
        push('G')
        break
      case 'h':
        break
      case 'j':
        push('HH')
        break
      case 'l':
        push('L')
        break
      case 'm':
        push('M')
        break
      case 'n':
        push('N')
        break
      case 'p':
        push('P')
        break
      case 'r':
        push('R')
        break
      case 's':
      case 'x':
        push('S')
        break
      case 't':
        push('T')
        break
      case 'w':
        push('W')
        break
      default:
        break
    }
    i += 1
  }
  return out
}

function expandToken(raw: string, language: Language): string[] {
  const trimmed = raw.trim()
  if (!trimmed) return []

  const money = trimmed.match(/^\$([0-9]+(?:\.[0-9]+)?)$/)
  if (money) {
    const [dollars, cents] = money[1].split('.')
    const d = Number(dollars)
    const words =
      language === 'spanish'
        ? `${numberToSpanish(d)} dólares`
        : `${numberToEnglish(d)} dollar${d === 1 ? '' : 's'}`
    if (cents) {
      const c = Number(cents.padEnd(2, '0').slice(0, 2))
      return language === 'spanish'
        ? `${words} con ${numberToSpanish(c)}`.split(' ')
        : `${words} and ${numberToEnglish(c)} cents`.split(' ')
    }
    return words.split(' ')
  }

  if (/^[0-9]+$/.test(trimmed)) {
    const n = Number(trimmed)
    return (language === 'spanish' ? numberToSpanish(n) : numberToEnglish(n)).split(
      ' ',
    )
  }

  const bare = trimmed.replace(/\./g, '').toLowerCase()
  if (ABBREVIATIONS[bare]) return ABBREVIATIONS[bare].split(' ')
  return [trimmed]
}

function tokenizeText(text: string): Array<{ word: string; pause?: string }> {
  const tokens: Array<{ word: string; pause?: string }> = []
  const parts = text.split(/(\s+|[,.;:!?…]+)/)
  for (const part of parts) {
    if (!part || /^\s+$/.test(part)) continue
    if (/^[,.;:!?…]+$/.test(part)) {
      const last = tokens[tokens.length - 1]
      const pause = part.includes('?') || part.includes('!') || part.includes('.')
        ? '.'
        : part.includes(';')
          ? ';'
          : ','
      if (last) last.pause = pause
      else tokens.push({ word: '', pause })
      continue
    }
    tokens.push({ word: part })
  }
  return tokens
}

const PHONE_REMAP: Record<string, string[]> = {
  DX: ['D'],
  NX: ['N'],
  EL: ['AH', 'L'],
  EM: ['AH', 'M'],
  EN: ['AH', 'N'],
  AX: ['AH'],
  IX: ['IH'],
  UX: ['UW'],
  AXR: ['ER'],
  Q: [],
}

function remapPhones(phones: Phone[]): Phone[] {
  const out: Phone[] = []
  for (const phone of phones) {
    const mapped = PHONE_REMAP[phone.code]
    if (mapped) {
      for (const code of mapped) out.push({ code, stressed: phone.stressed })
      continue
    }
    out.push(phone)
  }
  return out
}

function phonesForWord(word: string, language: Language): Phone[] {
  const cleaned = word.replace(/^[^A-Za-zÀ-ÿ']+|[^A-Za-zÀ-ÿ']+$/g, '')
  if (!cleaned) return []
  if (language === 'spanish') return remapPhones(spanishWord(cleaned))

  const lower = cleaned.toLowerCase()
  const fromCmu = pronounce(lower)
  if (fromCmu?.length) return remapPhones(fromCmu)

  // Possessives / trailing 's
  if (lower.endsWith("'s")) {
    const stem = pronounce(lower.slice(0, -2))
    if (stem) return remapPhones([...stem, { code: 'Z', stressed: false }])
  }
  if (lower.endsWith('s') && lower.length > 2) {
    const stem = pronounce(lower.slice(0, -1))
    if (stem) return remapPhones([...stem, { code: 'S', stressed: false }])
  }
  if (lower.endsWith('ed') && lower.length > 3) {
    const stem = pronounce(lower.slice(0, -2))
    if (stem) return remapPhones([...stem, { code: 'D', stressed: false }])
  }
  if (lower.endsWith('ing') && lower.length > 4) {
    const stem = pronounce(lower.slice(0, -3))
    if (stem)
      return remapPhones([
        ...stem,
        { code: 'IH', stressed: false },
        { code: 'NG', stressed: false },
      ])
  }

  return remapPhones(guessEnglish(cleaned))
}

export function textToPhones(
  text: string,
  language: Language,
): Array<{ phones: Phone[]; pause?: string }> {
  const chunks: Array<{ phones: Phone[]; pause?: string }> = []
  for (const token of tokenizeText(text)) {
    if (!token.word && token.pause) {
      chunks.push({ phones: [], pause: token.pause })
      continue
    }
    for (const piece of token.word.split(/[-/]/)) {
      for (const expanded of expandToken(piece, language)) {
        const phones = phonesForWord(expanded, language)
        if (phones.length) chunks.push({ phones })
      }
    }
    if (token.pause) {
      const last = chunks[chunks.length - 1]
      if (last) last.pause = token.pause
      else chunks.push({ phones: [], pause: token.pause })
    }
  }
  return chunks
}

const VOWELS = new Set([
  'AA',
  'AE',
  'AH',
  'AO',
  'AW',
  'AY',
  'EH',
  'ER',
  'EY',
  'IH',
  'IY',
  'OW',
  'OY',
  'UH',
  'UW',
])

export function phonesToArpabet(
  chunks: Array<{ phones: Phone[]; pause?: string }>,
  style: 'natural' | 'monotone' | 'sung',
  question: boolean,
  applyContour = true,
): string {
  const tokens: string[] = []
  let vowelIndex = 0
  const vowels: number[] = []

  for (const chunk of chunks) {
    if (style === 'sung' && chunk.phones.length) {
      const inner = chunk.phones
        .map((p) => p.code)
        .join(' ')
      tokens.push(`( ${inner} )`)
    } else {
      for (const phone of chunk.phones) {
        let tok = phone.code
        if (style === 'natural' && phone.stressed && VOWELS.has(phone.code)) {
          tok = `${phone.code}!`
        }
        if (VOWELS.has(phone.code)) {
          vowels.push(tokens.length)
          vowelIndex += 1
        }
        tokens.push(tok)
      }
    }
    if (chunk.pause) tokens.push(chunk.pause)
  }

  if (applyContour && style === 'natural' && vowels.length) {
    const last = vowels[vowels.length - 1]
    if (typeof last === 'number' && tokens[last] && !tokens[last].includes('(')) {
      const base = tokens[last].replace(/[!].*$/, '').replace(/[+-].*$/, '')
      tokens[last] = question ? `${base}(+18)` : `${base}(-12)`
    }
    if (vowels.length > 2) {
      const mid = vowels[Math.floor(vowels.length / 2)]
      if (typeof mid === 'number' && tokens[mid] && !tokens[mid].includes('(')) {
        const already = /[+-]/.test(tokens[mid])
        if (!already) tokens[mid] = `${tokens[mid].replace(/!$/, '')}(+6)`
      }
    }
  }

  void vowelIndex
  return tokens.join(' ')
}
