"use client";

import { useState, useMemo, useEffect } from "react";

type Appointment = {
  id: number;
  date: Date;
  title: string;
  priority: string;
  status: "confirmed" | "waiting";
};

const months = [
  "يناير","فبراير","مارس","أبريل","مايو","يونيو",
  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"
];

const displayWeekDays = [
  "السبت","الأحد","الاثنين","الثلاثاء",
  "الأربعاء","الخميس","الجمعة"
];

export default function Home() {
  const now = new Date();

  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [selectedDayName, setSelectedDayName] = useState<string | null>(null);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(null);

  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<"AM" | "PM">("AM");

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("عادي");
  const [status, setStatus] = useState<"confirmed" | "waiting">("confirmed");

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [conflictData, setConflictData] = useState<Appointment | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
const [moveDialog, setMoveDialog] = useState<Appointment | null>(null);

const [rangeOffset,setRangeOffset] = useState(0);
const [showTodayPopup,setShowTodayPopup] = useState(false);
  // 🔹 تحميل من LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem("appointments");
    if (saved) {
      const parsed = JSON.parse(saved).map((a:any)=>({
        ...a,
        date: new Date(a.date)
      }));
      setAppointments(parsed);
    }
  }, []);

  // 🔹 حفظ تلقائي
  useEffect(() => {
    localStorage.setItem("appointments", JSON.stringify(appointments));
  }, [appointments]);

  const convertArabicToEnglish = (value: string) => {
    const arabicNumbers = "٠١٢٣٤٥٦٧٨٩";
    return value.replace(/[٠-٩]/g, (d) =>
      arabicNumbers.indexOf(d).toString()
    );
  };

  const availableDates = useMemo(() => {
    if (!selectedDayName) return [];
    const result: number[] = [];
    const date = new Date(year, month, 1);

    while (date.getMonth() === month) {
      const dayName = date.toLocaleDateString("ar-EG", { weekday: "long" });
      if (dayName === selectedDayName) result.push(date.getDate());
      date.setDate(date.getDate() + 1);
    }
    return result;
  }, [month, year, selectedDayName]);

  const buildDate = () => {
    if (selectedDayNumber === null) return null;

    let hours24 = hour;
    if (period === "PM" && hour < 12) hours24 += 12;
    if (period === "AM" && hour === 12) hours24 = 0;

    return new Date(year, month, selectedDayNumber, hours24, minute);
  };

  const formatTimeArabic = (date: Date) => {
    const h = date.getHours();
    const m = date.getMinutes();
    const ampm = h >= 12 ? "مساءً" : "صباحًا";
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2,"0")} ${ampm}`;
  };

  const formatFullDateArabic = (date: Date) => {
    const dayName = date.toLocaleDateString("ar-EG", { weekday: "long" });
    const formattedDate = date.toLocaleDateString("en-CA");
    return `${dayName} ${formattedDate}`;
  };

  const getPriorityColor = (p: string) => {
    if (p === "عالي") return "red";
    if (p === "متوسط") return "orange";
    return "green";
  };

  const handleSave = (force = false, updateExisting = false) => {
    const newDate = buildDate();
    if (!newDate || !title) return;
      const nowTime = new Date();

  // منع وقت قديم في نفس اليوم فقط
  if (
    newDate.toDateString() === nowTime.toDateString() &&
    newDate.getTime() < nowTime.getTime()
  ) {
    alert("لا يمكن اختيار وقت سابق عن الوقت الحالي");
    return;
  }

    const conflict = appointments.find(
      a => a.date.getTime() === newDate.getTime() && a.id !== editingId
    );

    if (conflict && !force) {
      setConflictData(conflict);
      return;
    }

    if (updateExisting && conflict) {
      setAppointments(prev =>
        prev.map(a =>
          a.id === conflict.id
            ? { ...a, title, priority, status }
            : a
        )
      );
    } else if (editingId !== null) {
      setAppointments(prev =>
        prev.map(a =>
          a.id === editingId
            ? { ...a, date: newDate, title, priority, status }
            : a
        )
      );
      setEditingId(null);
    } else {
      setAppointments(prev => [
        ...prev,
        { id: Date.now(), date: newDate, title, priority, status }
      ]);
    }

    setConflictData(null);
    setTitle("");
  };

  const handleDelete = (id:number) => {
    setAppointments(prev => prev.filter(a => a.id !== id));
  };
const moveToConfirmed = (id:number) => {
  setAppointments(prev =>
    prev.map(a =>
      a.id === id
        ? { ...a, status: "confirmed" }
        : a
    )
  );
};

const [confirmDialog,setConfirmDialog] = useState<Appointment | null>(null);

const moveToWaiting = (id:number) => {
  setAppointments(prev =>
    prev.map(a =>
      a.id === id
        ? { ...a, status: "waiting" }
        : a
    )
  );
};
  
  const handleEdit = (app:Appointment) => {
    setEditingId(app.id);
    setTitle(app.title);
    setPriority(app.priority);
    setStatus(app.status);

    const d = app.date;
    setMonth(d.getMonth());
    setYear(d.getFullYear());
    setSelectedDayName(d.toLocaleDateString("ar-EG",{weekday:"long"}));
    setSelectedDayNumber(d.getDate());

    const h = d.getHours();
    if (h >= 12) {
      setPeriod("PM");
      setHour(h === 12 ? 12 : h - 12);
    } else {
      setPeriod("AM");
      setHour(h === 0 ? 12 : h);
    }
    setMinute(d.getMinutes());
  };

  // ترتيب المواعيد
const sorted = [...appointments].sort(
  (a, b) => a.date.getTime() - b.date.getTime()
);

// فلترة البحث
const filtered = sorted.filter(a => {
  const text = searchTerm.toLowerCase();

  const fullText =
    a.title +
    " " +
    a.priority +
    " " +
    a.date.toLocaleDateString("ar-EG", { weekday: "long" }) +
    " " +
    a.date.toLocaleDateString("en-CA") +
    " " +
    formatTimeArabic(a.date);

  return fullText.toLowerCase().includes(text);
});
  const groupByDay = (list:Appointment[]) => {
    const grouped:any = {};
    list.forEach(app=>{
      const key = app.date.toDateString();
      if (!grouped[key]) grouped[key]=[];
      grouped[key].push(app);
    });
    return grouped;
  };

  const confirmedGrouped = groupByDay(filtered.filter(a=>a.status==="confirmed"));
  
const confirmedKeys = Object.keys(confirmedGrouped)
.sort((a,b)=> new Date(a).getTime() - new Date(b).getTime());

const pageSize = 7; // عدد الأيام في الصفحة

const startIndex = rangeOffset * pageSize;
const endIndex = startIndex + pageSize;

const pagedConfirmedKeys = confirmedKeys.slice(startIndex,endIndex);
const totalPages = Math.ceil(confirmedKeys.length / pageSize);
const waitingGrouped = groupByDay(filtered.filter(a=>a.status==="waiting"));

  return (
    <main style={{direction:"rtl",padding:"40px",maxWidth:"1000px",margin:"auto"}}>

      <h1 style={{textAlign:"center",marginBottom:"30px"}}>
        
        برنامج إدارة المواعيد
      </h1>
      عرض مواعيد اليوم
<div style={{display:"flex",justifyContent:"space-between",marginBottom:"10px"}}>

<button
onClick={()=>setShowTodayPopup(true)}
style={{
background:"#2196F3",
color:"white",
border:"none",
padding:"6px 12px",
cursor:"pointer"
}}
>
مواعيد اليوم
</button>

</div>
      {/* الشهر والسنة */}
      <div style={{display:"flex",gap:"15px",marginBottom:"20px"}}>
        <select value={month} onChange={e=>setMonth(Number(e.target.value))}>
          {months.map((m,i)=><option key={i} value={i}>{m}</option>)}
        </select>

        <select value={year} onChange={e=>setYear(Number(e.target.value))}>
          {Array.from({length:10}).map((_,i)=>{
            const y = now.getFullYear()-2+i;
            return <option key={y}>{y}</option>;
          })}
        </select>
      </div>

      {/* أيام الأسبوع */}
      <div style={{display:"flex",gap:"10px",marginBottom:"15px"}}>
        {displayWeekDays.map(day=>(
          <div
            key={day}
            onClick={()=>{setSelectedDayName(day);setSelectedDayNumber(null);}}
            style={{
              padding:"8px 14px",
              border:"1px solid #ccc",
              cursor:"pointer",
              background:selectedDayName===day?"#4CAF50":"#eee",
              color:selectedDayName===day?"white":"black"
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* التواريخ */}
      {selectedDayName && (
        <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginBottom:"20px"}}>
{availableDates.map(d=>{
  const today = new Date();
  const thisDate = new Date(year, month, d);

  const isPastDay =
    thisDate.setHours(0,0,0,0) <
    new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  const isToday =
    d === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  return (
    <div
      key={d}
      onClick={()=>!isPastDay && setSelectedDayNumber(d)}
      style={{
        padding:"6px 12px",
        border:"1px solid #999",
        cursor:isPastDay ? "not-allowed" : "pointer",
        background:isPastDay
          ? "#ddd"
          : selectedDayNumber===d
            ? "#4CAF50"
            : isToday
              ? "#bbdefb"
              : "#f5f5f5",
        color:isPastDay
          ? "#888"
          : selectedDayNumber===d
            ? "white"
            : "black",
        fontWeight:isToday ? "bold" : "normal",
        opacity:isPastDay ? 0.6 : 1
      }}
    >
      {d}
    </div>
  );
})}
        </div>
      )}

      {/* مربع التوقيت */}
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"20px"}}>
        <div style={{
          border:"2px solid #4CAF50",
          borderRadius:"10px",
          padding:"15px",
          direction:"ltr",
          display:"flex",
          alignItems:"center",
          gap:"8px"
        }}>
          <input
            type="text"
            value={hour}
            onFocus={()=>setHour(0)}
            onChange={(e)=>{
              const num = Number(convertArabicToEnglish(e.target.value));
              if (num>=0 && num<=12) setHour(num);
            }}
            style={{width:"60px",textAlign:"center"}}
          />
          <span>:</span>
          <input
            type="text"
            value={minute.toString().padStart(2,"0")}
            onFocus={()=>setMinute(0)}
            onChange={(e)=>{
              const num = Number(convertArabicToEnglish(e.target.value));
              if (num>=0 && num<=59) setMinute(num);
            }}
            style={{width:"60px",textAlign:"center"}}
          />
          <button onClick={()=>setPeriod("AM")}
            style={{background:period==="AM"?"#4CAF50":"#ccc",padding:"6px 12px"}}>
            صباحًا
          </button>
          <button onClick={()=>setPeriod("PM")}
            style={{background:period==="PM"?"#4CAF50":"#ccc",padding:"6px 12px"}}>
            مساءً
          </button>
        </div>
      </div>

      {/* الاسم + الأولوية */}
      <div style={{display:"flex",gap:"10px",marginBottom:"10px"}}>
        <input
          placeholder="اسم الموعد"
          value={title}
          onChange={e=>setTitle(e.target.value)}
          style={{
            flex:1,
            border:"3px solid #4CAF50",
            borderRadius:"8px",
            padding:"8px"
          }}
        />
        <select value={priority} onChange={e=>setPriority(e.target.value)}>
          <option>عالي</option>
          <option>متوسط</option>
          <option>عادي</option>
        </select>
      </div>

      {/* اختيار الحالة */}
      <div style={{display:"flex",gap:"10px",marginBottom:"15px"}}>
        <button
          onClick={()=>setStatus("confirmed")}
          style={{background:status==="confirmed"?"#4CAF50":"#ccc",padding:"6px 12px"}}
        >
          موعد مؤكد
        </button>

        <button
          onClick={()=>setStatus("waiting")}
          style={{background:status==="waiting"?"#ff9800":"#ccc",padding:"6px 12px"}}
        >
          قائمة انتظار
        </button>
      </div>

      <button
        onClick={()=>handleSave()}
        style={{
          padding:"10px 20px",
          background:"#4CAF50",
          color:"white",
          border:"none",
          borderRadius:"6px",
          cursor:"pointer",
          fontSize:"16px"
        }}
      >
        {editingId ? "تحديث" : "إضافة"}
      </button>

{moveDialog && (
  <div style={{
    marginTop:"20px",
    padding:"15px",
    border:"2px solid orange",
    borderRadius:"8px",
    background:"#fff3e0"
  }}>
    هل تريد نقل الموعد إلى قائمة الانتظار؟

    <div style={{display:"flex",gap:"10px",marginTop:"10px"}}>

      <button
        onClick={()=>{
          moveToWaiting(moveDialog.id);
          setMoveDialog(null);
        }}
        style={{
          flex:1,
          padding:"8px",
          background:"#ff9800",
          color:"white",
          border:"none"
        }}
      >
        تحويل بنفس الموعد
      </button>

     <button
  onClick={()=>{
    handleEdit(moveDialog);
    setStatus("waiting");
    setMoveDialog(null);
  }}
  style={{
    flex:1,
    padding:"8px",
    background:"#2196F3",
    color:"white",
    border:"none"
  }}
>
  تعديل الموعد
</button>

    </div>
  </div>
)}
{confirmDialog && (
  <div style={{
    marginTop:"20px",
    padding:"15px",
    border:"2px solid green",
    borderRadius:"8px",
    background:"#e8f5e9"
  }}>

    هل تريد تحويل الموعد إلى مؤكد؟

    <div style={{display:"flex",gap:"10px",marginTop:"10px"}}>

      <button
        onClick={()=>{
          moveToConfirmed(confirmDialog.id);
          setConfirmDialog(null);
        }}
        style={{
          flex:1,
          padding:"8px",
          background:"#4CAF50",
          color:"white",
          border:"none"
        }}
      >
        تحويل بنفس الموعد
      </button>

      <button
        onClick={()=>{
          handleEdit(confirmDialog);
          setStatus("confirmed");
          setConfirmDialog(null);
        }}
        style={{
          flex:1,
          padding:"8px",
          background:"#2196F3",
          color:"white",
          border:"none"
        }}
      >
        تعديل الموعد
      </button>

    </div>

  </div>
)}
      {conflictData && (
        <div style={{
          marginTop:"20px",
          padding:"15px",
          border:"2px solid red",
          borderRadius:"8px",
          background:"#ffeaea"
        }}>
          يوجد موعد بنفس التاريخ والتوقيت
          <div style={{display:"flex",gap:"10px",marginTop:"10px"}}>
            <button
              onClick={()=>handleSave(true,false)}
              style={{flex:1,padding:"8px",background:"#4CAF50",color:"white",border:"none"}}
            >
              موافق
            </button>
            <button
              onClick={()=>handleSave(true,true)}
              style={{flex:1,padding:"8px",background:"#ff9800",color:"white",border:"none"}}
            >
              تحديث الموعد الموجود
            </button>
          </div>
        </div>
      )}
<div style={{marginBottom:"20px"}}>
  <input
    placeholder="🔎 بحث عن موعد..."
    value={searchTerm}
    onChange={(e)=>setSearchTerm(e.target.value)}
    style={{
      width:"100%",
      padding:"10px",
      border:"2px solid #2196F3",
      borderRadius:"8px"
    }}
  />
</div>

{showTodayPopup && (
<div style={{
position:"fixed",
top:"50%",
left:"50%",
transform:"translate(-50%,-50%)",
background:"white",
padding:"20px",
border:"2px solid #2196F3",
borderRadius:"10px",
zIndex:1000,
minWidth:"300px",
boxShadow:"0 0 10px rgba(0,0,0,0.3)"
}}>

<h3>مواعيد اليوم</h3>

<table style={{
width:"100%",
borderCollapse:"collapse",
marginTop:"10px"
}}>

<thead>
<tr style={{background:"#2196F3",color:"white"}}>
<th style={{padding:"6px"}}>الوقت</th>
<th style={{padding:"6px"}}>اسم الموعد</th>
<th style={{padding:"6px"}}>الأولوية</th>
</tr>
</thead>

<tbody>
{appointments
.filter(a=>{
const now=new Date();
return a.date.toDateString()===now.toDateString();
})
.sort((a,b)=>a.date.getTime()-b.date.getTime())
.map(a=>(
<tr key={a.id} style={{borderBottom:"1px solid #ccc"}}>
<td style={{padding:"6px"}}>
{formatTimeArabic(a.date)}
</td>

<td style={{padding:"6px"}}>
{a.title}
</td>

<td style={{padding:"6px"}}>
{a.priority}
</td>

</tr>
))}
</tbody>

</table>

<div style={{marginTop:"10px",textAlign:"center"}}>
<button
onClick={()=>setShowTodayPopup(false)}
style={{
padding:"6px 12px",
background:"#f44336",
color:"white",
border:"none",
cursor:"pointer"
}}
>
إغلاق
</button>
</div>

</div>
)}

<hr style={{margin:"30px 0"}}/>
      <hr style={{margin:"30px 0"}}/>
<div style={{display:"flex",gap:"10px",marginBottom:"10px"}}>

<button
onClick={()=>{
if(rangeOffset>0){
setRangeOffset(rangeOffset-1);
}
}}
style={{
padding:"6px 12px",
opacity: rangeOffset===0 ? 0.4 : 1,
cursor: rangeOffset===0 ? "not-allowed" : "pointer"
}}
>
السابق
</button>

<button
onClick={()=>{
if(rangeOffset < totalPages-1){
setRangeOffset(rangeOffset+1);
}
}}
style={{
padding:"6px 12px",
opacity: rangeOffset >= totalPages-1 ? 0.4 : 1,
cursor: rangeOffset >= totalPages-1 ? "not-allowed" : "pointer"
}}
>
التالي
</button>

<span style={{padding:"6px 12px"}}>
الصفحة {rangeOffset+1}
</span>

</div>
      <h2>المواعيد المؤكدة</h2>
{pagedConfirmedKeys.map(key=>{
  const dayDate = confirmedGrouped[key][0].date;

const today = new Date();

const todayDate = new Date(
  today.getFullYear(),
  today.getMonth(),
  today.getDate()
);

const targetDate = new Date(
  dayDate.getFullYear(),
  dayDate.getMonth(),
  dayDate.getDate()
);

const isToday =
  dayDate.getDate() === new Date().getDate() &&
  dayDate.getMonth() === new Date().getMonth() &&
  dayDate.getFullYear() === new Date().getFullYear();

return (
  <div
    key={key}
    style={{
      marginBottom:"20px",
      background:isToday ? "#e3f2fd" : "transparent",
      padding:isToday ? "10px" : "0",
      borderRadius:"8px"
    }}
  >

    <h3>
      {formatFullDateArabic(dayDate)}

      <span style={{
        fontSize:"14px",
        color:"#555",
        marginRight:"10px"
      }}>
        (عدد المواعيد: {confirmedGrouped[key].length})
      </span>
    </h3>
            {confirmedGrouped[key].map(item=>(
          <div key={item.id} style={{display:"flex",gap:"10px",marginBottom:"6px"}}>
  <div style={{width:"10px",height:"10px",borderRadius:"50%",background:getPriorityColor(item.priority)}}/>
  <div>{formatTimeArabic(item.date)}</div>
  <div style={{flex:1}}>{item.title}</div>

  <button
    onClick={()=>setMoveDialog(item)}
    style={{
      background:"#ff9800",
      color:"white",
      border:"none",
      padding:"4px 8px",
      cursor:"pointer"
    }}
  >
    نقل للانتظار
  </button>

  <button onClick={()=>handleEdit(item)}>تعديل</button>
  <button onClick={()=>handleDelete(item.id)}>حذف</button>
</div>
            ))}
          </div>
        );
      })}

      <hr style={{margin:"30px 0"}}/>

      <h2>قائمة الانتظار</h2>
{Object.keys(waitingGrouped).map(key=>{
  const dayDate = waitingGrouped[key][0].date;

 const today = new Date();

const todayDate = new Date(
  today.getFullYear(),
  today.getMonth(),
  today.getDate()
);

const targetDate = new Date(
  dayDate.getFullYear(),
  dayDate.getMonth(),
  dayDate.getDate()
);

const diffDays = Math.floor(
  (targetDate.getTime() - todayDate.getTime()) / (1000*60*60*24)
);

  const isToday = diffDays === 0;
  const isSoon = diffDays > 0 && diffDays <= 5;

  return (
    <div key={key} style={{marginBottom:"20px"}}>

      <h3 style={{
        background:isToday ? "#e3f2fd" : isSoon ? "#fff3cd" : "transparent",
        padding:"6px",
        borderRadius:"6px"
      }}>
        {formatFullDateArabic(dayDate)}

        <span style={{
          fontSize:"14px",
          color:"#555",
          marginRight:"10px"
        }}>
          (عدد المواعيد: {waitingGrouped[key].length})
        </span>
      </h3>

      {isSoon && (
        <div style={{
          color:"#856404",
          background:"#fff3cd",
          padding:"6px",
          borderRadius:"6px",
          marginBottom:"6px"
        }}>
          تنبيه: الموعد بعد {diffDays} يوم
        </div>
      )}
            {waitingGrouped[key].map(item=>(
       <div key={item.id} style={{display:"flex",gap:"10px",marginBottom:"6px"}}>
  <div style={{width:"10px",height:"10px",borderRadius:"50%",background:getPriorityColor(item.priority)}}/>
  <div>{formatTimeArabic(item.date)}</div>
  <div style={{flex:1}}>{item.title}</div>

<button
  onClick={()=>setConfirmDialog(item)}
  style={{
    background:"#4CAF50",
    color:"white",
    border:"none",
    padding:"4px 8px",
    cursor:"pointer"
  }}
>
تحويل لمؤكد
</button>

  <button onClick={()=>handleEdit(item)}>تعديل</button>
  <button onClick={()=>handleDelete(item.id)}>حذف</button>
</div>
            ))}
          </div>
        );
      })}

    </main>
  );
}


