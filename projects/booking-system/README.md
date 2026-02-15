# Booking System - Isa Coiffure

A lightweight appointment booking system for small businesses.

## Features

- Simple booking form (name, phone, service, date, time)
- Admin dashboard to manage appointments
- SMS reminders (via Twilio or similar)
- No user accounts needed for customers
- Free tier with Supabase

## Tech Stack

- Frontend: Vanilla HTML/CSS/JS (embeddable widget)
- Backend: Supabase (PostgreSQL + Auth + Realtime)
- SMS: Twilio (optional)

## Setup

1. Create Supabase project (free)
2. Run SQL setup
3. Deploy frontend
4. Configure SMS

## Database Schema

```sql
-- Appointments table
CREATE TABLE appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    service TEXT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, confirmed, cancelled, completed
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    reminder_sent BOOLEAN DEFAULT FALSE
);

-- Services table
CREATE TABLE services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    price DECIMAL(10,2),
    active BOOLEAN DEFAULT TRUE
);

-- Working hours
CREATE TABLE working_hours (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday...
    open_time TIME,
    close_time TIME,
    is_open BOOLEAN DEFAULT TRUE
);
```

## API Endpoints

All via Supabase REST API:

- `GET /rest/v1/appointments` - List appointments (admin)
- `POST /rest/v1/appointments` - Create appointment
- `PATCH /rest/v1/appointments` - Update status
- `GET /rest/v1/services` - List available services

## Widget Embed

```html
<div id="booking-widget"></div>
<script src="https://your-domain.com/booking-widget.js" data-salon="isa-coiffure"></script>
```
