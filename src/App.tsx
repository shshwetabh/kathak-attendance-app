import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navbar } from './components/Navbar';
import { AttendanceTab } from './components/AttendanceTab';
import { StudentsTab } from './components/StudentsTab';
import { FeesTab } from './components/FeesTab';
import { BatchesTab } from './components/BatchesTab';
import { ActiveTab, Batch, Student } from './types';
import { fetchBatches, fetchStudents } from './lib/supabase';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('attendance');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const loadInitialData = async () => {
    setLoading(true);
    const [fetchedBatches, fetchedStudents] = await Promise.all([
      fetchBatches(),
      fetchStudents(),
    ]);
    setBatches(fetchedBatches);
    setStudents(fetchedStudents);
    setLoading(false);
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col antialiased select-none">
      <Header />

      <main className="flex-1 pb-20">
        {loading ? (
          <div className="flex flex-col items-center justify-center pt-24 space-y-3">
            <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-700 rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-slate-500">Loading Kathak Tracker...</p>
          </div>
        ) : (
          <>
            {activeTab === 'attendance' && (
              <AttendanceTab batches={batches} students={students} />
            )}
            {activeTab === 'students' && (
              <StudentsTab batches={batches} students={students} onRefresh={loadInitialData} />
            )}
            {activeTab === 'fees' && (
              <FeesTab batches={batches} students={students} />
            )}
            {activeTab === 'batches' && (
              <BatchesTab batches={batches} students={students} onRefresh={loadInitialData} />
            )}
          </>
        )}
      </main>

      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

export default App;
