import { createClient } from '@supabase/supabase-js';
import { Batch, Student, AttendanceRecord, PaymentRecord } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// UUID generator compatible across all browsers
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const isValidUUID = (str?: string): boolean => {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

// Default 2 Initial Batches: Kids & Adults with 200/class default
const SEED_BATCHES: Batch[] = [
  {
    id: '11111111-1111-4111-a111-111111111111',
    name: 'Kids Batch',
    schedule_days: 'Tue, Thu, Sat',
    timing: '5:00 PM - 6:30 PM',
    per_class_fee: 200,
  },
  {
    id: '22222222-2222-4222-a222-222222222222',
    name: 'Adults Batch',
    schedule_days: 'Wed, Fri, Sun',
    timing: '6:30 PM - 8:00 PM',
    per_class_fee: 200,
  },
];

// Helper to initialize LocalStorage if empty
const initLocalStorage = () => {
  if (!localStorage.getItem('kathak_batches')) {
    localStorage.setItem('kathak_batches', JSON.stringify(SEED_BATCHES));
  }
  if (!localStorage.getItem('kathak_students')) {
    localStorage.setItem('kathak_students', JSON.stringify([]));
  }
  if (!localStorage.getItem('kathak_attendance')) {
    localStorage.setItem('kathak_attendance', JSON.stringify([]));
  }
  if (!localStorage.getItem('kathak_payments')) {
    localStorage.setItem('kathak_payments', JSON.stringify([]));
  }
};

initLocalStorage();

// Normalize batch object ensuring per_class_fee is present
const normalizeBatch = (b: any): Batch => ({
  id: b.id,
  name: b.name,
  schedule_days: b.schedule_days,
  timing: b.timing,
  per_class_fee: Number(b.per_class_fee || 200),
  monthly_fee: b.monthly_fee ? Number(b.monthly_fee) : undefined,
  created_at: b.created_at,
});

// --- BATCH API ---
export const fetchBatches = async (): Promise<Batch[]> => {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('batches').select('*').order('name');
      if (!error && data && data.length > 0) {
        const normalized = data.map(normalizeBatch);
        localStorage.setItem('kathak_batches', JSON.stringify(normalized));
        return normalized;
      }
      if (!error && data && data.length === 0) {
        // Seed default batches into Supabase if empty
        await supabase.from('batches').insert(
          SEED_BATCHES.map((b) => ({
            name: b.name,
            schedule_days: b.schedule_days,
            timing: b.timing,
            per_class_fee: b.per_class_fee,
          }))
        );
        const { data: seeded } = await supabase.from('batches').select('*').order('name');
        if (seeded && seeded.length > 0) {
          const normalized = seeded.map(normalizeBatch);
          localStorage.setItem('kathak_batches', JSON.stringify(normalized));
          return normalized;
        }
      }
    } catch (err) {
      console.error('Error fetching batches from Supabase:', err);
    }
  }
  const local = localStorage.getItem('kathak_batches');
  const parsed = local ? JSON.parse(local) : SEED_BATCHES;
  return parsed.map(normalizeBatch);
};

export const saveBatch = async (batch: Omit<Batch, 'id'> & { id?: string }): Promise<Batch> => {
  const newId = batch.id && isValidUUID(batch.id) ? batch.id : generateUUID();
  const fee = Number(batch.per_class_fee || 200);
  const newBatch: Batch = { ...batch, id: newId, per_class_fee: fee };

  if (isSupabaseConfigured && supabase) {
    try {
      const payload: any = {
        name: batch.name,
        schedule_days: batch.schedule_days,
        timing: batch.timing,
        per_class_fee: fee,
      };

      if (isValidUUID(batch.id)) {
        payload.id = batch.id;
      }

      const { data, error } = await supabase.from('batches').upsert([payload]).select().single();
      if (error) {
        console.error('Error saving batch to Supabase:', error);
      } else if (data) {
        newBatch.id = data.id;
      }
    } catch (err) {
      console.error('Supabase batch save exception:', err);
    }
  }

  const local = await fetchBatches();
  const existingIndex = local.findIndex((b) => b.id === newBatch.id || b.name.toLowerCase() === newBatch.name.toLowerCase());
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
    try {
      const { data, error } = await supabase.from('students').select('*').order('name');
      if (!error && data) {
        localStorage.setItem('kathak_students', JSON.stringify(data));
        return data;
      }
      if (error) {
        console.error('Error fetching students from Supabase:', error);
      }
    } catch (err) {
      console.error('Supabase fetchStudents exception:', err);
    }
  }
  const local = localStorage.getItem('kathak_students');
  return local ? JSON.parse(local) : [];
};

export const saveStudent = async (student: Omit<Student, 'id'> & { id?: string }): Promise<Student> => {
  const newId = student.id && isValidUUID(student.id) ? student.id : generateUUID();
  const newStudent: Student = { ...student, id: newId };

  if (isSupabaseConfigured && supabase) {
    try {
      const payload: any = {
        name: student.name,
        phone: student.phone || null,
        parent_phone: student.parent_phone || null,
        batch_id: isValidUUID(student.batch_id) ? student.batch_id : null,
        join_date: student.join_date,
        is_active: student.is_active ?? true,
        notes: student.notes || null,
      };

      if (isValidUUID(student.id)) {
        payload.id = student.id;
      }

      const { data, error } = await supabase.from('students').upsert([payload]).select().single();
      if (error) {
        console.error('Error saving student to Supabase:', error);
      } else if (data) {
        newStudent.id = data.id;
      }
    } catch (err) {
      console.error('Supabase student save exception:', err);
    }
  }

  const local = await fetchStudents();
  const existingIndex = local.findIndex((s) => s.id === newStudent.id);
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
    try {
      const query = supabase
        .from('attendance')
        .select('*')
        .eq('attendance_date', dateStr);

      if (isValidUUID(batchId)) {
        query.eq('batch_id', batchId);
      }

      const { data, error } = await query;
      if (!error && data) return data;
    } catch (err) {
      console.error('Supabase attendance fetch exception:', err);
    }
  }

  const local = localStorage.getItem('kathak_attendance');
  const records: AttendanceRecord[] = local ? JSON.parse(local) : [];
  return records.filter((r) => r.attendance_date === dateStr && (!batchId || r.batch_id === batchId));
};

export const fetchAllAttendance = async (): Promise<AttendanceRecord[]> => {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('attendance').select('*');
      if (!error && data) return data;
    } catch (err) {
      console.error('Supabase fetchAllAttendance error:', err);
    }
  }
  const local = localStorage.getItem('kathak_attendance');
  return local ? JSON.parse(local) : [];
};

export const saveAttendanceRecords = async (records: Omit<AttendanceRecord, 'id'>[]): Promise<void> => {
  if (isSupabaseConfigured && supabase) {
    try {
      const prepared = records.map((r) => ({
        attendance_date: r.attendance_date,
        batch_id: isValidUUID(r.batch_id) ? r.batch_id : null,
        student_id: r.student_id,
        status: r.status,
        notes: r.notes || null,
      }));

      const { error } = await supabase
        .from('attendance')
        .upsert(prepared, { onConflict: 'attendance_date,student_id' });

      if (error) {
        console.error('Error saving attendance to Supabase:', error);
      }
    } catch (err) {
      console.error('Supabase attendance save exception:', err);
    }
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
    try {
      const { data, error } = await supabase.from('payments').select('*').eq('month_year', monthYear);
      if (!error && data) return data;
      if (error) {
        console.error('Error fetching payments from Supabase:', error);
      }
    } catch (err) {
      console.error('Supabase fetchPayments error:', err);
    }
  }
  const local = localStorage.getItem('kathak_payments');
  const records: PaymentRecord[] = local ? JSON.parse(local) : [];
  return records.filter((p) => p.month_year === monthYear);
};

export const fetchAllPayments = async (): Promise<PaymentRecord[]> => {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('payments').select('*');
      if (!error && data) return data;
    } catch (err) {
      console.error('Supabase fetchAllPayments error:', err);
    }
  }
  const local = localStorage.getItem('kathak_payments');
  return local ? JSON.parse(local) : [];
};

export const savePaymentRecord = async (payment: Omit<PaymentRecord, 'id'> & { id?: string }): Promise<PaymentRecord> => {
  const newId = payment.id && isValidUUID(payment.id) ? payment.id : generateUUID();
  const record: PaymentRecord = { ...payment, id: newId };

  if (isSupabaseConfigured && supabase) {
    try {
      const payload: any = {
        student_id: payment.student_id,
        month_year: payment.month_year,
        amount_due: payment.amount_due,
        amount_paid: payment.amount_paid,
        status: payment.status,
        payment_date: payment.payment_date || null,
        payment_mode: payment.payment_mode || 'UPI',
        notes: payment.notes || null,
      };

      if (isValidUUID(payment.id)) {
        payload.id = payment.id;
      }

      const { data, error } = await supabase
        .from('payments')
        .upsert([payload], { onConflict: 'student_id,month_year' })
        .select()
        .single();

      if (error) {
        console.error('Error saving payment to Supabase:', error);
      } else if (data) {
        record.id = data.id;
      }
    } catch (err) {
      console.error('Supabase payment save exception:', err);
    }
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

export const deleteAttendanceByDateAndBatch = async (dateStr: string, batchId: string): Promise<void> => {
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase.from('attendance').delete().eq('attendance_date', dateStr);
      if (isValidUUID(batchId)) {
        query = query.eq('batch_id', batchId);
      }
      await query;
    } catch (err) {
      console.error('Supabase deleteAttendanceByDateAndBatch error:', err);
    }
  }

  const local = localStorage.getItem('kathak_attendance');
  if (local) {
    const records: AttendanceRecord[] = JSON.parse(local);
    const updated = records.filter(
      (r) => !(r.attendance_date === dateStr && (!batchId || r.batch_id === batchId))
    );
    localStorage.setItem('kathak_attendance', JSON.stringify(updated));
  }
};

export const deleteAttendanceRecord = async (dateStr: string, studentId: string): Promise<void> => {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('attendance')
        .delete()
        .eq('attendance_date', dateStr)
        .eq('student_id', studentId);
    } catch (err) {
      console.error('Supabase deleteAttendanceRecord error:', err);
    }
  }

  const local = localStorage.getItem('kathak_attendance');
  if (local) {
    const records: AttendanceRecord[] = JSON.parse(local);
    const updated = records.filter(
      (r) => !(r.attendance_date === dateStr && r.student_id === studentId)
    );
    localStorage.setItem('kathak_attendance', JSON.stringify(updated));
  }
};

export const deletePaymentRecord = async (studentId: string, monthYear: string): Promise<void> => {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('payments')
        .delete()
        .eq('student_id', studentId)
        .eq('month_year', monthYear);
    } catch (err) {
      console.error('Supabase deletePaymentRecord error:', err);
    }
  }

  const local = localStorage.getItem('kathak_payments');
  if (local) {
    const records: PaymentRecord[] = JSON.parse(local);
    const updated = records.filter(
      (p) => !(p.student_id === studentId && p.month_year === monthYear)
    );
    localStorage.setItem('kathak_payments', JSON.stringify(updated));
  }
};

