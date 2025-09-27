# ⚡ Quick Migration Steps

**Follow these steps to migrate to a new Supabase project quickly:**

## 🎯 Step-by-Step Checklist

### 1️⃣ Create New Supabase Project
- [ ] Go to [supabase.com](https://supabase.com)
- [ ] Create new project
- [ ] Wait for project to initialize

### 2️⃣ Setup Database
- [ ] Open **SQL Editor** in Supabase dashboard
- [ ] Copy contents of `COMPLETE_SUPABASE_SETUP.sql`
- [ ] Paste and **Run** the script
- [ ] ✅ Verify no errors

### 3️⃣ Update Environment Variables
**Option A - Automated (Recommended):**
```bash
node update-supabase-config.js
```

**Option B - Manual:**
- [ ] Go to **Settings → API** in Supabase
- [ ] Copy **Project URL** and **Anon Key**
- [ ] Update `.env` files:
```env
VITE_SUPABASE_URL=your_new_url
VITE_SUPABASE_ANON_KEY=your_new_key
```

### 4️⃣ Test Application
```bash
npm run build
npm run dev
```

- [ ] Test user registration
- [ ] Test messaging
- [ ] Test photo uploads
- [ ] Test admin functions (if applicable)

## 🗃️ What Gets Migrated

✅ **All Tables & Data Structure**
- Users, Messages, Reactions, Blocks
- Reports, Photo Usage, Presence, Typing
- Feedback, Admin Tables

✅ **Security Policies**
- Row Level Security (RLS)
- Authentication & Authorization
- Admin Access Controls

✅ **Storage Buckets**
- Avatars, Chat Images, Voice Messages
- Upload Policies & Permissions

✅ **Functions & Triggers**
- Conversation ID generation
- Timestamp updates
- Admin logging functions

## 🚨 Important Notes

⚠️ **Photo Management**: The old photos won't be transferred. Users will need to re-upload photos.

⚠️ **User Data**: Users will need to re-register. No user data transfers between projects.

⚠️ **Admin Users**: Create new admin users after migration.

## 🛠️ Files Created

| File | Purpose |
|------|---------|
| `COMPLETE_SUPABASE_SETUP.sql` | Complete database schema |
| `SUPABASE_MIGRATION_GUIDE.md` | Detailed migration guide |
| `update-supabase-config.js` | Environment updater script |
| `QUICK_MIGRATION_STEPS.md` | This quick reference |

## 📞 Need Help?

Check `SUPABASE_MIGRATION_GUIDE.md` for detailed troubleshooting and additional configuration options.

---
**Total Migration Time: ~15 minutes** ⏱️