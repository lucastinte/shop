import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  FileText,
  ShieldCheck,
  PackageCheck
} from 'lucide-react';

interface FormattedDescriptionProps {
  description?: string;
  maxInitialLines?: number;
  className?: string;
}

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
    return (
      <div className="p-4 rounded-2xl bg-gray-50/50 dark:bg-slate-950/30 border border-gray-150 dark:border-slate-800/60 text-gray-400 dark:text-slate-500 text-xs italic">
        Sin descripción adicional para este producto.
      </div>
    );
  }

  const isLong = lines.length > maxInitialLines;
  const visibleLines = isLong && !isExpanded ? lines.slice(0, maxInitialLines) : lines;

  // Render line naturally: detects bullet prefixes and key-value bolding inline
  const renderLine = (line: string, index: number) => {
    // Bullet detection (e.g. - item, • item, * item, ✓ item)
    const bulletMatch = line.match(/^[-*•✓✔+→▪]\s*(.+)$/);
    if (bulletMatch) {
      const content = bulletMatch[1].trim();
      const colonMatch = content.match(/^([a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s()/-]{2,30}):\s*(.+)$/);

      return (
        <div key={index} className="flex items-start gap-2.5 pl-1 py-0.5">
          <div className="w-4 h-4 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <span className="text-gray-700 dark:text-slate-200 text-sm leading-relaxed text-left">
            {colonMatch ? (
              <>
                <strong className="font-bold text-gray-900 dark:text-white">
                  {colonMatch[1]}:
                </strong>{' '}
                {colonMatch[2]}
              </>
            ) : (
              content
            )}
          </span>
        </div>
      );
    }

    // Line with "Título:" bolding
    const colonMatch = line.match(/^([a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s()/-]{2,30}):\s*(.+)$/);
    if (colonMatch && !line.startsWith('http')) {
      return (
        <p key={index} className="text-gray-700 dark:text-slate-300 text-sm leading-relaxed text-left">
          <strong className="font-bold text-gray-900 dark:text-white">
            {colonMatch[1]}:
          </strong>{' '}
          {colonMatch[2]}
        </p>
      );
    }

    // Normal paragraph text
    return (
      <p key={index} className="text-gray-700 dark:text-slate-300 text-sm leading-relaxed text-left">
        {line}
      </p>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Encabezado con Título y Botón Copiar */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
            Descripción y Detalles
          </h3>
        </div>
        
        <button
          onClick={handleCopy}
          type="button"
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors px-2.5 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
          title="Copiar texto de la descripción"
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

      {/* Contenido Natural de la Descripción */}
      <div className="relative">
        <div className="p-4 sm:p-5 rounded-2xl bg-gray-50/70 dark:bg-slate-950/40 border border-gray-150 dark:border-slate-800/80 space-y-2.5 shadow-2xs">
          {visibleLines.map((line, idx) => renderLine(line, idx))}
        </div>

        {/* Degradado suave al estar colapsado */}
        {isLong && !isExpanded && (
          <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-white dark:from-slate-900 to-transparent pointer-events-none rounded-b-2xl" />
        )}
      </div>

      {/* Botón Ver Más / Ver Menos */}
      {isLong && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          type="button"
          className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/70 hover:bg-gray-100 dark:bg-slate-950/40 dark:hover:bg-slate-800 text-xs font-bold text-indigo-600 dark:text-indigo-400 transition-all cursor-pointer shadow-2xs"
        >
          {isExpanded ? (
            <>
              <span>Ver menos</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              <span>Leer descripción completa ({lines.length - maxInitialLines} líneas más)</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      )}

      {/* Badges de Garantía y Confianza */}
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
