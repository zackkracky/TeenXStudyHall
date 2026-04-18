const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CACHE_PATH = path.join(__dirname, '../data/geocodeCache.json');
let cache = {};

try {
  cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
} catch {
  cache = {};
}

function normalizeQuery(query) {
  return query.trim().toLowerCase();
}

async function saveCache() {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (error) {
    console.warn('Unable to save geocode cache:', error.message);
  }
}

async function geocodeAddress(address) {
  const key = normalizeQuery(address);
  if (!key) return null;
  if (cache[key]) return cache[key];

  try {
    const res = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: address,
        format: 'json',
        limit: 1,
        addressdetails: 0
      },
      headers: {
        'User-Agent': 'TeenXStudyHall/1.0 (contact@example.com)'
      },
      timeout: 8000
    });

    const location = Array.isArray(res.data) && res.data[0];
    if (!location) return null;

    const result = {
      latitude: Number(location.lat),
      longitude: Number(location.lon),
      displayName: location.display_name || address
    };

    cache[key] = result;
    await saveCache();
    return result;
  } catch (error) {
    console.warn('Geocode failed for', address, error.message);
    return null;
  }
}

async function reverseGeocode(lat, lng) {
  const key = `${lat},${lng}`;
  if (cache[key]) return cache[key];

  try {
    const res = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        lat,
        lon: lng,
        format: 'json'
      },
      headers: {
        'User-Agent': 'TeenXStudyHall/1.0 (contact@example.com)'
      },
      timeout: 8000
    });

    if (!res.data) return null;
    const result = {
      latitude: Number(lat),
      longitude: Number(lng),
      displayName: res.data.display_name || `${lat},${lng}`
    };

    cache[key] = result;
    await saveCache();
    return result;
  } catch (error) {
    console.warn('Reverse geocode failed for', key, error.message);
    return null;
  }
}

function getCoordinatesFromDonor(donor) {
  if (donor == null) return null;
  if (donor.lat != null && donor.lng != null) {
    return { latitude: Number(donor.lat), longitude: Number(donor.lng) };
  }
  if (donor.location && typeof donor.location === 'object' && donor.location.latitude != null && donor.location.longitude != null) {
    return { latitude: Number(donor.location.latitude), longitude: Number(donor.location.longitude) };
  }
  return null;
}

async function ensureDonorLocation(donor) {
  if (!donor) return null;
  const existing = getCoordinatesFromDonor(donor);
  if (existing) {
    if (!donor.location || typeof donor.location !== 'object') {
      donor.location = { latitude: existing.latitude, longitude: existing.longitude };
    }
    return donor;
  }

  if (typeof donor.location === 'string' && donor.location.trim()) {
    const geocoded = await geocodeAddress(donor.location);
    if (geocoded) {
      donor.lat = geocoded.latitude;
      donor.lng = geocoded.longitude;
      donor.location = { latitude: geocoded.latitude, longitude: geocoded.longitude };
      donor.lastUpdated = new Date().toISOString();
      return donor;
    }
  }

  return null;
}

async function ensureDonorsLocations(donors) {
  if (!Array.isArray(donors)) return false;
  let updated = false;

  for (const donor of donors) {
    const before = getCoordinatesFromDonor(donor);
    const resolved = await ensureDonorLocation(donor);
    if (!before && resolved) {
      updated = true;
    }
  }

  return updated;
}

function normalizeDonorOutput(donor) {
  if (!donor || typeof donor !== 'object') return donor;
  const coords = getCoordinatesFromDonor(donor);
  const locationValue = coords
    ? { latitude: coords.latitude, longitude: coords.longitude }
    : typeof donor.location === 'string'
      ? donor.location
      : null;

  return {
    ...donor,
    bloodGroup: donor.blood_group || donor.bloodGroup,
    location: locationValue,
    lat: coords ? coords.latitude : donor.lat,
    lng: coords ? coords.longitude : donor.lng
  };
}

module.exports = {
  geocodeAddress,
  reverseGeocode,
  ensureDonorLocation,
  ensureDonorsLocations,
  normalizeDonorOutput,
  getCoordinatesFromDonor
};