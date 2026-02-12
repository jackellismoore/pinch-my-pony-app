"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
  GoogleMap,
  Marker,
  useLoadScript,
  Autocomplete,
} from "@react-google-maps/api";

export default function AddHorsePage() {
  const router = useRouter();
  const { isLoaded } = useLoadScript({
    googleMapsApiKey:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ["places"],
  });

  const [horse, setHorse] = useState<any>({});
  const [locationCoords, setLocationCoords] = useState<any>(null);
  const [autocomplete, setAutocomplete] = useState<any>(null);

  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();

      setHorse({
        ...horse,
        location: place.formatted_address,
      });

      setLocationCoords({ lat, lng });
    }
  };

  const handleSave = async () => {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    await supabase.from("horses").insert({
      ...horse,
      owner_id: userId,
      lat: locationCoords?.lat,
      lng: locationCoords?.lng,
      is_active: true,
    });

    router.push("/dashboard/owner/horses");
  };

  if (!isLoaded) return <div>Loading map...</div>;

  return (
    <div style={{ padding: 40 }}>
      <h1>Add Horse</h1>

      <input
        placeholder="Name"
        onChange={(e) =>
          setHorse({ ...horse, name: e.target.value })
        }
      />

      <input
        placeholder="Breed"
        onChange={(e) =>
          setHorse({ ...horse, breed: e.target.value })
        }
      />

      <input
        type="number"
        placeholder="Age"
        onChange={(e) =>
          setHorse({ ...horse, age: Number(e.target.value) })
        }
      />

      <input
        type="number"
        placeholder="Height (hh)"
        onChange={(e) =>
          setHorse({
            ...horse,
            height_hh: Number(e.target.value),
          })
        }
      />

      <input
        placeholder="Temperament"
        onChange={(e) =>
          setHorse({
            ...horse,
            temperament: e.target.value,
          })
        }
      />

      <input
        type="number"
        placeholder="Price per day"
        onChange={(e) =>
          setHorse({
            ...horse,
            price_per_day: Number(e.target.value),
          })
        }
      />

      <Autocomplete
        onLoad={(auto) => setAutocomplete(auto)}
        onPlaceChanged={onPlaceChanged}
      >
        <input
          placeholder="Search Location"
          style={{ width: "100%", marginTop: 10 }}
        />
      </Autocomplete>

      {locationCoords && (
        <GoogleMap
          zoom={10}
          center={locationCoords}
          mapContainerStyle={{
            width: "100%",
            height: "300px",
            marginTop: 20,
          }}
        >
          <Marker position={locationCoords} />
        </GoogleMap>
      )}

      <button
        onClick={handleSave}
        style={{
          marginTop: 20,
          padding: "10px 20px",
          background: "#16a34a",
          color: "white",
          border: "none",
          borderRadius: 6,
        }}
      >
        Save Horse
      </button>
    </div>
  );
}
