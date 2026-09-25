import React from 'react';

export default function DateTimePicker({
  value,
  onChange,
  minimumDate,
  maximumDate,
}: any) {
  const formatDate = (val: any) => {
    if (val instanceof Date && !Number.isNaN(val.getTime())) {
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const d = String(val.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return typeof val === 'string' ? val : '';
  };

  return (
    <input
      type="date"
      value={formatDate(value)}
      min={formatDate(minimumDate) || undefined}
      max={formatDate(maximumDate) || undefined}
      onChange={(e) => {
        const val = e.target.value;
        if (!val) return;
        if (onChange) {
          const [y, mo, d] = val.split('-').map(Number);
          onChange({ type: 'set' }, new Date(y, mo - 1, d));
        }
      }}
      onClick={(e) => {
        try {
          (e.target as any).showPicker?.();
        } catch {}
      }}
      style={{
        width: '100%',
        padding: '12px 14px',
        borderRadius: '12px',
        border: '1px solid #cbd5e1',
        fontSize: '14px',
        fontFamily: 'inherit',
        color: '#1e293b',
        backgroundColor: '#fff',
        cursor: 'pointer',
        boxSizing: 'border-box',
      }}
    />
  );
}
