import React, { useState } from 'react';
import { Search, Plus, UserPlus, Phone, Calendar, Edit2, X, Check, CheckCircle2 } from 'lucide-react';
import { Batch, Student } from '../types';
import { saveStudent } from '../lib/supabase';

interface StudentsTabProps {
  batches: Batch[];
  students: Student[];
  onRefresh: () => void;
}

export const StudentsTab: React.FC<StudentsTabProps> = ({ batches, students, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [batchId, setBatchId] = useState('');
  const [joinDate, setJoinDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const openAddModal = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setName(student.name);
      setPhone(student.phone || '');
      setParentPhone(student.parent_phone || '');
      setBatchId(student.batch_id || (batches[0]?.id || ''));
      setJoinDate(student.join_date);
      setNotes(student.notes || '');
    } else {
      setEditingStudent(null);
      setName('');
      setPhone('');
      setParentPhone('');
      setBatchId(batches[0]?.id || '');
      setJoinDate(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
    setShowAddModal(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const assignedBatchId = batchId || batches[0]?.id || '';

    setSaving(true);
    await saveStudent({
      id: editingStudent ? editingStudent.id : undefined,
      name: name.trim(),
      phone: phone.trim(),
      parent_phone: parentPhone.trim(),
      batch_id: assignedBatchId,
      join_date: joinDate,
      is_active: true,
      notes: notes.trim(),
    });
    setSaving(false);
    setShowAddModal(false);
    setSuccessMsg(`Student "${name.trim()}" saved successfully!`);
    setTimeout(() => setSuccessMsg(''), 3000);
    onRefresh();
  };

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.phone && s.phone.includes(searchTerm)) ||
      (s.parent_phone && s.parent_phone.includes(searchTerm));
    const matchesBatch = selectedBatchFilter === 'all' || s.batch_id === selectedBatchFilter;
    return matchesSearch && matchesBatch;
  });

  const getBatchName = (id: string) => {
    return batches.find((b) => b.id === id)?.name || 'Kathak Batch';
  };

  return (
    <div className="space-y-4 pb-24 max-w-md mx-auto px-4 pt-3">
      {/* Success Notification */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Search & Add Header */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none shadow-sm"
          />
        </div>
        <button
          onClick={() => openAddModal()}
          className="bg-rose-700 hover:bg-rose-800 text-white font-bold px-3 py-2 rounded-xl shadow-sm text-xs flex items-center gap-1 transition-colors whitespace-nowrap"
          title="Add New Student"
        >
          <Plus className="w-4 h-4" />
          <span>Add Student</span>
        </button>
      </div>

      {/* Batch Pill Selector */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setSelectedBatchFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
            selectedBatchFilter === 'all'
              ? 'bg-rose-700 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Students ({students.length})
        </button>
        {batches.map((b) => (
          <button
            key={b.id}
            onClick={() => setSelectedBatchFilter(b.id)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedBatchFilter === b.id
                ? 'bg-rose-700 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {b.name} ({students.filter((s) => s.batch_id === b.id).length})
          </button>
        ))}
      </div>

      {/* Student List */}
      {filteredStudents.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center text-slate-500 border border-slate-200 space-y-3">
          <UserPlus className="w-10 h-10 text-rose-300 mx-auto" />
          <div>
            <h3 className="text-sm font-bold text-slate-700">No students found</h3>
            <p className="text-xs text-slate-500 mt-0.5">Click the "Add Student" button above to enroll your first student!</p>
          </div>
          <button
            onClick={() => openAddModal()}
            className="bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-sm inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student Now</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredStudents.map((student) => (
            <div
              key={student.id}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2 hover:border-rose-200 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-base leading-tight">{student.name}</h3>
                  <span className="inline-block mt-1 bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-md text-[11px] font-semibold">
                    {getBatchName(student.batch_id)}
                  </span>
                </div>
                <button
                  onClick={() => openAddModal(student)}
                  className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{student.phone || 'No phone'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-rose-500" />
                  <span>Parent: {student.parent_phone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Joined: {student.join_date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-bold text-slate-800 text-lg">
                {editingStudent ? 'Edit Student Details' : 'Add New Kathak Student'}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Student Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ananya Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Assign to Batch *</label>
                <select
                  required
                  value={batchId || (batches[0]?.id || '')}
                  onChange={(e) => setBatchId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} (₹{b.monthly_fee}/mo)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Student Phone</label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Parent WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="Parent number"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Join Date</label>
                <input
                  type="date"
                  value={joinDate}
                  onChange={(e) => setJoinDate(e.target.value)}
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
                  <span>{saving ? 'Saving...' : 'Save Student'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
