import React from 'react';
import { Trash2 } from 'lucide-react';
import { Modal } from './Modal';
import { dangerButtonClass, secondaryButtonClass } from './formStyles';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  subtitle?: string;
  itemLabel: string;
  itemMeta?: string;
  description?: string;
  confirmText?: string;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle = 'Cette suppression est définitive.',
  itemLabel,
  itemMeta,
  description = 'Vous êtes sur le point de supprimer définitivement cet élément :',
  confirmText = 'Supprimer définitivement',
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      icon={<Trash2 className="w-4 h-4" />}
      tone="danger"
      size="sm"
      footer={
        <>
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            Annuler
          </button>
          <button type="button" onClick={onConfirm} className={dangerButtonClass}>
            {confirmText}
          </button>
        </>
      }
    >
      <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
        <p>{description}</p>
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <div className="font-semibold text-slate-900 break-words">{itemLabel}</div>
          {itemMeta && (
            <div className="mt-1 text-[11px] text-slate-500 font-mono tabular-nums">
              {itemMeta}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
