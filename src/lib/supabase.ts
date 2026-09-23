import { createClient } from '@supabase/supabase-js';
import { Batch, Student, AttendanceRecord, PaymentRecord } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Default 2 Initial Batches: Kids & Adults (with provision to add unlimited additional batches)
const SEED_BATCHES: Batch[] = [
  {
    id: 'batch-1',
    name: 'Kids Batch',
    schedule_days: 'Tue, Thu, Sat',
    timing: '5:00 PM - 6:30 PM',
    monthly_fee: 2500,
  },
  {
    id: 'batch-2',
    name: 'Adults Batch',
    schedule_days: 'Wed, Fri, Sun',
    timing: '6:30 PM - 8:00 PM',
    monthly_fee: 3000,
  },
];

const SEED_STUDENTS: Student[] = [
  {
    id: 'stu-1',
    name: 'Ananya Sharma',
    phone: '9876543210',
    parent_phone: '9876543211',
    batch_id: 'batch-1', // Kids Batch
    join_date: '2026-01-15',
    is_active: true,
  },
  {
    id: 'stu-2',
    name: 'Riya Verma',
    phone: '9812345678',
    parent_phone: '9812345679',
    batch_id: 'batch-1', // Kids Batch
    join_date: '2026-02-01',
    is_active: true,
  },
  {
    id: 'stu-3',
    name: 'Aarav Gupta',
    phone: '9822334455',
    parent_phone: '9822334456',
    batch_id: 'batch-1', // Kids Batch
    join_date: '2026-02-10',
    is_active: true,
  },
  {
    id: 'stu-4',
    name: 'Pooja Deshmukh',
    phone: '9988776655',
    parent_phone: '9988776656',
    batch_id: 'batch-2', // Adults Batch
    join_date: '2025-11-10',
    is_active: true,
  },
  {
    id: 'stu-5',
    name: 'Saanvi Mehta',
    phone: '9123456789',
    parent_phone: '9123456790',
    batch_id: 'batch-2', // Adults Batch
    join_date: '2025-08-20',
    is_active: true,
  },
];

// Helper to initialize LocalStorage if empty or reset to fresh structure
const initLocalStorage = () => {
  // Always ensure default batches & students exist for fresh test
  localStorage.setItem('kathak_batches', JSON.stringify(SEED_BATCHES));
  if (!localStorage.getItem('kathak_students')) {
    localStorage.setItem('kathak_students', JSON.stringify(SEED_STUDENTS));
  }
  if (!localStorage.getItem('kathak_attendance')) {
    localStorage.setItem('kathak_attendance', JSON.stringify([]));
  }
  if (!localStorage.getItem('kathak_payments')) {
    localStorage.setItem('kathak_payments', JSON.stringify([]));
  }
};

initLocalStorage();

// --- BATCH API ---
export const fetchBatches = async (): Promise<Batch[]> => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('batches').select('*').order('name');
    if (!error && data && data.length > 0) return data;
  }
  const local = localStorage.getItem('kathak_batches');
  return local ? JSON.parse(local) : SEED_BATCHES;
};

export const saveBatch = async (batch: Omit<Batch, 'id'> & { id?: string }): Promise<Batch> => {
  const newId = batch.id || `batch-${Date.now()}`;
  const newBatch: Batch = { ...batch, id: newId };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('batches').upsert([newBatch]).select().single();
    if (!error && data) return data;
  }

  const local = await fetchBatches();
  const existingIndex = local.findIndex((b) => b.id === newId);
  if (existingIndex >= 0) {
    local[existingIndex] = newBatch;
  } else {
    local.push(newBatch);
  }
  localStorage.setItem('kathak_batches', JSON.stringify(local));
  return newBatch;
};

// --- STUDENT API ---
export const fetchStudents = async (): Promise<Student[]> => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('students').select('*').order('name');
    if (!error && data) return data;
  }
  const local = localStorage.getItem('kathak_students');
  return local ? JSON.parse(local) : SEED_STUDENTS;
};

export const saveStudent = async (student: Omit<Student, 'id'> & { id?: string }): Promise<Student> => {
  const newId = student.id || `stu-${Date.now()}`;
  const newStudent: Student = { ...student, id: newId };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('students').upsert([newStudent]).select().single();
    if (!error && data) return data;
  }

  const local = await fetchStudents();
  const existingIndex = local.findIndex((s) => s.id === newId);
  if (existingIndex >= 0) {
    local[existingIndex] = newStudent;
  } else {
    local.push(newStudent);
  }
  localStorage.setItem('kathak_students', JSON.stringify(local));
  return newStudent;
};

// --- ATTENDANCE API ---
export const fetchAttendanceByDateAndBatch = async (
  dateStr: string,
  batchId: string
): Promise<AttendanceRecord[]> => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('attendance_date', dateStr)
      .eq('batch_id', batchId);
    if (!error && data) return data;
  }

  const local = localStorage.getItem('kathak_attendance');
  const records: AttendanceRecord[] = local ? JSON.parse(local) : [];
  return records.filter((r) => r.attendance_date === dateStr && r.batch_id === batchId);
};

export const fetchAllAttendance = async (): Promise<AttendanceRecord[]> => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('attendance').select('*');
    if (!error && data) return data;
  }
  const local = localStorage.getItem('kathak_attendance');
  return local ? JSON.parse(local) : [];
};

export const saveAttendanceRecords = async (records: Omit<AttendanceRecord, 'id'>[]): Promise<void> => {
  if (isSupabaseConfigured && supabase) {
    const prepared = records.map((r) => ({
      ...r,
      id: `${r.attendance_date}_${r.student_id}`,
    }));
    await supabase.from('attendance').upsert(prepared, { onConflict: 'attendance_date,student_id' });
    return;
  }

  const local = localStorage.getItem('kathak_attendance');
  let existing: AttendanceRecord[] = local ? JSON.parse(local) : [];

  records.forEach((rec) => {
    const recId = `${rec.attendance_date}_${rec.student_id}`;
    const idx = existing.findIndex((e) => e.attendance_date === rec.attendance_date && e.student_id === rec.student_id);
    if (idx >= 0) {
      existing[idx] = { ...rec, id: recId };
    } else {
      existing.push({ ...rec, id: recId });
    }
  });

  localStorage.setItem('kathak_attendance', JSON.stringify(existing));
};

// --- PAYMENTS API ---
export const fetchPaymentsByMonth = async (monthYear: string): Promise<PaymentRecord[]> => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('payments').select('*').eq('month_year', monthYear);
    if (!error && data) return data;
  }
  const local = localStorage.getItem('kathak_payments');
  const records: PaymentRecord[] = local ? JSON.parse(local) : [];
  return records.filter((p) => p.month_year === monthYear);
};

export const fetchAllPayments = async (): Promise<PaymentRecord[]> => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('payments').select('*');
    if (!error && data) return data;
  }
  const local = localStorage.getItem('kathak_payments');
  return local ? JSON.parse(local) : [];
};

export const savePaymentRecord = async (payment: Omit<PaymentRecord, 'id'> & { id?: string }): Promise<PaymentRecord> => {
  const newId = payment.id || `pay_${payment.student_id}_${payment.month_year}`;
  const record: PaymentRecord = { ...payment, id: newId };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('payments').upsert([record]).select().single();
    if (!error && data) return data;
  }

  const local = localStorage.getItem('kathak_payments');
  let existing: PaymentRecord[] = local ? JSON.parse(local) : [];
  const idx = existing.findIndex((e) => e.student_id === payment.student_id && e.month_year === payment.month_year);

  if (idx >= 0) {
    existing[idx] = record;
  } else {
    existing.push(record);
  }

  localStorage.setItem('kathak_payments', JSON.stringify(existing));
  return record;
};
