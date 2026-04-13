// /lib/editor-balcony-naming.ts
export function getNextEditorBalconyNo(prev: string): string {
  const trimmed = prev.trim();

  if (/^\d+$/.test(trimmed)) {
    const n = Number.parseInt(trimmed, 10);
    if (Number.isFinite(n)) return String(n + 1);
  }

  const levelMatch = /^Level\s+(\d+)$/i.exec(trimmed);
  if (levelMatch) {
    const current = Number.parseInt(levelMatch[1], 10);
    if (Number.isFinite(current)) {
      const next = current > 1 ? current - 1 : current;
      return `Level ${next}`;
    }
  }

  const unitMatch = /^(Unit)\s+(\d+)$/i.exec(trimmed);
  if (unitMatch) {
    const prefix = unitMatch[1];
    const current = Number.parseInt(unitMatch[2], 10);
    if (Number.isFinite(current)) {
      return `${prefix} ${current + 1}`;
    }
  }

  const numLetterMatch = /^(.*?)(\d+)([A-Za-z])$/.exec(trimmed);
  if (numLetterMatch) {
    const prefix = numLetterMatch[1];
    const numStr = numLetterMatch[2];
    const letter = numLetterMatch[3];

    const num = Number.parseInt(numStr, 10);
    if (!Number.isFinite(num)) return trimmed;

    const upper = letter.toUpperCase();
    const code = upper.charCodeAt(0);

    if (code >= 65 && code < 90) {
      const nextLetter = String.fromCharCode(code + 1);
      const finalLetter = letter === upper ? nextLetter : nextLetter.toLowerCase();
      return `${prefix}${num}${finalLetter}`;
    }

    if (code === 90) {
      const nextNum = num + 1;
      const nextLetter = letter === upper ? "A" : "a";
      return `${prefix}${nextNum}${nextLetter}`;
    }
  }

  return trimmed;
}

export function getNextEditorDrop(drop: string): string {
  const clean = (drop || "A").trim().toUpperCase();
  const code = clean.charCodeAt(0);

  if (code >= 65 && code < 90) {
    return String.fromCharCode(code + 1);
  }

  return "A";
}