

interface HistoryItem {
  id: number;
  label: string;  // "Review 1 (Apr 3)"
}

interface HistoryDropdownProps {
  items: HistoryItem[];
  selectedId?: number;
  onChange: (id: number) => void;
}

/** History dropdown. <select> styled per common.css. Options: "Review N (Mon D)" format (D-25). */
export function HistoryDropdown({ items, selectedId, onChange }: HistoryDropdownProps) {
  if (items.length === 0) { return null; }
  return (
    <select
      value={selectedId ?? items[0]?.id}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{
        fontSize: '11px',
        fontWeight: 600,
        background: 'var(--vscode-dropdown-background)',
        color: 'var(--vscode-dropdown-foreground)',
        border: '1px solid var(--vscode-dropdown-border)',
        borderRadius: '4px',
        padding: '3px 8px',
      }}
    >
      {items.map(item => (
        <option key={item.id} value={item.id}>{item.label}</option>
      ))}
    </select>
  );
}
