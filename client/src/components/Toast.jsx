import React from 'react';
import { Icon, icons } from '../icons';
import { api } from '../api';

export function Toast({ toasts, removeToast }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`} onClick={() => removeToast(t.id)}>
          <Icon d={t.type === "em" ? icons.alert : t.type === "ok" ? icons.check : icons.bell} size={16} />
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
