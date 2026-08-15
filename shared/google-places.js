export function placePredictionSummary(prediction = {}) {
  const place = prediction.placePrediction;
  if (!place?.placeId) return null;
  return {
    id: place.placeId,
    name: place.structuredFormat?.mainText?.text || place.text?.text || "Google place",
    address: place.structuredFormat?.secondaryText?.text || "",
  };
}

export function placeDetailsToLocation(place = {}) {
  const components = Array.isArray(place.addressComponents) ? place.addressComponents : [];
  const component = (...types) => components.find((item) => types.some((type) => item.types?.includes(type)))?.longText || "";
  return {
    name: place.displayName?.text || "",
    suburb: component("locality", "postal_town", "sublocality", "sublocality_level_1"),
    address: place.formattedAddress || "",
    latitude: Number.isFinite(place.location?.latitude) ? place.location.latitude : null,
    longitude: Number.isFinite(place.location?.longitude) ? place.location.longitude : null,
    googleMapsUrl: place.googleMapsUri || null,
  };
}

