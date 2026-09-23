import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Calendar,
  CheckCircle2,
  Save,
  Filter,
  UserCheck,
  AlertCircle,
  BarChart3,
  CalendarCheck,
  Clock,
  Trash2,
} from 'lucide-react';
import { Batch, Student, AttendanceStatus, AttendanceRecord } from '../types';
import {
  fetchAttendanceByDateAndBatch,
  fetchAllAttendance,
  saveAttendanceRecords,
  deleteAttendanceByDateAndBatch,
} from '../lib/supabase';

interface AttendanceTabProps {
  batches: Batch[];
  students: Student[];
}

type AttendanceSubView = 'daily' | 'monthly' | 'summary';

// Helper to safely format date headers without timezone shift
const formatDateHeader = (dateStr: string) => {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return {
        dayNum: parts[2],
        monthStr: d.toLocaleDateString('en-US', { month: 'short' }),
        weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
      };
    }
  } catch {
    // fallback
  }
  return { dayNum: dateStr, monthStr: '', weekday: '' };
};

const formatMonthName = (monthYearStr: string) => {
  try {
    const [y, m] = monthYearStr.split('-');
    const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return monthYearStr;
  }
};

export const AttendanceTab: React.FC<AttendanceTabProps> = ({ batches, students }) => {
  const [subView, setSubView] = useState<AttendanceSubView>('daily');

  // Daily Mode State
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [attendanceState, setAttendanceState] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [existingDailyRecordsCount, setExistingDailyRecordsCount] = useState(0);

  // Monthly Matrix View State
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [monthBatchFilter, setMonthBatchFilter] = useState<string>('all');
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);

  // Overall Stats Sub-view State (supports All-Time or specific Month drill-down)
  const [statsTimeframe, setStatsTimeframe] = useState<'month' | 'all_time'>('month');
  const [statsMonth, setStatsMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [statsBatchFilter, setStatsBatchFilter] = useState<string>('all');

  // Set default batch when batches load
  useEffect(() => {
    if (batches.length > 0 && !selectedBatchId) {
      setSelectedBatchId(batches[0].id);
    }
  }, [batches, selectedBatchId]);

  // Load all attendance records for Monthly & Summary views
  const reloadAllAttendance = async () => {
    const records = await fetchAllAttendance();
    setAllAttendance(records);
  };

  useEffect(() => {
    reloadAllAttendance();
  }, []);

  // Filter active students for selected daily batch
  const dailyBatchStudents = students.filter(
    (s) => s.is_active && (selectedBatchId ? s.batch_id === selectedBatchId : true)
  );

  // Load existing attendance for specific date & batch in daily mode
  useEffect(() => {
    const loadDailyAttendance = async () => {
      if (!selectedBatchId) return;
      const records = await fetchAttendanceByDateAndBatch(selectedDate, selectedBatchId);
      setExistingDailyRecordsCount(records.length);

      const stateMap: Record<string, AttendanceStatus> = {};
      records.forEach((r) => {
        stateMap[r.student_id] = r.status;
      });
      // Default un-marked students to present
      dailyBatchStudents.forEach((s) => {
        if (!stateMap[s.id]) {
          stateMap[s.id] = 'present';
        }
      });
      setAttendanceState(stateMap);
    };
    loadDailyAttendance();
  }, [selectedDate, selectedBatchId, students, allAttendance]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleMarkAllPresent = () => {
    const updated: Record<string, AttendanceStatus> = { ...attendanceState };
    dailyBatchStudents.forEach((s) => {
      updated[s.id] = 'present';
    });
    setAttendanceState(updated);
  };

  const handleSaveDaily = async () => {
    setSaving(true);
    setSuccessMsg('');
    const recordsToSave: Omit<AttendanceRecord, 'id'>[] = dailyBatchStudents.map((s) => ({
      attendance_date: selectedDate,
      batch_id: s.batch_id,
      student_id: s.id,
      status: attendanceState[s.id] || 'present',
    }));

    await saveAttendanceRecords(recordsToSave);
    await reloadAllAttendance();
    setSaving(false);
    setSuccessMsg('Attendance saved successfully!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleDeleteDailyAttendance = async () => {
    const currentBatchName = batches.find((b) => b.id === selectedBatchId)?.name || 'Selected Batch';
    if (!window.confirm(`Are you sure you want to delete all attendance records for ${selectedDate} (${currentBatchName})?`)) {
      return;
    }

    setSaving(true);
    await deleteAttendanceByDateAndBatch(selectedDate, selectedBatchId);
    await reloadAllAttendance();
    setSaving(false);
    setSuccessMsg('Attendance records for this date cleared.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleDeleteSpecificDateBatch = async (dateStr: string, batchId: string, batchName: string) => {
    if (!window.confirm(`Delete attendance record for ${dateStr} (${batchName})?`)) {
      return;
    }
    await deleteAttendanceByDateAndBatch(dateStr, batchId);
    await reloadAllAttendance();
  };

  const getStatusBadgeClass = (status: AttendanceStatus, current: AttendanceStatus) => {
    const isSelected = status === current;
    switch (status) {
      case 'present':
        return isSelected
          ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30'
          : 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700';
      case 'absent':
        return isSelected
          ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30'
          : 'bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-700';
      case 'late':
        return isSelected
          ? 'bg-amber-500 text-white font-bold shadow-md shadow-amber-500/30'
          : 'bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-700';
      case 'excused':
        return isSelected
          ? 'bg-sky-600 text-white font-bold shadow-md shadow-sky-600/30'
          : 'bg-slate-100 text-slate-600 hover:bg-sky-100 hover:text-sky-700';
    }
  };

  // --- MONTHLY MATRIX CALCULATIONS ---
  const monthRecords = allAttendance.filter((r) => {
    const inMonth = r.attendance_date.startsWith(selectedMonth);
    const inBatch = monthBatchFilter === 'all' || r.batch_id === monthBatchFilter;
    return inMonth && inBatch;
  });

  // Unique conducted dates across filtered month records
  const conductedDates = Array.from(new Set(monthRecords.map((r) => r.attendance_date))).sort();

  // Distinct conducted sessions for deletion management
  const conductedSessions: { date: string; batchId: string; batchName: string; studentCount: number }[] = [];
  const sessionKeys = new Set<string>();

  monthRecords.forEach((r) => {
    const key = `${r.attendance_date}_${r.batch_id}`;
    if (!sessionKeys.has(key)) {
      sessionKeys.add(key);
      const bName = batches.find((b) => b.id === r.batch_id)?.name || 'Batch';
      const count = monthRecords.filter((m) => m.attendance_date === r.attendance_date && m.batch_id === r.batch_id).length;
      conductedSessions.push({
        date: r.attendance_date,
        batchId: r.batch_id,
        batchName: bName,
        studentCount: count,
      });
    }
  });

  const monthStudents = students.filter((s) => {
    if (!s.is_active) return false;
    if (monthBatchFilter !== 'all') {
      return s.batch_id === monthBatchFilter;
    }
    return true;
  });

  // Calculate student monthly record accurately based on dates conducted for THAT student's batch
  const getStudentMonthlyRecord = (student: Student) => {
    // Conducted dates specifically for this student's batch
    const studentBatchConductedDates = Array.from(
      new Set(
        allAttendance
          .filter((r) => r.batch_id === student.batch_id && r.attendance_date.startsWith(selectedMonth))
          .map((r) => r.attendance_date)
      )
    ).sort();

    const studentMonthRecords = monthRecords.filter((r) => r.student_id === student.id);
    const dateStatusMap: Record<string, AttendanceStatus> = {};
    studentMonthRecords.forEach((r) => {
      dateStatusMap[r.attendance_date] = r.status;
    });

    const attendedCount = studentBatchConductedDates.filter((d) => {
      const st = dateStatusMap[d];
      return st === 'present' || st === 'late';
    }).length;

    const totalHeld = studentBatchConductedDates.length;
    const rate = totalHeld > 0 ? Math.round((attendedCount / totalHeld) * 100) : 0;

    return {
      dateStatusMap,
      attendedCount,
      totalHeld,
      rate,
      studentBatchConductedDates,
    };
  };

  // --- OVERALL / MONTH STATS DRILL-DOWN CALCULATIONS ---
  const statsStudents = students.filter((s) => {
    if (!s.is_active) return false;
    if (statsBatchFilter !== 'all') {
      return s.batch_id === statsBatchFilter;
    }
    return true;
  });

  const calculateStudentDrilldownStats = (student: Student) => {
    if (statsTimeframe === 'month') {
      // Conducted dates for this student's batch in that month
      const batchConductedDates = Array.from(
        new Set(
          allAttendance
            .filter((r) => r.batch_id === student.batch_id && r.attendance_date.startsWith(statsMonth))
            .map((r) => r.attendance_date)
        )
      );

      const studentRecords = allAttendance.filter(
        (r) => r.student_id === student.id && r.attendance_date.startsWith(statsMonth)
      );

      const presentCount = studentRecords.filter((r) => r.status === 'present' || r.status === 'late').length;
      const totalHeld = batchConductedDates.length;
      const pct = totalHeld > 0 ? Math.round((presentCount / totalHeld) * 100) : 0;

      return { total: totalHeld, present: presentCount, pct, isBatchEmpty: totalHeld === 0 };
    } else {
      // All time
      const studentRecords = allAttendance.filter((r) => r.student_id === student.id);
      if (studentRecords.length === 0) return { total: 0, present: 0, pct: 0, isBatchEmpty: true };
      const presentCount = studentRecords.filter((r) => r.status === 'present' || r.status === 'late').length;
      const pct = Math.round((presentCount / studentRecords.length) * 100);
      return { total: studentRecords.length, present: presentCount, pct, isBatchEmpty: false };
    }
  };

  return (
    <div className="space-y-4 pb-28 max-w-md mx-auto px-4 pt-3">
      {/* Sub-navigation Pills */}
      <div className="bg-slate-200/80 p-1 rounded-2xl flex items-center justify-between text-xs font-bold text-slate-600">
        <button
          onClick={() => setSubView('daily')}
          className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            subView === 'daily'
              ? 'bg-white text-rose-700 shadow-sm font-bold'
              : 'hover:text-slate-900'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Daily Sheet</span>
        </button>
        <button
          onClick={() => setSubView('monthly')}
          className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            subView === 'monthly'
              ? 'bg-white text-rose-700 shadow-sm font-bold'
              : 'hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Monthly Matrix</span>
        </button>
        <button
          onClick={() => setSubView('summary')}
          className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            subView === 'summary'
              ? 'bg-white text-rose-700 shadow-sm font-bold'
              : 'hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Overall Stats</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* VIEW 1: DAILY ATTENDANCE SHEET */}
      {/* ========================================================= */}
      {subView === 'daily' && (
        <div className="space-y-4 animate-fade-in">
          {/* Daily Controls Container */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            {/* Date Selector */}
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-4 h-4 text-rose-600" />
                Class Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>

            {/* Batch Filter */}
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Filter className="w-4 h-4 text-rose-600" />
                Select Batch
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none max-w-[200px]"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Actions Header */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <span className="text-xs font-medium text-slate-500">
                Total Students: <strong className="text-slate-800">{dailyBatchStudents.length}</strong>
              </span>
              <div className="flex items-center gap-2">
                {existingDailyRecordsCount > 0 && (
                  <button
                    onClick={handleDeleteDailyAttendance}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition-colors"
                    title="Delete all attendance entries for this date & batch"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Clear Date</span>
                  </button>
                )}
                <button
                  onClick={handleMarkAllPresent}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Mark All Present
                </button>
              </div>
            </div>
          </div>

          {/* Success Notification */}
          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Students Attendance List */}
          {dailyBatchStudents.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-slate-500 border border-slate-200">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium">No active students in this batch.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {dailyBatchStudents.map((student) => {
                const currentStatus = attendanceState[student.id] || 'present';
                return (
                  <div
                    key={student.id}
                    className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-2 hover:border-rose-200 transition-colors"
                  >
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm leading-tight">{student.name}</h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {student.phone
                          ? `Ph: ${student.phone}`
                          : student.parent_phone
                          ? `Parent: ${student.parent_phone}`
                          : 'No phone listed'}
                      </p>
                    </div>

                    {/* Attendance Toggle Pills */}
                    <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                      {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map((st) => (
                        <button
                          key={st}
                          onClick={() => handleStatusChange(student.id, st)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all uppercase flex items-center justify-center ${getStatusBadgeClass(
                            st,
                            currentStatus
                          )}`}
                          title={st}
                        >
                          {st === 'present' ? 'P' : st === 'absent' ? 'A' : st === 'late' ? 'L' : 'E'}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Save Button Floating Bar */}
          <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto px-4 py-2 z-30">
            <button
              onClick={handleSaveDaily}
              disabled={saving || dailyBatchStudents.length === 0}
              className="w-full bg-rose-700 hover:bg-rose-800 text-white font-bold py-3 px-4 rounded-2xl shadow-lg shadow-rose-700/30 flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Records...' : "Save Today's Attendance"}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 2: MONTH-WISE ATTENDANCE MATRIX */}
      {/* ========================================================= */}
      {subView === 'monthly' && (
        <div className="space-y-4 animate-fade-in">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-4 h-4 text-rose-600" />
                Select Month
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Filter className="w-4 h-4 text-rose-600" />
                Batch Filter
              </label>
              <select
                value={monthBatchFilter}
                onChange={(e) => setMonthBatchFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none max-w-[200px]"
              >
                <option value="all">All Batches</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Month Summary KPI Banner */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm text-center">
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Classes Conducted</p>
              <p className="text-xl font-extrabold text-rose-700 mt-0.5">
                {conductedDates.length} <span className="text-xs font-semibold text-slate-500">Days</span>
              </p>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm text-center">
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Active Students</p>
              <p className="text-xl font-extrabold text-slate-800 mt-0.5">
                {monthStudents.length} <span className="text-xs font-semibold text-slate-500">Enrolled</span>
              </p>
            </div>
          </div>

          {conductedDates.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-slate-500 border border-slate-200 space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">No classes conducted in {formatMonthName(selectedMonth)}</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Once attendance is marked for any date in this month, all conducted dates and student statuses will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Horizontally Scrollable Attendance Matrix */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    {formatMonthName(selectedMonth)} Date Matrix
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">Scroll right for dates →</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[340px]">
                    <thead>
                      <tr className="bg-slate-50 text-[11px] text-slate-600 border-b border-slate-200">
                        <th className="py-2.5 px-3 font-bold sticky left-0 bg-slate-50 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)] min-w-[120px]">
                          Student Name
                        </th>
                        {conductedDates.map((dateStr) => {
                          const { dayNum, weekday } = formatDateHeader(dateStr);
                          return (
                            <th key={dateStr} className="py-2 px-2 text-center min-w-[48px]">
                              <div className="font-extrabold text-slate-800 leading-none">{dayNum}</div>
                              <div className="text-[10px] text-slate-400 font-semibold uppercase">{weekday}</div>
                            </th>
                          );
                        })}
                        <th className="py-2.5 px-3 font-bold text-center min-w-[70px]">Attended</th>
                        <th className="py-2.5 px-3 font-bold text-center min-w-[60px]">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {monthStudents.map((student) => {
                        const rec = getStudentMonthlyRecord(student);
                        return (
                          <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-slate-800 sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)] whitespace-nowrap">
                              {student.name}
                            </td>
                            {conductedDates.map((dateStr) => {
                              const isBatchDate = rec.studentBatchConductedDates.includes(dateStr);
                              const status = rec.dateStatusMap[dateStr];

                              if (!isBatchDate) {
                                return (
                                  <td key={dateStr} className="py-2 px-1 text-center" title="No class for this student's batch">
                                    <span className="inline-flex items-center justify-center w-6 h-6 text-slate-300 font-semibold">
                                      —
                                    </span>
                                  </td>
                                );
                              }

                              return (
                                <td key={dateStr} className="py-2 px-1 text-center">
                                  {status === 'present' ? (
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold text-[11px]">
                                      P
                                    </span>
                                  ) : status === 'absent' ? (
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-rose-100 text-rose-800 font-extrabold text-[11px]">
                                      A
                                    </span>
                                  ) : status === 'late' ? (
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-amber-100 text-amber-800 font-extrabold text-[11px]">
                                      L
                                    </span>
                                  ) : status === 'excused' ? (
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-sky-100 text-sky-800 font-extrabold text-[11px]">
                                      E
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center justify-center w-6 h-6 text-slate-300 font-bold">
                                      -
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="py-2.5 px-3 font-bold text-slate-700 text-center whitespace-nowrap">
                              {rec.totalHeld === 0 ? '0/0' : `${rec.attendedCount}/${rec.totalHeld}`}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              {rec.totalHeld === 0 ? (
                                <span className="text-slate-400 font-medium text-[11px]">N/A</span>
                              ) : (
                                <span
                                  className={`px-2 py-0.5 rounded-md font-extrabold text-[11px] ${
                                    rec.rate >= 80
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : rec.rate >= 50
                                      ? 'bg-amber-50 text-amber-700'
                                      : 'bg-rose-50 text-rose-700'
                                  }`}
                                >
                                  {rec.rate}%
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Status Legend */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center justify-around gap-2 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">
                    P
                  </span>
                  <span>Present</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-rose-100 text-rose-800 flex items-center justify-center font-bold text-[10px]">
                    A
                  </span>
                  <span>Absent</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[10px]">
                    L
                  </span>
                  <span>Late</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-[10px]">
                    E
                  </span>
                  <span>Excused</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold text-sm">—</span>
                  <span>No Batch Class</span>
                </div>
              </div>

              {/* Manage / Delete Erroneous Class Sessions */}
              {conductedSessions.length > 0 && (
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Manage Conducted Class Sessions
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    If an attendance session was marked by mistake, you can delete it below:
                  </p>
                  <div className="space-y-1.5 pt-1">
                    {conductedSessions.map((session) => (
                      <div
                        key={`${session.date}_${session.batchId}`}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-800">{session.date}</span>
                          <span className="text-slate-500 font-medium ml-2">
                            {session.batchName} ({session.studentCount} entries)
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            handleDeleteSpecificDateBatch(session.date, session.batchId, session.batchName)
                          }
                          className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 p-1 rounded-lg transition-colors flex items-center gap-1 font-semibold text-[11px]"
                          title="Delete this class session"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 3: OVERALL / MONTHLY ATTENDANCE STATS DRILL-DOWN */}
      {/* ========================================================= */}
      {subView === 'summary' && (
        <div className="space-y-4 animate-fade-in">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            {/* Timeframe selector: By Month vs All Time */}
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-4 h-4 text-rose-600" />
                Time Period
              </label>
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setStatsTimeframe('month')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    statsTimeframe === 'month'
                      ? 'bg-rose-700 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  By Month
                </button>
                <button
                  type="button"
                  onClick={() => setStatsTimeframe('all_time')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    statsTimeframe === 'all_time'
                      ? 'bg-rose-700 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Time
                </button>
              </div>
            </div>

            {/* Month Picker (Shown when "By Month" is active) */}
            {statsTimeframe === 'month' && (
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 animate-fade-in">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-rose-600" />
                  Select Month
                </label>
                <input
                  type="month"
                  value={statsMonth}
                  onChange={(e) => setStatsMonth(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
            )}

            {/* Batch Filter */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Filter className="w-4 h-4 text-rose-600" />
                Batch Filter
              </label>
              <select
                value={statsBatchFilter}
                onChange={(e) => setStatsBatchFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none max-w-[200px]"
              >
                <option value="all">All Batches</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Performance Chart Card */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-rose-600" />
                  {statsTimeframe === 'month'
                    ? `Attendance Rate • ${formatMonthName(statsMonth)}`
                    : 'Attendance Rate • All Time'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {statsTimeframe === 'month'
                    ? `Showing statistics for ${formatMonthName(statsMonth)}`
                    : 'Showing lifetime attendance statistics'}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {statsStudents.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No active students in this filter.</p>
              ) : (
                statsStudents.map((student) => {
                  const stats = calculateStudentDrilldownStats(student);
                  return (
                    <div key={student.id} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span className="font-bold text-slate-800">{student.name}</span>
                        {stats.isBatchEmpty ? (
                          <span className="text-[11px] text-slate-400 font-medium">No classes for batch</span>
                        ) : (
                          <span className="font-semibold text-slate-600">
                            <strong className="text-rose-700 font-bold">{stats.pct}%</strong> ({stats.present}/{stats.total} classes)
                          </span>
                        )}
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-300 ${
                            stats.isBatchEmpty
                              ? 'bg-slate-200'
                              : stats.pct >= 85
                              ? 'bg-emerald-500'
                              : stats.pct >= 60
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${stats.isBatchEmpty ? 0 : Math.max(stats.pct, 5)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
