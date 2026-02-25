// api/hourly.ts
export async function getHourly() {
  const url = "https://api.weather.gov/gridpoints/BMX/57,85/forecast/hourly";

  const res = await fetch(url, {
    headers: {
      // NWS requires this! It's like a 'description' on a Cisco interface.
      "User-Agent": "(FORRADAPP_v1.0, bjgarner@icloud.com)",
      "Accept": "application/geo+json",
    },
    next: { revalidate: 3600 } // This is 'Caching'—don't hit the API more than once an hour
  });

  if (!res.ok) {
    console.error("NWS API Error Status:", res.status);
    return null;
  }

  const data = await res.json();
  return data.properties.periods; // This is the array of hourly weather
}