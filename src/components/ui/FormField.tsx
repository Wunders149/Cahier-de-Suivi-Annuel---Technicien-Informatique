import React from 'react';
import { fieldLabelClass } from './formStyles';

interface FormFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  htmlFor?: string;
  rightSlot?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  hint,
  htmlFor,
  rightSlot,
  className = '',
  children,
}) => {
  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <label htmlFor={htmlFor} className={`${fieldLabelClass} mb-0`}>
          <span>{label}</span>
          {required && (
            <span className="text-rose-600 ml-0.5 font-bold" aria-hidden="true">
              *
            </span>
          )}
        </label>
        {rightSlot}
      </div>
      {children}
      {hint && <p className="text-[11px] text-slate-500 mt-1 leading-snug">{hint}</p>}
    </div>
  );
};

interface FormSectionProps {
  title: string;
  description?: string;
  rightSlot?: React.ReactNode;
  separated?: boolean;
  children: React.ReactNode;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  rightSlot,
  separated = false,
  children,
}) => {
  return (
    <section className={separated ? 'pt-5 border-t border-slate-200 space-y-3.5' : 'space-y-3.5'}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-[13px] font-bold text-slate-900 tracking-tight">{title}</h4>
          {description && (
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{description}</p>
          )}
        </div>
        {rightSlot}
      </div>
      {children}
    </section>
  );
};
