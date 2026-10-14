import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Copy, Check, ShieldCheck, PackageCheck } from 'lucide-react';

interface FormattedDescriptionProps {
  description?: string;
  maxInitialLines?: number;
  className?: string;
}

const KEY_VALUE_RE = /^([a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s()/-]{2,30}):\s*(.+)$/;

export const FormattedDescription: React.FC<FormattedDescriptionProps> = ({
  description,
  maxInitialLines = 10,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const lines = useMemo(() => {
    if (!description || !description.trim()) return [];
    return description.split('\n').map(l => l.trim()).filter(Boolean);
  }, [description]);

  const handleCopy = () => {
    if (!description) return;
    navigator.clipboard.writeText(description).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!description || !description.trim()) {
    return <p className="text-sm text-muted italic">Sin descripción adicional para este producto.</p>;
  }

  const isLong = lines.length > maxInitialLines;
  const visibleLines = isLong && !isExpanded ? lines.slice(0, maxInitialLines) : lines;

  // Detecta viñetas y pares "Clave: valor" para darles formato
  const renderLine = (line: string, index: number) => {
    const bulletMatch = line.match(/^[-*•✓✔+→▪]\s*(.+)$/);
    if (bulletMatch) {
      const content = bulletMatch[1].trim();
      const kv = content.match(KEY_VALUE_RE);
      return (
        <li key={index} className="flex items-start gap-3">
          <span className="mt-[0.55em] w-1.5 h-1.5 shrink-0 bg-signal" aria-hidden="true" />
          <span className="text-ink-2 leading-relaxed">
            {kv ? (
              <>
                <strong className="font-semibold text-ink">{kv[1]}:</strong> {kv[2]}
              </>
            ) : (
              content
            )}
          </span>
        </li>
      );
    }

    const kv = line.match(KEY_VALUE_RE);
    if (kv && !line.startsWith('http')) {
      return (
        <li key={index} className="text-ink-2 leading-relaxed">
          <strong className="font-semibold text-ink">{kv[1]}:</strong> {kv[2]}
        </li>
      );
    }

    return (
      <li key={index} className="text-ink-2 leading-relaxed">
        {line}
      </li>
    );
  };

  return (
    <div className={`flex flex-col gap-5 ${className}`}>
      <div className="flex items-center justify-between gap-4 pb-3 border-b border-line">
        <h2 className="font-display font-black uppercase text-3xl leading-none">Descripción</h2>
        <button
          onClick={handleCopy}
          type="button"
          className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-[2px] border border-line hover:border-ink text-sm font-medium text-ink transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4 text-signal-ink" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>

      <div className="relative">
        <ul className="m-0 p-0 list-none flex flex-col gap-2.5 max-w-[75ch]">
          {visibleLines.map((line, idx) => renderLine(line, idx))}
        </ul>
        {isLong && !isExpanded && (
          <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-surface to-transparent pointer-events-none" />
        )}
      </div>

      {isLong && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          type="button"
          aria-expanded={isExpanded}
          className="self-start inline-flex items-center gap-2 min-h-11 px-4 rounded-[2px] border-2 border-ink text-ink font-semibold hover:bg-ink hover:text-bg transition-colors cursor-pointer"
        >
          {isExpanded ? (
            <>
              Ver menos
              <ChevronUp className="w-4 h-4" aria-hidden="true" />
            </>
          ) : (
            <>
              Leer completa ({lines.length - maxInitialLines} líneas más)
              <ChevronDown className="w-4 h-4" aria-hidden="true" />
            </>
          )}
        </button>
      )}

      <div className="flex flex-wrap gap-x-8 gap-y-2 pt-4 border-t border-line">
        <span className="inline-flex items-center gap-2 label-mono text-muted">
          <ShieldCheck className="w-4 h-4 text-ink" aria-hidden="true" />
          Stock real y condición verificada
        </span>
        <span className="inline-flex items-center gap-2 label-mono text-muted">
          <PackageCheck className="w-4 h-4 text-ink" aria-hidden="true" />
          Retiro en sede o envío coordinado
        </span>
      </div>
    </div>
  );
};

export default FormattedDescription;
