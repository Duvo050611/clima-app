// API 1: Nominatim (OpenStreetMap). Convierte el nombre de un destino en
// coordenadas, país y el artículo de Wikipedia asociado.
// Documentación: https://nominatim.org/release-docs/latest/api/Search/
import { ApiError, getJson } from './http';

export const NOMINATIM = {
  id: 'nominatim',
  name: 'Nominatim (OpenStreetMap)',
  searchUrl: 'https://nominatim.openstreetmap.org/search',
  reverseUrl: 'https://nominatim.openstreetmap.org/reverse',
  docs: 'https://nominatim.org/release-docs/latest/api/Search/',
};

// Letras (con acentos y ñ), espacios, puntos, guiones, apóstrofes y comas (ej. "Toluca, México")
const CITY_REGEX = /^[\p{L}\s.'\-,]+$/u;

export function validateCity(input) {
  const city = (input ?? '').trim().replace(/\s+/g, ' ');
  if (city.length === 0) {
    throw new ApiError('Escribe el nombre de un destino.', 'VALIDATION');
  }
  if (city.length < 2 || city.length > 60) {
    throw new ApiError('El destino debe tener entre 2 y 60 caracteres.', 'VALIDATION');
  }
  if (!CITY_REGEX.test(city)) {
    throw new ApiError(
      'El destino solo puede contener letras, espacios, puntos, comas o guiones.',
      'VALIDATION',
    );
  }
  return city;
}

export function validateCoords(lat, lon) {
  const valid =
    Number.isFinite(lat) && Number.isFinite(lon) &&
    lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  if (!valid) throw new ApiError('Coordenadas fuera de rango.', 'VALIDATION');
}

// "es:Toluca de Lerdo" -> { lang: 'es', title: 'Toluca de Lerdo' }
function parseWikipediaTag(tag) {
  const match = /^([a-z-]{2,12}):(.+)$/.exec(tag ?? '');
  return match ? { lang: match[1], title: match[2] } : null;
}

// Procesa un elemento del JSON de Nominatim y se queda solo con lo que usa la app.
export function parsePlace(item) {
  const lat = Number.parseFloat(item?.lat);
  const lon = Number.parseFloat(item?.lon);
  if (!item || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new ApiError('La respuesta de geolocalización está incompleta.', 'EMPTY');
  }
  const address = item.address ?? {};
  const extratags = item.extratags ?? {};
  const name =
    item.name || address.city || address.town || address.village || address.county || 'Ubicación';
  const population = Number.parseInt(extratags.population, 10);

  return {
    name,
    displayName: item.display_name ?? name,
    state: address.state ?? '',
    country: address.country ?? '',
    countryCode: (address.country_code ?? '').toUpperCase(),
    lat,
    lon,
    type: item.addresstype ?? item.type ?? '',
    population: Number.isFinite(population) ? population : null,
    // Dato que se reutiliza para la 3.ª API. Si OSM no lo tiene, se busca por nombre.
    wikipedia: parseWikipediaTag(extratags.wikipedia) ?? { lang: 'es', title: name },
    mapUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=12/${lat}/${lon}`,
  };
}

export async function searchPlace(input) {
  const q = validateCity(input);
  const { json, url, ms } = await getJson(NOMINATIM.id, NOMINATIM.searchUrl, {
    q,
    format: 'jsonv2',
    addressdetails: 1,
    extratags: 1,
    limit: 1,
    'accept-language': 'es',
  });
  if (!Array.isArray(json) || json.length === 0) {
    throw new ApiError(`No se encontró el destino "${q}". Revisa el nombre.`, 'NOT_FOUND');
  }
  return { data: parsePlace(json[0]), url, ms };
}

export async function reversePlace(lat, lon) {
  validateCoords(lat, lon);
  const { json, url, ms } = await getJson(NOMINATIM.id, NOMINATIM.reverseUrl, {
    lat,
    lon,
    format: 'jsonv2',
    addressdetails: 1,
    extratags: 1,
    zoom: 10, // nivel ciudad
    'accept-language': 'es',
  });
  if (!json || json.error) {
    throw new ApiError('No se pudo identificar un lugar en tu ubicación.', 'NOT_FOUND');
  }
  return { data: parsePlace(json), url, ms };
}
