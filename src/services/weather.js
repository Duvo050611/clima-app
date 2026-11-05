// API 2: Open-Meteo. Clima actual y pronóstico usando las coordenadas que devolvió Nominatim.
// Documentación: https://open-meteo.com/en/docs
import { ApiError, getJson } from './http';

export const OPEN_METEO = {
  id: 'openmeteo',
  name: 'Open-Meteo',
  forecastUrl: 'https://api.open-meteo.com/v1/forecast',
  docs: 'https://open-meteo.com/en/docs',
};

// Códigos WMO que usa Open-Meteo -> descripción en español + ícono (Ionicons)
const WMO = {
  0: ['Despejado', 'sunny'],
  1: ['Mayormente despejado', 'partly-sunny'],
  2: ['Parcialmente nublado', 'partly-sunny'],
  3: ['Nublado', 'cloudy'],
  45: ['Niebla', 'cloud'],
  48: ['Niebla con escarcha', 'cloud'],
  51: ['Llovizna ligera', 'rainy'],
  53: ['Llovizna', 'rainy'],
  55: ['Llovizna intensa', 'rainy'],
  56: ['Llovizna helada', 'rainy'],
  57: ['Llovizna helada intensa', 'rainy'],
  61: ['Lluvia ligera', 'rainy'],
  63: ['Lluvia', 'rainy'],
  65: ['Lluvia intensa', 'rainy'],
  66: ['Lluvia helada', 'rainy'],
  67: ['Lluvia helada intensa', 'rainy'],
  71: ['Nevada ligera', 'snow'],
  73: ['Nevada', 'snow'],
  75: ['Nevada intensa', 'snow'],
  77: ['Granizo fino', 'snow'],
  80: ['Chubascos ligeros', 'rainy'],
  81: ['Chubascos', 'rainy'],
  82: ['Chubascos fuertes', 'thunderstorm'],
  85: ['Chubascos de nieve', 'snow'],
  86: ['Chubascos de nieve fuertes', 'snow'],
  95: ['Tormenta', 'thunderstorm'],
  96: ['Tormenta con granizo', 'thunderstorm'],
  99: ['Tormenta con granizo fuerte', 'thunderstorm'],
};

export function describeWeather(code, isDay = true) {
  const [text, icon] = WMO[code] ?? ['Sin datos', 'help-circle-outline'];
  return { text, icon: !isDay && code <= 2 ? 'moon' : icon };
}

// Recomendación simple para el viajero a partir del pronóstico
function travelTip(current, today) {
  if (today.rainChance >= 60) return { icon: 'umbrella-outline', text: 'Alta probabilidad de lluvia: lleva paraguas.' };
  if (current.code >= 95) return { icon: 'warning-outline', text: 'Hay tormentas: evita actividades al aire libre.' };
  if (today.max >= 30) return { icon: 'sunny-outline', text: 'Hará calor: hidrátate y usa protector solar.' };
  if (today.min <= 5) return { icon: 'snow-outline', text: 'Noches frías: lleva abrigo.' };
  return { icon: 'walk-outline', text: 'Buen clima para recorrer el destino.' };
}

// Convierte el JSON (arreglos paralelos en `daily`) en objetos fáciles de pintar.
export function parseForecast(json) {
  const c = json?.current;
  const d = json?.daily;
  if (!c || !d || !Array.isArray(d.time) || d.time.length === 0) {
    throw new ApiError('El servicio de clima devolvió datos incompletos.', 'EMPTY');
  }
  const current = {
    temp: Math.round(c.temperature_2m),
    feelsLike: Math.round(c.apparent_temperature),
    humidity: c.relative_humidity_2m,
    wind: Math.round(c.wind_speed_10m),
    code: c.weather_code,
    isDay: c.is_day === 1,
    ...describeWeather(c.weather_code, c.is_day === 1),
  };
  const days = d.time.map((date, i) => ({
    date,
    max: Math.round(d.temperature_2m_max[i]),
    min: Math.round(d.temperature_2m_min[i]),
    rainChance: d.precipitation_probability_max?.[i] ?? 0,
    ...describeWeather(d.weather_code[i]),
  }));
  return {
    current,
    days,
    timezone: json.timezone,
    localTime: c.time, // hora local del destino (ISO sin zona)
    elevation: json.elevation,
    tip: travelTip(current, days[0]),
  };
}

export async function getForecast(lat, lon) {
  const { json, url, ms } = await getJson(OPEN_METEO.id, OPEN_METEO.forecastUrl, {
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: 7,
  });
  return { data: parseForecast(json), url, ms };
}
