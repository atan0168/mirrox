// backend/src/services/display_name.ts

// Capitalize words, but keep common short words lowercase
export function titleize(str: string): string {
    return str
      .toLowerCase()
      .split(/\s+/)
      .map(w =>
        /^(and|of|with|in|&)$/.test(w)
          ? w
          : (w[0]?.toUpperCase() || "") + w.slice(1)
      )
      .join(" ");
  }
  
  /** Make a human-friendly food name from raw name + optional aliases */
  export function prettyName(rawName: string, aliases?: string[]): string {
    // 1) prefer the shortest alias if available
    if (aliases && aliases.length) {
      const sorted = [...aliases].map(a => a.trim()).filter(Boolean).sort((a,b)=>a.length-b.length);
      if (sorted[0]?.length >= 2) return titleize(sorted[0]);
    }
  
    // 2) clean raw name
    let s = (rawName || "").trim();
  
    // underscores -> space; collapse multiple spaces
    s = s.replace(/_/g, " ").replace(/\s+/g, " ");
  
    // if comma-separated, drop brandy prefixes and keep meaningful tail
    const parts = s.split(",").map(p => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      for (let i = parts.length - 1; i >= 0; i--) {
        if (parts[i].length >= 3) { s = parts.slice(i).join(", "); break; }
      }
    }
  
    s = titleize(s);
    s = s.replace(/\s+,/g, ",").replace(/,\s*,/g, ", ");
    return s;
  }
  