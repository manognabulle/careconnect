import React from 'react';
import { Icon, icons } from '../icons';
import { api } from '../api';
import { getAlternatives } from './helpers';

export function AlternativesModal({ medicine, medicines, onClose }) {
  const alts = getAlternatives(medicine, medicines);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="card-title">Alternative Medicines</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>Same salt: {medicine.salt}</div>
          </div>
          <button className="btn btn-outline" style={{ padding: "6px 10px" }} onClick={onClose}><Icon d={icons.x} size={16} /></button>
        </div>
        <div className="modal-body">
          {alts.length === 0 - (
            <div className="empty"><div className="empty-text">No alternatives found</div></div>
          ) : alts.map(alt => (
            <div key={alt.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid var(--border)" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{alt.name}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{alt.manufacturer}  <span className={`tag ${alt.requires_prescription ? "rx" : "otc"}`}>{alt.requires_prescription ? "Rx" : "OTC"}</span></div>
              </div>
              <div className="med-price">{alt.price} <span>/strip</span></div>
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

//  PAGES 
