import React from 'react';
import { Eye, Edit3, Copy, Trash2 } from 'lucide-react';

interface CrudRowActionsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  viewLabel?: string;
  editLabel?: string;
  duplicateLabel?: string;
  deleteLabel?: string;
  compact?: boolean;
}

export const CrudRowActions: React.FC<CrudRowActionsProps> = ({
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  viewLabel = 'Consulter la fiche',
  editLabel = 'Modifier',
  duplicateLabel = 'Dupliquer',
  deleteLabel = 'Supprimer',
  compact = false,
}) => {
  const btnPadding = compact ? 'p-1' : 'p-1.5';
  const iconSize = compact ? 'w-3.5 h-3.5' : 'w-3.5 h-3.5';

  return (
    <div
      className="inline-flex items-center justify-end gap-0.5 shrink-0"
      onClick={(e) => e.stopPropagation()}
    >
      {onView && (
        <button
          type="button"
          onClick={onView}
          title={viewLabel}
          aria-label={viewLabel}
          className={`${btnPadding} rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
        >
          <Eye className={iconSize} />
        </button>
      )}
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          title={editLabel}
          aria-label={editLabel}
          className={`${btnPadding} rounded-md text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
        >
          <Edit3 className={iconSize} />
        </button>
      )}
      {onDuplicate && (
        <button
          type="button"
          onClick={onDuplicate}
          title={duplicateLabel}
          aria-label={duplicateLabel}
          className={`${btnPadding} rounded-md text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500`}
        >
          <Copy className={iconSize} />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          title={deleteLabel}
          aria-label={deleteLabel}
          className={`${btnPadding} rounded-md text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500`}
        >
          <Trash2 className={iconSize} />
        </button>
      )}
    </div>
  );
};
