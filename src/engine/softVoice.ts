/**
 * SoftVoice / Talk It! phoneme-sequence helpers.
 *
 * Raw SoftVoice lines expose controls (`bF#2`, `r243.2`, `v8`) next to phones.
 * We pack those controls into hidden `{{sv …}}` commands attached to each
 * phoneme word/group so the chip UI only shows the spoken units.
 */

const GROUP_RE =
  /\(\s*[A-Z]{1,3}(?:[12])?(?:\s+[A-Z]{1,3}(?:[12])?)*\s*\)/g

/** SoftVoice control token (rate, scale, note, vibrato, …) — not a phone. */
export function isSoftVoiceControl(token: string): boolean {
  if (/^b(?:[A-G](?:[#b]|bb)?\d+|[+-]?\d+(?:\.\d+)?)$/i.test(token)) return true
  if (/^[rsgvhmtwn]\d+(?:\.\d+)?$/i.test(token)) return true
  if (/^[vwrshg]$/i.test(token)) return true
  return false
}

export function isSoftVoiceGroup(token: string): boolean {
  return /^\(\s*[A-Z]{1,3}(?:[12])?(?:\s+[A-Z]{1,3}(?:[12])?)*\s*\)$/.test(token)
}

export function isSoftVoicePhone(token: string): boolean {
  return /^[A-Z]{1,3}(?:[+-]\d+)?$/.test(token)
}

/** True when the line looks like SoftVoice phonemes (raw or already packed). */
export function looksLikeSoftVoice(text: string): boolean {
  if (/\{\{\s*\.?sv\s+/i.test(text)) return true
  if (GROUP_RE.test(text)) return true
  if (/\b[A-Z]{1,3}[+-]\d+\b/.test(text)) return true
  if (/\bb(?:[A-G](?:[#b]|bb)?\d+)\b/i.test(text) && /\b[A-Z]{1,3}\b/.test(text)) {
    return true
  }
  return false
}

/**
 * Tokenize a SoftVoice body: parenthesized phone groups stay one token,
 * commas stay, SoftVoice controls and ARPABET phones split on whitespace.
 */
export function tokenizeSoftVoice(body: string): string[] {
  const tokens: string[] = []
  const re =
    /\(\s*[A-Z]{1,3}(?:[12])?(?:\s+[A-Z]{1,3}(?:[12])?)*\s*\)|[^\s,]+|,/g
  let match: RegExpExecArray | null
  while ((match = re.exec(body)) !== null) {
    tokens.push(match[0])
  }
  return tokens
}

/** Serialize one SoftVoice control as a hidden word command. */
export function serializeSoftVoiceCmd(token: string, muted = false): string {
  const inner = muted ? `.sv ${token}` : `sv ${token}`
  return `{{${inner}}}`
}

/**
 * Pack a raw SoftVoice line so each control sits in `{{sv …}}` on the next
 * phone / `( PHONE… )` group. Already-packed `{{sv}}` / `{{…}}` regions are
 * left alone.
 */
export function packSoftVoice(source: string): string {
  if (/\{\{\s*\.?sv\s+/i.test(source)) return source

  // Preserve any existing Talk It! {{commands}} by packing only text spans.
  // SoftVoice demos do not mix those in, but be safe.
  const COMMAND_SPLIT = /(\{\{\s*\.?[a-z]+(?:\s+-?\d+(?:\.\d+)?)?\s*\}\})/gi
  const chunks = source.split(COMMAND_SPLIT)
  return chunks
    .map((chunk) => {
      if (/^\{\{/.test(chunk)) return chunk
      return packSoftVoiceBody(chunk)
    })
    .join('')
}

function packSoftVoiceBody(body: string): string {
  if (!body.trim()) return body
  if (!looksLikeSoftVoice(body) && !tokenizeSoftVoice(body).some(isSoftVoiceControl)) {
    return body
  }

  const tokens = tokenizeSoftVoice(body)
  if (!tokens.length) return body

  const pending: string[] = []
  const out: string[] = []
  let sawPhone = false

  const flushPending = () => {
    for (const ctrl of pending) out.push(serializeSoftVoiceCmd(ctrl))
    pending.length = 0
  }

  for (const tok of tokens) {
    if (tok === ',') {
      // Comma stays visible punctuation between phrases.
      if (!sawPhone) flushPending()
      out.push(',')
      continue
    }
    if (isSoftVoiceControl(tok)) {
      pending.push(tok)
      continue
    }
    if (isSoftVoiceGroup(tok) || isSoftVoicePhone(tok)) {
      flushPending()
      out.push(tok)
      sawPhone = true
      continue
    }
    // Unknown token — keep as-is after any pending controls.
    flushPending()
    out.push(tok)
  }

  // Trailing SoftVoice with no following phone: keep as hidden cmds at end.
  flushPending()

  // Join SoftVoice runs tightly (`{{sv a}}{{sv b}}word`), spaces only between phrases.
  const parts: string[] = []
  let softRun = ''
  const flushSoft = () => {
    if (!softRun) return
    parts.push(softRun)
    softRun = ''
  }
  for (const tok of out) {
    if (tok.startsWith('{{')) {
      softRun += tok
      continue
    }
    if (softRun) {
      parts.push(softRun + tok)
      softRun = ''
      continue
    }
    parts.push(tok)
  }
  flushSoft()

  let result = ''
  for (let i = 0; i < parts.length; i++) {
    const tok = parts[i]!
    if (i === 0) {
      result = tok
      continue
    }
    if (tok === ',') {
      result += tok
      continue
    }
    if (parts[i - 1] === ',') {
      result += ` ${tok}`
      continue
    }
    result += ` ${tok}`
  }

  return result.replace(/[ \t]{2,}/g, ' ').trim()
}

/** Extract SoftVoice control tokens from a command region (for rewrite preserve). */
export function softVoiceCmdsFromRegion(region: string): string[] {
  const out: string[] = []
  const re = /\{\{\s*(\.?)sv\s+([^}]+?)\s*\}\}/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(region)) !== null) {
    const muted = match[1] === '.'
    const token = match[2]!.trim()
    if (token) out.push(serializeSoftVoiceCmd(token, muted))
  }
  return out
}

/**
 * Split a text span into SoftVoice-aware chunks: spaces, `( PHONE… )` groups,
 * and other non-space runs. Used by annotateWords so each syllable is one chip.
 */
export function splitSoftVoiceChunks(text: string): string[] {
  if (!text) return []
  const re =
    /(\(\s*[A-Z]{1,3}(?:[12])?(?:\s+[A-Z]{1,3}(?:[12])?)*\s*\)|\s+)/g
  return text.split(re).filter((chunk) => chunk !== undefined && chunk !== '')
}

/** Chip label: drop SoftVoice parentheses for a cleaner word button. */
export function softVoiceDisplayText(token: string): string {
  if (isSoftVoiceGroup(token)) {
    return token.replace(/^\(\s*|\s*\)$/g, '').replace(/\s+/g, ' ').trim()
  }
  return token
}
