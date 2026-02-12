"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import {
  GoogleMap,
  Marker,
  useLoadScript,
  Autocomplete,
} from "@react-google-maps/api";

export default function EditHorsePage() {
  const { id } = useParams();
  const router = useRouter();

  const { isLoaded } = useLoadScript({
    googleMapsApiKey:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ["places"],
  });

  const [horse, setHorse] = useState<any>(null);
  const [locationCoords, setLocationCoords] = useState<any>(null);
  const [autocomplete, setAutocomplete] = useState<any>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    loadHorse();
  }, []);

  const loadHorse = async () => {
    const { data } = await supabase
      .from("horses")
      .select("*")
      .eq("id", id)
      .single();

    setHorse(data);

    if (data?.lat && data?.lng) {
      setLocationCoords({
        lat: data.lat,
        lng: data.lng,
      });
    }
  };

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

  const uploadImage = async () => {
    if (!imageFile) return horse.image_url;

    const filePath = `horses/${Date.now()}-${imageFile.name}`;

    await supabase.storage
      .from("horse-images")
      .upload(filePath, imageFile);

    const { data } = supabase.storage
      .from("horse-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSave = async () => {
    const imageUrl = await uploadImage();

    await supabase
      .from("horses")
      .update({
        name: horse.name,
        breed: horse.breed,
        age: horse.age,
        height_hh: horse.height_hh,
        temperament: horse.temperament,
        description: horse.description,
        price_per_day: horse.price_per_day,
        location: horse.location,
        lat: locationCoords?.lat,
        lng: locationCoords?.lng,
        image_url: imageUrl,
      })
      .eq("id", id);

    router.push("/dashboard/owner/horses");
  };

  if (!horse || !isLoaded)
    return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ padding: 40, maxWidth: 700 }}>
      <h1>Edit Horse</h1>

      <input
        value={horse.name || ""}
        onChange={(e) =>
          setHorse({ ...horse, name: e.target.value })
        }
        placeholder="Name"
      />

      <input
        value={horse.breed || ""}
        onChange={(e) =>
          setHorse({ ...horse, breed: e.target.value })
        }
        placeholder="Breed"
      />

      <input
        type="number"
        value={horse.age || ""}
        onChange={(e) =>
          setHorse({
            ...horse,
            age: Number(e.target.value),
          })
        }
        placeholder="Age"
      />

      <input
        type="number"
        value={horse.height_hh || ""}
        onChange={(e) =>
          setHorse({
            ...horse,
            height_hh: Number(e.target.value),
          })
        }
        placeholder="Height (hh)"
      />

      <input
        value={horse.temperament || ""}
        onChange={(e) =>
          setHorse({
            ...horse,
            temperament: e.target.value,
          })
        }
        placeholder="Temperament"
      />

      <input
        type="number"
        value={horse.price_per_day || ""}
        onChange={(e) =>
          setHorse({
            ...horse,
            price_per_day: Number(e.target.value),
          })
        }
        placeholder="Price per day"
      />

      <textarea
        value={horse.description || ""}
        onChange={(e) =>
          setHorse({
            ...horse,
            description: e.target.value,
          })
        }
        placeholder="Description"
      />

      <Autocomplete
        onLoad={(auto) => setAutocomplete(auto)}
        onPlaceChanged={onPlaceChanged}
      >
        <input
          value={horse.location || ""}
          onChange={(e) =>
            setHorse({
              ...horse,
              location: e.target.value,
            })
          }
          placeholder="Search Location"
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

      {horse.image_url && (
        <img
          src={horse.image_url}
          style={{
            width: "100%",
            maxHeight: 200,
            objectFit: "cover",
            marginTop: 20,
            borderRadius: 8,
          }}
        />
      )}

      <input
        type="file"
        onChange={(e) =>
          setImageFile(e.target.files?.[0] || null)
        }
      />

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
        Save Changes
      </button>
    </div>
  );
}
