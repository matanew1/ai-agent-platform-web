import { Command } from "lucide-react";

type BrandProps = { compact?: boolean };

/** Product mark used across authentication and workspace navigation. */
export function Brand({ compact = false }: BrandProps) {
  return (
    <div className={`brand ${compact ? "brand-compact" : ""}`}>
      <span className="brand-mark" aria-hidden="true"><Command size={compact ? 17 : 23} strokeWidth={2.15} /></span>
      {!compact && <span><strong>AI Platform</strong><small>Build with intelligence</small></span>}
    </div>
  );
}
