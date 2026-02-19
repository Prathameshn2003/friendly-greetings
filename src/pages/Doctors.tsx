import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Stethoscope, Search, Navigation, ShieldCheck, Phone, Mail, Building2 } from "lucide-react";

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

// Haversine Formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const DISTANCE_OPTIONS = [5, 10, 20, 50];

const DoctorCard = ({ doctor }: { doctor: Doctor }) => (
  <div className="glass-card p-5 rounded-xl space-y-3 hover:shadow-lg transition-shadow">
    <div className="flex items-start justify-between gap-2">
      <div>
        <h3 className="font-semibold text-base text-foreground">{doctor.name}</h3>
        <p className="text-sm text-primary font-medium">{doctor.specialization}</p>
      </div>
      {doctor.isVerified && (
        <Badge variant="default" className="flex items-center gap-1 shrink-0 text-xs">
          <ShieldCheck className="w-3 h-3" />
          Verified
        </Badge>
      )}
    </div>

    <div className="space-y-1 text-sm text-muted-foreground">
      {doctor.hospital && (
        <p className="flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 shrink-0" />
          {doctor.hospital}
        </p>
      )}
      {doctor.location && (
        <p className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="line-clamp-2">{doctor.location}</span>
        </p>
      )}
      {doctor.phone && (
        <p className="flex items-center gap-2">
          <Phone className="w-3.5 h-3.5 shrink-0" />
          {doctor.phone}
        </p>
      )}
      {doctor.email && (
        <p className="flex items-center gap-2">
          <Mail className="w-3.5 h-3.5 shrink-0" />
          {doctor.email}
        </p>
      )}
    </div>

    {doctor.description && (
      <p className="text-xs text-muted-foreground line-clamp-2">{doctor.description}</p>
    )}

    {doctor.distance !== undefined && (
      <p className="text-xs font-medium text-accent">
        📍 {doctor.distance} km away
      </p>
    )}

    <Button
      variant="outline"
      size="sm"
      className="w-full text-xs"
      onClick={() => {
        const query = encodeURIComponent(`${doctor.name} ${doctor.location || ""}`);
        window.open(`https://www.google.com/maps/search/${query}`, "_blank");
      }}
    >
      <MapPin className="w-3.5 h-3.5 mr-1" />
      Open in Maps
    </Button>
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="col-span-full text-center py-10 text-muted-foreground">
    <Stethoscope className="w-10 h-10 mx-auto mb-3 opacity-40" />
    <p className="text-sm">{message}</p>
  </div>
);

const Doctors = () => {
  const [nearbyDoctors, setNearbyDoctors] = useState<Doctor[]>([]);
  const [cityDoctors, setCityDoctors] = useState<Doctor[]>([]);
  const [adminDoctors, setAdminDoctors] = useState<Doctor[]>([]);
  const [city, setCity] = useState("");
  const [distanceLimit, setDistanceLimit] = useState(10);
  const [locationLoading, setLocationLoading] = useState(false);
  const [cityLoading, setCityLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);

  // ─── Fetch admin-verified doctors from Supabase ───────────────────────────
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
          latitude: doc.latitude,
          longitude: doc.longitude,
          isVerified: true,
        }))
      );
    }
  }, []);

  // ─── Auto detect nearby doctors ──────────────────────────────────────────
  const fetchNearbyDoctors = useCallback(async (lat: number, lon: number, limit: number, fallback: Doctor[]) => {
    setLocationLoading(true);
    setLocationError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=gynecologist&limit=30`,
        { headers: { "User-Agent": "NaariCare-App/1.0" } }
      );
      if (!res.ok) throw new Error("API error");
      const data = await res.json();

      const filtered: Doctor[] = data
        .map((place: any) => {
          const pLat = parseFloat(place.lat);
          const pLon = parseFloat(place.lon);
          const dist = calculateDistance(lat, lon, pLat, pLon);
          return {
            id: place.place_id,
            name: place.display_name.split(",")[0],
            specialization: "Gynecologist",
            location: place.display_name,
            latitude: pLat,
            longitude: pLon,
            distance: Number(dist.toFixed(2)),
            isVerified: false,
          };
        })
        .filter((d: Doctor) => (d.distance ?? 999) <= limit)
        .sort((a: Doctor, b: Doctor) => (a.distance ?? 0) - (b.distance ?? 0));

      // Also include verified admin doctors with distance if they have coords
      const verifiedWithDist = fallback
        .filter(d => d.latitude != null && d.longitude != null)
        .map(d => ({
          ...d,
          distance: Number(calculateDistance(lat, lon, d.latitude!, d.longitude!).toFixed(2)),
        }))
        .filter(d => d.distance <= limit);

      const combined = [...verifiedWithDist, ...filtered].sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
      setNearbyDoctors(combined.length > 0 ? combined : fallback);
    } catch {
      // Fallback: show admin doctors
      setNearbyDoctors(fallback);
      setLocationError("Could not reach location API. Showing verified doctors.");
    } finally {
      setLocationLoading(false);
    }
  }, []);

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
        fetchNearbyDoctors(latitude, longitude, distanceLimit, adminDoctors);
      },
      () => {
        setLocationLoading(false);
        setLocationError("Location permission denied. Showing verified doctors.");
        setNearbyDoctors(adminDoctors);
      }
    );
  }, [adminDoctors, distanceLimit, fetchNearbyDoctors]);

  // ─── Search by city ──────────────────────────────────────────────────────
  const fetchDoctorsByCity = useCallback(async () => {
    if (!city.trim()) return;
    setCityLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=gynecologist+in+${encodeURIComponent(city)}&limit=30`,
        { headers: { "User-Agent": "NaariCare-App/1.0" } }
      );
      if (!res.ok) throw new Error("API error");
      const data = await res.json();

      const formatted: Doctor[] = data.map((place: any) => ({
        id: place.place_id,
        name: place.display_name.split(",")[0],
        specialization: "Gynecologist",
        location: place.display_name,
        latitude: parseFloat(place.lat),
        longitude: parseFloat(place.lon),
        isVerified: false,
      }));

      // Merge with admin doctors that match the city search
      const cityLower = city.toLowerCase();
      const matchingAdmin = adminDoctors.filter(
        d => d.location?.toLowerCase().includes(cityLower) || d.hospital?.toLowerCase().includes(cityLower)
      );

      const combined = [...matchingAdmin, ...formatted.filter(f =>
        !matchingAdmin.some(a => a.name === f.name)
      )];

      setCityDoctors(combined.length > 0 ? combined : adminDoctors);
    } catch {
      setCityDoctors(adminDoctors);
    } finally {
      setCityLoading(false);
    }
  }, [city, adminDoctors]);

  // Re-run nearby search when distance changes and we have coords
  useEffect(() => {
    if (userCoords) {
      fetchNearbyDoctors(userCoords.lat, userCoords.lon, distanceLimit, adminDoctors);
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
            </p>
          </div>

          {/* Distance Filter */}
          <div className="glass-card rounded-xl p-5 mb-8">
            <p className="text-sm font-medium text-foreground mb-3">Filter by Distance</p>
            <div className="flex flex-wrap gap-2">
              {DISTANCE_OPTIONS.map(d => (
                <Button
                  key={d}
                  variant={distanceLimit === d ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDistanceLimit(d)}
                >
                  {d} km
                </Button>
              ))}
            </div>
          </div>

          {/* ─── Section 1: Auto Detect ─── */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-heading font-semibold text-foreground flex items-center gap-2">
                <Navigation className="w-5 h-5 text-primary" />
                Nearby Doctors (Auto Detect)
              </h2>
              <Button onClick={handleAutoDetect} disabled={locationLoading} size="sm" className="gap-2">
                {locationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                {locationLoading ? "Detecting..." : "Detect My Location"}
              </Button>
            </div>

            {locationError && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {locationError}
              </div>
            )}

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {nearbyDoctors.length > 0 ? (
                nearbyDoctors.map(doc => <DoctorCard key={doc.id} doctor={doc} />)
              ) : (
                <EmptyState message='Click "Detect My Location" to find nearby doctors.' />
              )}
            </div>
          </section>

          {/* ─── Section 2: City Search ─── */}
          <section className="mb-12">
            <h2 className="text-xl font-heading font-semibold text-foreground flex items-center gap-2 mb-4">
              <Search className="w-5 h-5 text-primary" />
              Search Doctors by City
            </h2>

            <div className="flex gap-3 mb-5">
              <Input
                placeholder="Enter city (e.g., Mumbai, Delhi, Pune)"
                value={city}
                onChange={e => setCity(e.target.value)}
                onKeyDown={e => e.key === "Enter" && fetchDoctorsByCity()}
                className="max-w-md"
              />
              <Button onClick={fetchDoctorsByCity} disabled={cityLoading || !city.trim()} className="gap-2">
                {cityLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {cityLoading ? "Searching..." : "Search"}
              </Button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {cityDoctors.length > 0 ? (
                cityDoctors.map(doc => <DoctorCard key={doc.id} doctor={doc} />)
              ) : (
                <EmptyState message="Enter a city name and click Search to find doctors." />
              )}
            </div>
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
