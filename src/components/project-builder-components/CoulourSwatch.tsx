"use client";

import Image from "next/image";

type ColourSwatchProps = {
  hex?: string | null;
  imageUrl?: string | null;
};

function toCssHex(raw?: string | null): string {
  if (!raw) return "#cccccc";

  let s = raw.trim();

  // Strip common prefixes: "0x", "x", "#"
  s = s.replace(/^0x/i, "");
  s = s.replace(/^x/i, "");
  s = s.replace(/^#/, "");

  // If 8-char hex (AARRGGBB) → drop alpha
  if (s.length === 8) {
    s = s.slice(2);
  }

  // Expand short hex (ABC → AABBCC)
  if (s.length === 3) {
    s = s
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }

  if (s.length !== 6) {
    return "#cccccc";
  }

  return `#${s}`;
}

export function ColourSwatch({ hex, imageUrl }: ColourSwatchProps) {
  // ✅ Only treat as “has hex” if the *raw* value is a non-empty string
  const hasRawHex = typeof hex === "string" && hex.trim().length > 0;
  const cssHex = hasRawHex ? toCssHex(hex) : "#cccccc";

  const hasImage = !!imageUrl;
  const hasHex = hasRawHex && cssHex !== "#cccccc";

  // 1) Image swatch (non-uniform texture)
  if (hasImage) {
    return (
      <div className="relative w-full h-full">
        <Image
          src={imageUrl!}
          alt="Powdercoat colour swatch"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 30vw, 23vw"
        />
      </div>
    );
  }

  // 2) Flat colour swatch from hex
  if (hasHex) {
    return (
      <div
        className="w-full h-full"
        style={{ backgroundColor: cssHex }}
      />
    );
  }

  // 3) No image and no hex → explicit fallback
  return (
    <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
      Refer to supplier
    </div>
  );
}
