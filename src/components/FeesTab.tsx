import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Send,
  X,
  Check,
  Plus,
  Search,
  IndianRupee,
  Calendar,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { Batch, Student, PaymentRecord, PaymentStatus, AttendanceRecord } from '../types';
import { fetchPaymentsByMonth, fetchAllPayments, fetchAllAttendance, savePaymentRecord } from '../lib/supabase';

interface FeesTabProps {
  batches: Batch[];
  students: Student[];
}

// Starting tracking baseline: September 2026
const BASELINE_MONTH = '2026-09';

// Calculate scheduled classes in a month given schedule days string
const getScheduledClassesInMonth = (monthYear: string, scheduleDaysStr: string): number => {
  if (!monthYear) return 12;
  const [yearStr, monthStr] = monthYear.split('-');
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1;

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const scheduleDays = (scheduleDaysStr || '')
    .split(',')
    .map((d) => d.trim().toLowerCase());

  if (scheduleDays.length === 0 || scheduleDays[0] === '') {
    return 12;
  }

  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthIndex, day);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
    const fullDayName = d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    if (
      scheduleDays.some(
        (sd) => sd.startsWith(dayName) || dayName.startsWith(sd) || sd === fullDayName
      )
    ) {
      count++;
    }
  }

  return count > 0 ? count : 12;
};

// Check if a month is overdue (more than 7 days past the last day of that month)
const isMonthOverdue = (monthYear: string): boolean => {
  if (monthYear < BASELINE_MONTH) return false;
  const [yearStr, monthStr] = monthYear.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const lastDayOfMonth = new Date(year, month, 0);
  const gracePeriodEnd = new Date(year, month - 1, lastDayOfMonth.getDate() + 7, 23, 59, 59);

  const now = new Date();
  return now > gracePeriodEnd;
};

export const FeesTab: React.FC<FeesTabProps> = ({ batches, students }) => {
  const [viewMode, setViewMode] = useState<'month-wise' | 'overall'>('month-wise');
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));

  const [monthPayments, setMonthPayments] = useState<Record<string, PaymentRecord>>({});
  const [allPayments, setAllPayments] = useState<PaymentRecord[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);

  const [activeModalStudent, setActiveModalStudent] = useState<Student | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [modalStudentId, setModalStudentId] = useState<string>('');
  const [modalMonthYear, setModalMonthYear] = useState<string>(format(new Date(), 'yyyy-MM'));

  // Search & batch filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState('all');

  // Form State
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<string>('UPI');
  const [paymentDate, setPaymentDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Load attendance and payments
  const loadData = async () => {
    const [monthRecs, allRecs, attRecs] = await Promise.all([
      fetchPaymentsByMonth(selectedMonth),
      fetchAllPayments(),
      fetchAllAttendance(),
    ]);

    const mMap: Record<string, PaymentRecord> = {};
    monthRecs.forEach((r) => {
      mMap[r.student_id] = r;
    });

    setMonthPayments(mMap);
    setAllPayments(allRecs);
    setAllAttendance(attRecs);
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const getStudentBatch = (batchId: string) => {
    return batches.find((b) => b.id === batchId);
  };

  // 1. Calculate per-class fee and fee due for a single student in a specific month
  const calculateStudentMonthFee = (student: Student, monthYear: string) => {
    // Payments prior to September 2026 are fully completed/exempt
    if (monthYear < BASELINE_MONTH) {
      return {
        classesScheduled: 0,
        classesAttended: 0,
        perClassFee: 0,
        feeDue: 0,
        amountPaid: 0,
        pending: 0,
        status: 'paid' as PaymentStatus,
        isOverdue: false,
      };
    }

    const batch = getStudentBatch(student.batch_id);
    const monthlyFee = batch ? batch.monthly_fee : 2500;
    const scheduleDays = batch ? batch.schedule_days : 'Tue, Thu, Sat';

    const classesScheduled = getScheduledClassesInMonth(monthYear, scheduleDays);
    const perClassFee = classesScheduled > 0 ? monthlyFee / classesScheduled : 0;

    // Count classes attended by student in that month
    const studentAttended = allAttendance.filter(
      (a) =>
        a.student_id === student.id &&
        a.attendance_date.startsWith(monthYear) &&
        (a.status === 'present' || a.status === 'late')
    ).length;

    // Fee due basis # of classes attended
    const feeDue = Math.round(studentAttended * perClassFee);

    // Amount paid for this month
    const payRecord = monthYear === selectedMonth
      ? monthPayments[student.id]
      : allPayments.find((p) => p.student_id === student.id && p.month_year === monthYear);

    const paidAmt = payRecord ? payRecord.amount_paid : 0;
    const pending = Math.max(0, feeDue - paidAmt);

    const status: PaymentStatus =
      feeDue === 0 || paidAmt >= feeDue ? 'paid' : paidAmt > 0 ? 'partial' : 'unpaid';

    const overdue = pending > 0 && isMonthOverdue(monthYear);

    return {
      classesScheduled,
      classesAttended: studentAttended,
      perClassFee: Math.round(perClassFee),
      feeDue,
      amountPaid: paidAmt,
      pending,
      status,
      isOverdue: overdue,
      payRecord,
    };
  };

  // 2. Calculate overall lifetime fee summary for a student (from Sep '26 onwards)
  const calculateStudentOverallFee = (student: Student) => {
    // Generate list of months from Sep 2026 up to current month
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthNum = now.getMonth() + 1;

    let totalClassesAttended = 0;
    let totalFeeDue = 0;
    let totalPaid = 0;
    let hasOverdueMonth = false;

    // Start from 2026-09 up to current month
    for (let y = 2026; y <= currentYear; y++) {
      const startM = y === 2026 ? 9 : 1;
      const endM = y === currentYear ? currentMonthNum : 12;

      for (let m = startM; m <= endM; m++) {
        const mStr = `${y}-${m.toString().padStart(2, '0')}`;
        const mStats = calculateStudentMonthFee(student, mStr);

        totalClassesAttended += mStats.classesAttended;
        totalFeeDue += mStats.feeDue;
        totalPaid += mStats.amountPaid;
        if (mStats.isOverdue) {
          hasOverdueMonth = true;
        }
      }
    }

    const netPending = Math.max(0, totalFeeDue - totalPaid);
    const overallStatus: PaymentStatus =
      totalFeeDue === 0 || totalPaid >= totalFeeDue ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid';

    return {
      totalClassesAttended,
      totalFeeDue,
      totalPaid,
      netPending,
      overallStatus,
      hasOverdueMonth,
    };
  };

  // Modal actions
  const openModalForStudent = (student: Student, monthStr?: string) => {
    const targetMonth = monthStr || selectedMonth;
    const stats = calculateStudentMonthFee(student, targetMonth);

    setActiveModalStudent(student);
    setModalStudentId(student.id);
    setModalMonthYear(targetMonth);
    setAmountPaid(stats.pending > 0 ? stats.pending : stats.feeDue > 0 ? stats.feeDue : 2500);
    setPaymentMode(stats.payRecord?.payment_mode || 'UPI');
    setPaymentDate(stats.payRecord?.payment_date || format(new Date(), 'yyyy-MM-dd'));
    setNotes(stats.payRecord?.notes || '');
    setShowPaymentModal(true);
  };

  const openGeneralPaymentModal = () => {
    const firstStudent = students[0];
    if (firstStudent) {
      openModalForStudent(firstStudent, selectedMonth);
    } else {
      setActiveModalStudent(null);
      setModalStudentId('');
      setModalMonthYear(selectedMonth);
      setAmountPaid(2500);
      setPaymentMode('UPI');
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
      setNotes('');
      setShowPaymentModal(true);
    }
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetStudent = activeModalStudent || students.find((s) => s.id === modalStudentId);
    if (!targetStudent) return;

    const stats = calculateStudentMonthFee(targetStudent, modalMonthYear);
    const feeDue = stats.feeDue > 0 ? stats.feeDue : 2500;
    const status: PaymentStatus =
      amountPaid >= feeDue ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid';

    setSaving(true);
    await savePaymentRecord({
      student_id: targetStudent.id,
      month_year: modalMonthYear,
      amount_due: feeDue,
      amount_paid: Number(amountPaid),
      status,
      payment_date: paymentDate,
      payment_mode: paymentMode,
      notes,
    });

    await loadData();
    setSaving(false);
    setShowPaymentModal(false);
    setActiveModalStudent(null);
  };

  const sendWhatsAppReminder = (student: Student, dueAmount: number, monthStr: string) => {
    const targetPhone = student.parent_phone || student.phone;
    if (!targetPhone) {
      alert('No phone number listed for this student.');
      return;
    }

    const monthFormatted = format(new Date(`${monthStr}-01`), 'MMMM yyyy');
    const message = encodeURIComponent(
      `Namaste! Gentle reminder from Kathak Dance Class regarding attendance-based monthly fee for ${student.name} for ${monthFormatted}.\nDue Amount: ₹${dueAmount}\nKindly let us know once paid via UPI/Cash. Thank you!`
    );
    window.open(`https://wa.me/91${targetPhone.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  // Filter students
  const activeStudents = students.filter((s) => s.is_active);
  const filteredStudents = activeStudents.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.phone && s.phone.includes(searchTerm));
    const matchesBatch = selectedBatchFilter === 'all' || s.batch_id === selectedBatchFilter;
    return matchesSearch && matchesBatch;
  });

  // Month-wise Totals
  let monthTotalExpected = 0;
  let monthTotalCollected = 0;

  activeStudents.forEach((s) => {
    const stats = calculateStudentMonthFee(s, selectedMonth);
    monthTotalExpected += stats.feeDue;
    monthTotalCollected += stats.amountPaid;
  });
  const monthPendingDues = Math.max(0, monthTotalExpected - monthTotalCollected);

  // Overall Lifetime Totals
  let overallTotalExpected = 0;
  let overallTotalCollected = 0;

  activeStudents.forEach((s) => {
    const stats = calculateStudentOverallFee(s);
    overallTotalExpected += stats.totalFeeDue;
    overallTotalCollected += stats.totalPaid;
  });
  const overallPendingDues = Math.max(0, overallTotalExpected - overallTotalCollected);

  return (
    <div className="space-y-4 pb-24 max-w-md mx-auto px-4 pt-3">
      {/* View Mode Toggle: Month-wise vs Overall Collection */}
      <div className="bg-slate-200/80 p-1 rounded-2xl flex items-center justify-between text-xs font-bold shadow-inner">
        <button
          onClick={() => setViewMode('month-wise')}
          className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            viewMode === 'month-wise'
              ? 'bg-white text-rose-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Month-wise View</span>
        </button>

        <button
          onClick={() => setViewMode('overall')}
          className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            viewMode === 'overall'
              ? 'bg-white text-rose-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Overall Status</span>
        </button>
      </div>

      {/* Baseline Assumption Banner */}
      <div className="bg-rose-50 border border-rose-200/60 p-2.5 rounded-2xl flex items-start gap-2 text-[11px] text-rose-900 font-medium">
        <Info className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
        <span>
          Payments completed till Aug '26 for all students. Dues are calculated per-class attended starting from <strong>Sep '26</strong>.
        </span>
      </div>

      {/* SUMMARY CARD */}
      {viewMode === 'month-wise' ? (
        /* Month-wise Summary Card */
        <div className="bg-gradient-to-br from-rose-900 via-rose-800 to-rose-900 text-white p-4 rounded-3xl shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-rose-200 uppercase tracking-wider">
              Selected Month
            </label>
            <input
              type="month"
              min={BASELINE_MONTH}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-rose-950/60 border border-rose-600/40 text-white text-sm font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-rose-700/50 text-center">
            <div className="bg-rose-950/40 p-2.5 rounded-2xl border border-rose-700/30">
              <span className="text-[11px] text-rose-200 uppercase font-medium block">
                Collected (This Month)
              </span>
              <span className="text-xl font-black text-amber-300">
                ₹{monthTotalCollected.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="bg-rose-950/40 p-2.5 rounded-2xl border border-rose-700/30">
              <span className="text-[11px] text-rose-200 uppercase font-medium block">
                Pending (This Month)
              </span>
              <span
                className={`text-xl font-black ${
                  isMonthOverdue(selectedMonth) && monthPendingDues > 0
                    ? 'text-rose-400'
                    : 'text-amber-300'
                }`}
              >
                ₹{monthPendingDues.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Overall Lifetime Summary Card */
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-rose-950 text-white p-4 rounded-3xl shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Overall Collection Summary
              </span>
            </div>
            <span className="text-[11px] bg-rose-900/60 border border-rose-700/40 px-2 py-0.5 rounded-full text-rose-200 font-semibold">
              From Sep '26 Onwards
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-700/50 text-center">
            <div className="bg-slate-950/40 p-2 rounded-2xl border border-slate-700/30">
              <span className="text-[10px] text-slate-300 uppercase font-medium block">Total Due</span>
              <span className="text-base font-black text-white">
                ₹{overallTotalExpected.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="bg-slate-950/40 p-2 rounded-2xl border border-slate-700/30">
              <span className="text-[10px] text-emerald-300 uppercase font-medium block">Collected</span>
              <span className="text-base font-black text-emerald-400">
                ₹{overallTotalCollected.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="bg-slate-950/40 p-2 rounded-2xl border border-slate-700/30">
              <span className="text-[10px] text-rose-300 uppercase font-medium block">Net Pending</span>
              <span className="text-base font-black text-amber-300">
                ₹{overallPendingDues.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Top Action Bar & Search */}
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student fee record..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none shadow-sm"
          />
        </div>
        <button
          onClick={openGeneralPaymentModal}
          className="bg-rose-700 hover:bg-rose-800 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 shadow-sm transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Record Fee</span>
        </button>
      </div>

      {/* Batch Pill Selector */}
      {batches.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedBatchFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedBatchFilter === 'all'
                ? 'bg-rose-700 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Batches
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
              {b.name}
            </button>
          ))}
        </div>
      )}

      {/* STUDENT FEE LIST (MONTH-WISE OR OVERALL) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {viewMode === 'month-wise'
              ? `Month-wise List (${format(new Date(`${selectedMonth}-01`), 'MMM yyyy')})`
              : 'Overall Students Ledger'}
          </h2>
          <span className="text-xs font-semibold text-slate-500">
            {filteredStudents.length} Students
          </span>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-slate-500 border border-slate-200 space-y-2">
            <IndianRupee className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No students found.</p>
            <p className="text-xs text-slate-500">
              Add your students in the <strong>Students</strong> tab to see their fee records here.
            </p>
          </div>
        ) : (
          filteredStudents.map((student) => {
            const batch = getStudentBatch(student.batch_id);

            if (viewMode === 'month-wise') {
              const stats = calculateStudentMonthFee(student, selectedMonth);

              return (
                <div
                  key={student.id}
                  className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2 hover:border-rose-200 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm leading-tight">{student.name}</h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {batch?.name || 'Kathak'} • {stats.classesAttended}/{stats.classesScheduled} classes attended
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium">
                        (₹{stats.perClassFee}/class • Due: ₹{stats.feeDue})
                      </p>
                    </div>

                    {/* Pending / Paid Badges with Grace Period Logic */}
                    <div className="flex flex-col items-end gap-1">
                      {stats.status === 'paid' ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-300">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          Paid ₹{stats.amountPaid}
                        </span>
                      ) : stats.isOverdue ? (
                        /* RED: Overdue after month-end + 7 days */
                        <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 px-2.5 py-1 rounded-full text-xs font-bold border border-rose-300">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          Overdue ₹{stats.pending}
                        </span>
                      ) : (
                        /* ORANGE: Due within month + 7-day grace period */
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full text-xs font-bold border border-amber-300">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Due ₹{stats.pending} (Grace)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-xs">
                    <span className="text-slate-400 text-[11px]">
                      {stats.payRecord?.payment_mode
                        ? `Paid via ${stats.payRecord.payment_mode}`
                        : 'No payment recorded'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {stats.pending > 0 && (
                        <button
                          onClick={() => sendWhatsAppReminder(student, stats.pending, selectedMonth)}
                          className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold border border-emerald-200 transition-colors flex items-center gap-1"
                          title="Send WhatsApp Reminder"
                        >
                          <Send className="w-3 h-3 text-emerald-600" />
                        </button>
                      )}
                      <button
                        onClick={() => openModalForStudent(student, selectedMonth)}
                        className="px-2.5 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                      >
                        Record Payment
                      </button>
                    </div>
                  </div>
                </div>
              );
            } else {
              /* OVERALL LIFETIME SUMMARY ROW */
              const overall = calculateStudentOverallFee(student);

              return (
                <div
                  key={student.id}
                  className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2 hover:border-rose-200 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm leading-tight">{student.name}</h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {batch?.name || 'Kathak'} • {overall.totalClassesAttended} total classes attended
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {overall.netPending === 0 ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-300">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          All Settled
                        </span>
                      ) : overall.hasOverdueMonth ? (
                        <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 px-2.5 py-1 rounded-full text-xs font-bold border border-rose-300">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          Pending ₹{overall.netPending} (Overdue)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full text-xs font-bold border border-amber-300">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Pending ₹{overall.netPending}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded-xl text-center text-xs border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Total Due</span>
                      <span className="font-bold text-slate-700">₹{overall.totalFeeDue}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-600 block">Total Paid</span>
                      <span className="font-bold text-emerald-700">₹{overall.totalPaid}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-rose-600 block">Net Dues</span>
                      <span className="font-bold text-rose-700">₹{overall.netPending}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      onClick={() => openModalForStudent(student, selectedMonth)}
                      className="px-3 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                    >
                      Record Payment
                    </button>
                  </div>
                </div>
              );
            }
          })
        )}
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-bold text-slate-800 text-base">Record Fee Payment</h2>
                <p className="text-xs text-rose-700 font-semibold">{modalMonthYear}</p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Select Student *</label>
                <select
                  required
                  value={modalStudentId}
                  onChange={(e) => {
                    setModalStudentId(e.target.value);
                    const stu = students.find((s) => s.id === e.target.value);
                    if (stu) {
                      setActiveModalStudent(stu);
                      const stats = calculateStudentMonthFee(stu, modalMonthYear);
                      setAmountPaid(stats.pending > 0 ? stats.pending : stats.feeDue > 0 ? stats.feeDue : 2500);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
                >
                  <option value="" disabled>
                    -- Choose Student --
                  </option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({getStudentBatch(s.batch_id)?.name || 'Batch'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Month *</label>
                <input
                  type="month"
                  required
                  min={BASELINE_MONTH}
                  value={modalMonthYear}
                  onChange={(e) => {
                    setModalMonthYear(e.target.value);
                    const targetStudent = activeModalStudent || students.find((s) => s.id === modalStudentId);
                    if (targetStudent) {
                      const stats = calculateStudentMonthFee(targetStudent, e.target.value);
                      setAmountPaid(stats.pending > 0 ? stats.pending : stats.feeDue > 0 ? stats.feeDue : 2500);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Amount Paid (₹) *</label>
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

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !modalStudentId}
                  className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-sm font-bold shadow-md shadow-rose-700/20 flex items-center gap-1.5 disabled:opacity-50"
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
