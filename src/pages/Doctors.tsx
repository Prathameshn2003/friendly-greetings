import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, MapPin, Stethoscope, Search, Navigation,
  ShieldCheck, Phone, Mail, Building2, AlertCircle
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────
interface Doctor {
  id: string | number;
  name: string;
  specialization: string;
  hospital?: string | null;
  location: string | null;
  phone?: string | null;
  email?: string | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distance?: number;
  isVerified?: boolean;
}

// ─── Haversine Formula ───────────────────────────────────────────────────────
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ─── Overpass Query Builder ──────────────────────────────────────────────────
const buildOverpassQuery = (lat: number, lon: number, radiusMeters: number) => `
[out:json][timeout:25];
(
  node["amenity"="clinic"]["healthcare:speciality"="gynaecology"](around:${radiusMeters},${lat},${lon});
  node["amenity"="hospital"]["healthcare:speciality"="gynaecology"](around:${radiusMeters},${lat},${lon});
  node["amenity"="clinic"]["healthcare:speciality"="obstetrics"](around:${radiusMeters},${lat},${lon});
  node["amenity"="hospital"]["healthcare:speciality"="obstetrics"](around:${radiusMeters},${lat},${lon});
  node["amenity"="clinic"]["name"~"gynec|women|ladies|maternity|obstet",i](around:${radiusMeters},${lat},${lon});
  node["amenity"="hospital"]["name"~"gynec|women|ladies|maternity|obstet",i](around:${radiusMeters},${lat},${lon});
  way["amenity"="clinic"]["healthcare:speciality"="gynaecology"](around:${radiusMeters},${lat},${lon});
  way["amenity"="hospital"]["healthcare:speciality"="gynaecology"](around:${radiusMeters},${lat},${lon});
);
out center;
`;

// ─── Nominatim Geocoding ─────────────────────────────────────────────────────
const geocodeCity = async (city: string): Promise<{ lat: number; lon: number } | null> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`,
      { headers: { "User-Agent": "NaariCare-App/1.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
};

// ─── Overpass Fetch ──────────────────────────────────────────────────────────
const fetchOverpassDoctors = async (
  lat: number, lon: number, radiusMeters: number, userLat: number, userLon: number
): Promise<Doctor[]> => {
  const query = buildOverpassQuery(lat, lon, radiusMeters);
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: `data=${encodeURIComponent(query)}`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  if (!res.ok) throw new Error("Overpass API error");
  const data = await res.json();

  return (data.elements || []).map((el: any) => {
    const elLat = el.lat ?? el.center?.lat;
    const elLon = el.lon ?? el.center?.lon;
    const tags = el.tags || {};
    const dist = elLat && elLon ? calculateDistance(userLat, userLon, elLat, elLon) : 999;
    return {
      id: `osm-${el.id}`,
      name: tags.name || tags["name:en"] || "Women's Health Clinic",
      specialization: tags["healthcare:speciality"] === "gynaecology"
        ? "Gynecologist"
        : tags["healthcare:speciality"] === "obstetrics"
        ? "Obstetrician"
        : "Women's Health Specialist",
      hospital: tags["operator"] || tags["brand"] || null,
      location: [tags["addr:street"], tags["addr:city"], tags["addr:state"]]
        .filter(Boolean).join(", ") || tags["addr:full"] || null,
      phone: tags.phone || tags["contact:phone"] || null,
      latitude: elLat,
      longitude: elLon,
      distance: Number(dist.toFixed(2)),
      isVerified: false,
    } as Doctor;
  });
};

// ─── Merge + Sort + Filter ───────────────────────────────────────────────────
const mergeAndFilter = (
  apiDoctors: Doctor[],
  adminDoctors: Doctor[],
  userLat: number,
  userLon: number,
  limitKm: number
): Doctor[] => {
  // Add distance to admin doctors
  const adminWithDist = adminDoctors
    .filter(d => d.latitude != null && d.longitude != null)
    .map(d => ({
      ...d,
      distance: Number(calculateDistance(userLat, userLon, d.latitude!, d.longitude!).toFixed(2)),
    }));

  // Admin doctors without coords (always show them)
  const adminNoCoords = adminDoctors
    .filter(d => d.latitude == null || d.longitude == null)
    .map(d => ({ ...d, distance: undefined }));

  // Deduplicate OSM results that match admin entries by name
  const adminNames = new Set(adminDoctors.map(d => d.name.toLowerCase()));
  const filtered = apiDoctors.filter(d => !adminNames.has(d.name.toLowerCase()));

  const combined = [
    ...adminWithDist.filter(d => (d.distance ?? 0) <= limitKm),
    ...adminNoCoords,
    ...filtered.filter(d => (d.distance ?? 999) <= limitKm),
  ];

  // Sort: verified first, then by distance
  return combined.sort((a, b) => {
    if (a.isVerified && !b.isVerified) return -1;
    if (!a.isVerified && b.isVerified) return 1;
    return (a.distance ?? 999) - (b.distance ?? 999);
  });
};

const DISTANCE_OPTIONS = [5, 10, 20, 50];

// ─── Doctor Card ─────────────────────────────────────────────────────────────
const DoctorCard = ({ doctor }: { doctor: Doctor }) => (
  <div className="glass-card p-5 rounded-xl space-y-3 hover:shadow-lg transition-shadow border border-border/50">
    <div className="flex items-start justify-between gap-2">
      <div>
        <h3 className="font-semibold text-base text-foreground">{doctor.name}</h3>
        <p className="text-sm text-primary font-medium">{doctor.specialization}</p>
      </div>
      {doctor.isVerified && (
        <Badge variant="default" className="flex items-center gap-1 shrink-0 text-xs bg-primary/10 text-primary border-primary/20">
          <ShieldCheck className="w-3 h-3" />
          Verified
        </Badge>
      )}
    </div>

    <div className="space-y-1.5 text-sm text-muted-foreground">
      {doctor.hospital && (
        <p className="flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 shrink-0 text-primary/60" />
          {doctor.hospital}
        </p>
      )}
      {doctor.location && (
        <p className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-primary/60" />
          <span className="line-clamp-2">{doctor.location}</span>
        </p>
      )}
      {doctor.phone && (
        <p className="flex items-center gap-2">
          <Phone className="w-3.5 h-3.5 shrink-0 text-primary/60" />
          {doctor.phone}
        </p>
      )}
      {doctor.email && (
        <p className="flex items-center gap-2">
          <Mail className="w-3.5 h-3.5 shrink-0 text-primary/60" />
          {doctor.email}
        </p>
      )}
    </div>

    {doctor.description && (
      <p className="text-xs text-muted-foreground line-clamp-2 border-t border-border/40 pt-2">
        {doctor.description}
      </p>
    )}

    {doctor.distance !== undefined && (
      <div className="flex items-center gap-1.5 text-xs font-semibold text-accent">
        <Navigation className="w-3 h-3" />
        {doctor.distance} km away
      </div>
    )}

    <Button
      variant="outline"
      size="sm"
      className="w-full text-xs mt-1"
      onClick={() => {
        const q = encodeURIComponent(
          doctor.latitude && doctor.longitude
            ? `${doctor.latitude},${doctor.longitude}`
            : `${doctor.name} ${doctor.location || ""}`
        );
        const url = doctor.latitude && doctor.longitude
          ? `https://www.google.com/maps?q=${q}`
          : `https://www.google.com/maps/search/${q}`;
        window.open(url, "_blank");
      }}
    >
      <MapPin className="w-3.5 h-3.5 mr-1" />
      Open in Maps
    </Button>
  </div>
);

// ─── Empty / Error States ────────────────────────────────────────────────────
const EmptyState = ({ message }: { message: string }) => (
  <div className="col-span-full text-center py-12 text-muted-foreground">
    <Stethoscope className="w-12 h-12 mx-auto mb-3 opacity-30" />
    <p className="text-sm">{message}</p>
  </div>
);

const ErrorBanner = ({ message }: { message: string }) => (
  <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
    <AlertCircle className="w-4 h-4 shrink-0" />
    {message}
  </div>
);

// ─── Section Skeleton ────────────────────────────────────────────────────────
const LoadingSkeleton = () => (
  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
    {[1, 2, 3].map(i => (
      <div key={i} className="glass-card rounded-xl p-5 space-y-3 animate-pulse">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-2/3" />
      </div>
    ))}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const Doctors = () => {
  const [adminDoctors, setAdminDoctors] = useState<Doctor[]>([]);
  const [nearbyDoctors, setNearbyDoctors] = useState<Doctor[]>([]);
  const [cityDoctors, setCityDoctors] = useState<Doctor[]>([]);
  const [city, setCity] = useState("");
  const [distanceLimit, setDistanceLimit] = useState(10);
  const [locationLoading, setLocationLoading] = useState(false);
  const [cityLoading, setCityLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [cityError, setCityError] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);

  // ─── Fetch admin doctors ─────────────────────────────────────────────────
  const fetchAdminDoctors = useCallback(async () => {
    const { data, error } = await supabase
      .from("doctors")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (!error && data) {
      setAdminDoctors(
        data.map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          specialization: doc.specialization,
          hospital: doc.hospital,
          location: doc.location,
          phone: doc.phone,
          email: doc.email,
          description: doc.description,
          latitude: doc.latitude ?? null,
          longitude: doc.longitude ?? null,
          isVerified: true,
        }))
      );
    }
  }, []);

  // ─── Run location-based search ───────────────────────────────────────────
  const runNearbySearch = useCallback(async (
    lat: number, lon: number, limitKm: number, admins: Doctor[]
  ) => {
    setLocationLoading(true);
    setLocationError(null);
    setNearbyDoctors([]);

    try {
      const radiusMeters = limitKm * 1000;
      const overpassDoctors = await fetchOverpassDoctors(lat, lon, radiusMeters, lat, lon);
      const merged = mergeAndFilter(overpassDoctors, admins, lat, lon, limitKm);

      if (merged.length === 0) {
        // Fallback: show all admin doctors if none found nearby
        setNearbyDoctors(admins.length > 0 ? admins : []);
        if (admins.length === 0) setLocationError("No doctors found in this area. Try increasing the radius.");
        else setLocationError(`No results within ${limitKm} km. Showing all verified doctors.`);
      } else {
        setNearbyDoctors(merged);
      }
    } catch {
      // Fallback to admin doctors on API failure
      setNearbyDoctors(admins);
      setLocationError("Could not reach Overpass API. Showing verified doctors only.");
    } finally {
      setLocationLoading(false);
    }
  }, []);

  // ─── Auto detect ─────────────────────────────────────────────────────────
  const handleAutoDetect = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      setNearbyDoctors(adminDoctors);
      return;
    }
    setLocationLoading(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserCoords({ lat: latitude, lon: longitude });
        runNearbySearch(latitude, longitude, distanceLimit, adminDoctors);
      },
      () => {
        setLocationLoading(false);
        setLocationError("Location permission denied. Showing verified doctors.");
        setNearbyDoctors(adminDoctors);
      },
      { timeout: 10000 }
    );
  }, [adminDoctors, distanceLimit, runNearbySearch]);

  // ─── City search ─────────────────────────────────────────────────────────
  const handleCitySearch = useCallback(async () => {
    if (!city.trim()) return;
    setCityLoading(true);
    setCityError(null);
    setCityDoctors([]);

    try {
      // Step 1: Geocode city name → coordinates
      const coords = await geocodeCity(city.trim());
      if (!coords) {
        setCityError("City not found. Please check the spelling and try again.");
        setCityDoctors(adminDoctors);
        return;
      }

      // Step 2: Fetch doctors via Overpass
      const radiusMeters = distanceLimit * 1000;
      const overpassDoctors = await fetchOverpassDoctors(
        coords.lat, coords.lon, radiusMeters, coords.lat, coords.lon
      );

      // Step 3: Merge with admin doctors matching city
      const cityLower = city.toLowerCase();
      const matchingAdmin = adminDoctors.filter(
        d => d.location?.toLowerCase().includes(cityLower) ||
             d.hospital?.toLowerCase().includes(cityLower)
      );
      const otherAdmin = adminDoctors.filter(
        d => !d.location?.toLowerCase().includes(cityLower) &&
             !d.hospital?.toLowerCase().includes(cityLower)
      );

      const adminNamesSet = new Set(adminDoctors.map(d => d.name.toLowerCase()));
      const filteredOSM = overpassDoctors.filter(d => !adminNamesSet.has(d.name.toLowerCase()));

      const combined = [
        ...matchingAdmin.map(d => ({ ...d, distance: undefined })),
        ...filteredOSM.filter(d => (d.distance ?? 999) <= distanceLimit),
      ];

      if (combined.length === 0) {
        // Show all admins as fallback
        setCityDoctors(otherAdmin.length > 0 ? adminDoctors : []);
        setCityError(`No doctors found in "${city}" within ${distanceLimit} km. Showing all verified doctors.`);
      } else {
        setCityDoctors(combined.sort((a, b) => {
          if (a.isVerified && !b.isVerified) return -1;
          if (!a.isVerified && b.isVerified) return 1;
          return (a.distance ?? 999) - (b.distance ?? 999);
        }));
      }
    } catch {
      setCityDoctors(adminDoctors);
      setCityError("API error. Showing verified doctors only.");
    } finally {
      setCityLoading(false);
    }
  }, [city, distanceLimit, adminDoctors]);

  // Re-run nearby when distance changes & coords available
  useEffect(() => {
    if (userCoords) {
      runNearbySearch(userCoords.lat, userCoords.lon, distanceLimit, adminDoctors);
    }
  }, [distanceLimit]); // eslint-disable-line

  useEffect(() => {
    fetchAdminDoctors();
  }, [fetchAdminDoctors]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">

          {/* Page Header */}
          <div className="mb-10">
            <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground flex items-center gap-3">
              <Stethoscope className="w-8 h-8 text-primary" />
              Find Doctors
            </h1>
            <p className="text-muted-foreground mt-2">
              Discover verified gynecologists and women's health specialists near you.
              Powered by OpenStreetMap Nominatim + Overpass API.
            </p>
          </div>

          {/* Distance Filter */}
          <div className="glass-card rounded-xl p-5 mb-8">
            <p className="text-sm font-medium text-foreground mb-3">🔍 Filter by Search Radius</p>
            <div className="flex flex-wrap gap-2">
              {DISTANCE_OPTIONS.map(d => (
                <Button
                  key={d}
                  variant={distanceLimit === d ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDistanceLimit(d)}
                  className="min-w-[60px]"
                >
                  {d} km
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Overpass radius: {distanceLimit * 1000} meters
            </p>
          </div>

          {/* ─── Section 1: Auto Detect ─── */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="text-xl font-heading font-semibold text-foreground flex items-center gap-2">
                <Navigation className="w-5 h-5 text-primary" />
                Nearby Doctors (Auto Detect)
              </h2>
              <Button
                onClick={handleAutoDetect}
                disabled={locationLoading}
                size="sm"
                className="gap-2"
              >
                {locationLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Navigation className="w-4 h-4" />}
                {locationLoading ? "Searching Overpass..." : "Detect My Location"}
              </Button>
            </div>

            {locationError && <ErrorBanner message={locationError} />}

            {locationLoading ? (
              <LoadingSkeleton />
            ) : nearbyDoctors.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {nearbyDoctors.map(doc => (
                  <DoctorCard key={doc.id} doctor={doc} />
                ))}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <EmptyState message='Click "Detect My Location" to find nearby doctors via Overpass API.' />
              </div>
            )}
          </section>

          {/* ─── Section 2: City Search ─── */}
          <section className="mb-12">
            <h2 className="text-xl font-heading font-semibold text-foreground flex items-center gap-2 mb-4">
              <Search className="w-5 h-5 text-primary" />
              Search Doctors by City
            </h2>

            <div className="flex gap-3 mb-2 flex-wrap">
              <Input
                placeholder="Enter city (e.g., Mumbai, Delhi, Pune)"
                value={city}
                onChange={e => setCity(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCitySearch()}
                className="max-w-md"
              />
              <Button
                onClick={handleCitySearch}
                disabled={cityLoading || !city.trim()}
                className="gap-2"
              >
                {cityLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Search className="w-4 h-4" />}
                {cityLoading ? "Searching..." : "Search"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-5">
              City geocoded via Nominatim → doctors fetched via Overpass API
            </p>

            {cityError && <ErrorBanner message={cityError} />}

            {cityLoading ? (
              <LoadingSkeleton />
            ) : cityDoctors.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {cityDoctors.map(doc => (
                  <DoctorCard key={doc.id} doctor={doc} />
                ))}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <EmptyState message="Enter a city name and click Search to find doctors." />
              </div>
            )}
          </section>

          {/* ─── Section 3: Admin Verified Doctors ─── */}
          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Admin Verified Doctors
            </h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {adminDoctors.length > 0 ? (
                adminDoctors.map(doc => <DoctorCard key={doc.id} doctor={doc} />)
              ) : (
                <EmptyState message="No verified doctors added yet." />
              )}
            </div>
          </section>

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Doctors;
