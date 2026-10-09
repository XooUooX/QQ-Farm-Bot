/** Extract actual GameFriend GIDs from a captured QQ Farm protobuf response. */

const MAX_UINT32 = 0xffff_ffff
const MIN_LIKELY_GID = 100_000_000
const MAX_DEPTH = 12
// A large friend-list response can contain hundreds or thousands of records.
// Keep a generous cap so valid records are not truncated midway through the
// response while still preventing an accidental pathological input from
// locking the browser tab.
const MAX_NODES = 200_000

interface ProtoField {
  no: number
  wire: number
  value?: number
  bytes?: Uint8Array
}

function normalizeHex(input: string): Uint8Array {
  const source = String(input || '').replace(/0x/gi, '').replace(/[\s,:;|_-]+/g, '')
  if (!source)
    return new Uint8Array()
  if (!/^[0-9a-f]+$/i.test(source))
    throw new Error('Hex 数据包含非十六进制字符')
  if (source.length % 2 !== 0)
    throw new Error('Hex 数据长度必须为偶数')
  const bytes = new Uint8Array(source.length / 2)
  for (let i = 0; i < bytes.length; i++)
    bytes[i] = Number.parseInt(source.slice(i * 2, i * 2 + 2), 16)
  return bytes
}

function readVarint(bytes: Uint8Array, offset: number, end: number): { value: number, next: number } | null {
  let value = 0
  let shift = 0
  let cursor = offset
  while (cursor < end && shift <= 35) {
    const byte = bytes[cursor++]!
    value += (byte & 0x7f) * 2 ** shift
    if ((byte & 0x80) === 0)
      return { value, next: cursor }
    shift += 7
  }
  return null
}

function isLikelyGid(value: number) {
  return Number.isSafeInteger(value) && value >= MIN_LIKELY_GID && value <= MAX_UINT32
}

function parseFields(bytes: Uint8Array, start: number, end: number, depth: number, state: { nodes: number }): ProtoField[] | null {
  if (depth > MAX_DEPTH || start >= end || state.nodes >= MAX_NODES)
    return null
  const fields: ProtoField[] = []
  let offset = start
  while (offset < end && state.nodes < MAX_NODES) {
    state.nodes++
    const tag = readVarint(bytes, offset, end)
    if (!tag)
      return null
    offset = tag.next
    const fieldNumber = Math.floor(tag.value / 8)
    const wireType = tag.value % 8
    if (fieldNumber <= 0 || fieldNumber > 536_870_911)
      return null
    if (wireType === 0) {
      const value = readVarint(bytes, offset, end)
      if (!value)
        return null
      fields.push({ no: fieldNumber, wire: wireType, value: value.value })
      offset = value.next
      continue
    }
    if (wireType === 1) {
      if (offset + 8 > end)
        return null
      fields.push({ no: fieldNumber, wire: wireType })
      offset += 8
      continue
    }
    if (wireType === 2) {
      const length = readVarint(bytes, offset, end)
      if (!length || length.value > end - length.next)
        return null
      const valueStart = length.next
      const valueEnd = valueStart + length.value
      fields.push({ no: fieldNumber, wire: wireType, bytes: bytes.slice(valueStart, valueEnd) })
      offset = valueEnd
      continue
    }
    if (wireType === 5) {
      if (offset + 4 > end)
        return null
      fields.push({
        no: fieldNumber,
        wire: wireType,
        value: new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, true),
      })
      offset += 4
      continue
    }
    return null
  }
  return fields
}

function firstField(fields: ProtoField[], no: number) {
  return fields.find(field => field.no === no)
}

function isPrintableText(bytes: Uint8Array | undefined) {
  if (!bytes || bytes.length === 0)
    return false
  const text = new TextDecoder().decode(bytes)
  if (!text)
    return false
  let printable = 0
  for (const char of text) {
    const code = char.codePointAt(0) || 0
    if (code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 0xfffd))
      printable++
  }
  return printable / text.length >= 0.85
}

function isFriendRecord(fields: ProtoField[]) {
  const gid = firstField(fields, 1)
  if (!gid || gid.wire !== 0 || !isLikelyGid(gid.value ?? 0))
    return false
  const identity = [2, 3, 4, 5].some((no) => {
    const field = firstField(fields, no)
    return field?.wire === 2 && isPrintableText(field.bytes)
  })
  // A real GameFriend record carries level/gold as scalar fields 6/7. Do not
  // use only nested fields 8/9 here: many unrelated protobuf messages also
  // contain nested records and would otherwise look like a friend.
  const profile = [6, 7].some(no => firstField(fields, no)?.wire === 0)
  return identity && profile
}

function walkForFriendRecords(bytes: Uint8Array, start: number, end: number, depth: number, gids: Set<number>, state: { nodes: number }) {
  if (depth > MAX_DEPTH || start >= end || state.nodes >= MAX_NODES)
    return
  const fields = parseFields(bytes, start, end, depth, state)
  if (!fields)
    return
  if (isFriendRecord(fields)) {
    const gid = firstField(fields, 1)?.value
    if (gid !== undefined)
      gids.add(gid)
    return
  }
  for (const field of fields) {
    if (field.wire === 2 && field.bytes && field.bytes.length > 0)
      walkForFriendRecords(field.bytes, 0, field.bytes.length, depth + 1, gids, state)
  }
}

export function extractFriendGidsFromHex(input: string): number[] {
  const bytes = normalizeHex(input)
  if (bytes.length === 0)
    return []
  const gids = new Set<number>()
  walkForFriendRecords(bytes, 0, bytes.length, 0, gids, { nodes: 0 })
  return [...gids]
}

