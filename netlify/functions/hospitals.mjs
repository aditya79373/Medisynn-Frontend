const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

export default async (req) => {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return Response.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  // regex ki jagah alag-alag filters: ye zyada fast hote hain
  const query = `
    [out:json][timeout:9];
    (
      nwr["amenity"="hospital"](around:5000,${lat},${lon});
      nwr["amenity"="clinic"](around:5000,${lat},${lon});
    );
    out center 40;
  `;

  try {
    const data = await Promise.any(
      ENDPOINTS.map(async (url) => {
        const res = await fetch(url, {
          method: "POST",
          body: "data=" + encodeURIComponent(query),
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            // APNA REAL EMAIL YA SITE YAHAN DAALO
            "User-Agent": "MediSynncare/1.0 (https://medisynncare24.netlify.app)",
          },
          signal: AbortSignal.timeout(9000),
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
