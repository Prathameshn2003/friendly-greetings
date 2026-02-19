import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, MapPin, Stethoscope, Search, Navigation,
  ShieldCheck, Phone, Mail, Building2, AlertCircle,
  Heart, ExternalLink, SortAsc, User, Lock, Globe,
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

type SortOption = "nearest" | "verified" | "alpha";

// ─── Haversine ───────────────────────────────────────────────────────────────
const calcDist = (la1: number, lo1: number, la2: number, lo2: number) => {
  const R = 6371;
  const dLat = (la2 - la1) * (Math.PI / 180);
  const dLon = (lo2 - lo1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(la1 * Math.PI / 180) * Math.cos(la2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ─── Overpass Query ──────────────────────────────────────────────────────────
const buildOverpassQuery = (lat: number, lon: number, r: number) => `
[out:json][timeout:25];
(
  node["amenity"="clinic"]["healthcare:speciality"="gynaecology"](around:${r},${lat},${lon});
  node["amenity"="hospital"]["healthcare:speciality"="gynaecology"](around:${r},${lat},${lon});
  node["amenity"="clinic"]["healthcare:speciality"="obstetrics"](around:${r},${lat},${lon});
  node["amenity"="hospital"]["healthcare:speciality"="obstetrics"](around:${r},${lat},${lon});
  node["amenity"="clinic"]["name"~"gynec|women|ladies|maternity|obstet",i](around:${r},${lat},${lon});
  node["amenity"="hospital"]["name"~"gynec|women|ladies|maternity|obstet",i](around:${r},${lat},${lon});
  way["amenity"="clinic"]["healthcare:speciality"="gynaecology"](around:${r},${lat},${lon});
  way["amenity"="hospital"]["healthcare:speciality"="gynaecology"](around:${r},${lat},${lon});
);
out center;
`;

const geocodeCity = async (city: string) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`,
      { headers: { "User-Agent": "NaariCare-App/1.0" } }
    );
    if (!res.ok) return null;
    const d = await res.json();
    if (!d.length) return null;
    return { lat: parseFloat(d[0].lat), lon: parseFloat(d[0].lon) };
  } catch { return null; }
};

const fetchOverpass = async (lat: number, lon: number, r: number, uLat: number, uLon: number): Promise<Doctor[]> => {
  const q = buildOverpassQuery(lat, lon, r);
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: `data=${encodeURIComponent(q)}`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  if (!res.ok) throw new Error("Overpass error");
  const data = await res.json();
  return (data.elements || []).map((el: any) => {
    const elLat = el.lat ?? el.center?.lat;
    const elLon = el.lon ?? el.center?.lon;
    const tags = el.tags || {};
    const dist = elLat && elLon ? calcDist(uLat, uLon, elLat, elLon) : 999;
    return {
      id: `osm-${el.id}`,
      name: tags.name || tags["name:en"] || "Women's Health Clinic",
      specialization: tags["healthcare:speciality"] === "gynaecology"
        ? "Gynecologist"
        : tags["healthcare:speciality"] === "obstetrics"
        ? "Obstetrician"
        : "Women's Health Specialist",
      hospital: tags["operator"] || tags["brand"] || null,
      location: [tags["addr:street"], tags["addr:city"], tags["addr:state"]].filter(Boolean).join(", ") || tags["addr:full"] || null,
      phone: tags.phone || tags["contact:phone"] || null,
      latitude: elLat,
      longitude: elLon,
      distance: Number(dist.toFixed(2)),
      isVerified: false,
    } as Doctor;
  });
};

const sortDoctors = (doctors: Doctor[], sort: SortOption): Doctor[] => {
  return [...doctors].sort((a, b) => {
    if (sort === "verified") {
      if (a.isVerified && !b.isVerified) return -1;
      if (!a.isVerified && b.isVerified) return 1;
      return (a.distance ?? 999) - (b.distance ?? 999);
    }
    if (sort === "alpha") return a.name.localeCompare(b.name);
    // nearest
    return (a.distance ?? 999) - (b.distance ?? 999);
  });
};

const mergeResults = (api: Doctor[], admins: Doctor[], uLat: number, uLon: number, limitKm: number): Doctor[] => {
  const adminWithDist = admins
    .filter(d => d.latitude != null && d.longitude != null)
    .map(d => ({ ...d, distance: Number(calcDist(uLat, uLon, d.latitude!, d.longitude!).toFixed(2)) }));
  const adminNoCoords = admins.filter(d => d.latitude == null || d.longitude == null);
  const adminNames = new Set(admins.map(d => d.name.toLowerCase()));
  const filtered = api.filter(d => !adminNames.has(d.name.toLowerCase()));
  return [
    ...adminWithDist.filter(d => (d.distance ?? 0) <= limitKm),
    ...adminNoCoords,
    ...filtered.filter(d => (d.distance ?? 999) <= limitKm),
  ];
};

// ─── Distance Badge ──────────────────────────────────────────────────────────
const DistanceBadge = ({ km }: { km: number }) => {
  // color-coded: close = success-ish, mid = warn-ish, far = destructive-ish
  const style =
    km < 5
      ? { bg: "hsl(142 72% 94%)", fg: "hsl(142 76% 28%)", border: "hsl(142 72% 78%)" }
      : km <= 15
      ? { bg: "hsl(48 96% 93%)", fg: "hsl(32 95% 34%)", border: "hsl(48 96% 78%)" }
      : { bg: "hsl(0 86% 95%)", fg: "hsl(0 84% 38%)", border: "hsl(0 86% 84%)" };
  return (
    <span
      style={{ background: style.bg, color: style.fg, borderColor: style.border }}
      className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border"
    >
      <Navigation className="w-3 h-3" />
      {km} km
    </span>
  );
};

// ─── Avatar Initials ──────────────────────────────────────────────────────────
const AVATAR_GRADIENTS = [
  { from: "hsl(340 82% 65%)", to: "hsl(0 72% 60%)" },
  { from: "hsl(270 72% 65%)", to: "hsl(260 72% 58%)" },
  { from: "hsl(300 72% 60%)", to: "hsl(340 72% 62%)" },
  { from: "hsl(350 75% 62%)", to: "hsl(330 72% 55%)" },
];

const DoctorAvatar = ({ name }: { name: string }) => {
  const initials = name
    .replace(/^Dr\.?\s*/i, "")
    .split(" ")
    .slice(0, 2)
    .map(w => w[0])
    .join("")
    .toUpperCase();
  const g = AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length];
  return (
    <div
      style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
      className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-md"
    >
      <span className="text-white font-bold text-lg">{initials || "Dr"}</span>
    </div>
  );
};

// ─── Doctor Card ─────────────────────────────────────────────────────────────
const DoctorCard = ({ doctor, index }: { doctor: Doctor; index: number }) => {
  const mapsUrl = doctor.latitude && doctor.longitude
    ? `https://www.google.com/maps?q=${doctor.latitude},${doctor.longitude}`
    : `https://www.google.com/maps/search/${encodeURIComponent(`${doctor.name} ${doctor.location || ""}`)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: "easeOut" }}
      className="group relative bg-card border border-border/60 rounded-2xl p-5 flex flex-col gap-4
        hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300 cursor-default overflow-hidden"
    >
      {/* Subtle gradient top bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/60 via-primary/30 to-secondary/60 rounded-t-2xl" />

      {/* Top: avatar + name + badge */}
      <div className="flex items-start gap-4 pt-1">
        <DoctorAvatar name={doctor.name} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <h3 className="font-bold text-base text-foreground leading-tight">{doctor.name}</h3>
              <p className="text-sm font-medium text-primary mt-0.5">{doctor.specialization}</p>
            </div>
            {doctor.isVerified && (
              <Badge
                style={{ background: "hsl(142 72% 94%)", color: "hsl(142 76% 28%)", borderColor: "hsl(142 72% 78%)" }}
                className="flex items-center gap-1 text-xs shrink-0 border"
              >
                <ShieldCheck className="w-3 h-3" />
                Verified
              </Badge>
            )}
          </div>
          {doctor.distance !== undefined && (
            <div className="mt-1.5">
              <DistanceBadge km={doctor.distance} />
            </div>
          )}
        </div>
      </div>

      {/* Middle: details */}
      <div className="space-y-1.5 text-sm text-muted-foreground">
        {doctor.hospital && (
          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 shrink-0 text-primary/50" />
            <span className="truncate">{doctor.hospital}</span>
          </div>
        )}
        {doctor.location && (
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-primary/50 mt-0.5" />
            <span className="line-clamp-2 text-xs">{doctor.location}</span>
          </div>
        )}
        {doctor.phone && (
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 shrink-0 text-primary/50" />
            <a href={`tel:${doctor.phone}`} className="hover:text-primary transition-colors text-xs">{doctor.phone}</a>
          </div>
        )}
        {doctor.email && (
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 shrink-0 text-primary/50" />
            <a href={`mailto:${doctor.email}`} className="hover:text-primary transition-colors text-xs truncate">{doctor.email}</a>
          </div>
        )}
      </div>

      {/* Description */}
      {doctor.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 border-t border-border/50 pt-3">
          {doctor.description}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-1">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs rounded-xl gap-1.5 border-border/60
            group-hover:border-primary/40 group-hover:text-primary transition-colors"
          onClick={() => window.open(mapsUrl, "_blank")}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Get Directions
        </Button>
        {doctor.phone && (
          <Button
            size="sm"
            className="flex-1 text-xs rounded-xl gap-1.5 bg-primary/90 hover:bg-primary"
            onClick={() => window.open(`tel:${doctor.phone}`, "_self")}
          >
            <Phone className="w-3.5 h-3.5" />
            Call
          </Button>
        )}
      </div>
    </motion.div>
  );
};

// ─── Skeleton ────────────────────────────────────────────────────────────────
const SkeletonCard = ({ i }: { i: number }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: i * 0.08 }}
    className="bg-card border border-border/60 rounded-2xl p-5 space-y-4"
  >
    <div className="flex gap-4">
      <div className="w-14 h-14 rounded-full bg-muted animate-pulse" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
        <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
        <div className="h-5 bg-muted rounded-full animate-pulse w-16" />
      </div>
    </div>
    <div className="space-y-2">
      <div className="h-3 bg-muted rounded animate-pulse w-full" />
      <div className="h-3 bg-muted rounded animate-pulse w-4/5" />
      <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
    </div>
    <div className="flex gap-2 pt-2">
      <div className="h-8 bg-muted rounded-xl animate-pulse flex-1" />
      <div className="h-8 bg-muted rounded-xl animate-pulse flex-1" />
    </div>
  </motion.div>
);

// ─── Empty State ─────────────────────────────────────────────────────────────
const EmptyState = ({ message, onShowVerified }: { message: string; onShowVerified?: () => void }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="col-span-full flex flex-col items-center justify-center py-16 gap-4 text-center"
  >
    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
      <Stethoscope className="w-10 h-10 text-primary/50" />
    </div>
    <div>
      <p className="font-medium text-foreground">{message}</p>
      <p className="text-sm text-muted-foreground mt-1">Try increasing the search radius</p>
    </div>
    {onShowVerified && (
      <Button variant="outline" size="sm" className="rounded-xl" onClick={onShowVerified}>
        <ShieldCheck className="w-4 h-4 mr-2" />
        View Verified Doctors
      </Button>
    )}
  </motion.div>
);

const ErrorBanner = ({ message }: { message: string }) => (
  <motion.div
    initial={{ opacity: 0, y: -8 }}
    animate={{ opacity: 1, y: 0 }}
    className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm flex items-center gap-2 border border-destructive/20"
  >
    <AlertCircle className="w-4 h-4 shrink-0" />
    {message}
  </motion.div>
);

const DISTANCE_OPTIONS = [5, 10, 20, 50];

// ─── Results Section ─────────────────────────────────────────────────────────
const ResultsSection = ({
  title, icon, doctors, loading, error, emptyMsg, sort, onShowVerified,
}: {
  title: string;
  icon: React.ReactNode;
  doctors: Doctor[];
  loading: boolean;
  error: string | null;
  emptyMsg: string;
  sort: SortOption;
  onShowVerified?: () => void;
}) => {
  const sorted = sortDoctors(doctors, sort);
  return (
    <section className="mb-14">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        <h2 className="text-xl font-heading font-bold text-foreground">{title}</h2>
        {doctors.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {doctors.length} found
          </span>
        )}
      </div>
      {error && <ErrorBanner message={error} />}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          [0, 1, 2].map(i => <SkeletonCard key={i} i={i} />)
        ) : sorted.length > 0 ? (
          sorted.map((doc, i) => <DoctorCard key={doc.id} doctor={doc} index={i} />)
        ) : (
          <EmptyState message={emptyMsg} onShowVerified={onShowVerified} />
        )}
      </div>
    </section>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
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
  const [sortOption, setSortOption] = useState<SortOption>("nearest");
  const [nearbySearched, setNearbySearched] = useState(false);
  const [citySearched, setCitySearched] = useState(false);

  const fetchAdminDoctors = useCallback(async () => {
    const { data, error } = await supabase
      .from("doctors")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (!error && data) {
      setAdminDoctors(data.map((doc: any) => ({
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
      })));
    }
  }, []);

  const runNearbySearch = useCallback(async (lat: number, lon: number, limitKm: number, admins: Doctor[]) => {
    setLocationLoading(true);
    setLocationError(null);
    setNearbySearched(true);
    try {
      const overpass = await fetchOverpass(lat, lon, limitKm * 1000, lat, lon);
      const merged = mergeResults(overpass, admins, lat, lon, limitKm);
      if (merged.length === 0) {
        setNearbyDoctors(admins);
        if (admins.length > 0) setLocationError(`No results within ${limitKm} km via API. Showing verified doctors.`);
        else setLocationError("No doctors found. Try a larger radius.");
      } else {
        setNearbyDoctors(merged);
      }
    } catch {
      setNearbyDoctors(admins);
      setLocationError("Could not reach Overpass API. Showing verified doctors only.");
    } finally {
      setLocationLoading(false);
    }
  }, []);

  const handleAutoDetect = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported by your browser.");
      setNearbyDoctors(adminDoctors);
      return;
    }
    setLocationLoading(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        setUserCoords({ lat: latitude, lon: longitude });
        runNearbySearch(latitude, longitude, distanceLimit, adminDoctors);
      },
      () => {
        setLocationLoading(false);
        setLocationError("Location permission denied. Showing verified doctors.");
        setNearbyDoctors(adminDoctors);
        setNearbySearched(true);
      },
      { timeout: 10000 }
    );
  }, [adminDoctors, distanceLimit, runNearbySearch]);

  const handleCitySearch = useCallback(async () => {
    if (!city.trim()) return;
    setCityLoading(true);
    setCityError(null);
    setCitySearched(true);
    try {
      const coords = await geocodeCity(city.trim());
      if (!coords) {
        setCityError("City not found. Check spelling and try again.");
        setCityDoctors(adminDoctors);
        return;
      }
      const overpass = await fetchOverpass(coords.lat, coords.lon, distanceLimit * 1000, coords.lat, coords.lon);
      const cityLower = city.toLowerCase();
      const matchingAdmin = adminDoctors.filter(
        d => d.location?.toLowerCase().includes(cityLower) || d.hospital?.toLowerCase().includes(cityLower)
      );
      const adminNames = new Set(adminDoctors.map(d => d.name.toLowerCase()));
      const filteredOSM = overpass.filter(d => !adminNames.has(d.name.toLowerCase()) && (d.distance ?? 999) <= distanceLimit);
      const combined = [...matchingAdmin, ...filteredOSM];
      if (combined.length === 0) {
        setCityDoctors(adminDoctors);
        setCityError(`No results in "${city}" within ${distanceLimit} km. Showing verified doctors.`);
      } else {
        setCityDoctors(combined);
      }
    } catch {
      setCityDoctors(adminDoctors);
      setCityError("API error. Showing verified doctors only.");
    } finally {
      setCityLoading(false);
    }
  }, [city, distanceLimit, adminDoctors]);

  useEffect(() => {
    if (userCoords) runNearbySearch(userCoords.lat, userCoords.lon, distanceLimit, adminDoctors);
  }, [distanceLimit]); // eslint-disable-line

  useEffect(() => { fetchAdminDoctors(); }, [fetchAdminDoctors]);

  const scrollToVerified = () => {
    document.getElementById("verified-section")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">

        {/* ─── Hero Section ─────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/10 border-b border-border/40">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-primary/8 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-secondary/10 blur-3xl" />
          </div>
          <div className="container mx-auto px-4 max-w-6xl py-14 relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-2xl mx-auto"
            >
              {/* Animated icon */}
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary/25"
              >
                <Heart className="w-8 h-8 text-primary-foreground fill-primary-foreground" />
              </motion.div>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-foreground leading-tight mb-4">
                Find Women's Health{" "}
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Specialists
                </span>{" "}
                Near You
              </h1>
              <p className="text-muted-foreground text-base md:text-lg">
                Search verified gynecologists and women's health experts near your location.
                Powered by OpenStreetMap — free and private.
              </p>

              {/* Trust pills */}
              <div className="flex flex-wrap justify-center gap-3 mt-6">
                {[
                  { icon: <ShieldCheck className="w-3.5 h-3.5" />, label: "Verified Doctors" },
                  { icon: <Globe className="w-3.5 h-3.5" />, label: "OpenStreetMap Data" },
                  { icon: <Lock className="w-3.5 h-3.5" />, label: "Private Search" },
                ].map(({ icon, label }) => (
                  <span key={label}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground
                      bg-background/80 border border-border/60 px-3 py-1.5 rounded-full backdrop-blur-sm">
                    <span className="text-primary">{icon}</span>
                    {label}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ─── Search & Filter Section ───────────────────────────────────── */}
        <section className="sticky top-16 z-20 bg-background/95 backdrop-blur-md border-b border-border/60 shadow-sm">
          <div className="container mx-auto px-4 max-w-6xl py-4">
            <div className="flex flex-wrap gap-3 items-center">
              {/* Auto detect button */}
              <Button
                onClick={handleAutoDetect}
                disabled={locationLoading}
                className="gap-2 rounded-xl bg-primary hover:bg-primary/90 shadow-sm"
              >
                {locationLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Navigation className="w-4 h-4" />}
                {locationLoading ? "Detecting..." : "Detect Location"}
              </Button>

              {/* City search */}
              <div className="flex gap-2 flex-1 min-w-[200px]">
                <Input
                  placeholder="Search by city (e.g., Mumbai)"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCitySearch()}
                  className="rounded-xl border-border/60 bg-background"
                />
                <Button
                  onClick={handleCitySearch}
                  disabled={cityLoading || !city.trim()}
                  variant="outline"
                  className="rounded-xl gap-2 border-border/60 shrink-0"
                >
                  {cityLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Search
                </Button>
              </div>

              {/* Distance filter */}
              <Select
                value={String(distanceLimit)}
                onValueChange={v => setDistanceLimit(Number(v))}
              >
                <SelectTrigger className="w-[130px] rounded-xl border-border/60 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border shadow-lg z-50">
                  {DISTANCE_OPTIONS.map(d => (
                    <SelectItem key={d} value={String(d)}>{d} km radius</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortOption} onValueChange={v => setSortOption(v as SortOption)}>
                <SelectTrigger className="w-[160px] rounded-xl border-border/60 bg-background">
                  <SortAsc className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border shadow-lg z-50">
                  <SelectItem value="nearest">Nearest First</SelectItem>
                  <SelectItem value="verified">Verified First</SelectItem>
                  <SelectItem value="alpha">A–Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* ─── Results Sections ─────────────────────────────────────────── */}
        <div className="container mx-auto px-4 max-w-6xl py-10">

          {/* Nearby (Auto Detect) */}
          <ResultsSection
            title="Nearby Doctors"
            icon={<Navigation className="w-4 h-4" />}
            doctors={nearbyDoctors}
            loading={locationLoading}
            error={locationError}
            sort={sortOption}
            emptyMsg={nearbySearched ? "No doctors found in this area." : 'Click "Detect Location" to find nearby doctors.'}
            onShowVerified={scrollToVerified}
          />

          {/* City Search Results */}
          <ResultsSection
            title={citySearched ? `Doctors in "${city || "City"}"` : "City Search Results"}
            icon={<Search className="w-4 h-4" />}
            doctors={cityDoctors}
            loading={cityLoading}
            error={cityError}
            sort={sortOption}
            emptyMsg="Enter a city name above and click Search."
            onShowVerified={scrollToVerified}
          />

          {/* Admin Verified Doctors */}
          <section id="verified-section">
            <div className="flex items-center gap-2 mb-5">
              <div
                style={{ background: "hsl(142 72% 94%)", color: "hsl(142 76% 28%)" }}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
              >
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h2 className="text-xl font-heading font-bold text-foreground">Admin Verified Doctors</h2>
              {adminDoctors.length > 0 && (
                <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {adminDoctors.length} verified
                </span>
              )}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {adminDoctors.length > 0
                ? sortDoctors(adminDoctors, sortOption).map((doc, i) => (
                    <DoctorCard key={doc.id} doctor={doc} index={i} />
                  ))
                : (
                  <EmptyState message="No verified doctors added yet." />
                )}
            </div>
          </section>

          {/* Trust Footer */}
          <div className="mt-16 p-6 rounded-2xl bg-primary/5 border border-border/40 text-center">
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Only verified doctors displayed
              </span>
              <span className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary/70" />
                Powered by OpenStreetMap
              </span>
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                Secure &amp; private search
              </span>
              <span className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary/80" />
                Women's health focused
              </span>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Doctors;
