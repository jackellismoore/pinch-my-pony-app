'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import RequestsTable from '@/components/RequestsTable';
import { Icon } from '@/components/Icon';

type ProfileMini={id:string;display_name:string|null;full_name:string|null};
function ownerLabel(p?:ProfileMini|null){return p?.display_name?.trim()||p?.full_name?.trim()||'Owner'}

export default function BorrowerHorsesPage(){
 const[myUserId,setMyUserId]=useState<string|null>(null);const[loading,setLoading]=useState(true);const[error,setError]=useState<string|null>(null);const[rides,setRides]=useState<any[]>([]);const[canReviewByRequestId,setCanReviewByRequestId]=useState<Record<string,boolean>>({});
 useEffect(()=>{let cancelled=false;async function load(){setLoading(true);setError(null);try{const{data:auth,error:authErr}=await supabase.auth.getUser();if(authErr)throw authErr;const uid=auth?.user?.id??null;if(!uid){if(!cancelled){setMyUserId(null);setRides([])}return}if(!cancelled)setMyUserId(uid);const{data:reqs,error:reqErr}=await supabase.from('borrow_requests').select(`id,status,start_date,end_date,message,horse:horses!borrow_requests_horse_id_fkey(id,name,owner_id)`).eq('borrower_id',uid).in('status',['accepted','approved']).order('start_date',{ascending:false});if(reqErr)throw reqErr;const reqRows:any[]=(reqs??[])as any[];const ownerIds=Array.from(new Set(reqRows.map(r=>r?.horse?.owner_id).filter((v)=>typeof v==='string'&&v.length>0)))as string[];let ownersById:Record<string,ProfileMini>={};if(ownerIds.length){const{data:owners}=await supabase.from('public_profiles').select('id,display_name,full_name').in('id',ownerIds);for(const p of(owners??[])as ProfileMini[])ownersById[p.id]=p}const tableRows=reqRows.map(r=>{const horse=r?.horse??null;const ownerId=horse?.owner_id?String(horse.owner_id):'';return{id:String(r?.id??''),status:String(r?.status??'pending'),start_date:r?.start_date??null,end_date:r?.end_date??null,message:r?.message??null,horse:horse?.id?{id:String(horse.id),name:horse?.name??null}:null,horse_id:horse?.id?String(horse.id):null,borrower_name:ownerLabel(ownerId?ownersById[ownerId]:null)}}).filter(x=>x.id);const ids=tableRows.map(r=>r.id);let reviewed=new Set<string>();if(ids.length){const{data:revs,error:revErr}=await supabase.from('reviews').select('request_id').eq('borrower_id',uid).in('request_id',ids);reviewed=revErr?new Set(ids):new Set((revs??[]).map((x:any)=>String(x.request_id)))}const canMap:Record<string,boolean>={};for(const row of tableRows)canMap[row.id]=!reviewed.has(row.id);if(!cancelled){setRides(tableRows);setCanReviewByRequestId(canMap)}}catch(e:any){if(!cancelled){setError(e?.message??'Failed to load your rides.');setRides([]);setCanReviewByRequestId({})}}finally{if(!cancelled)setLoading(false)}}load();return()=>{cancelled=true}},[]);
 const reviewDue=Object.values(canReviewByRequestId).filter(Boolean).length;
 return <div className="pmp-pageShell"><style>{`.pmp-ridesHeroActions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}@media(max-width:560px){.pmp-ridesHeroActions{display:grid;grid-template-columns:1fr}.pmp-ridesHeroActions a{width:100%;box-sizing:border-box;justify-content:center}}`}</style>
  <div className="pmp-kicker">Your borrowing</div><h1 className="pmp-pageTitle">My rides</h1><div className="pmp-mutedText" style={{marginTop:6}}>See approved rides, message the owner and leave feedback after your booking.</div>
  <div className="pmp-ridesHeroActions"><Link href="/browse" className="pmp-ctaPrimary"><Icon name="search" size={17}/> Browse horses</Link><Link href="/messages" className="pmp-ctaSecondary"><Icon name="messages" size={17}/> Messages</Link></div>
  {reviewDue>0?<div className="pmp-sectionCard" style={{marginTop:16,background:'rgba(200,162,77,.08)',borderColor:'rgba(200,162,77,.25)'}}><div style={{fontWeight:950,color:'#1F2A44'}}>You have {reviewDue} review{reviewDue===1?'':'s'} to leave</div><div className="pmp-mutedText" style={{marginTop:5}}>Reviews help owners and other members build trust. Use the Leave a review button on the ride below.</div></div>:null}
  {error?<div className="pmp-errorBanner" style={{marginTop:16}}>{error}</div>:null}
  {!myUserId&&!loading?<div className="pmp-sectionCard" style={{marginTop:16}}>Log in to see your rides.</div>:null}
  {myUserId?<div style={{marginTop:16}}><RequestsTable mode="borrower" title="Your approved rides" subtitle="Everything is kept here so your booking, messages and review are easy to find." emptyLabel={loading?'Loading…':'No approved rides yet.'} requests={rides} showReviewCTA canReviewByRequestId={canReviewByRequestId}/></div>:null}
 </div>;
}
