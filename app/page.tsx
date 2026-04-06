"use client";
import { supabase } from "@/lib/supabase";
import { useState, useMemo, useEffect, Fragment } from "react";
import Swal from "sweetalert2";
import { ArrowUpDown, Pencil, Trash2, Clock } from "lucide-react";
import Link from "next/link";
type Appointment = {
  id: number;
  date: Date | null;
  title: string;
  priority: string;
  status: "confirmed" | "waiting" | "unscheduled";
};

const months = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

const displayWeekDays = [
  "السبت", "الأحد", "الاثنين", "الثلاثاء",
  "الأربعاء", "الخميس", "الجمعة"
];
const formatTimeArabic = (date: Date) => {
  let hours = date.getHours();
  const minutes = date.getMinutes();

  const period = hours >= 12 ? "م" : "ص";

  hours = hours % 12;
  if (hours === 0) hours = 12;

  const formattedMinutes = minutes < 10 ? "0" + minutes : minutes;

  return `${hours}:${formattedMinutes} ${period}`;
};
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
  const [status, setStatus] = useState<"confirmed" | "waiting" | "unscheduled">("confirmed");

  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [conflictData, setConflictData] = useState<Appointment | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [moveDialog, setMoveDialog] = useState<Appointment | null>(null);

  const [rangeOffset, setRangeOffset] = useState(0);
  const [showTodayPopup, setShowTodayPopup] = useState(false);
  const [showDateTime, setShowDateTime] = useState(true);
  // 🔹 تحميل من Supabase
  const loadData = async () => {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .order("id", { ascending: false });

    if (error) return;

    if (data) {
      const parsed = data.map((a: any) => ({
        ...a,
        date: a.date ? new Date(a.date) : null
      }));

      const filtered = parsed.filter(a => {
        if (a.status === "unscheduled") return true;

        if (!a.date) return false;

        const today = new Date();
        return a.date >= today;
      });

      setAppointments(filtered);
    }
  };

  useEffect(() => {
    loadData();
  }, []);


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
    if (!selectedDayNumber) return null;

    let h = hour;

    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;

    const date = new Date(year, month, selectedDayNumber, h, minute);

    date.setSeconds(0, 0); // مهم جدًا

    return date;
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

  const handleSave = async (force = false, updateExisting = false) => {

    const newDate = status === "unscheduled" ? null : buildDate();

    console.log("NEW DATE:", newDate);
    console.log("ISO:", newDate?.toISOString());

    // ❗ Validation
    if (status !== "unscheduled" && !newDate) {
      Swal.fire({
        icon: "warning",
        title: "تنبيه",
        text: "يرجى تحديد التاريخ والوقت أولاً"
      });
      return;
    }

    if (!title) {
      Swal.fire({
        icon: "warning",
        title: "تنبيه",
        text: "يرجى إدخال اسم الموعد"
      });
      return;
    }

    // ❗ منع وقت قديم
    const now = new Date();
    if (
      newDate &&
      newDate.toDateString() === now.toDateString() &&
      newDate.getTime() < now.getTime()
    ) {
      alert("لا يمكن اختيار وقت سابق عن الوقت الحالي");
      return;
    }

    // 🔥 الحل النهائي للتعارض (مضمون 100%)
    if (newDate) {

      const isoDate = newDate.toISOString();

      const { data: existing, error: checkError } = await supabase
        .from("appointments")
        .select("id, date, status")
        .eq("status", "confirmed")
        .eq("date", isoDate);

      console.log("CHECK:", existing, checkError);

      if (existing && existing.length > 0 && !force) {
        Swal.fire({
          icon: "warning",
          title: "الموعد محجوز",
          text: "يوجد موعد آخر في نفس الوقت"
        });
        return;
      }
    }

    // 🔥 الحفظ
    const { error } = await supabase
      .from("appointments")
      .insert([
        {
          title,
          priority,
          status,
          date: newDate ? newDate.toISOString() : null
        }
      ]);

    console.log("INSERT ERROR:", error);

    if (error) {
      Swal.fire({
        icon: "error",
        title: "خطأ",
        text: "فشل في حفظ الموعد"
      });
      return;
    }

    // 🔄 تحديث البيانات
    await loadData();

    // 🧹 Reset
    setConflictData(null);
    setTitle("");
  };

  // 🗑 حذف موعد
  const handleDelete = async (id: number) => {

    const confirmDelete = confirm("هل أنت متأكد من حذف هذا الموعد؟");
    if (!confirmDelete) return;

    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", id);

    console.log("DELETE ERROR:", error);

    if (error) return;

    await loadData();
  };


  // ✅ نقل إلى مؤكد
  const moveToConfirmed = async (id: number) => {

    const { error } = await supabase
      .from("appointments")
      .update({ status: "confirmed" })
      .eq("id", id);

    console.log("UPDATE CONFIRMED ERROR:", error);

    if (error) return;

    await loadData();
  };


  // ⏳ نقل إلى انتظار
  const moveToWaiting = async (id: number) => {

    const { error } = await supabase
      .from("appointments")
      .update({ status: "waiting" })
      .eq("id", id);

    console.log("UPDATE WAITING ERROR:", error);

    if (error) return;

    await loadData();
  };


  // ❌ بدون موعد
  const moveToUnscheduled = async (id: number) => {

    const { error } = await supabase
      .from("appointments")
      .update({
        status: "unscheduled",
        date: null
      })
      .eq("id", id);

    console.log("UPDATE UNSCHEDULED ERROR:", error);

    if (error) return;

    await loadData();
  };


  // 🔹 dialog (زي ما هو)
  const [confirmDialog, setConfirmDialog] = useState<Appointment | null>(null);

  const handleEdit = (app: Appointment) => {
    setEditingId(app.id);
    setTitle(app.title);
    setPriority(app.priority);
    setStatus(app.status);

    const d = app.date;

    if (d) {

      setMonth(d.getMonth());
      setYear(d.getFullYear());
      setSelectedDayName(d.toLocaleDateString("ar-EG", { weekday: "long" }));
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

    } else {

      setSelectedDayName(null);
      setSelectedDayNumber(null);

    }
  };

  // ترتيب المواعيد
  // الوقت الحالي
  const nowTime = new Date();

  // المواعيد المنتهية (الأرشيف)
  const archivedAppointments = appointments.filter(a =>
    a.date && a.date.getTime() < nowTime.getTime()
  );

  // المواعيد القادمة فقط
  const upcomingAppointments = appointments.filter(a =>
    !a.date || a.date.getTime() >= nowTime.getTime()
  );
  const sorted = [...upcomingAppointments].sort((a, b) => {

    if (!a.date && !b.date) return 0;

    if (!a.date) return 1;

    if (!b.date) return -1;

    return a.date.getTime() - b.date.getTime();

  });

  // فلترة البحث
  const filtered = sorted.filter(a => {

    const text = searchTerm.toLowerCase();

    const dateText = a.date
      ? a.date.toLocaleDateString("ar-EG", { weekday: "long" }) +
      " " +
      a.date.toLocaleDateString("en-CA") +
      " " +
      formatTimeArabic(new Date(a.date))
      : "بدون موعد";

    const fullText =
      a.title +
      " " +
      a.priority +
      " " +
      dateText;

    return fullText.toLowerCase().includes(text);

  });
  const groupByDay = (list: Appointment[]) => {
    const grouped: any = {};
    list.forEach(app => {
      const key = app.date.toDateString();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(app);
    });
    return grouped;
  };

  const confirmedGrouped = groupByDay(filtered.filter(a => a.status === "confirmed"));

  const confirmedKeys = Object.keys(confirmedGrouped)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const pageSize = 7; // عدد الأيام في الصفحة

  const startIndex = rangeOffset * pageSize;
  const endIndex = startIndex + pageSize;

  const pagedConfirmedKeys = confirmedKeys.slice(startIndex, endIndex);
  const totalPages = Math.ceil(confirmedKeys.length / pageSize);
  const waitingGrouped = groupByDay(filtered.filter(a => a.status === "waiting"));
  const unscheduled = filtered.filter(a => a.status === "unscheduled");

  return (
    <main style={{ direction: "rtl", padding: "40px", maxWidth: "1000px", margin: "auto" }}>

      <h1 style={{ textAlign: "center", marginBottom: "30px" }}>

        برنامج إدارة المواعيد
      </h1>
      <div style={{ marginBottom: "20px" }}>

        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>

          <Link href="/archive">
            <button
              style={{
                background: "#607D8B",
                color: "white",
                border: "none",
                padding: "8px 16px",
                cursor: "pointer",
                borderRadius: "6px"
              }}
            >
              فتح أرشيف المواعيد
            </button>
          </Link>

          {status !== "unscheduled" && (
            <button
              onClick={() => setShowDateTime(!showDateTime)}
              style={{
                background: "#607D8B",
                color: "white",
                border: "none",
                padding: "8px 16px",
                cursor: "pointer",
                borderRadius: "6px"
              }}
            >
              {showDateTime ? "إخفاء التاريخ والتوقيت" : "إظهار التاريخ والتوقيت"}
            </button>
          )}

        </div>

      </div>

      <div style={{ marginBottom: "10px", fontWeight: "bold" }}>
        عرض مواعيد اليوم
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>

        <button
          onClick={() => setShowTodayPopup(true)}
          style={{
            background: "#2196F3",
            color: "white",
            border: "none",
            padding: "6px 12px",
            cursor: "pointer"
          }}
        >
          مواعيد اليوم
        </button>

      </div>
      {showDateTime && (
        <>
          {/* الشهر والسنة */}
          <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
            <select value={month} onChange={e => setMonth(Number(e.target.value))}>
              {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>

            <select value={year} onChange={e => setYear(Number(e.target.value))}>
              {Array.from({ length: 10 }).map((_, i) => {
                const y = now.getFullYear() - 2 + i;
                return <option key={y}>{y}</option>;
              })}
            </select>
          </div>

          {/* أيام الأسبوع */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
            {displayWeekDays.map(day => (
              <div
                key={day}
                onClick={() => { setSelectedDayName(day); setSelectedDayNumber(null); }}
                style={{
                  padding: "8px 14px",
                  border: "1px solid #ccc",
                  cursor: "pointer",
                  background: selectedDayName === day ? "#4CAF50" : "#eee",
                  color: selectedDayName === day ? "white" : "black"
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* التواريخ */}
          {selectedDayName && (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
              {availableDates.map(d => {
                const today = new Date();
                const thisDate = new Date(year, month, d);

                const isPastDay =
                  thisDate.setHours(0, 0, 0, 0) <
                  new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

                const isToday =
                  d === today.getDate() &&
                  month === today.getMonth() &&
                  year === today.getFullYear();

                return (
                  <div
                    key={d}
                    onClick={() => !isPastDay && setSelectedDayNumber(d)}
                    style={{
                      padding: "6px 12px",
                      border: "1px solid #999",
                      cursor: isPastDay ? "not-allowed" : "pointer",
                      background: isPastDay
                        ? "#ddd"
                        : selectedDayNumber === d
                          ? "#4CAF50"
                          : isToday
                            ? "#bbdefb"
                            : "#f5f5f5",
                      color: isPastDay
                        ? "#888"
                        : selectedDayNumber === d
                          ? "white"
                          : "black",
                      fontWeight: isToday ? "bold" : "normal",
                      opacity: isPastDay ? 0.6 : 1
                    }}
                  >
                    {d}
                  </div>
                );
              })}
            </div>
          )}

          {/* مربع التوقيت */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
            <div style={{
              border: "2px solid #4CAF50",
              borderRadius: "10px",
              padding: "15px",
              direction: "ltr",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <input
                type="text"
                value={hour}
                onFocus={() => setHour(0)}
                onChange={(e) => {
                  const num = Number(convertArabicToEnglish(e.target.value));
                  if (num >= 0 && num <= 12) setHour(num);
                }}
                style={{ width: "60px", textAlign: "center" }}
              />
              <span>:</span>
              <input
                type="text"
                value={minute.toString().padStart(2, "0")}
                onFocus={() => setMinute(0)}
                onChange={(e) => {
                  const num = Number(convertArabicToEnglish(e.target.value));
                  if (num >= 0 && num <= 59) setMinute(num);
                }}
                style={{ width: "60px", textAlign: "center" }}
              />
              <button onClick={() => setPeriod("AM")}
                style={{ background: period === "AM" ? "#4CAF50" : "#ccc", padding: "6px 12px" }}>
                صباحًا
              </button>
              <button onClick={() => setPeriod("PM")}
                style={{ background: period === "PM" ? "#4CAF50" : "#ccc", padding: "6px 12px" }}>
                مساءً
              </button>
            </div>
          </div>
        </>
      )}
      {/* الاسم + الأولوية */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        <input
          placeholder="اسم الموعد"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{
            flex: 1,
            border: "3px solid #4CAF50",
            borderRadius: "8px",
            padding: "8px"
          }}
        />
        <select value={priority} onChange={e => setPriority(e.target.value)}>
          <option>عالي</option>
          <option>متوسط</option>
          <option>عادي</option>
        </select>
      </div>

      {/* اختيار الحالة */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>

        <button
          onClick={() => {
            setStatus("confirmed");
            setShowDateTime(true);
          }}
          style={{ background: status === "confirmed" ? "#4CAF50" : "#ccc", padding: "6px 12px" }}
        >
          موعد مؤكد
        </button>

        <button
          onClick={() => {
            setStatus("waiting");
            setShowDateTime(true);
          }}
          style={{ background: status === "waiting" ? "#ff9800" : "#ccc", padding: "6px 12px" }}
        >
          قائمة انتظار
        </button>

        <button
          onClick={() => {
            setStatus("unscheduled");
            setShowDateTime(false);
          }}
          style={{ background: status === "unscheduled" ? "#607D8B" : "#ccc", padding: "6px 12px" }}
        >
          بدون موعد
        </button>


      </div>

      <button
        onClick={() => handleSave()}
        style={{
          padding: "10px 20px",
          background: "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "16px"
        }}
      >
        {editingId ? "تحديث" : "إضافة"}
      </button>

      {confirmDialog && (
        <div style={{
          marginTop: "20px",
          padding: "15px",
          border: "2px solid green",
          borderRadius: "8px",
          background: "#e8f5e9"
        }}>

          هل تريد تحويل الموعد إلى مؤكد؟

          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>

            <button
              onClick={() => {
                moveToConfirmed(confirmDialog.id);
                setConfirmDialog(null);
              }}
              style={{
                flex: 1,
                padding: "8px",
                background: "#4CAF50",
                color: "white",
                border: "none"
              }}
            >
              تحويل بنفس الموعد
            </button>

            <button
              onClick={() => {
                handleEdit(confirmDialog);
                setStatus("confirmed");
                setConfirmDialog(null);
              }}
              style={{
                flex: 1,
                padding: "8px",
                background: "#2196F3",
                color: "white",
                border: "none"
              }}
            >
              تعديل الموعد
            </button>

          </div>

        </div>
      )}
      {conflictData && (
        <div style={{
          marginTop: "20px",
          padding: "15px",
          border: "2px solid red",
          borderRadius: "8px",
          background: "#ffeaea"
        }}>
          يوجد موعد بنفس التاريخ والتوقيت
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button
              onClick={() => handleSave(true, false)}
              style={{ flex: 1, padding: "8px", background: "#4CAF50", color: "white", border: "none" }}
            >
              موافق
            </button>
            <button
              onClick={() => handleSave(true, true)}
              style={{ flex: 1, padding: "8px", background: "#ff9800", color: "white", border: "none" }}
            >
              تحديث الموعد الموجود
            </button>
          </div>
        </div>
      )}
      <div style={{ marginBottom: "20px" }}>
        <input
          placeholder="🔎 بحث عن موعد..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            border: "2px solid #2196F3",
            borderRadius: "8px"
          }}
        />
      </div>

      {showTodayPopup && (
        <div style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          background: "white",
          padding: "20px",
          border: "2px solid #2196F3",
          borderRadius: "10px",
          zIndex: 1000,
          minWidth: "300px",
          boxShadow: "0 0 10px rgba(0,0,0,0.3)"
        }}>

          <h3>مواعيد اليوم</h3>

          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "10px",
            tableLayout: "fixed"
          }}>

            <thead>
              <tr style={{ background: "#2196F3", color: "white" }}>
                <th style={{ padding: "6px" }}>الوقت</th>
                <th style={{ padding: "6px" }}>اسم الموعد</th>
                <th style={{ padding: "6px" }}>الأولوية</th>
              </tr>
            </thead>

            <tbody>
              {appointments
                .filter(a => {
                  const now = new Date();

                  if (!a.date) return false;

                  const d = new Date(a.date);

                  return d.toDateString() === now.toDateString();
                })
                .sort((a, b) => {
                  const d1 = new Date(a.date);
                  const d2 = new Date(b.date);

                  return d1.getTime() - d2.getTime();
                })
                .map(a => {
                  const d = new Date(a.date);

                  return (
                    <tr key={a.id} style={{ borderBottom: "1px solid #ccc" }}>
                      <td style={{ padding: "6px" }}>
                        {formatTimeArabic(d)}
                      </td>

                      <td style={{ padding: "6px" }}>
                        {a.title}
                      </td>

                      <td style={{ padding: "6px", textAlign: "center" }}>
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px"
                        }}>
                          <div style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            background: getPriorityColor(a.priority)
                          }}></div>

                          <span>
                            {a.priority}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>

            </table>

            {/* Close button */}
            <div style={{ marginTop: "10px", textAlign: "center" }}>
              <button onClick={() => setShowTodayPopup(false)}>
                إغلاق
              </button>
            </div>

          </div>
        )}

        <hr style={{ margin: "30px 0" }} />
              <hr style={{ margin: "30px 0" }} />
              <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>

                <button
                  onClick={() => {
                    if (rangeOffset > 0) {
                      setRangeOffset(rangeOffset - 1);
                    }
                  }}
                  style={{
                    padding: "6px 12px",
                    opacity: rangeOffset === 0 ? 0.4 : 1,
                    cursor: rangeOffset === 0 ? "not-allowed" : "pointer"
                  }}
                >
                  السابق
                </button>

                <button
                  onClick={() => {
                    if (rangeOffset < totalPages - 1) {
                      setRangeOffset(rangeOffset + 1);
                    }
                  }}
                  style={{
                    padding: "6px 12px",
                    opacity: rangeOffset >= totalPages - 1 ? 0.4 : 1,
                    cursor: rangeOffset >= totalPages - 1 ? "not-allowed" : "pointer"
                  }}
                >
                  التالي
                </button>

                <span style={{ padding: "6px 12px" }}>
                  الصفحة {rangeOffset + 1}
                </span>

              </div>
              <h2>المواعيد المؤكدة</h2>
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: "15px"
              }}>

                <thead>
                  <tr style={{
                    background: "#4CAF50",
                    color: "white"
                  }}>
                    <th style={{ padding: "10px", width: "140px", textAlign: "center" }}>الوقت</th>

                    <th style={{
                      padding: "10px",
                      textAlign: "center",
                      width: "100%",
                      letterSpacing: "2px",
                      fontWeight: "bold"
                    }}>
                      ────────────── الموعد ──────────────
                    </th>

                    <th style={{ padding: "10px", width: "70px", textAlign: "center" }}>
                      الأولوية
                    </th>

                    <th style={{ padding: "10px", width: "120px", textAlign: "left" }}>
                      الإجراءات
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {pagedConfirmedKeys.map(key => {

                    const dayDate = confirmedGrouped[key][0].date;

                    return (

                      <Fragment key={key}>
                        <tr style={{
                          background: "#e3f2fd",
                          fontWeight: "bold"
                        }}>
                          <td colSpan={4} style={{ padding: "8px" }}>
                            {formatFullDateArabic(dayDate)}
                            (عدد المواعيد: {confirmedGrouped[key].length})
                          </td>
                        </tr>

                        {confirmedGrouped[key].map(item => (
                          <tr key={item.id} style={{ borderBottom: "1px solid #ddd" }}>

                            <td style={{
                              padding: "8px",
                              textAlign: "center",
                              width: "140px"
                            }}>
                              {formatTimeArabic(new Date(item.date))}
                            </td>

                            <td style={{
                              padding: "8px",
                              whiteSpace: "normal",
                              wordBreak: "break-word",
                              lineHeight: "1.4"
                            }}>
                              {item.title}
                            </td>

                            <td style={{
                              padding: "8px",
                              textAlign: "center",
                              width: "70px"
                            }}>
                              <div style={{
                                width: "10px",
                                height: "10px",
                                borderRadius: "50%",
                                margin: "auto",
                                background: getPriorityColor(item.priority)
                              }}></div>
                            </td>

                            <td style={{
                              padding: "8px",
                              textAlign: "left",
                              width: "120px"
                            }}>

                              <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "14px"
                              }}>

                                <ArrowUpDown
                                  size={18}
                                  style={{ cursor: "pointer" }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = "#ff9800"}
                                  onMouseLeave={(e) => e.currentTarget.style.color = "black"}
                                  onClick={() => {

                                    Swal.fire({
                                      title: "نقل الموعد",
                                      text: "هل تريد نقل الموعد بنفس التوقيت أم تعديل الموعد؟",
                                      icon: "question",

                                      showCancelButton: true,
                                      showCloseButton: true,

                                      confirmButtonText: "نقل بنفس الموعد",
                                      cancelButtonText: "تعديل الموعد",

                                      confirmButtonColor: "#ff9800",
                                      cancelButtonColor: "#2196F3",

                                      customClass: {
                                        closeButton: "swal-close-left"
                                      }

                                    }).then((result) => {

                                      if (result.isConfirmed) {

                                        moveToWaiting(item.id)

                                      } else if (result.dismiss === Swal.DismissReason.cancel) {

                                        handleEdit(item)
                                        setStatus("waiting")

                                      }

                                    })

                                  }}
                                />

                                <Pencil
                                  size={18}
                                  style={{ cursor: "pointer" }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = "#2196F3"}
                                  onMouseLeave={(e) => e.currentTarget.style.color = "black"}
                                  onClick={() => handleEdit(item)}
                                />

                                <Trash2
                                  size={18}
                                  style={{ cursor: "pointer" }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = "#f44336"}
                                  onMouseLeave={(e) => e.currentTarget.style.color = "black"}
                                  onClick={() => handleDelete(item.id)}
                                />
                                <div
                                  style={{ position: "relative", cursor: "pointer" }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = "#607D8B"}
                                  onMouseLeave={(e) => e.currentTarget.style.color = "black"}
                                  onClick={() => moveToUnscheduled(item.id)}
                                >

                                  <Clock size={18} />

                                  <span style={{
                                    position: "absolute",
                                    top: "-4px",
                                    right: "-4px",
                                    fontSize: "10px",
                                    color: "red",
                                    fontWeight: "bold"
                                  }}>
                                    ×
                                  </span>

                                </div>

                              </div>

                            </td>

                          </tr>
                        ))}

                      </Fragment>
                    )

                  })}

                </tbody>

              </table>

              <hr style={{ margin: "30px 0" }} />

              <h2>قائمة الانتظار</h2>

              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: "15px"
              }}>

     <thead>
                  <tr style={{
                    background: "#e4982d",
                    color: "white"
                  }}>
                    <th style={{ padding: "10px", width: "140px", textAlign: "center" }}>الوقت</th>

                    <th style={{
                      padding: "10px",
                      textAlign: "center",
                      width: "100%",
                      letterSpacing: "2px",
                      fontWeight: "bold"
                    }}>
                      ────────────── الموعد ──────────────
                    </th>

                    <th style={{ padding: "10px", width: "70px", textAlign: "center" }}>
                      الأولوية
                    </th>

                    <th style={{ padding: "10px", width: "120px", textAlign: "left" }}>
                      الإجراءات
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {Object.keys(waitingGrouped).map(key => {

                    const dayDate = new Date(waitingGrouped[key][0].date);

                    return (

                      <Fragment key={key}>

                        <tr style={{
                          background: "#e6cca1",
                          fontWeight: "bold"
                        }}>
                          <td colSpan={4} style={{ padding: "8px" }}>
                            {formatFullDateArabic(dayDate)}
                            (عدد المواعيد: {waitingGrouped[key].length})
                          </td>
                        </tr>

                        {waitingGrouped[key].map(item => {

                          const d = new Date(item.date);

                          return (
                            <tr key={item.id} style={{ borderBottom: "1px solid #ddd" }}>

                              <td style={{
                                padding: "8px",
                                textAlign: "center",
                                width: "140px"
                              }}>
                                {formatTimeArabic(d)}
                              </td>

                              <td style={{
                                padding: "8px",
                                whiteSpace: "normal",
                                wordBreak: "break-word",
                                lineHeight: "1.4"
                              }}>
                                {item.title}
                              </td>

                              <td style={{
                                padding: "8px",
                                textAlign: "center",
                                width: "70px"
                              }}>
                                <div style={{
                                  width: "10px",
                                  height: "10px",
                                  borderRadius: "50%",
                                  margin: "auto",
                                  background: getPriorityColor(item.priority)
                                }}></div>
                              </td>

                              <td style={{
                                padding: "8px",
                                textAlign: "left",
                                width: "120px"
                              }}>

                                <div style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "14px"
                                }}>
<ArrowUpDown
                                  size={18}
                                  style={{ cursor: "pointer" }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = "#00ff73"}
                                  onMouseLeave={(e) => e.currentTarget.style.color = "black"}
                                  onClick={() => {

                                    Swal.fire({
                                      title: "نقل الموعد",
                                      text: "هل تريد نقل الموعد بنفس التوقيت أم تعديل الموعد؟",
                                      icon: "question",

                                      showCancelButton: true,
                                      showCloseButton: true,

                                      confirmButtonText: "نقل بنفس الموعد",
                                      cancelButtonText: "تعديل الموعد",

                                      confirmButtonColor: "#0e8218",
                                      cancelButtonColor: "#2196F3",

                                      customClass: {
                                        closeButton: "swal-close-left"
                                      }

                                    }).then((result) => {

                                      if (result.isConfirmed) {

                                        moveToConfirmed(item.id)

                                      } else if (result.dismiss === Swal.DismissReason.cancel) {

                                        handleEdit(item)
                                        setStatus("waiting")

                                      }

                                    })

                                  }}
                                />

                                <Pencil
                                  size={18}
                                  style={{ cursor: "pointer" }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = "#2196F3"}
                                  onMouseLeave={(e) => e.currentTarget.style.color = "black"}
                                  onClick={() => handleEdit(item)}
                                />

                                <Trash2
                                  size={18}
                                  style={{ cursor: "pointer" }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = "#f44336"}
                                  onMouseLeave={(e) => e.currentTarget.style.color = "black"}
                                  onClick={() => handleDelete(item.id)}
                                />
                                <div
                                  style={{ position: "relative", cursor: "pointer" }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = "#607D8B"}
                                  onMouseLeave={(e) => e.currentTarget.style.color = "black"}
                                  onClick={() => moveToUnscheduled(item.id)}
                                >

                                  <Clock size={18} />

                                  <span style={{
                                    position: "absolute",
                                    top: "-4px",
                                    right: "-4px",
                                    fontSize: "10px",
                                    color: "red",
                                    fontWeight: "bold"
                                  }}>
                                    ×
                                  </span>
                                  </div>

                                </div>

                              </td>

                            </tr>
                          );
                        })}

                      </Fragment>
                    );

                  })}

                </tbody>

              </table>
              <hr style={{ margin: "30px 0" }} />

              <h2>بدون موعد</h2>

              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: "15px"
              }}>

                <thead>
                  <tr style={{
                    background: "#607D8B",
                    color: "white"
                  }}>
                    <th style={{ padding: "10px", textAlign: "center" }}>
                      ────────────── الموعد ──────────────
                    </th>

                    <th style={{ padding: "10px", width: "70px", textAlign: "center" }}>
                      الأولوية
                    </th>

                    <th style={{ padding: "10px", width: "120px", textAlign: "left" }}>
                      الإجراءات
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {unscheduled.map(item => {
  return (
                    <tr key={item.id} style={{ borderBottom: "1px solid #ddd" }}>

                      <td style={{
                        padding: "8px",
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                        lineHeight: "1.4"
                      }}>
                        {item.title}
                      </td>

                      <td style={{ padding: "8px", textAlign: "center" }}>
                        <div style={{
                          width: "10px",
                          height: "10px",
                          borderRadius: "50%",
                          margin: "auto",
                          background: getPriorityColor(item.priority)
                        }}></div>
                      </td>

                      <td style={{ padding: "8px" }}>

                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "14px"
                        }}>

                          <Pencil
                            size={18}
                            style={{ cursor: "pointer" }}
                            onMouseEnter={(e) => e.currentTarget.style.color = "#2196F3"}
                            onMouseLeave={(e) => e.currentTarget.style.color = "black"}
                            onClick={() => handleEdit(item)}
                          />

                          <Trash2
                            size={18}
                            style={{ cursor: "pointer" }}
                            onMouseEnter={(e) => e.currentTarget.style.color = "#f44336"}
                            onMouseLeave={(e) => e.currentTarget.style.color = "black"}
                            onClick={() => handleDelete(item.id)}
                          />

                        </div>

                      </td>

                    </tr>
                    );
})}

                </tbody>

              </table>
            
    </main>
    );
}

