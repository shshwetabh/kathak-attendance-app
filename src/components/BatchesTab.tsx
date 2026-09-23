import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Download, BarChart3, Clock, Check, X } from 'lucide-react';
import { Batch, Student, AttendanceRecord } from '../types';
import { saveBatch, fetchAllAttendance } from '../lib/supabase';

interface BatchesTabProps {
  batches: Batch[];
  students: Student[];
  onRefresh: () => void;
}

export const BatchesTab: React.FC<BatchesTabProps> = ({ batches, students, onRefresh }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [scheduleDays, setScheduleDays] = useState('');
  const [timing, setTiming] = useState('');
  const [monthlyFee, setMonthlyFee] = useState<number>(2500);
  const [saving, setSaving] = useState(false);

  // Attendance stats state
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    const loadStats = async () => {
      const records = await fetchAllAttendance();
      setAllAttendance(records);
    };
    loadStats();
  }, []);

  const openModal = (batch?: Batch) => {
    if (batch) {
      setEditingBatch(batch);
      setName(batch.name);
      setScheduleDays(batch.schedule_days);
      setTiming(batch.timing);
      setMonthlyFee(batch.monthly_fee);
    } else {
      setEditingBatch(null);
      setName('');
      setScheduleDays('Tue, Thu');
      setTiming('5:00 PM - 6:30 PM');
      setMonthlyFee(2500);
    }
    setShowAddModal(true);
  };

  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    await saveBatch({
      id: editingBatch ? editingBatch.id : undefined,
      name: name.trim(),
      schedule_days: scheduleDays.trim(),
      timing: timing.trim(),
      monthly_fee: Number(monthlyFee),
    });
    setSaving(false);
    setShowAddModal(false);
    onRefresh();
  };

  const exportJSONBackup = () => {
    const backupData = {
      batches,
      students,
      attendance: allAttendance,
      exportedAt: new Date().toISOString(),
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `kathak_class_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Student Attendance Statistics Calculation
  const calculateStudentStats = (studentId: string) => {
    const studentRecords = allAttendance.filter((r) => r.student_id === studentId);
    if (studentRecords.length === 0) return { total: 0, present: 0, pct: 0 };
    const presentCount = studentRecords.filter((r) => r.status === 'present' || r.status === 'late').length;
    const pct = Math.round((presentCount / studentRecords.length) * 100);
    return { total: studentRecords.length, present: presentCount, pct };
  };

  return (
    <div className="space-y-5 pb-24 max-w-md mx-auto px-4 pt-3">
      {/* Header & New Batch Action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-800 text-base">Batches & Attendance Summary</h2>
          <p className="text-xs text-slate-500 font-medium">Manage class schedules & export data</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-rose-700 hover:bg-rose-800 text-white font-bold px-3 py-1.5 rounded-xl shadow-sm text-xs flex items-center gap-1 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Batch</span>
        </button>
      </div>

      {/* Batches Grid */}
      <div className="space-y-3">
        {batches.map((batch) => {
          const batchStudentCount = students.filter((s) => s.batch_id === batch.id && s.is_active).length;
          return (
            <div
              key={batch.id}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2.5 hover:border-rose-200 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">{batch.name}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-600 font-medium">
                    <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md">
                      <Clock className="w-3.5 h-3.5 text-rose-600" />
                      {batch.schedule_days} ({batch.timing})
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => openModal(batch)}
                  className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="font-semibold text-slate-600">
                  Enrolled: <strong className="text-rose-700 font-bold">{batchStudentCount} Students</strong>
                </span>
                <span className="font-bold text-slate-800 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                  ₹{batch.monthly_fee}/month
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Student Attendance Rate Performance */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
          <BarChart3 className="w-4 h-4 text-rose-600" />
          Overall Attendance Rate Summary
        </h3>

        <div className="space-y-2">
          {students.map((student) => {
            const stats = calculateStudentStats(student.id);
            return (
              <div key={student.id} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>{student.name}</span>
                  <span>
                    {stats.pct}% ({stats.present}/{stats.total} classes)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      stats.pct >= 85
                        ? 'bg-emerald-500'
                        : stats.pct >= 60
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.max(stats.pct, 5)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Backup & Export Bar */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-md flex items-center justify-between">
        <div>
          <h4 className="font-bold text-sm leading-tight">Data Backup & Export</h4>
          <p className="text-xs text-slate-400 mt-0.5">Download full JSON data copy</p>
        </div>
        <button
          onClick={exportJSONBackup}
          className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export JSON</span>
        </button>
      </div>

      {/* Add / Edit Batch Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-bold text-slate-800 text-base">
                {editingBatch ? 'Edit Kathak Batch' : 'Create New Kathak Batch'}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBatch} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Batch Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Beginners Batch 1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Schedule Days</label>
                <input
                  type="text"
                  placeholder="e.g. Tue, Thu, Sat"
                  value={scheduleDays}
                  onChange={(e) => setScheduleDays(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Timing</label>
                <input
                  type="text"
                  placeholder="e.g. 5:00 PM - 6:30 PM"
                  value={timing}
                  onChange={(e) => setTiming(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Monthly Fee (₹)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={monthlyFee}
                  onChange={(e) => setMonthlyFee(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-sm font-bold shadow-md shadow-rose-700/20 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Batch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
