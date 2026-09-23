import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, CheckCircle2, Save, Filter, UserCheck, AlertCircle } from 'lucide-react';
import { Batch, Student, AttendanceStatus, AttendanceRecord } from '../types';
import { fetchAttendanceByDateAndBatch, saveAttendanceRecords } from '../lib/supabase';

interface AttendanceTabProps {
  batches: Batch[];
  students: Student[];
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({ batches, students }) => {
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [attendanceState, setAttendanceState] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Set default batch when batches load
  useEffect(() => {
    if (batches.length > 0 && !selectedBatchId) {
      setSelectedBatchId(batches[0].id);
    }
  }, [batches, selectedBatchId]);

  // Filter active students for selected batch
  const batchStudents = students.filter(
    (s) => s.is_active && (selectedBatchId ? s.batch_id === selectedBatchId : true)
  );

  // Load existing attendance for date & batch
  useEffect(() => {
    const loadAttendance = async () => {
      if (!selectedBatchId) return;
      const records = await fetchAttendanceByDateAndBatch(selectedDate, selectedBatchId);
      const stateMap: Record<string, AttendanceStatus> = {};
      records.forEach((r) => {
        stateMap[r.student_id] = r.status;
      });
      // Default un-marked students to present
      batchStudents.forEach((s) => {
        if (!stateMap[s.id]) {
          stateMap[s.id] = 'present';
        }
      });
      setAttendanceState(stateMap);
    };
    loadAttendance();
  }, [selectedDate, selectedBatchId, students]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleMarkAllPresent = () => {
    const updated: Record<string, AttendanceStatus> = { ...attendanceState };
    batchStudents.forEach((s) => {
      updated[s.id] = 'present';
    });
    setAttendanceState(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg('');
    const recordsToSave: Omit<AttendanceRecord, 'id'>[] = batchStudents.map((s) => ({
      attendance_date: selectedDate,
      batch_id: s.batch_id,
      student_id: s.id,
      status: attendanceState[s.id] || 'present',
    }));

    await saveAttendanceRecords(recordsToSave);
    setSaving(false);
    setSuccessMsg('Attendance saved successfully!');
    setTimeout(() => setSuccessMsg(''), 3000);
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

  return (
    <div className="space-y-4 pb-24 max-w-md mx-auto px-4 pt-3">
      {/* Controls Container */}
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
            Total Students: <strong className="text-slate-800">{batchStudents.length}</strong>
          </span>
          <button
            onClick={handleMarkAllPresent}
            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5" />
            Mark All Present
          </button>
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
      {batchStudents.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center text-slate-500 border border-slate-200">
          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-medium">No active students in this batch.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {batchStudents.map((student) => {
            const currentStatus = attendanceState[student.id] || 'present';
            return (
              <div
                key={student.id}
                className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-2 hover:border-rose-200 transition-colors"
              >
                <div>
                  <h3 className="font-bold text-slate-800 text-sm leading-tight">{student.name}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {student.phone ? `Ph: ${student.phone}` : student.parent_phone ? `Parent: ${student.parent_phone}` : 'No phone listed'}
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
          onClick={handleSave}
          disabled={saving || batchStudents.length === 0}
          className="w-full bg-rose-700 hover:bg-rose-800 text-white font-bold py-3 px-4 rounded-2xl shadow-lg shadow-rose-700/30 flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving Records...' : 'Save Today\'s Attendance'}</span>
        </button>
      </div>
    </div>
  );
};
