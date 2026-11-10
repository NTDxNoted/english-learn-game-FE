export function fieldDescription(id: string, hasError: boolean, hasHelp = true) {
  return [hasHelp ? `${id}-help` : '', hasError ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;
}
