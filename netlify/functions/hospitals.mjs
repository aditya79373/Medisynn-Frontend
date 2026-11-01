const ENDPOINTS = [
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

export default async (req) => {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return Response.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const query = `
    [out:json][timeout:8];
    nwr["amenity"~"hospital|clinic"](around:5000,${lat},${lon});
    out center 50;
  `;

  try {
    const data = await Promise.any(
      ENDPOINTS.map(async (url) => {
        const res = await fetch(url, {
          method: "POST",
          body: "data=" + encodeURIComponent(query),
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "nearby-doctors-app/1.0 (contact: your-email@example.com)",
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
        return res.json();
      })
    );
    return Response.json(data, {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch (err) {
    const reasons = (err.errors || [err]).map((e) => e.message);
    console.error("Overpass failures:", reasons);
    return Response.json(
      { error: "All Overpass mirrors failed", reasons },
      { status: 502 }
    );
  }
};
