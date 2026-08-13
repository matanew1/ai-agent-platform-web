import { BrainCircuit } from "lucide-react";

type BrandProps = { compact?: boolean };

/** Product mark used across authentication and workspace navigation. */
export function Brand({ compact = false }: BrandProps) {
  return (
    <div className={`brand ${compact ? "brand-compact" : ""}`}>
      <span className="brand-mark" aria-hidden="true"><BrainCircuit size={compact ? 17 : 23} strokeWidth={2.1} /></span>
      {!compact && <span><strong>AI Platform</strong><small>Build with intelligence</small></span>}
    </div>
  );
}
