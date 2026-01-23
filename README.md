# World Cup Transport - Rideshare Platform MVP

A production-ready rideshare platform with rider, driver, and admin capabilities. Built with React, TypeScript, and Supabase.

## Quick Start

### Prerequisites
- Node.js 18+ installed
- Supabase account (database already configured)

### Installation

```bash
npm install
```

### Run Development Server

The development server is started automatically. Visit the application in your browser at the provided URL.

### Build for Production

```bash
npm run build
```

### Stripe Payment Setup (Optional)

To enable payment processing:

1. **Get Stripe API Keys:**
   - Sign up at https://dashboard.stripe.com/register
   - Go to Developers → API Keys
   - Copy your Publishable Key (pk_test_...)

2. **Add to .env file:**
   ```bash
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
   ```

3. **Restart the dev server**

4. **Test with Stripe test cards:**
   - Card: 4242 4242 4242 4242
   - Expiry: Any future date
   - CVC: Any 3 digits

📖 **Complete Setup Guide:** See `STRIPE_SETUP.md` for detailed instructions

## User Guide

### For Riders

**Sign Up**
1. Open the application
2. Click "Sign Up"
3. Enter your email, password, and full name
4. Select "Rider" as your role
5. Click "Sign Up"

**Request a Ride**
1. Log in to your account
2. Enter your pickup location (start typing for suggestions)
3. Enter your destination
4. Review the fare estimate
5. Click "Request Ride"
6. Track your ride status in real-time

**Track Your Ride**
- **Matching:** System is finding a driver
- **Accepted:** Driver assigned, on the way to you
- **Arriving:** Driver is close to pickup location
- **In Progress:** Trip has started
- **Completed:** Trip finished, see summary

**View History**
- All past rides appear on your dashboard
- Click any ride to see details

---

### For Drivers

**Sign Up**
1. Open the application
2. Click "Sign Up"
3. Enter your email, password, and full name
4. Select "Driver" as your role
5. Complete onboarding with vehicle information:
   - Vehicle make & model
   - Year & color
   - License plate number
   - Driver license number

**Go Online**
1. Log in to your driver account
2. Click the power button to go online
3. Available rides will appear automatically

**Accept a Ride**
1. Review ride details (pickup, dropoff, fare, distance)
2. Click "Accept Ride"
3. Navigate to pickup location

**Complete a Trip**
1. Click "Arriving at Pickup" when close
2. Click "Start Trip" once passenger is onboard
3. Navigate to destination
4. Click "Complete Trip" upon arrival

**Performance Metrics**
- View your total trips on the dashboard
- See your average rating
- Track earnings (placeholder in MVP)

---

### For Admins

**Sign Up**
1. Open the application
2. Click "Sign Up"
3. Enter credentials and select "Admin" role

**Dashboard Overview**
- Total rides (all time)
- Completed rides count
- Active rides monitor
- Total revenue generated
- Online driver count
- Completion rate percentage

**Manage Rides**
1. Click "Rides" tab
2. Filter by status (Matching, In Progress, Completed, etc.)
3. View all ride details
4. Monitor active trips in real-time

**Manage Drivers**
1. Click "Drivers" tab
2. View all drivers and their status
3. See vehicle information
4. Check performance metrics (trips, ratings)
5. Activate or deactivate driver accounts

---

## Features

### Core Features (MVP)
✅ User authentication with role-based access
✅ Real-time ride matching
✅ Live status updates
✅ Address autocomplete with geocoding
✅ Fare estimation
✅ Driver availability toggle
✅ Trip history
✅ Admin dashboard with metrics
✅ Responsive design (mobile-friendly)
✅ **Stripe payment processing**
✅ **Secure payment method storage**
✅ **Authorize → Capture payment flow**
✅ **Platform fee calculation (20%)**
✅ **Driver earnings tracking**

### Security
✅ Row Level Security (RLS) on all data
✅ JWT-based authentication
✅ Role-based access control
✅ Secure password hashing

### Real-Time Features
✅ Automatic driver matching
✅ Live ride status updates
✅ Instant notifications for new rides
✅ Real-time dashboard metrics

---

## Technical Details

### Tech Stack
- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS
- **Backend:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (JWT)
- **Real-time:** Supabase Realtime (WebSockets)
- **Functions:** Supabase Edge Functions
- **Geocoding:** OpenStreetMap Nominatim
- **Routing:** React Router

### Database Schema
- **profiles** - User accounts with roles
- **driver_profiles** - Driver-specific info & vehicles
- **rides** - Trip data with lifecycle tracking
- **trip_locations** - GPS breadcrumb trail

### API Endpoints
All data access is through Supabase client with automatic authentication and RLS enforcement.

---

## Fare Calculation

Fares are calculated using:
```
Base Fare: $2.50
Per Mile: $1.75
Per Minute: $0.35
Minimum Fare: $5.00

Total = Base + (Miles × Per Mile) + (Minutes × Per Minute)
Final = max(Total, Minimum Fare)
```

---

## Troubleshooting

### "No available drivers found"
- Ensure at least one driver is online
- Drivers must have location permissions enabled
- Check that drivers are within 10 miles of pickup

### Ride stuck in "Matching"
- System automatically retries matching
- No drivers may be available in your area
- Try requesting again after a few moments

### Location autocomplete not working
- Check internet connection
- OpenStreetMap API may have rate limits
- Try entering more specific addresses

### Can't accept rides as driver
- Ensure you completed onboarding
- Toggle your availability to "Online"
- Check that your account is active

---

## Limitations (MVP Scope)

- **Driver Payouts:** Earnings tracked, but automated payouts require Stripe Connect setup
- **Ratings:** Coming in Phase 2
- **Push Notifications:** Web notifications only
- **Maps View:** Text-based for MVP
- **Surge Pricing:** Fixed multiplier (1.0x)
- **Background Checks:** Not integrated
- **Mobile Apps:** Web-responsive only

---

## Roadmap

### Phase 2 (Next)
- Stripe Connect for automated driver payouts
- Two-way ratings & reviews
- Promo codes & referrals
- Scheduled rides
- In-app chat
- Enhanced maps with route visualization
- Payment refunds for canceled rides

### Phase 3 (Future)
- Native mobile apps (iOS/Android)
- Advanced surge pricing
- Ride pooling
- Multi-city support
- Driver background checks
- Insurance verification

---

## Support

For technical issues or questions:
1. Check the IMPLEMENTATION.md file for detailed documentation
2. Review the database schema and API contracts
3. Check browser console for error messages
4. Verify Supabase connection and authentication

---

## Security & Privacy

- All passwords are hashed using bcrypt
- JWT tokens expire after 1 hour
- Row Level Security enforces data access
- HTTPS enforced in production
- No sensitive data in client-side code

---

## Contributing

This is an MVP project. Future contributions should focus on:
- Payment integration
- Enhanced matching algorithms
- Performance optimization
- Mobile app development
- Additional security hardening

---

## License

Proprietary - All rights reserved

---

**Version:** 1.0.0 (MVP)
**Status:** Production-Ready
**Last Updated:** December 2025
