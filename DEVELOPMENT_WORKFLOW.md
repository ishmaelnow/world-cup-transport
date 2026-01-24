# FairFare Development Workflow Guide

## 🚀 Quick Start

### Prerequisites Check
- ✅ Node.js 18+ installed
- ✅ Dependencies installed (`npm install` completed)
- ✅ Environment variables configured (`.env` file exists)

### Starting Development Server

```bash
cd C:\Users\koshi\apps-deve
npm run dev
```

The app will be available at `http://localhost:5173` (or the port shown in terminal)

---

## 📋 Development Workflow

### 1. **Daily Development Routine**

#### Morning Setup
1. **Pull latest changes** (if using Git)
   ```bash
   git pull origin main
   ```

2. **Install dependencies** (if package.json changed)
   ```bash
   npm install
   ```

3. **Start dev server**
   ```bash
   npm run dev
   ```

4. **Verify environment**
   - Check `.env` file has all required variables
   - Test Supabase connection in browser console
   - Verify Stripe keys (if working on payments)

#### During Development
- **Hot Reload**: Vite automatically reloads on file changes
- **Type Checking**: Run `npm run typecheck` to check TypeScript errors
- **Linting**: Run `npm run lint` to check code quality

#### Before Committing
1. **Type check**
   ```bash
   npm run typecheck
   ```

2. **Lint code**
   ```bash
   npm run lint
   ```

3. **Test manually**
   - Test the feature you're working on
   - Check browser console for errors
   - Verify Supabase operations work

---

## 🏗️ Project Structure Overview

```
apps-deve/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── LocationInput.tsx
│   │   └── ...
│   ├── contexts/            # React Context providers
│   │   └── AuthContext.tsx
│   ├── lib/                 # Utility functions & services
│   │   ├── supabase.ts      # Supabase client
│   │   ├── auth.ts          # Authentication helpers
│   │   ├── stripe.ts        # Stripe integration
│   │   ├── geocoding.ts     # Address/geocoding
│   │   └── ...
│   ├── pages/               # Page components
│   │   ├── AuthPage.tsx
│   │   ├── admin/
│   │   ├── driver/
│   │   └── rider/
│   └── App.tsx              # Main app & routing
├── supabase/
│   ├── functions/           # Edge Functions
│   └── migrations/          # Database migrations
└── public/                  # Static assets
```

---

## 🎯 Best Practices for Development

### 1. **Code Organization**

#### Component Structure
```typescript
// Good: Clear, focused component
export function Button({ onClick, children }: ButtonProps) {
  return <button onClick={onClick}>{children}</button>;
}

// Bad: Too many responsibilities
export function ButtonWithEverything() { ... }
```

#### File Naming
- Components: `PascalCase.tsx` (e.g., `RiderDashboard.tsx`)
- Utilities: `camelCase.ts` (e.g., `auth.ts`)
- Types: `camelCase.types.ts` (e.g., `database.types.ts`)

### 2. **TypeScript Best Practices**

- ✅ Always type function parameters and return types
- ✅ Use interfaces for object shapes
- ✅ Leverage TypeScript's type inference where appropriate
- ❌ Avoid `any` type (use `unknown` if needed)

```typescript
// Good
interface User {
  id: string;
  email: string;
  role: 'rider' | 'driver' | 'admin';
}

function getUser(id: string): Promise<User | null> {
  // ...
}

// Bad
function getUser(id: any): any {
  // ...
}
```

### 3. **Supabase Integration**

#### Query Pattern
```typescript
// Good: Error handling and type safety
const { data, error } = await supabase
  .from('rides')
  .select('*')
  .eq('rider_id', userId)
  .order('created_at', { ascending: false });

if (error) {
  console.error('Error fetching rides:', error);
  return;
}

// Type-safe data
const rides: Ride[] = data;
```

#### Real-time Subscriptions
```typescript
// Always clean up subscriptions
useEffect(() => {
  const subscription = supabase
    .channel('rides')
    .on('postgres_changes', 
      { event: 'UPDATE', schema: 'public', table: 'rides' },
      (payload) => {
        // Handle update
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

### 4. **State Management**

- Use React Context for global state (Auth, etc.)
- Use local state (`useState`) for component-specific state
- Use `useEffect` for side effects and subscriptions
- Clean up subscriptions and timers

### 5. **Error Handling**

```typescript
// Good: Comprehensive error handling
try {
  const result = await someAsyncOperation();
  // Handle success
} catch (error) {
  console.error('Operation failed:', error);
  // Show user-friendly error message
  // Log to error tracking service (Sentry, etc.)
}
```

---

## 🔧 Common Development Tasks

### Adding a New Feature

1. **Plan the feature**
   - What database changes are needed?
   - What UI components are needed?
   - What API calls are required?

2. **Database changes** (if needed)
   - Create migration file in `supabase/migrations/`
   - Run migration in Supabase SQL Editor
   - Update `database.types.ts` if schema changed

3. **Create components**
   - Start with UI components
   - Add business logic
   - Connect to Supabase

4. **Add routing** (if new page)
   - Update `App.tsx` with new route
   - Add protected route if needed

5. **Test thoroughly**
   - Test happy path
   - Test error cases
   - Test edge cases

### Fixing a Bug

1. **Reproduce the bug**
   - Understand when it happens
   - Check browser console for errors
   - Check Supabase logs

2. **Identify root cause**
   - Check relevant code files
   - Check database queries
   - Check API responses

3. **Fix the issue**
   - Make minimal changes
   - Test the fix
   - Ensure no regressions

4. **Document the fix**
   - Add comments if complex logic
   - Update relevant docs

### Working with Supabase

#### Running Migrations
1. Go to Supabase Dashboard → SQL Editor
2. Copy migration file content
3. Paste and run
4. Verify tables/columns created

#### Testing Edge Functions
1. Deploy function: `supabase functions deploy function-name`
2. Test via Supabase Dashboard → Edge Functions
3. Check logs for errors

#### Debugging Database Issues
- Check Supabase Dashboard → Logs
- Use SQL Editor to query tables directly
- Check RLS policies if access denied

---

## 🧪 Testing Strategy

### Manual Testing Checklist

#### Rider Flow
- [ ] Sign up as rider
- [ ] Request a ride
- [ ] Track ride status
- [ ] Complete payment flow
- [ ] View ride history

#### Driver Flow
- [ ] Sign up as driver
- [ ] Complete onboarding
- [ ] Go online
- [ ] Accept ride
- [ ] Update ride status
- [ ] Complete trip
- [ ] View earnings

#### Admin Flow
- [ ] Sign up as admin
- [ ] View dashboard metrics
- [ ] Manage rides
- [ ] Manage drivers

### Browser Testing
- Test in Chrome, Firefox, Safari
- Test on mobile devices (responsive design)
- Test with slow network (throttle in DevTools)

---

## 🐛 Debugging Tips

### Common Issues

#### "Missing Supabase environment variables"
- Check `.env` file exists
- Verify variable names start with `VITE_`
- Restart dev server after changing `.env`

#### "RLS policy violation"
- Check user is authenticated
- Verify RLS policies in Supabase
- Check user role matches policy requirements

#### "Stripe not configured"
- Check `VITE_STRIPE_PUBLISHABLE_KEY` in `.env`
- Verify Stripe keys are correct
- Restart dev server

#### Real-time updates not working
- Check WebSocket connection in browser DevTools
- Verify subscription is set up correctly
- Check Supabase Realtime is enabled for table

### Debugging Tools

1. **Browser DevTools**
   - Console for errors
   - Network tab for API calls
   - React DevTools for component state

2. **Supabase Dashboard**
   - Logs for database queries
   - Auth logs for authentication
   - Realtime logs for subscriptions

3. **Vite DevTools**
   - Hot module replacement status
   - Build errors

---

## 📦 Building for Production

### Build Process

```bash
# Build the app
npm run build

# Preview production build locally
npm run preview
```

### Build Output
- Files in `dist/` folder
- Ready to deploy to Vercel, Netlify, etc.

### Pre-Deployment Checklist
- [ ] Environment variables set in hosting platform
- [ ] Build completes without errors
- [ ] Test production build locally
- [ ] Verify Supabase connection works
- [ ] Test Stripe integration (if applicable)
- [ ] Check all routes work
- [ ] Verify responsive design

---

## 🔄 Git Workflow (if using Git)

### Branch Strategy
- `main` - Production-ready code
- `develop` - Development branch
- `feature/feature-name` - Feature branches
- `fix/bug-name` - Bug fix branches

### Commit Messages
Use clear, descriptive commit messages:
```
feat: Add driver earnings dashboard
fix: Resolve payment capture issue
refactor: Improve ride matching algorithm
docs: Update setup instructions
```

---

## 📚 Key Resources

### Documentation
- `README.md` - User guide
- `SETUP_INSTRUCTIONS.md` - Setup guide
- `IMPLEMENTATION.md` - Technical architecture
- `STRIPE_SETUP.md` - Payment integration

### External Resources
- [Supabase Docs](https://supabase.com/docs)
- [React Docs](https://react.dev)
- [TypeScript Docs](https://www.typescriptlang.org/docs)
- [Vite Docs](https://vitejs.dev)
- [Stripe Docs](https://stripe.com/docs)

---

## 🎯 Next Steps for Development

### Immediate Tasks
1. ✅ Verify dev server runs
2. ✅ Test authentication flow
3. ✅ Test basic ride request flow
4. ✅ Verify database connection

### Short-term Improvements
- Add error boundaries
- Improve error messages
- Add loading states
- Enhance UI/UX

### Long-term Features
- Stripe Connect for driver payouts
- Ratings & reviews system
- Promo codes
- Scheduled rides
- Native mobile apps

---

## 💡 Tips for Efficient Development

1. **Use TypeScript** - Catch errors early
2. **Test frequently** - Don't wait until the end
3. **Check console** - Monitor for errors/warnings
4. **Use Supabase Dashboard** - Visual database management
5. **Keep docs updated** - Document as you go
6. **Commit often** - Small, focused commits
7. **Ask for help** - Use Supabase Discord, Stack Overflow

---

**Happy Coding! 🚀**


