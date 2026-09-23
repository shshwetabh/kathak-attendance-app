export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type PaymentStatus = 'paid' | 'unpaid' | 'partial';

export interface Batch {
  id: string;
  name: string;
  schedule_days: string;
  timing: string;
  per_class_fee: number; // Default 200/class
  monthly_fee?: number; // Optional for backward compatibility
  created_at?: string;
}

export interface Student {
  id: string;
  name: string;
  phone?: string;
  parent_phone?: string;
  batch_id: string;
  join_date: string;
  is_active: boolean;
  notes?: string;
  created_at?: string;
}

export interface AttendanceRecord {
  id: string;
  attendance_date: string; // YYYY-MM-DD
  batch_id: string;
  student_id: string;
  status: AttendanceStatus;
  notes?: string;
  created_at?: string;
}

export interface PaymentRecord {
  id: string;
  student_id: string;
  month_year: string; // YYYY-MM
  amount_due: number;
  amount_paid: number;
  status: PaymentStatus;
  payment_date?: string;
  payment_mode?: string;
  notes?: string;
  created_at?: string;
}

export type ActiveTab = 'attendance' | 'students' | 'fees' | 'batches';
