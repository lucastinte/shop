import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  Sparkles, 
  FileText,
  ShieldCheck,
  PackageCheck,
  Tag
} from 'lucide-react';

interface FormattedDescriptionProps {
  description?: string;
  maxInitialItems?: number;
  className?: string;
}

interface ParsedItem {
  type: 'short_spec' | 'feature' | 'bullet' | 'heading' | 'paragraph';
  title?: string;
  text: string;
}

export const FormattedDescription: React.FC<FormattedDescriptionProps> = ({
  description,
  maxInitialItems = 8,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const { shortSpecs, contentItems } = useMemo(() => {
    if (!description || !description.trim()) {
      return { shortSpecs: [], contentItems: [] };
    }

    const lines = description.split('\n').map(l => l.trim()).filter(Boolean);
    const specs: { key: string; value: string }[] = [];
    const items: ParsedItem[] = [];

    // Regex for key-value pair like "Batería: 95%" or "Compatibilidad: Diseñado para..."
    const kvRegex = /^([a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s()/-]{2,35}):\s*(.+)$/;
    // Regex for bullet points like "- item", "* item", "• item", "✓ item"
    const bulletRegex = /^[-*•✓✔+→▪]\s*(.+)$/;
    // Regex for section headers like "--- Especificaciones ---" or "CARACTERÍSTICAS"
    const headingRegex = /^(?:[-#=~*]{2,}\s*)?([A-ZÁÉÍÓÚÑ\s0-9]{3,35})(?:\s*[-#=~*]{2,})?:?$/;

    for (const line of lines) {
      // 1. Heading check
      const headingMatch = line.match(headingRegex);
      if (headingMatch && line.length <= 35 && line === line.toUpperCase() && !line.includes(':')) {
        items.push({
          type: 'heading',
          text: headingMatch[1].trim(),
        });
        continue;
      }

      // 2. Bullet point check
      const bulletMatch = line.match(bulletRegex);
      if (bulletMatch) {
        const bulletText = bulletMatch[1].trim();
        // Check if bullet itself has Title: Description
        const bulletKv = bulletText.match(kvRegex);
        if (bulletKv) {
          items.push({
            type: 'feature',
            title: bulletKv[1].trim(),
            text: bulletKv[2].trim(),
          });
        } else {
          items.push({
            type: 'bullet',
            text: bulletText,
          });
        }
        continue;
      }

      // 3. Key-Value check
      const kvMatch = line.match(kvRegex);
      if (kvMatch && !line.startsWith('http')) {
        const key = kvMatch[1].trim();
        const value = kvMatch[2].trim();

        // Short technical spec (e.g. "Estado: Nuevo", "Color: Azul", "Garantía: 6 meses")
        if (key.length <= 18 && value.length <= 25) {
          specs.push({ key, value });
        } else {
          // Longer detailed feature description
          items.push({
            type: 'feature',
            title: key,
            text: value,
          });
        }
        continue;
      }

      // 4. Regular paragraph
      items.push({
        type: 'paragraph',
        text: line,
      });
    }

    return { shortSpecs: specs, contentItems: items };
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
      <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-950/40 border border-gray-100 dark:border-slate-800 text-gray-400 dark:text-slate-500 text-xs italic">
        Sin descripción adicional para este producto.
      </div>
    );
  }

  const totalItemsCount = contentItems.length;
  const isLong = totalItemsCount > maxInitialItems;
  const visibleItems = isLong && !isExpanded 
    ? contentItems.slice(0, maxInitialItems) 
    : contentItems;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Encabezado con Título y Copiar */}
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

      {/* Ficha Rápida: Solo para especificaciones técnicas cortas */}
      {shortSpecs.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {shortSpecs.map((spec, idx) => (
            <div 
              key={idx} 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100/80 dark:border-indigo-900/40 text-xs shadow-2xs"
            >
              <Tag className="w-3 h-3 text-indigo-500 shrink-0" />
              <span className="text-gray-500 dark:text-slate-400 font-medium">
                {spec.key}:
              </span>
              <span className="text-gray-900 dark:text-white font-bold">
                {spec.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Lista Principal de Características y Párrafos */}
      <div className="relative">
        <div className="space-y-3 text-sm leading-relaxed">
          {visibleItems.map((item, idx) => {
            // Título de Sección
            if (item.type === 'heading') {
              return (
                <div key={idx} className="pt-3 pb-1">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1 rounded-lg">
                    <Sparkles className="w-3 h-3" />
                    {item.text}
                  </span>
                </div>
              );
            }

            // Característica con Título y Explicación
            if (item.type === 'feature') {
              return (
                <div 
                  key={idx} 
                  className="p-3.5 sm:p-4 rounded-2xl bg-gray-50/80 dark:bg-slate-950/50 border border-gray-150 dark:border-slate-800/80 space-y-1 shadow-2xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400 shrink-0" />
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                      {item.title}
                    </h4>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300 pl-4 leading-relaxed text-left">
                    {item.text}
                  </p>
                </div>
              );
            }

            // Viñeta Simple
            if (item.type === 'bullet') {
              return (
                <div key={idx} className="flex items-start gap-2.5 pl-1 py-0.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-gray-700 dark:text-slate-200 text-xs sm:text-sm text-left leading-relaxed">
                    {item.text}
                  </span>
                </div>
              );
            }

            // Párrafo normal
            return (
              <p key={idx} className="text-gray-600 dark:text-slate-300 text-xs sm:text-sm text-left leading-relaxed whitespace-pre-wrap">
                {item.text}
              </p>
            );
          })}
        </div>

        {/* Degradado suave al estar colapsado */}
        {isLong && !isExpanded && (
          <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-white dark:from-slate-900 to-transparent pointer-events-none" />
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
              <span>Ver menos detalles</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              <span>Ver todos los detalles ({totalItemsCount - maxInitialItems} más)</span>
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
