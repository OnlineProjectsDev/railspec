// /lib/NumericInput.ts
"use client"

import React, { useEffect, useRef, useState } from "react"

type UpdateMode = "change" | "commit"

function isAllowedCharsOnly(s: string) {
  // digits, sign, decimal separators, and whitespace (we trim later)
  return /^[0-9+\-.,\s]*$/.test(s)
}

function normalizeRawToDecimalString(raw: string) {
  // Returns { ok, normalized } where normalized is a string that Number() can parse (with '.' decimal).
  // If not ok, caller should revert.
  let s = (raw ?? "").trim()

  if (s === "") return { ok: false as const, normalized: "" }

  // Reject illegal characters outright (e.g. "-a")
  if (!isAllowedCharsOnly(s)) return { ok: false as const, normalized: "" }

  // Treat comma as decimal separator.
  // (We do NOT support thousands separators; "1,234" becomes "1.234" by design.)
  s = s.replace(/,/g, ".")

  // Allow a single leading sign only.
  // If there are additional signs elsewhere, reject.
  const signMatches = s.match(/[+-]/g)
  if (signMatches && signMatches.length > 1) return { ok: false as const, normalized: "" }
  if (signMatches && signMatches.length === 1 && !/^[+-]/.test(s)) return { ok: false as const, normalized: "" }

  // Allow at most one decimal point.
  const dotCount = (s.match(/\./g) ?? []).length
  if (dotCount > 1) return { ok: false as const, normalized: "" }

  // Handle pure sign
  if (s === "-" || s === "+") return { ok: true as const, normalized: s === "-" ? "-0" : "0" }

  // Handle "." / "+." / "-."
  if (s === "." || s === "+." || s === "-.") {
    const sign = s.startsWith("-") ? "-" : ""
    return { ok: true as const, normalized: `${sign}0.0` }
  }

  // Handle leading decimal ".1" / "-.1" / "+.1"
  if (/^[+-]?\.\d+$/.test(s)) {
    const sign = s.startsWith("-") ? "-" : ""
    const digits = s.replace(/^[+-]?\./, "")
    return { ok: true as const, normalized: `${sign}0.${digits}` }
  }

  // Handle trailing decimal "1." / "-1."
  if (/^[+-]?\d+\.$/.test(s)) {
    return { ok: true as const, normalized: `${s}0` }
  }

  // Handle standard integer / decimal forms: "12", "-12", "12.3", "-12.3"
  if (/^[+-]?\d+(\.\d+)?$/.test(s)) {
    return { ok: true as const, normalized: s }
  }

  // Anything else is not "fixable"
  return { ok: false as const, normalized: "" }
}

export default function NumericInput({
  value,
  onChange,
  onCommit,
  updateMode,
  min,
  max,
  step, // unused (text input); kept for API symmetry
  disabled,
  className,
  style,
  placeholder,
  inputRef,
  onFocus,
  onKeyDown,
  onBlur,
}: {
  value: number
  onChange?: (value: number) => void
  onCommit?: (value: number) => void
  updateMode?: UpdateMode
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
  placeholder?: string
  inputRef?: React.Ref<HTMLInputElement>
  onFocus?: React.FocusEventHandler<HTMLInputElement>
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>
  onBlur?: React.FocusEventHandler<HTMLInputElement>
}) {
  const mode: UpdateMode = updateMode ?? (onCommit ? "commit" : "change")

  const [draft, setDraft] = useState<string>(Number.isFinite(value) ? String(value) : "0")
  const isEditingRef = useRef(false)

  // Sync draft from external value when not editing.
  useEffect(() => {
    if (isEditingRef.current) return
    setDraft(Number.isFinite(value) ? String(value) : "0")
  }, [value])

  const clampIfNeeded = (n: number) => {
    let out = n
    if (typeof min === "number") out = Math.max(min, out)
    if (typeof max === "number") out = Math.min(max, out)
    return out
  }

  const commit = (raw: string) => {
    const norm = normalizeRawToDecimalString(raw)
    if (!norm.ok) {
      // Revert hard to last valid value
      setDraft(Number.isFinite(value) ? String(value) : "0")
      return
    }

    const n = Number(norm.normalized)
    if (!Number.isFinite(n)) {
      setDraft(Number.isFinite(value) ? String(value) : "0")
      return
    }

    const next = clampIfNeeded(n)

    if (onCommit) onCommit(next)
    else if (onChange) onChange(next)

    // Ensure input shows normalized/clamped representation
    setDraft(String(next))
  }

  return (
    <input
      ref={inputRef}
      className={className}
      style={style}
      type="text"
      inputMode="decimal"
      value={draft}
      placeholder={placeholder}
      disabled={!!disabled}
      suppressHydrationWarning
      onFocus={(e) => {
        isEditingRef.current = true
        onFocus?.(e)
      }}
      onChange={(e) => {
        const raw = e.target.value

        // If user types illegal characters, ignore that keystroke and keep prior draft.
        // (Prevents "-a" ever appearing.)
        if (!isAllowedCharsOnly(raw)) return

        setDraft(raw)

        if (mode !== "change") return
        if (!onChange) return

        // Only dispatch when it's already a fixable numeric form.
        const norm = normalizeRawToDecimalString(raw)
        if (!norm.ok) return

        const n = Number(norm.normalized)
        if (!Number.isFinite(n)) return

        // For change-mode we gate by min/max (don’t auto-clamp mid-typing).
        if (typeof min === "number" && n < min) return
        if (typeof max === "number" && n > max) return

        onChange(n)
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e)

        if (e.key !== "Enter") return
        if (mode !== "commit") return
        commit((e.currentTarget.value ?? "").trim())
        ;(e.currentTarget as HTMLInputElement).blur()
      }}
      onBlur={(e) => {
        isEditingRef.current = false
        if (mode === "commit") {
          commit((e.currentTarget.value ?? "").trim())
        }
        onBlur?.(e)
      }}
    />
  )
}