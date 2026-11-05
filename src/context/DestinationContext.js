// Estado compartido por las pestañas: destino actual y resultado de cada API.
// Flujo de integración:
//   1) Nominatim (nombre -> lat/lon, país, artículo de Wikipedia)   [obligatoria]
//   2) Open-Meteo (lat/lon -> clima)            ┐ en paralelo, cada una
//   3) Wikipedia  (artículo -> resumen/imagen)  ┘ puede fallar sin afectar a la otra
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { reversePlace, searchPlace } from '../services/geocoding';
import { setSimulatedOutage } from '../services/http';
import { getForecast } from '../services/weather';
import { getSummary } from '../services/wikipedia';

const DestinationContext = createContext(null);

const idle = { status: 'idle', data: null, error: null, url: null, ms: null };
const loading = { ...idle, status: 'loading' };

function toResult(promiseResult) {
  if (promiseResult.status === 'fulfilled') {
    const { data, url, ms } = promiseResult.value;
    return { status: 'success', data, error: null, url, ms };
  }
  const reason = promiseResult.reason;
  return { ...idle, status: 'error', error: reason?.message ?? 'Error desconocido.', url: reason?.url ?? null };
}

export function DestinationProvider({ children }) {
  const [place, setPlace] = useState(idle);
  const [weather, setWeather] = useState(idle);
  const [wiki, setWiki] = useState(idle);
  const [lastRequest, setLastRequest] = useState(null);
  const [outages, setOutages] = useState({ nominatim: false, openmeteo: false, wikipedia: false });
  const requestId = useRef(0);

  const run = useCallback(async (req) => {
    const id = ++requestId.current; // descarta respuestas de búsquedas anteriores
    setPlace((prev) => ({ ...loading, data: prev.data }));

    // --- 1.ª API: geolocalización ---
    const [geo] = await Promise.allSettled([
      req.type === 'city' ? searchPlace(req.value) : reversePlace(req.value.lat, req.value.lon),
    ]);
    if (id !== requestId.current) return;

    const placeResult = toResult(geo);
    if (placeResult.status === 'error') {
      // Se conserva el destino anterior (si había) para no dejar la pantalla vacía.
      setPlace((prev) => ({ ...placeResult, data: prev.data }));
      return;
    }
    setPlace(placeResult);
    setLastRequest(req);
    const { lat, lon, wikipedia } = placeResult.data;

    // --- 2.ª y 3.ª API: usan los datos de la 1.ª ---
    setWeather(loading);
    setWiki(loading);
    const weatherTask = Promise.allSettled([getForecast(lat, lon)]).then(([r]) => {
      if (id === requestId.current) setWeather(toResult(r));
    });
    const wikiTask = Promise.allSettled([getSummary(wikipedia)]).then(([r]) => {
      if (id === requestId.current) setWiki(toResult(r));
    });
    await Promise.all([weatherTask, wikiTask]);
  }, []);

  const search = useCallback((city) => run({ type: 'city', value: city }), [run]);
  const searchByCoords = useCallback((lat, lon) => run({ type: 'coords', value: { lat, lon } }), [run]);
  const refresh = useCallback(() => lastRequest && run(lastRequest), [run, lastRequest]);

  const toggleOutage = useCallback((serviceId) => {
    setOutages((prev) => {
      const next = { ...prev, [serviceId]: !prev[serviceId] };
      setSimulatedOutage(serviceId, next[serviceId]);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      place,
      weather,
      wiki,
      busy: [place, weather, wiki].some((r) => r.status === 'loading'),
      search,
      searchByCoords,
      refresh,
      outages,
      toggleOutage,
    }),
    [place, weather, wiki, search, searchByCoords, refresh, outages, toggleOutage],
  );

  return <DestinationContext.Provider value={value}>{children}</DestinationContext.Provider>;
}

export function useDestination() {
  const ctx = useContext(DestinationContext);
  if (!ctx) throw new Error('useDestination debe usarse dentro de <DestinationProvider>.');
  return ctx;
}
