export function veterinaryCareUrl(location: string) {
  const query = `veterinarians veterinary clinics near ${location.trim()}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
