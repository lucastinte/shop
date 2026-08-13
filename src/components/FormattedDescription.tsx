import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  Sparkles, 
  Sliders, 
  FileText,
  ShieldCheck,
  PackageCheck
} from 'lucide-react';

interface FormattedDescriptionProps {
  description?: string;
  maxInitialLines?: number;
  className?: string;
}

interface ParsedSection {
  type: 'kv' | 'bullet' | 'heading' | 'paragraph';
  content: string;
  key?: string;
  value?: string;
}

export const FormattedDescription: React.FC<FormattedDescriptionProps> = ({
  description,
  maxInitialLines = 6,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const parsedData = useMemo(() => {
    if (!description || !description.trim()) return { sections: [], hasSpecs: false, hasBullets: false };

    const lines = description.split('\n').map(l => l.trim()).filter(Boolean);
    const sections: ParsedSection[] = [];
    let hasSpecs = false;
    let hasBullets = false;

    // Regex for key-value pair like "Batería: 95%" or "Memoria RAM : 16 GB"
    const kvRegex = /^([a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s()/-]{2,30}):\s*(.+)$/;
    // Regex for bullet points like "- item", "* item", "• item", "✓ item"
    const bulletRegex = /^[-*•✓✔+→▪]\s*(.+)$/;
    // Regex for section headers like "--- Especificaciones ---" or "CARACTERÍSTICAS:"
    const headingRegex = /^(?:[-#=~*]{2,}\s*)?([A-ZÁÉÍÓÚÑ\s0-9]{3,35})(?:\s*[-#=~*]{2,})?:?$/;

    for (const line of lines) {
      const bulletMatch = line.match(bulletRegex);
      if (bulletMatch) {
        sections.push({
          type: 'bullet',
          content: bulletMatch[1],
        });
        hasBullets = true;
        continue;
      }

      const kvMatch = line.match(kvRegex);
      if (kvMatch && !line.startsWith('http')) {
        sections.push({
          type: 'kv',
          key: kvMatch[1].trim(),
          value: kvMatch[2].trim(),
          content: line,
        });
        hasSpecs = true;
        continue;
      }

      const headingMatch = line.match(headingRegex);
      if (headingMatch && line.length <= 40 && line === line.toUpperCase()) {
        sections.push({
          type: 'heading',
          content: headingMatch[1].trim(),
        });
        continue;
      }

      sections.push({
        type: 'paragraph',
        content: line,
      });
    }

    return { sections, hasSpecs, hasBullets };
  }, [description]);

  const handleCopy = () => {
    if (!description) return;
    navigator.clipboard.writeText(description).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!description || !description.trim()) {
    return (
      <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-950/40 border border-gray-100 dark:border-slate-800/80 text-gray-400 dark:text-slate-500 text-xs italic">
        Sin descripción adicional para este producto.
      </div>
    );
  }

  const isLong = parsedData.sections.length > maxInitialLines;
  const visibleSections = isLong && !isExpanded 
    ? parsedData.sections.slice(0, maxInitialLines) 
    : parsedData.sections;

  // Group consecutive key-values for grid display if present
  const kvItems = parsedData.sections.filter(s => s.type === 'kv');
  const showSpecsGrid = kvItems.length >= 2;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with Title & Action */}
      <div className="flex items-center justify-between pb-1 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
            Descripción y Especificaciones
          </h3>
        </div>
        
        <button
          onClick={handleCopy}
          type="button"
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
          title="Copiar texto de descripción"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copiado</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar</span>
            </>
          )}
        </button>
      </div>

      {/* Structured Specs Grid if multiple key-values are present */}
      {showSpecsGrid && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/60 dark:border-indigo-900/30">
          <div className="flex items-center gap-1.5 mb-3 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
            <Sliders className="w-3.5 h-3.5" />
            <span>Ficha Rápida</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {kvItems.map((kv, idx) => (
              <div 
                key={idx} 
                className="flex items-start justify-between gap-2 p-2 rounded-xl bg-white dark:bg-slate-900/80 border border-indigo-50 dark:border-slate-800 shadow-2xs text-xs"
              >
                <span className="text-gray-500 dark:text-slate-400 font-medium shrink-0">
                  {kv.key}
                </span>
                <span className="text-gray-900 dark:text-white font-bold text-right break-words">
                  {kv.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Rich Content Section */}
      <div className="relative">
        <div className="space-y-2.5 text-sm leading-relaxed text-gray-700 dark:text-slate-300">
          {visibleSections.map((section, idx) => {
            if (section.type === 'heading') {
              return (
                <div key={idx} className="pt-2 pb-1">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg">
                    <Sparkles className="w-3 h-3" />
                    {section.content}
                  </span>
                </div>
              );
            }

            if (section.type === 'bullet') {
              return (
                <div key={idx} className="flex items-start gap-2.5 pl-1">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-gray-700 dark:text-slate-200">
                    {section.content}
                  </span>
                </div>
              );
            }

            if (section.type === 'kv' && !showSpecsGrid) {
              return (
                <div key={idx} className="flex items-baseline gap-2 pl-1">
                  <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                    {section.key}:
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {section.value}
                  </span>
                </div>
              );
            }

            // Paragraph
            return (
              <p key={idx} className="text-gray-600 dark:text-slate-350 whitespace-pre-wrap">
                {section.content}
              </p>
            );
          })}
        </div>

        {/* Fade overlay when collapsed */}
        {isLong && !isExpanded && (
          <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-white dark:from-slate-900 to-transparent pointer-events-none" />
        )}
      </div>

      {/* Expand / Collapse Button */}
      {isLong && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          type="button"
          className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/70 hover:bg-gray-100 dark:bg-slate-950/40 dark:hover:bg-slate-800 text-xs font-bold text-indigo-600 dark:text-indigo-400 transition-all cursor-pointer"
        >
          {isExpanded ? (
            <>
              <span>Ver menos</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              <span>Leer descripción completa</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      )}

      {/* Trust guarantees badge list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50/70 dark:bg-slate-950/30 border border-gray-100 dark:border-slate-800/50">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-[11px] font-medium text-gray-600 dark:text-slate-400">
            Stock real y condición verificada
          </span>
        </div>
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50/70 dark:bg-slate-950/30 border border-gray-100 dark:border-slate-800/50">
          <PackageCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="text-[11px] font-medium text-gray-600 dark:text-slate-400">
            Retiro en el día o envío coordinado
          </span>
        </div>
      </div>
    </div>
  );
};

export default FormattedDescription;
