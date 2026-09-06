/**
 * GDB Machine Interface (MI2) Output Parser
 * 
 * Parses GDB/MI output records into JavaScript objects.
 * MI output format: https://sourceware.org/gdb/onlinedocs/gdb/GDB_002fMI-Output-Syntax.html
 */

/**
 * Parse a MI result record line.
 */
export function parseMIRecord(line) {
  if (!line) return null;

  let type = null;
  let rest = line;

  if (line.startsWith('^done')) {
    type = 'done';
    rest = line.slice(5);
  } else if (line.startsWith('^error')) {
    type = 'error';
    rest = line.slice(6);
  } else if (line.startsWith('^running')) {
    type = 'running';
    rest = line.slice(8);
  } else if (line.startsWith('*stopped')) {
    type = 'stopped';
    rest = line.slice(8);
  } else if (line.startsWith('*running')) {
    type = 'async-running';
    rest = line.slice(8);
  } else {
    return { type: 'unknown', raw: line };
  }

  if (rest.startsWith(',')) {
    rest = rest.slice(1);
  }

  const data = parseMITuple(rest);
  return { type, ...data };
}

/**
 * Parse locals from -stack-list-locals output.
 * Returns: { x: "5", p: "{x = 10, y = 20}", ptr: "0x61fe14", ... }
 */
export function parseMILocals(output) {
  const result = {};
  const lines = output.split('\n');

  for (const line of lines) {
    if (line.startsWith('^done,locals=')) {
      const localsStr = line.slice('^done,locals='.length);
      const locals = parseMIList(localsStr);

      for (const local of locals) {
        if (local.name && local.value !== undefined) {
          result[local.name] = local.value;
        }
      }
      break;
    }
  }

  return result;
}

/**
 * Parse stack frames from -stack-list-frames output.
 * Returns: [ { level: 0, func: "swap", line: 11, file: "..." }, ... ]
 */
export function parseCallStack(output) {
  const frames = [];
  const lines = output.split('\n');

  for (const line of lines) {
    if (line.startsWith('^done,stack=')) {
      const stackStr = line.slice('^done,stack='.length);
      const list = parseMIList(stackStr);

      for (const item of list) {
        const f = item.frame || item;
        if (f && f.func) {
          frames.push({
            level: parseInt(f.level || '0', 10),
            func: f.func,
            line: parseInt(f.line || '0', 10),
            addr: f.addr || '',
            file: f.file || ''
          });
        }
      }
      break;
    }
  }

  return frames;
}

/**
 * Parse evaluated expression from -data-evaluate-expression output.
 * Input: ^done,value="10"
 * Returns: "10"
 */
export function parseExpressionValue(output) {
  const lines = output.split('\n');
  for (const line of lines) {
    if (line.startsWith('^done,value="')) {
      const match = line.match(/^\^done,value="(.*)"$/);
      if (match) {
        return match[1].replace(/\\"/g, '"');
      }
    } else if (line.startsWith('^done,value=')) {
      return line.slice('^done,value='.length).trim();
    }
  }
  return null;
}

/**
 * Parse struct value string into an object of fields.
 * Example: "{x = 100, y = 200, name = \"Alice\"}"
 * Returns: { x: 100, y: 200, name: "Alice" }
 */
export function parseStructFields(str) {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;

  // Check if it's an array rather than a struct (array: "{1, 2, 3}", struct: "{field = val, ...}")
  if (!trimmed.includes('=')) return null;

  const inner = trimmed.slice(1, -1).trim();
  const fields = {};

  // Split by top-level commas (handling nested braces)
  const parts = [];
  let current = '';
  let depth = 0;
  let inQuotes = false;

  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === '"' && inner[i - 1] !== '\\') inQuotes = !inQuotes;
    if (!inQuotes) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      else if (ch === ',' && depth === 0) {
        parts.push(current.trim());
        current = '';
        continue;
      }
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());

  for (const part of parts) {
    const eqIdx = part.indexOf('=');
    if (eqIdx !== -1) {
      const key = part.slice(0, eqIdx).trim();
      const valStr = part.slice(eqIdx + 1).trim();

      // Parse value
      if (/^-?\d+(\.\d+)?$/.test(valStr)) {
        fields[key] = parseFloat(valStr);
      } else if (valStr.startsWith('"') && valStr.endsWith('"')) {
        fields[key] = valStr.slice(1, -1);
      } else if (valStr.startsWith('{')) {
        fields[key] = parseStructFields(valStr) || valStr;
      } else {
        fields[key] = valStr;
      }
    }
  }

  return Object.keys(fields).length > 0 ? fields : null;
}

/**
 * Parse 1D or 2D array string.
 * Examples:
 *   "{1, 2, 3}" -> [1, 2, 3]
 *   "{{1, 2}, {3, 4}}" -> [[1, 2], [3, 4]]
 */
export function parseArrayValue(str) {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;

  // If it's a struct (contains '='), don't parse as array
  if (trimmed.includes('=')) return null;

  const inner = trimmed.slice(1, -1).trim();

  // Check if 2D array: inner starts with '{'
  if (inner.startsWith('{')) {
    const rows = [];
    let cur = '';
    let depth = 0;
    for (let i = 0; i < inner.length; i++) {
      const ch = inner[i];
      if (ch === '{') depth++;
      cur += ch;
      if (ch === '}') {
        depth--;
        if (depth === 0) {
          const parsedRow = parseArrayValue(cur.trim());
          if (parsedRow) rows.push(parsedRow);
          cur = '';
        }
      }
    }
    return rows.length > 0 ? rows : null;
  }

  // 1D array
  const parts = inner.split(',').map(s => s.trim());
  const nums = parts.map(p => {
    const n = parseFloat(p);
    return isNaN(n) ? p : n;
  });

  return nums;
}

/**
 * Parse frame info from -stack-info-frame or *stopped output.
 */
export function parseFrameInfo(output) {
  const lines = output.split('\n');
  for (const line of lines) {
    const frameMatch = line.match(/frame=\{(.+)\}/);
    if (frameMatch) {
      return parseMITupleStr(frameMatch[1]);
    }
    if (line.startsWith('*stopped') || line.startsWith('^done')) {
      const result = parseMITupleFromLine(line);
      if (result.frame) return result.frame;
      if (result.line) return result;
    }
  }
  return null;
}

/**
 * Parse a MI value (string, tuple, or list)
 */
export function parseMIValue(str, pos = 0) {
  if (pos >= str.length) return [null, pos];

  const ch = str[pos];

  if (ch === '"') {
    return parseMIString(str, pos);
  } else if (ch === '{') {
    return parseMITupleAt(str, pos);
  } else if (ch === '[') {
    return parseMIListAt(str, pos);
  }

  // Handle unquoted bare token (numbers, hex addresses, names)
  let val = '';
  while (pos < str.length && str[pos] !== ',' && str[pos] !== '}' && str[pos] !== ']' && str[pos] !== ' ') {
    val += str[pos];
    pos++;
  }
  return [val, pos];
}

function parseMIString(str, pos) {
  if (str[pos] !== '"') return [null, pos];
  pos++;

  let result = '';
  while (pos < str.length) {
    const ch = str[pos];
    if (ch === '\\' && pos + 1 < str.length) {
      const next = str[pos + 1];
      if (next === '"') { result += '"'; pos += 2; }
      else if (next === '\\') { result += '\\'; pos += 2; }
      else if (next === 'n') { result += '\n'; pos += 2; }
      else if (next === 't') { result += '\t'; pos += 2; }
      else { result += next; pos += 2; }
    } else if (ch === '"') {
      pos++;
      return [result, pos];
    } else {
      result += ch;
      pos++;
    }
  }

  return [result, pos];
}

function parseMITupleAt(str, pos) {
  if (str[pos] !== '{') return [null, pos];
  pos++;

  const result = {};

  while (pos < str.length && str[pos] !== '}') {
    while (pos < str.length && (str[pos] === ',' || str[pos] === ' ')) pos++;
    if (pos >= str.length || str[pos] === '}') break;

    let key = '';
    while (pos < str.length && str[pos] !== '=' && str[pos] !== '}' && str[pos] !== ',') {
      key += str[pos];
      pos++;
    }
    key = key.trim();

    if (str[pos] === '=') {
      pos++;
      const [value, newPos] = parseMIValue(str, pos);
      result[key] = value;
      pos = newPos > pos ? newPos : pos + 1;
    } else {
      pos++;
    }
  }

  if (pos < str.length && str[pos] === '}') pos++;

  return [result, pos];
}

function parseMIListAt(str, pos) {
  if (str[pos] !== '[') return [null, pos];
  pos++;

  const result = [];

  while (pos < str.length && str[pos] !== ']') {
    while (pos < str.length && (str[pos] === ',' || str[pos] === ' ')) pos++;
    if (pos >= str.length || str[pos] === ']') break;

    // Check if named result: name=value (e.g. frame={...})
    if (str[pos] !== '"' && str[pos] !== '{' && str[pos] !== '[') {
      let key = '';
      let scanPos = pos;
      while (scanPos < str.length && str[scanPos] !== '=' && str[scanPos] !== ',' && str[scanPos] !== ']') {
        key += str[scanPos];
        scanPos++;
      }
      if (scanPos < str.length && str[scanPos] === '=') {
        pos = scanPos + 1;
        const [value, newPos] = parseMIValue(str, pos);
        result.push({ [key.trim()]: value });
        pos = newPos > pos ? newPos : pos + 1;
        continue;
      }
    }

    const [value, newPos] = parseMIValue(str, pos);
    if (value !== null) {
      result.push(value);
    }
    pos = newPos > pos ? newPos : pos + 1;
  }

  if (pos < str.length && str[pos] === ']') pos++;

  return [result, pos];
}

function parseMITuple(str) {
  if (!str || str.trim() === '') return {};
  const [result] = parseMITupleAt('{' + str + '}', 0);
  return result || {};
}

function parseMITupleStr(str) {
  if (!str) return {};
  const wrapped = str.startsWith('{') ? str : '{' + str + '}';
  const [result] = parseMITupleAt(wrapped, 0);
  return result || {};
}

function parseMIList(str) {
  if (!str) return [];
  const wrapped = str.startsWith('[') ? str : '[' + str + ']';
  const [result] = parseMIListAt(wrapped, 0);
  return result || [];
}

function parseMITupleFromLine(line) {
  let start = 0;
  if (line.startsWith('^done')) start = 5;
  else if (line.startsWith('^error')) start = 6;
  else if (line.startsWith('*stopped')) start = 8;
  else if (line.startsWith('*running')) start = 8;

  if (start < line.length && line[start] === ',') start++;

  const rest = line.slice(start);
  return parseMITuple(rest);
}
