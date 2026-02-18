import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Loader2, Search, MapPin, Stethoscope } from "lucide-react";

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  hospital: string | null;
  location: string | null;
  latitude: number;
  longitude: number;
  distance?: number;
  description: string | null;
}

const Doctors = () => {
  const [osmDoctors, setOsmDoctors] = useState<Doctor[]>([]);
  const [adminDoctors, setAdminDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);

  const [city, setCity] = useState("Pune");
  const [distanceLimit, setDistanceLimit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");

  // 📌 Haversine Formula (Calculate distance between 2 lat/lon)
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // 🌍 Fetch OSM Doctors
  const fetchOSMDoctors = async () => {
    setLoading(true);

    try {
      // Get city coordinates first
      const cityRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${city}&limit=1`,
        { headers: { "User-Agent": "NaariCare-App" } }
      );

      const cityData = await cityRes.json();
      if (!cityData.length) return;

      const cityLat = parseFloat(cityData[0].lat);
      const cityLon = parseFloat(cityData[0].lon);

      // Fetch doctors in city
      const doctorRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=gynecologist+in+${city}&limit=30`,
        { headers: { "User-Agent": "NaariCare-App" } }
      );

      const doctorData = await doctorRes.json();

      const formattedDoctors: Doctor[] = doctorData.map((place: any) => {
        const lat = parseFloat(place.lat);
        const lon = parseFloat(place.lon);
        const distance = calculateDistance(cityLat, cityLon, lat, lon);

        return {
          id: place.place_id,
          name: place.display_name.split(",")[0],
          specialization: "Gynecologist",
          hospital: null,
          location: place.display_name,
          latitude: lat,
          longitude: lon,
          distance: Number(distance.toFixed(2)),
          description: "Women's Health Specialist",
        };
      });

      // Filter by distance
      const nearby = formattedDoctors.filter(
        (doc) => doc.distance! <= distanceLimit
      );

      setOsmDoctors(nearby);
      setFilteredDoctors([...nearby, ...adminDoctors]);

    } catch (err) {
      console.error("Error fetching OSM doctors:", err);
    }

    setLoading(false);
  };

  // 👩‍⚕️ Fetch Admin Doctors from Supabase
  const fetchAdminDoctors = async () => {
    const { data } = await supabase.from("doctors").select("*");

    if (data) {
      const formatted = data.map((doc: any) => ({
        id: doc.id,
        name: doc.name,
        specialization: doc.specialization,
        hospital: doc.hospital,
        location: doc.location,
        latitude: doc.latitude,
        longitude: doc.longitude,
        description: doc.description,
      }));

      setAdminDoctors(formatted);
    }
  };

  useEffect(() => {
    fetchAdminDoctors();
  }, []);

  useEffect(() => {
    fetchOSMDoctors();
  }, [city, distanceLimit]);

  // 🔎 Search filter
  useEffect(() => {
    if (searchQuery) {
      setFilteredDoctors(
        [...osmDoctors, ...adminDoctors].filter(
          (d) =>
            d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.location?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredDoctors([...osmDoctors, ...adminDoctors]);
    }
  }, [searchQuery, osmDoctors, adminDoctors]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16 container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
          <Stethoscope /> Find Nearby Doctors
        </h1>

        {/* City Input */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Input
            placeholder="Enter City (e.g., Mumbai)"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />

          <Input
            type="number"
            placeholder="Distance (km)"
            value={distanceLimit}
            onChange={(e) => setDistanceLimit(Number(e.target.value))}
          />

          <Input
            placeholder="Search doctor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <Loader2 className="animate-spin" />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doctor) => (
              <div key={doctor.id} className="glass-card p-6 rounded-xl">
                <h3 className="font-semibold text-lg">{doctor.name}</h3>
                <p className="text-sm text-accent">
                  {doctor.specialization}
                </p>
                {doctor.location && (
                  <p className="text-sm flex items-center gap-2 mt-2">
                    <MapPin size={16} /> {doctor.location}
                  </p>
                )}
                {doctor.distance && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Distance: {doctor.distance} km
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Doctors;
