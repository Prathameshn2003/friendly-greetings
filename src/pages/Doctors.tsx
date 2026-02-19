import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, Stethoscope } from "lucide-react";

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  location: string | null;
  latitude: number;
  longitude: number;
  distance?: number;
  description?: string | null;
}

const Doctors = () => {
  const [autoDoctors, setAutoDoctors] = useState<Doctor[]>([]);
  const [cityDoctors, setCityDoctors] = useState<Doctor[]>([]);
  const [adminDoctors, setAdminDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);

  const [city, setCity] = useState("");
  const [distanceLimit, setDistanceLimit] = useState(10);

  // 📌 Haversine Distance
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const R = 6371;
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

  // =====================================
  // 1️⃣ AUTO DETECT LOCATION
  // =====================================
  const fetchNearbyDoctorsAuto = async () => {
    if (!navigator.geolocation) return;

    setLoading(true);

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=gynecologist&limit=30`,
          { headers: { "User-Agent": "NaariCare-App" } }
        );

        const data = await res.json();

        const formatted = data
          .map((place: any) => {
            const lat = parseFloat(place.lat);
            const lon = parseFloat(place.lon);
            const distance = calculateDistance(
              latitude,
              longitude,
              lat,
              lon
            );

            return {
              id: place.place_id,
              name: place.display_name.split(",")[0],
              specialization: "Gynecologist",
              location: place.display_name,
              latitude: lat,
              longitude: lon,
              distance: Number(distance.toFixed(2)),
            };
          })
          .filter((doc: Doctor) => doc.distance! <= distanceLimit);

        if (formatted.length === 0) {
          // fallback to admin doctors
          setAutoDoctors(adminDoctors);
        } else {
          setAutoDoctors(formatted);
        }
      } catch (err) {
        setAutoDoctors(adminDoctors);
      }

      setLoading(false);
    });
  };

  // =====================================
  // 2️⃣ SEARCH BY CITY
  // =====================================
  const fetchDoctorsByCity = async () => {
    if (!city) return;

    setLoading(true);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=gynecologist+in+${city}&limit=30`,
        { headers: { "User-Agent": "NaariCare-App" } }
      );

      const data = await res.json();

      const formatted = data.map((place: any) => ({
        id: place.place_id,
        name: place.display_name.split(",")[0],
        specialization: "Gynecologist",
        location: place.display_name,
        latitude: parseFloat(place.lat),
        longitude: parseFloat(place.lon),
      }));

      setCityDoctors(formatted);
    } catch (err) {
      setCityDoctors([]);
    }

    setLoading(false);
  };

  // =====================================
  // 3️⃣ FETCH ADMIN DOCTORS
  // =====================================
  const fetchAdminDoctors = async () => {
const { data, error } = await supabase
  .from("doctors")
  .select("*")
  .eq("is_active", true)
  .order("name", { ascending: true });


  if (error) {
    console.error("Error fetching admin doctors:", error);
    return;
  }

  if (data) {
    const formatted = data.map((doc: any) => ({
      id: doc.id,
      name: doc.name,
      specialization: doc.specialization,
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
    fetchNearbyDoctorsAuto();
  }, [distanceLimit, adminDoctors]);

  // =====================================
  // UI
  // =====================================

  const DoctorCard = ({ doctor }: { doctor: Doctor }) => (
    <div className="glass-card p-6 rounded-xl">
      <h3 className="font-semibold text-lg">{doctor.name}</h3>
      <p className="text-sm text-accent">{doctor.specialization}</p>
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
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16 container mx-auto px-4">

        <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
          <Stethoscope /> Find Doctors
        </h1>

        {/* Distance Filter */}
        <div className="mb-8">
          <Input
            type="number"
            placeholder="Search within distance (km)"
            value={distanceLimit}
            onChange={(e) => setDistanceLimit(Number(e.target.value))}
          />
        </div>

        {loading && <Loader2 className="animate-spin mb-6" />}

        {/* 🔹 Auto Nearby Section */}
        <h2 className="text-xl font-semibold mb-4">
          Nearby Doctors (Auto Detected)
        </h2>

        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {autoDoctors.length > 0 ? (
            autoDoctors.map((doc) => <DoctorCard key={doc.id} doctor={doc} />)
          ) : (
            <p>No nearby doctors found.</p>
          )}
        </div>

        {/* 🔹 Search by City Section */}
        <h2 className="text-xl font-semibold mb-4">
          Search Doctors by City
        </h2>

        <div className="flex gap-4 mb-6">
          <Input
            placeholder="Enter city (e.g., Mumbai)"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <button
            onClick={fetchDoctorsByCity}
            className="bg-primary text-white px-6 rounded-lg"
          >
            Search
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {cityDoctors.map((doc) => (
            <DoctorCard key={doc.id} doctor={doc} />
          ))}
        </div>

        {/* 🔹 Admin Doctors Section */}
        <h2 className="text-xl font-semibold mb-4">
          Admin Verified Doctors
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {adminDoctors.map((doc) => (
            <DoctorCard key={doc.id} doctor={doc} />
          ))}
        </div>

      </main>
      <Footer />
    </div>
  );
};

export default Doctors;
