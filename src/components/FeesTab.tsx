import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CheckCircle, Clock, AlertTriangle, Send, X, Check } from 'lucide-react';
import { Batch, Student, PaymentRecord, PaymentStatus } from '../types';
import { fetchPaymentsByMonth, savePaymentRecord } from '../lib/supabase';

interface FeesTabProps {
  batches: Batch[];
  students: Student[];
}

export const FeesTab: React.FC<FeesTabProps> = ({ batches, students }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [payments, setPayments] = useState<Record<string, PaymentRecord>>({});
  const [activeModalStudent, setActiveModalStudent] = useState<Student | null>(null);

  // Form State
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<string>('UPI');
  const [paymentDate, setPaymentDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    const loadPayments = async () => {
      const records = await fetchPaymentsByMonth(selectedMonth);
      const map: Record<string, PaymentRecord> = {};
      records.forEach((r) => {
        map[r.student_id] = r;
      });
      setPayments(map);
    };
    loadPayments();
  }, [selectedMonth]);

  const getStudentBatch = (batchId: string) => {
    return batches.find((b) => b.id === batchId);
  };

  const openPaymentModal = (student: Student) => {
    const batch = getStudentBatch(student.batch_id);
    const existing = payments[student.id];

    setActiveModalStudent(student);
    setAmountPaid(existing ? existing.amount_paid : batch ? batch.monthly_fee : 2500);
    setPaymentMode(existing?.payment_mode || 'UPI');
    setPaymentDate(existing?.payment_date || format(new Date(), 'yyyy-MM-dd'));
    setNotes(existing?.notes || '');
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalStudent) return;

    const batch = getStudentBatch(activeModalStudent.batch_id);
    const due = batch ? batch.monthly_fee : 2500;
    const status: PaymentStatus =
      amountPaid >= due ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid';

    setSaving(true);
    const saved = await savePaymentRecord({
      student_id: activeModalStudent.id,
      month_year: selectedMonth,
      amount_due: due,
      amount_paid: Number(amountPaid),
      status,
      payment_date: paymentDate,
      payment_mode: paymentMode,
      notes,
    });

    setPayments((prev) => ({
      ...prev,
      [activeModalStudent.id]: saved,
    }));

    setSaving(false);
    setActiveModalStudent(null);
  };

  const sendWhatsAppReminder = (student: Student, dueAmount: number) => {
    const targetPhone = student.parent_phone || student.phone;
    if (!targetPhone) {
      alert('No phone number listed for this student.');
      return;
    }

    const monthFormatted = format(new Date(`${selectedMonth}-01`), 'MMMM yyyy');
    const message = encodeURIComponent(
      `Namaste! Gentle reminder from Kathak Dance Class regarding monthly fee for ${student.name} for ${monthFormatted}.\nDue Amount: ₹${dueAmount}\nKindly let us know once paid via UPI/Cash. Thank you!`
    );
    window.open(`https://wa.me/91${targetPhone.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  // Stats
  const activeStudents = students.filter((s) => s.is_active);
  let totalExpected = 0;
  let totalCollected = 0;

  activeStudents.forEach((s) => {
    const batch = getStudentBatch(s.batch_id);
    const due = batch ? batch.monthly_fee : 2500;
    totalExpected += due;
    const rec = payments[s.id];
    if (rec) {
      totalCollected += rec.amount_paid;
    }
  });

  return (
    <div className="space-y-4 pb-24 max-w-md mx-auto px-4 pt-3">
      {/* Month Picker & Summary Card */}
      <div className="bg-gradient-to-br from-rose-900 via-rose-800 to-rose-900 text-white p-4 rounded-3xl shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-rose-200 uppercase tracking-wider">
            Fee Month
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-rose-950/60 border border-rose-600/40 text-white text-sm font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-rose-700/50 text-center">
          <div className="bg-rose-950/40 p-2.5 rounded-2xl border border-rose-700/30">
            <span className="text-[11px] text-rose-200 uppercase font-medium block">Total Collected</span>
            <span className="text-xl font-black text-amber-300">₹{totalCollected.toLocaleString('en-IN')}</span>
          </div>
          <div className="bg-rose-950/40 p-2.5 rounded-2xl border border-rose-700/30">
            <span className="text-[11px] text-rose-200 uppercase font-medium block">Pending Dues</span>
            <span className="text-xl font-black text-rose-200">
              ₹{Math.max(0, totalExpected - totalCollected).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Student Fee Ledger List */}
      <div className="space-y-2.5">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
          Student Payment Directory
        </h2>

        {activeStudents.map((student) => {
          const batch = getStudentBatch(student.batch_id);
          const monthlyFee = batch ? batch.monthly_fee : 2500;
          const payRecord = payments[student.id];

          const status: PaymentStatus = payRecord ? payRecord.status : 'unpaid';
          const paidAmt = payRecord ? payRecord.amount_paid : 0;
          const pending = Math.max(0, monthlyFee - paidAmt);

          return (
            <div
              key={student.id}
              className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-2 hover:border-rose-200 transition-colors"
            >
              <div className="space-y-0.5">
                <h3 className="font-bold text-slate-800 text-sm leading-tight">{student.name}</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {batch?.name || 'Unassigned'} (₹{monthlyFee})
                </p>
                {payRecord && payRecord.payment_mode && (
                  <p className="text-[11px] text-slate-400 font-medium">
                    Paid via {payRecord.payment_mode} on {payRecord.payment_date}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-end gap-1.5">
                {status === 'paid' ? (
                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-300">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Paid ₹{paidAmt}
                  </span>
                ) : status === 'partial' ? (
                  <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-xs font-bold border border-amber-300">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Paid ₹{paidAmt} (Due ₹{pending})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 px-2.5 py-1 rounded-full text-xs font-bold border border-rose-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Unpaid ₹{monthlyFee}
                  </span>
                )}

                <div className="flex items-center gap-1">
                  {status !== 'paid' && (
                    <button
                      onClick={() => sendWhatsAppReminder(student, pending)}
                      className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold border border-emerald-200 transition-colors flex items-center gap-1"
                      title="Send WhatsApp Reminder"
                    >
                      <Send className="w-3 h-3 text-emerald-600" />
                    </button>
                  )}
                  <button
                    onClick={() => openPaymentModal(student)}
                    className="px-2.5 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                  >
                    Record Payment
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Record Payment Modal */}
      {activeModalStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-bold text-slate-800 text-base">Record Payment</h2>
                <p className="text-xs text-rose-700 font-semibold">{activeModalStudent.name}</p>
              </div>
              <button
                onClick={() => setActiveModalStudent(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Amount Paid (₹)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-base font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
                  >
                    <option value="UPI">UPI (GooglePay/PhonePe)</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Date Paid</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notes / Transaction Ref</label>
                <input
                  type="text"
                  placeholder="Optional reference notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModalStudent(null)}
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
                  <span>{saving ? 'Saving...' : 'Save Payment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
