// Servicio de acceso a la API de OpenWeather (Current Weather Data 2.5)
// Documentación: https://openweathermap.org/current

const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather'; // Siempre HTTPS
const TIMEOUT_MS = 10000;

// La clave se lee de la variable de entorno (.env), nunca se escribe en el código.
const API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;

// Letras (incluye acentos y ñ), espacios, puntos, guiones, apóstrofes y comas (ej. "Toluca,MX")
const CITY_REGEX = /^[\p{L}\s.'\-,]+$/u;

export class WeatherError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

// Valida y normaliza el nombre de ciudad antes de enviarlo a la API.
export function validateCity(input) {
  const city = (input ?? '').trim().replace(/\s+/g, ' ');
  if (city.length === 0) {
    throw new WeatherError('Escribe el nombre de una ciudad.', 'VALIDATION');
  }
  if (city.length < 2 || city.length > 60) {
    throw new WeatherError('La ciudad debe tener entre 2 y 60 caracteres.', 'VALIDATION');
  }
  if (!CITY_REGEX.test(city)) {
    throw new WeatherError(
      'La ciudad solo puede contener letras, espacios, puntos, comas o guiones.',
      'VALIDATION',
    );
  }
  return city;
}

export function validateCoords(lat, lon) {
  const valid =
    Number.isFinite(lat) && Number.isFinite(lon) &&
    lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  if (!valid) {
    throw new WeatherError('Coordenadas fuera de rango.', 'VALIDATION');
  }
  return { lat, lon };
}

// Convierte la respuesta JSON de la API en un objeto con los campos que usa la interfaz.
export function parseWeather(json) {
  if (!json || !json.main || !Array.isArray(json.weather) || json.weather.length === 0) {
    throw new WeatherError('La API devolvió una respuesta vacía o incompleta.', 'EMPTY');
  }
  const [condition] = json.weather;
  return {
    city: json.name || 'Ubicación sin nombre',
    country: json.sys?.country ?? '',
    lat: json.coord?.lat,
    lon: json.coord?.lon,
    temp: Math.round(json.main.temp),
    feelsLike: Math.round(json.main.feels_like),
    tempMin: Math.round(json.main.temp_min),
    tempMax: Math.round(json.main.temp_max),
    humidity: json.main.humidity,
    windSpeed: json.wind?.speed ?? 0,
    description: condition.description,
    icon: `https://openweathermap.org/img/wn/${condition.icon}@2x.png`,
    updatedAt: new Date((json.dt ?? Date.now() / 1000) * 1000),
  };
}

async function request(params) {
  if (!API_KEY) {
    throw new WeatherError(
      'Falta la clave de la API. Configura EXPO_PUBLIC_OPENWEATHER_API_KEY en el archivo .env.',
      'CONFIG',
    );
  }

  const query = new URLSearchParams({ ...params, units: 'metric', lang: 'es', appid: API_KEY });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${BASE_URL}?${query.toString()}`, {
      method: 'GET',
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new WeatherError('El servicio tardó demasiado en responder. Intenta de nuevo.', 'TIMEOUT');
    }
    throw new WeatherError('Sin conexión a internet o el servicio no está disponible.', 'NETWORK');
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    switch (response.status) {
      case 401:
        throw new WeatherError('Clave de API inválida o aún no activada.', 'UNAUTHORIZED');
      case 404:
        throw new WeatherError('No se encontró la ciudad. Revisa el nombre.', 'NOT_FOUND');
      case 429:
        throw new WeatherError(
          'Se alcanzó el límite de solicitudes de la API. Espera un minuto e intenta de nuevo.',
          'RATE_LIMIT',
        );
      default:
        if (response.status >= 500) {
          throw new WeatherError('El servicio meteorológico no está disponible por ahora.', 'SERVER');
        }
        throw new WeatherError(`Error inesperado de la API (${response.status}).`, 'HTTP');
    }
  }

  let json;
  try {
    json = await response.json();
  } catch {
    throw new WeatherError('La API devolvió una respuesta vacía o inválida.', 'EMPTY');
  }
  return parseWeather(json);
}

export function getWeatherByCity(input) {
  const city = validateCity(input);
  return request({ q: city });
}

export function getWeatherByCoords(lat, lon) {
  validateCoords(lat, lon);
  return request({ lat: String(lat), lon: String(lon) });
}
