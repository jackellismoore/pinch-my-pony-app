"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { parseHorseHeight } from "@/lib/horseHeight";
import LocationAutocomplete from "@/components/LocationAutocomplete";

const palette = {
  forest: "#1F3D2B",
  navy: "#1F2A44",
};

const STORAGE_BUCKET = "horses";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg","image/jpg","image/png","image/webp"]);
function validateHorseImage(file: File) {
  const mime = (file.type || "").toLowerCase();
  const extOk = /\.(jpe?g|png|webp)$/i.test(file.name);
  if (!ALLOWED_IMAGE_TYPES.has(mime) && !extOk) throw new Error("Please choose JPG, PNG, or WebP images.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Each horse photo must be 5MB or smaller.");
}
function storagePathFromPublicUrl(url: string) {
  const marker = "/storage/v1/object/public/" + STORAGE_BUCKET + "/";
  const i = url.indexOf(marker);
  return i >= 0 ? decodeURIComponent(url.slice(i + marker.length)) : null;
}

const BREED_OPTIONS = [
  "Arabian",
  "Cob",
  "Connemara",
  "Clydesdale",
  "Dutch Warmblood",
  "Ex-Racehorse",
  "Fell Pony",
  "Friesian",
  "Hackney",
  "Highland Pony",
  "Irish Draught",
  "Irish Sport Horse",
  "New Forest Pony",
  "Shetland",
  "Shire",
  "Sports Horse",
  "Thoroughbred",
  "Warmblood",
  "Welsh Pony",
  "Welsh Section D",
  "Other",
] as const;

const GENDER_OPTIONS = ["Mare", "Gelding", "Stallion"] as const;

const DISCIPLINE_OPTIONS = [
  "Hacking / pleasure",
  "Dressage",
  "Show jumping",
  "Eventing",
  "Hunting",
  "Endurance",
  "Pony Club",
  "Riding Club",
  "Schooling",
  "Other",
] as const;

const RIDER_EXPERIENCE_OPTIONS = ["Beginner", "Novice", "Intermediate", "Experienced"] as const;

const TEMPERAMENT_OPTIONS = [
  "Calm",
  "Friendly",
  "Gentle",
  "Safe",
  "Confidence Giving",
  "Forward Going",
  "Energetic",
  "Playful",
  "Sensitive",
  "Sharp",
  "Needs Experienced Rider",
  "Experienced Ride",
  "Lazy",
  "Strong",
  "Other",
] as const;

const card: React.CSSProperties = {
  borderRadius: 22,
  border: "1px solid rgba(31,42,68,0.12)",
  background: "rgba(255,255,255,0.86)",
  boxShadow: "0 18px 50px rgba(31,42,68,0.08)",
};

const btn = (kind: "primary" | "secondary") =>
  ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 14,
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 950,
    whiteSpace: "nowrap",
    border: "1px solid rgba(31,42,68,0.16)",
    background: kind === "primary" ? `linear-gradient(180deg, ${palette.forest}, #173223)` : "rgba(255,255,255,0.72)",
    color: kind === "primary" ? "white" : palette.navy,
    boxShadow: kind === "primary" ? "0 14px 34px rgba(31,61,43,0.18)" : "0 14px 34px rgba(31,42,68,0.08)",
    cursor: "pointer",
    minHeight: 44,
  }) as React.CSSProperties;

const input: React.CSSProperties = {
  border: "1px solid rgba(31,42,68,0.16)",
  borderRadius: 12,
  padding: "12px 12px",
  fontSize: 14,
  background: "rgba(255,255,255,0.85)",
  outline: "none",
  width: "100%",
};

export default function AddHorsePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [heightHh, setHeightHh] = useState("");
  const [temperament, setTemperament] = useState("");
  const [gender, setGender] = useState("");
  const [disciplines, setDisciplines] = useState<string[]>([]);
  const [riderExperience, setRiderExperience] = useState("");
  const [description, setDescription] = useState("");
  const [arrangementType, setArrangementType] = useState("");
  const [helpNeeded, setHelpNeeded] = useState<string[]>([]);
  const [riderExpectations, setRiderExpectations] = useState("");
  const [pricePerDay, setPricePerDay] = useState("");
  const [active, setActive] = useState(true);

  const ARRANGEMENT_OPTIONS = [
    ["Riding in return for help", "Help with horse care or yard jobs in return for riding time."],
    ["Paid arrangement", "A paid riding arrangement."],
    ["Flexible arrangement", "Open to discussing the right arrangement with a rider."],
  ] as const;
  const HELP_OPTIONS = ["Mucking out", "Stable chores", "General yard jobs", "Grooming & horse care", "Exercise / schooling", "Bringing in / turning out", "Regular weekly help", "Occasional help"] as const;

  const [location, setLocation] = useState("");
  const [locationName, setLocationName] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  const missingFields = useMemo(() => {
    const missing: string[] = [];
    if (!name.trim()) missing.push("Horse name");
    if (!breed.trim()) missing.push("Breed");
    if (!age.trim()) missing.push("Age");
    if (!heightHh.trim()) missing.push("Height");
    if (!temperament.trim()) missing.push("Temperament");
    if (!gender.trim()) missing.push("Gender");
    if (!disciplines.length) missing.push("Riding disciplines");
    if (!riderExperience.trim()) missing.push("Suitable rider experience");
    if (!description.trim()) missing.push("Description");
    if (!arrangementType.trim()) missing.push("Arrangement");
    if (!helpNeeded.length) missing.push("What help is needed");
    if (!location.trim() || lat == null || lng == null) missing.push("Location");
    if (!imageFiles.length) missing.push("Photo");
    return missing;
  }, [name, breed, age, heightHh, temperament, gender, disciplines, riderExperience, description, arrangementType, helpNeeded, location, lat, lng, imageFiles]);

  const fieldStyle = (missing: boolean): React.CSSProperties => ({
    ...input,
    borderColor: showValidation && missing ? "#b42318" : undefined,
    background: showValidation && missing ? "rgba(180,35,24,0.05)" : input.background,
  });

  const canSubmit = useMemo(() => {
    return Boolean(
      name.trim() &&
      breed.trim() &&
      age.trim() &&
      heightHh.trim() &&
      temperament.trim() &&
      gender.trim() &&
      disciplines.length > 0 &&
      riderExperience.trim() &&
      description.trim() &&
      arrangementType.trim() &&
      helpNeeded.length > 0 &&
      location.trim() &&
      lat != null &&
      lng != null &&
      imageFiles.length > 0 &&
      !submitting
    );
  }, [name, breed, age, heightHh, temperament, gender, disciplines, riderExperience, description, arrangementType, helpNeeded, location, lat, lng, imageFiles, submitting]);

  useEffect(() => {
    const urls = imageFiles.map((file) => URL.createObjectURL(file));
    setImagePreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [imageFiles]);

  async function uploadImages(userId: string, files: File[]) {
    const urls: string[] = [];
    const uploadedPaths: string[] = [];
    try {
      for (const file of files.slice(0, 5)) {
        validateHorseImage(file);
        const ext = file.name.toLowerCase().match(/\.(jpe?g|png|webp)$/)?.[1] || "jpg";
        const path = userId + "/" + crypto.randomUUID() + "." + ext;
        const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
        if (upErr) throw upErr;
        uploadedPaths.push(path);
        const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
        if (!data?.publicUrl) throw new Error("Failed to get public image URL");
        urls.push(data.publicUrl);
      }
      return urls;
    } catch (error) {
      if (uploadedPaths.length) await supabase.storage.from(STORAGE_BUCKET).remove(uploadedPaths).catch(() => {});
      throw error;
    }
  }


  const [step, setStep] = useState(1);
  const stepNames = ["About your horse", "Riding profile", "The arrangement", "Photos & location", "Review & post"];
  const stepChecks = [
    () => !!(name.trim() && breed.trim() && age.trim() && heightHh.trim() && temperament.trim() && gender.trim()),
    () => !!(disciplines.length && riderExperience.trim() && description.trim()),
    () => !!(arrangementType.trim() && helpNeeded.length),
    () => !!(location.trim() && lat != null && lng != null && imageFiles.length),
  ];
  function goNext(){setShowValidation(true);setError(null);if(!stepChecks[step-1]?.()){setError("Please complete the required fields in this section.");return;}setShowValidation(false);setStep(s=>Math.min(5,s+1));window.scrollTo({top:0,behavior:"smooth"});}
  function goBack(){setError(null);setShowValidation(false);setStep(s=>Math.max(1,s-1));window.scrollTo({top:0,behavior:"smooth"});}

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setShowValidation(true);

    if (!name.trim() || !breed.trim() || !age.trim() || !heightHh.trim() || !temperament.trim() || !gender.trim() || !disciplines.length || !riderExperience.trim() || !description.trim() || !arrangementType.trim() || !helpNeeded.length || !location.trim() || lat == null || lng == null || !imageFiles.length) {
      setError("Please complete all required fields, including the arrangement and help required.");
      return;
    }

    try {
      setSubmitting(true);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) throw userErr;
      if (!user) throw new Error("Not authenticated");

      const ageNum = Number(age);
      if (!Number.isInteger(ageNum) || ageNum < 0 || ageNum > 99) throw new Error("Age must be a whole number between 0 and 99.");

      const heightNum = parseHorseHeight(heightHh);
      if (heightNum == null) throw new Error("Please enter a valid horse height.");

      const priceNum = pricePerDay.trim() ? Number(pricePerDay) : null;
      if (pricePerDay.trim() && (priceNum === null || !Number.isFinite(priceNum) || priceNum < 0)) throw new Error("Price per day must be a valid non-negative number.");

      const imageUrls = await uploadImages(user.id, imageFiles);

      const { error: insErr } = await supabase.from("horses").insert({
        owner_id: user.id,
        name: name.trim(),
        breed: breed.trim() ? breed.trim() : null,
        temperament: temperament.trim() ? temperament.trim() : null,
        gender: gender.trim(),
        disciplines,
        rider_experience: riderExperience.trim(),
        description: description.trim() ? description.trim() : null,
        arrangement_type: arrangementType,
        help_needed: helpNeeded,
        rider_expectations: riderExpectations.trim() ? riderExpectations.trim() : null,
        active,
        age: ageNum,
        height_hh: heightNum,
        price_per_day: priceNum,
        location: location.trim() ? location.trim() : null,
        location_name: locationName.trim() ? locationName.trim() : null,
        lat,
        lng,
        latitude: null,
        longitude: null,
        image_url: imageUrls[0] ?? null,
        image_urls: imageUrls,
        photo_url: null,
      });

      if (insErr) {
        const paths = imageUrls.map(storagePathFromPublicUrl).filter((v): v is string => Boolean(v));
        if (paths.length) await supabase.storage.from(STORAGE_BUCKET).remove(paths).catch(() => {});
        throw insErr;
      }

      router.push("/dashboard/owner/horses");
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Failed to add horse.");
    } finally {
      setSubmitting(false);
    }
  }


  return (
    <>
      <div className="pmp-pageShell">
        <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
          <div><div className="pmp-kicker">Owner tools · Step {step} of 5</div><h1 className="pmp-pageTitle">{stepNames[step-1]}</h1><div className="pmp-mutedText" style={{marginTop:6}}>{step===1?"Start with the essentials.":step===2?"Help the right rider understand your horse.":step===3?"Be clear about the arrangement you are looking for.":step===4?"Choose your best cover photo and show riders where your horse is based.":"One final look before your horse goes live."}</div></div>
          <Link href="/dashboard/owner/horses" style={btn("secondary")}>← Back</Link>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,margin:"18px 0 12px"}}>{[1,2,3,4,5].map(n=><div key={n} style={{height:5,borderRadius:99,background:n<=step?palette.forest:"rgba(31,42,68,.10)",boxShadow:n===step?"0 0 0 2px rgba(200,162,77,.18)":undefined}} />)}</div>
        <form onSubmit={onSubmit} style={{marginTop:8,...card,padding:18}}>
          {step===1 && <div style={{display:"grid",gap:14}}>
            <label style={{display:"grid",gap:6,fontSize:13,fontWeight:800}}>Horse name *<input value={name} onChange={e=>setName(e.target.value)} style={fieldStyle(!name.trim())} placeholder="e.g. Apollo"/></label>
            <div className="pmp-addHorse-grid2"><label style={{display:"grid",gap:6,fontSize:13,fontWeight:800}}>Breed *<select value={breed} onChange={e=>setBreed(e.target.value)} style={fieldStyle(!breed.trim())}><option value="">Select breed</option>{BREED_OPTIONS.map(x=><option key={x}>{x}</option>)}</select></label><label style={{display:"grid",gap:6,fontSize:13,fontWeight:800}}>Temperament *<select value={temperament} onChange={e=>setTemperament(e.target.value)} style={fieldStyle(!temperament.trim())}><option value="">Select temperament</option>{TEMPERAMENT_OPTIONS.map(x=><option key={x}>{x}</option>)}</select></label></div>
            <div className="pmp-addHorse-grid3"><label style={{display:"grid",gap:6,fontSize:13,fontWeight:800}}>Age *<input type="number" min={0} max={99} value={age} onChange={e=>setAge(e.target.value)} style={fieldStyle(!age.trim())} placeholder="9"/></label><label style={{display:"grid",gap:6,fontSize:13,fontWeight:800}}>Height (hh) *<input value={heightHh} onChange={e=>setHeightHh(e.target.value)} style={fieldStyle(!heightHh.trim())} placeholder="16.2"/></label><label style={{display:"grid",gap:6,fontSize:13,fontWeight:800}}>Price per day <span style={{fontWeight:600,opacity:.55}}>(optional)</span><input value={pricePerDay} onChange={e=>setPricePerDay(e.target.value)} style={input} placeholder="40" inputMode="decimal"/></label></div>
            <label style={{display:"grid",gap:6,fontSize:13,fontWeight:800}}>Gender *<select value={gender} onChange={e=>setGender(e.target.value)} style={fieldStyle(!gender.trim())}><option value="">Select gender</option>{GENDER_OPTIONS.map(x=><option key={x}>{x}</option>)}</select></label>
          </div>}
          {step===2 && <div style={{display:"grid",gap:16}}>
            <div><div style={{fontSize:13,fontWeight:850,marginBottom:8}}>Riding disciplines *</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8}}>{DISCIPLINE_OPTIONS.map(x=><label key={x} style={{display:"flex",gap:7,alignItems:"center",padding:"10px",borderRadius:12,border:"1px solid rgba(31,42,68,.12)",background:disciplines.includes(x)?"rgba(200,162,77,.14)":"rgba(255,255,255,.7)",fontSize:12,fontWeight:750}}><input type="checkbox" checked={disciplines.includes(x)} onChange={e=>setDisciplines(c=>e.target.checked?[...c,x]:c.filter(v=>v!==x))}/>{x}</label>)}</div></div>
            <label style={{display:"grid",gap:6,fontSize:13,fontWeight:800}}>Suitable rider experience *<select value={riderExperience} onChange={e=>setRiderExperience(e.target.value)} style={fieldStyle(!riderExperience.trim())}><option value="">Select experience</option>{RIDER_EXPERIENCE_OPTIONS.map(x=><option key={x}>{x}</option>)}</select></label>
            <label style={{display:"grid",gap:6,fontSize:13,fontWeight:800}}>Description *<textarea value={description} onChange={e=>setDescription(e.target.value)} rows={7} style={{...fieldStyle(!description.trim()),resize:"vertical"}} placeholder="Tell riders about schooling, suitability, rules, personality and what makes your horse a good match."/></label>
          </div>}
          {step===3 && <section style={{display:"grid",gap:16}}>
            <div><div className="pmp-kicker">What are you looking for?</div><div style={{fontSize:13,opacity:.65}}>Make the arrangement clear from the start.</div></div>
            <div style={{display:"grid",gap:9}}>{ARRANGEMENT_OPTIONS.map(([value,help])=><label key={value} style={{display:"flex",gap:10,alignItems:"flex-start",padding:14,borderRadius:15,border:arrangementType===value?"2px solid #1F3D2B":"1px solid rgba(31,42,68,.12)",background:arrangementType===value?"rgba(31,61,43,.07)":"rgba(255,255,255,.72)",cursor:"pointer"}}><input type="radio" name="arrangement" checked={arrangementType===value} onChange={()=>setArrangementType(value)} style={{marginTop:3}}/><span><strong style={{color:palette.navy}}>{value}</strong><span style={{display:"block",fontSize:12,opacity:.65,marginTop:3}}>{help}</span></span></label>)}</div>
            <div style={{fontSize:13,fontWeight:850}}>What help are you looking for? *</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:8}}>{HELP_OPTIONS.map(x=><label key={x} style={{display:"flex",gap:8,alignItems:"center",padding:"10px",borderRadius:12,border:"1px solid rgba(31,42,68,.12)",background:helpNeeded.includes(x)?"rgba(200,162,77,.14)":"rgba(255,255,255,.7)",fontSize:12,fontWeight:750}}><input type="checkbox" checked={helpNeeded.includes(x)} onChange={e=>setHelpNeeded(c=>e.target.checked?[...c,x]:c.filter(v=>v!==x))}/>{x}</label>)}</div>
            <label style={{display:"grid",gap:6,fontSize:13,fontWeight:800}}>What can riders expect? <span style={{fontWeight:600,opacity:.55}}>(optional)</span><textarea value={riderExpectations} onChange={e=>setRiderExpectations(e.target.value)} rows={5} style={{...input,resize:"vertical"}} placeholder="Optional: explain what a typical visit or ride looks like."/></label>
          </section>}
          {step===4 && <div style={{display:"grid",gap:18}}>
            <div><div style={{fontSize:13,fontWeight:850,marginBottom:8}}>Horse photos *</div><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>{const files=Array.from(e.target.files??[]);if(!files.length)return;if(imageFiles.length+files.length>5){setError("You can upload a maximum of 5 photos.");return;}setError(null);setImageFiles(c=>[...c,...files]);e.currentTarget.value="";}} style={{fontSize:13}}/><div style={{fontSize:12,opacity:.65,marginTop:5}}>1–5 photos · first photo is your cover.</div>{imagePreviewUrls.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:10,marginTop:12}}>{imagePreviewUrls.map((url,i)=><div key={url} style={{position:"relative",aspectRatio:"4/3",borderRadius:14,overflow:"hidden",border:i===0?"2px solid #1F3D2B":"1px solid rgba(0,0,0,.1)"}}><img src={url} alt={"Horse photo "+(i+1)} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/><button type="button" onClick={()=>setImageFiles(c=>c.filter((_,idx)=>idx!==i))} style={{position:"absolute",right:6,top:6,width:28,height:28,minHeight:28,padding:0,border:0,borderRadius:99,background:"rgba(15,23,42,.78)",color:"white"}}>×</button>{i===0&&<span style={{position:"absolute",left:6,bottom:6,padding:"4px 7px",borderRadius:99,background:"#1F3D2B",color:"white",fontSize:10,fontWeight:900}}>Cover</span>}</div>)}</div>}</div>
            <label style={{display:"grid",gap:6,fontSize:13,fontWeight:800}}>Location *<LocationAutocomplete value={location} onChange={v=>{setLocation(v);setLocationName("");setLat(null);setLng(null)}} onPlaceSelect={({address,name,lat,lng})=>{setLocation(address);setLocationName(name&&name!==address?name:"");setLat(lat);setLng(lng)}}/><span style={{fontSize:12,opacity:.6}}>{lat!=null&&lng!=null?"Location selected.":"Select a suggestion to set the map location."}</span></label>
          </div>}
          {step===5 && <div style={{display:"grid",gap:14}}>
            <div style={{padding:16,borderRadius:17,background:"linear-gradient(135deg,rgba(31,61,43,.08),rgba(200,162,77,.12))",border:"1px solid rgba(200,162,77,.35)"}}><div className="pmp-kicker">Ready to post</div><div style={{fontSize:22,fontWeight:950,color:palette.navy,marginTop:3}}>{name||"Your horse"}</div><div style={{fontSize:12,opacity:.65,marginTop:3}}>Review the details below before your listing goes live.</div></div>
            <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:2}}>{imagePreviewUrls.map((url,i)=><img key={url} src={url} alt="" style={{width:96,height:72,objectFit:"cover",borderRadius:12,border:i===0?"2px solid #1F3D2B":"1px solid rgba(0,0,0,.1)"}}/>)}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[["Breed",breed],["Age",age],["Height",heightHh+" hh"],["Gender",gender],["Temperament",temperament],["Rider experience",riderExperience],["Price per day",pricePerDay.trim()?"£"+pricePerDay:"Not set"],["Location",location]].map(([label,value])=><div key={label} style={{padding:"11px 12px",borderRadius:12,border:"1px solid rgba(31,42,68,.10)",background:"rgba(255,255,255,.62)"}}><div style={{fontSize:10,fontWeight:900,textTransform:"uppercase",letterSpacing:".06em",opacity:.5}}>{label}</div><div style={{fontSize:13,fontWeight:750,color:palette.navy,marginTop:3}}>{value}</div></div>)}
            </div>
            <div style={{padding:14,borderRadius:14,border:"1px solid rgba(31,42,68,.10)",background:"rgba(255,255,255,.6)"}}><div style={{fontSize:10,fontWeight:900,textTransform:"uppercase",opacity:.5}}>Disciplines</div><div style={{marginTop:4,fontSize:13}}>{disciplines.join(" · ")}</div><div style={{fontSize:10,fontWeight:900,textTransform:"uppercase",opacity:.5,marginTop:12}}>Arrangement</div><div style={{marginTop:4,fontSize:13,fontWeight:800}}>{arrangementType}</div><div style={{fontSize:10,fontWeight:900,textTransform:"uppercase",opacity:.5,marginTop:12}}>Help needed</div><div style={{marginTop:4,fontSize:13}}>{helpNeeded.join(" · ")}</div></div>
            <div style={{padding:14,borderRadius:14,border:"1px solid rgba(31,42,68,.10)",background:"rgba(255,255,255,.6)"}}><div style={{fontSize:10,fontWeight:900,textTransform:"uppercase",opacity:.5}}>Description</div><div style={{marginTop:5,fontSize:13,lineHeight:1.5,whiteSpace:"pre-wrap"}}>{description}</div>{riderExpectations&&<><div style={{fontSize:10,fontWeight:900,textTransform:"uppercase",opacity:.5,marginTop:12}}>Riders can expect</div><div style={{marginTop:5,fontSize:13,lineHeight:1.5,whiteSpace:"pre-wrap"}}>{riderExpectations}</div></>}</div>
            <label style={{display:"flex",gap:10,alignItems:"center",fontSize:13,fontWeight:900,color:palette.navy}}><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/> Publish this listing as active</label>
          </div>}
          {showValidation && error ? <div className="pmp-errorBanner" style={{marginTop:14}}>{error}</div> : null}
          <div style={{display:"flex",justifyContent:"space-between",gap:10,marginTop:20}}>
            {step>1?<button type="button" onClick={goBack} style={btn("secondary")}>← Previous</button>:<span/>}
            {step<5?<button type="button" onClick={goNext} style={btn("primary")}>Continue →</button>:<button type="submit" disabled={submitting} style={{...btn("primary"),minWidth:150,opacity:submitting?.65:1}}>{submitting?"Posting…":"Post listing"}</button>}
          </div>
        </form>
      </div>
    </>
  );

}
