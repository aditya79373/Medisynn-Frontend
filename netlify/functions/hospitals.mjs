const OVERPASS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const UA = "MediSynncare/1.0 (https://medisynncare24.netlify.app)";

async function fromOverpass(url, lat, lon) {
  const query = `
    [out:json][timeout:8];
    nwr["amenity"="hospital"](around:4000,${lat},${lon});
    out center 30;
  `;
  const res = await fetch(url, {
    method: "POST",
    body: "data=" + encodeURIComponent(query),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": UA,
      Accept: "*/*",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

async function fromNominatim(lat, lon) {
  const d = 0.05; // ~5 km
  const viewbox = `${lon - d},${lat + d},${lon + d},${lat - d}`;
  const terms = ["hospital", "clinic"];

  const results = await Promise.all(
    terms.map(async (q) => {
      const url =
        `https://nominatim.openstreetmap.org/search?format=jsonv2` +
        `&q=${q}&viewbox=${viewbox}&bounded=1&limit=15`;
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`nominatim(${q}) -> HTTP ${res.status}`);
      return res.json();
    })
  );

  const seen = new Set();
  const elements = results
    .flat()
    .filter((p) => !seen.has(p.place_id) && seen.add(p.place_id))
    .map((p) => ({
      id: p.place_id,
      lat: Number(p.lat),
      lon: Number(p.lon),
      tags: { name: p.name || p.display_name?.split(",")[0] },
    }));

  if (elements.length === 0) throw new Error("nominatim -> no results");
  return { elements };
}

export default async (req) => {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return Response.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  try {
    const data = await Promise.any([
      ...OVERPASS.map((url) => fromOverpass(url, lat, lon)),
      fromNominatim(lat, lon),
    ]);
    return Response.json(data, {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch (err) {
    const reasons = (err.errors || [err]).map((e) => e.message);
    console.error("All sources failed:", reasons);
    return Response.json({ error: "All sources failed", reasons }, { status: 502 });
  }
};
