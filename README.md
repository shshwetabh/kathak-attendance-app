# Kathak Class Attendance & Fee Tracker

A mobile-first Web Application & PWA designed for Kathak dance teachers to manage student attendance, batch schedules, monthly fee collections, and WhatsApp reminder alerts.

Built with **React**, **Tailwind CSS**, **Supabase (PostgreSQL)**, and ready for **Vercel** deployment.

---

## Features

- **Daily Attendance Sheet**: Date & batch filters, P/A/L/E toggles, "Mark All Present" button.
- **Student Roster**: Student directory, parent WhatsApp contact numbers, batch assignments.
- **Monthly Fee Tracker**: Fee status indicators (Paid/Unpaid/Partial), payment recorder (UPI/Cash), 1-tap WhatsApp fee reminder link.
- **Batches & Stats**: Batch schedule management, student attendance percentage summary, full JSON backup export.
- **Supabase Cloud + Local Demo Mode**: Works out of the box with sample demo data in LocalStorage if Supabase environment variables are missing.

---

## Quick Setup

### 1. Database Setup (Supabase)
Run `supabase/schema.sql` in your [Supabase SQL Editor](https://supabase.com/dashboard).

### 2. Environment Setup
Create a `.env` file:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Run Locally
```bash
npm install
npm run dev
```

### 4. Deploy to Vercel
Push to GitHub and import the repository into Vercel with your Supabase environment variables.
