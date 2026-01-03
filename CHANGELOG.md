# Changelog

## [1.0.0] - 2026-01-03

### Initial Release

#### Features
- ✅ Owner dashboard with store management
- ✅ QR code generation for check-in
- ✅ Staff QR scanner with html5-qrcode
- ✅ Selfie capture with react-webcam
- ✅ GPS location verification
- ✅ Distance calculation with Haversine formula
- ✅ Supabase backend with PostgreSQL
- ✅ Row Level Security (RLS) policies
- ✅ Image storage in Supabase Storage
- ✅ Modern Vietnamese UI/UX
- ✅ Fully responsive design
- ✅ TypeScript for type safety

#### Tech Stack
- Next.js 16.1.1 (App Router)
- React 19.2.3
- TypeScript 5.9.3
- Tailwind CSS 3.x (stable)
- Supabase 2.89.0
- PostCSS & Autoprefixer

#### Database Schema
- `profiles` - User profiles (owner/staff)
- `stores` - Store information with GPS coordinates
- `staff` - Staff members per store
- `check_ins` - Check-in records with selfies
- `time_slots` - Work shifts (for future use)

#### Documentation
- README.md - Full project documentation
- SETUP_GUIDE.md - Detailed setup instructions
- QUICKSTART.md - 5-minute quick start
- PROJECT_SUMMARY.md - Technical overview
- DATABASE_SCHEMA.sql - Complete database setup

#### Known Issues
- No authentication system (planned for v2.0)
- No real-time updates (planned for v2.0)
- No offline support
- Browser-only (mobile app planned)

#### Notes
- Uses Tailwind CSS v3 for stability (v4 compatibility issues with Next.js 16)
- Supabase Storage bucket "selfies" must be created manually or via SQL
- GPS and camera permissions required for staff check-in
- Works best on HTTPS or localhost

---

## Future Roadmap

### v2.0 (Planned)
- [ ] Supabase Auth integration
- [ ] Real-time check-in updates
- [ ] Time slot management
- [ ] Advanced reporting
- [ ] Email notifications

### v3.0 (Planned)
- [ ] Mobile app (React Native)
- [ ] Offline support
- [ ] Face recognition
- [ ] Payroll integration
