// F4 (02c, D-01): reserva que aún no se ha creado. "Reservar mesa" guarda aquí el
// resumen y el formulario, y la pantalla de pago confirma con "Ya pagué". Solo en
// memoria, igual que la confirmación: ni nombres ni teléfonos en la URL.
import { createContext, useContext, useState } from 'react';

const ReservaPendienteContext = createContext(null);

export function ReservaPendienteProvider({ children }) {
  const [pendiente, setPendiente] = useState(null);
  return <ReservaPendienteContext.Provider value={{ pendiente, setPendiente }}>
    {children}
  </ReservaPendienteContext.Provider>;
}

export function useReservaPendiente() {
  return useContext(ReservaPendienteContext);
}
