"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Appointment = {
  id:number
  date:Date | null
  title:string
  priority:string
  status:"confirmed" | "waiting" | "unscheduled"
}

export default function Archive(){

const [appointments,setAppointments] = useState<Appointment[]>([])

useEffect(()=>{

const saved = localStorage.getItem("appointments")

if(saved){

const parsed = JSON.parse(saved).map((a:any)=>({
...a,
date: a.date ? new Date(a.date) : null
}))

setAppointments(parsed)

}

},[])

const now = new Date()

const archived = appointments.filter(a =>
a.date && a.date.getTime() < now.getTime()
)

const formatTimeArabic = (date:Date)=>{

const h = date.getHours()
const m = date.getMinutes()

const ampm = h>=12 ? "مساءً" : "صباحًا"

const hour12 = h%12 || 12

return `${hour12}:${m.toString().padStart(2,"0")} ${ampm}`

}

return(

<main style={{
direction:"rtl",
padding:"40px",
maxWidth:"900px",
margin:"auto"
}}>

<Link href="/">

<button
style={{
marginBottom:"20px",
background:"#2196F3",
color:"white",
border:"none",
padding:"8px 16px",
cursor:"pointer",
borderRadius:"6px"
}}
>
العودة لبرنامج المواعيد
</button>

</Link>

<h1 style={{textAlign:"center"}}>
أرشيف المواعيد السابقة
</h1>

<table style={{
width:"100%",
borderCollapse:"collapse",
marginTop:"20px"
}}>

<thead>

<tr style={{background:"#9E9E9E",color:"white"}}>

<th style={{padding:"10px"}}>التاريخ</th>
<th style={{padding:"10px"}}>الوقت</th>
<th style={{padding:"10px"}}>اسم الموعد</th>
<th style={{padding:"10px"}}>الأولوية</th>

</tr>

</thead>

<tbody>

{archived
.sort((a,b)=>b.date!.getTime()-a.date!.getTime())
.map(item=>(

<tr key={item.id} style={{borderBottom:"1px solid #ddd"}}>

<td style={{padding:"8px"}}>
{item.date?.toLocaleDateString("en-CA")}
</td>

<td style={{padding:"8px"}}>
{formatTimeArabic(item.date!)}
</td>

<td style={{padding:"8px"}}>
{item.title}
</td>

<td style={{padding:"8px"}}>
{item.priority}
</td>

</tr>

))}

</tbody>

</table>

</main>

)

}