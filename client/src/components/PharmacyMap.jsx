import React from 'react';
import { Icon, icons } from '../icons';
import { api } from '../api';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';

export function PharmacyMap({ pharmacies, stock, medicines, userLocation }) {
  const defaultCenter = [12.9716, 77.5946];
  const center = userLocation ? [userLocation.lat, userLocation.lng] : defaultCenter;

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div className="card-title">Live Pharmacy Map</div>
          <span className="open-badge">{pharmacies.length} Active</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="map-container" style={{ height: '500px', zIndex: 1 }}>
            <MapContainer center={center} zoom={13} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
              <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {userLocation && (
                <Marker position={[userLocation.lat, userLocation.lng]}>
                  <Popup><div style={{ fontWeight: 600 }}>Your Location</div></Popup>
                </Marker>
              )}
              {pharmacies.filter((pharmacy) => pharmacy.lat !== null && pharmacy.lng !== null).map((pharmacy) => (
                <Marker key={pharmacy.id} position={[pharmacy.lat, pharmacy.lng]}>
                  <Popup>
                    <div style={{ minWidth: 180 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{pharmacy.name}</div>
                      <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 8 }}>{pharmacy.area}</div>
                      <div style={{ fontSize: 12 }}>Rating: <b>{pharmacy.rating}</b> - {pharmacy.hours}</div>
                      {pharmacy.emergency && <div className="em-badge" style={{ width: 'fit-content', marginTop: 6 }}>24/7 Emergency</div>}
                      <div style={{ fontSize: 11, marginTop: 8 }}>Medicines in stock: {Object.keys(stock[pharmacy.id] || {}).length}</div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">All Registered Pharmacies</div></div>
        <div className="card-body" style={{ padding: 0 }}>
          <table className="pharm-table">
            <thead><tr><th>Pharmacy</th><th>Area</th><th>Phone</th><th>Hours</th><th>Rating</th><th>Emergency</th></tr></thead>
            <tbody>
              {pharmacies.map((pharmacy) => (
                <tr key={pharmacy.id}>
                  <td style={{ fontWeight: 600 }}>{pharmacy.name}</td>
                  <td>{pharmacy.area}</td>
                  <td style={{ color: 'var(--teal)', fontSize: 13 }}>{pharmacy.phone}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>{pharmacy.hours}</td>
                  <td><span className="rating-badge">{pharmacy.rating}</span></td>
                  <td>{pharmacy.emergency ? <span className="em-badge">24/7</span> : <span style={{ color: 'var(--muted)', fontSize: 12 }}>-</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
