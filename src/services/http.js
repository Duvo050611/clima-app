// Cliente HTTP compartido por los tres servicios.
// Se encarga de: exigir HTTPS, timeout, codificar parámetros, traducir errores
// HTTP/red a mensajes en español y medir el tiempo de respuesta.
import { Platform } from 'react-native';

const TIMEOUT_MS = 10000;

// Nominatim y Wikipedia piden que las apps se identifiquen con un User-Agent.
// En web el navegador no permite cambiarlo (envía su propio Referer), por eso solo se agrega en móvil.
const APP_USER_AGENT = 'DestinosApp/1.0 (proyecto escolar UTVT; React Native/Expo)';

// Fuente para <Image>: Wikimedia responde 403 a las imágenes pedidas con el User-Agent
// genérico de Android (okhttp), así que en móvil también se envía el de la app.
export function remoteImage(uri) {
  return Platform.OS === 'web' ? { uri } : { uri, headers: { 'User-Agent': APP_USER_AGENT } };
}

export class ApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// Servicios marcados como "caídos" desde la pestaña APIs para probar la indisponibilidad.
// La petición se manda a un dominio .invalid (RFC 2606), que nunca resuelve,
// así que la falla es de red real y no un error inventado.
const simulatedOutages = new Set();

export function setSimulatedOutage(serviceId, enabled) {
  if (enabled) simulatedOutages.add(serviceId);
  else simulatedOutages.delete(serviceId);
}

// Se arma la URL a mano (en vez de `new URL`) porque React Native no implementa
// todos sus setters. Cada parámetro se codifica con encodeURIComponent.
function buildUrl(baseUrl, params, serviceId) {
  const match = /^https:\/\/([^/?#]+)(.*)$/.exec(baseUrl);
  if (!match) {
    throw new ApiError('Por seguridad solo se permiten peticiones HTTPS.', 'INSECURE');
  }
  const host = simulatedOutages.has(serviceId) ? `${serviceId}.servicio-caido.invalid` : match[1];
  const query = Object.entries(params ?? {})
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return `https://${host}${match[2]}${query ? `?${query}` : ''}`;
}

/**
 * Hace un GET y devuelve { json, url, ms }.
 * `messages` permite a cada servicio personalizar el texto de 404, etc.
 */
export async function getJson(serviceId, baseUrl, params, options) {
  const url = buildUrl(baseUrl, params, serviceId);
  try {
    return await request(url, options);
  } catch (err) {
    err.url = url; // para mostrar en la pestaña APIs qué URL falló
    throw err;
  }
}

async function request(url, { messages = {} } = {}) {
  const headers = { Accept: 'application/json' };
  if (Platform.OS !== 'web') headers['User-Agent'] = APP_USER_AGENT;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = Date.now();

  let response;
  try {
    response = await fetch(url, { method: 'GET', headers, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError('El servicio tardó demasiado en responder.', 'TIMEOUT');
    }
    throw new ApiError('Sin conexión o el servicio no está disponible.', 'NETWORK');
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const { status } = response;
    if (status === 404) {
      throw new ApiError(messages.notFound ?? 'No se encontró la información solicitada.', 'NOT_FOUND', status);
    }
    if (status === 429) {
      throw new ApiError('Se alcanzó el límite de solicitudes. Espera un momento.', 'RATE_LIMIT', status);
    }
    if (status === 403) {
      throw new ApiError('El servicio rechazó la petición (403).', 'FORBIDDEN', status);
    }
    if (status >= 500) {
      throw new ApiError('El servicio no está disponible por ahora.', 'SERVER', status);
    }
    throw new ApiError(`Error inesperado del servicio (${status}).`, 'HTTP', status);
  }

  let json;
  try {
    json = await response.json();
  } catch {
    throw new ApiError('El servicio devolvió una respuesta vacía o inválida.', 'EMPTY', response.status);
  }
  return { json, url, ms: Date.now() - started };
}
