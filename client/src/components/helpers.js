export function getAvailability(medicineId, stock, pharmacies) {
  return pharmacies.filter((p) => (stock[p.id]?.[medicineId] ?? 0) > 0);
}

export function getAlternatives(medicine, medicines) {
  return medicines.filter((m) => m.salt === medicine.salt && m.id !== medicine.id);
}

export function getStockLevel(qty) {
  if (qty >= 30) return 'good';
  if (qty >= 10) return 'low';
  return 'critical';
}

export function generateTimeSlots(start = '09:00', end = '17:00') {
  const slots = [];
  let current = new Date(`2024-01-01T${start}:00`);
  const stop = new Date(`2024-01-01T${end}:00`);
  while (current <= stop) {
    slots.push(current.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
    current.setMinutes(current.getMinutes() + 30);
  }
  return slots;
}
