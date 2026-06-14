// api/hourly.ts
export async function getHourly() {
  const url = "htttp://weather-proxy:5000/api/hourly";

  const res = await fetch(url, {
     cache: "no-store"
  });

  if (!res.ok) {
    console.error("NWS API Error Status:", res.status);
    return null;
  }

  const data = await res.json();
  return data.properties.periods; // This is the array of hourly weather
}