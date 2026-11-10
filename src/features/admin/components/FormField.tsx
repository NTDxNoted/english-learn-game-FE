import { AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';

export function FormField({ id, label, help, error, children }: {
  id: string; label: string; help?: string; error?: string; children: ReactNode;
}) {
  return <div className="adm-field">
    <label htmlFor={id}>{label}</label>
    {children}
    {help && <small id={`${id}-help`} className="adm-field-help">{help}</small>}
    {error && <span id={`${id}-error`} className="adm-field-error" role="alert"><AlertCircle size={16} aria-hidden="true" />{error}</span>}
  </div>;
}

