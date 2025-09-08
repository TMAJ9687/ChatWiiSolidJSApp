# Supabase Migration Guide

This guide explains how to complete the migration from Firebase to Supabase for your chat application.

## Prerequisites

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note down your project URL and anon key

2. **Update Environment Variables**
   - Open `.env` file
   - Replace the placeholder Supabase credentials:
     ```
     VITE_SUPABASE_URL=https://your_actual_project_id.supabase.co
     VITE_SUPABASE_ANON_KEY=your_actual_supabase_anon_key_here
     ```

## Database Setup

1. **Run the Setup Script**
   - Open your Supabase project dashboard
   - Go to SQL Editor
   - Copy and paste the entire content of `supabase-setup.sql`
   - Run the script

2. **Verify Tables Created**
   - Check the Table Editor in your Supabase dashboard
   - You should see: `users`, `messages`, `reactions`, `blocks`, `reports`, `photo_usage`, `presence`

3. **Verify Storage Buckets**
   - Go to Storage in your Supabase dashboard
   - You should see: `avatars`, `chat-images`, `voice-messages`

## Code Migration Steps

### Phase 1: Switch to Supabase Services

1. **Update Service Imports**
   
   Replace Firebase service imports with Supabase equivalents:

   ```typescript
   // OLD (Firebase)
   import { authService } from '../services/authService';
   import { messageService } from '../services/messageService';
   // ... other Firebase services

   // NEW (Supabase)
   import { 
     authService,
     messageService,
     presenceService,
     imageService,
     voiceService,
     reactionService,
     blockingService,
     conversationService,
     photoTrackingService,
     translationService,
     typingService
   } from '../services/supabase';
   ```

2. **Update Component Imports**
   
   Find and replace in all component files:
   - `src/components/**/*.tsx`
   - `src/pages/**/*.tsx`

### Phase 2: Update Specific Components

The following components need service import updates:

1. **Authentication Components**
   - `src/pages/Landing.tsx`
   - `src/components/landing/NicknameInput.tsx`

2. **Chat Components**
   - `src/pages/Chat.tsx`
   - `src/components/chat/desktop/ChatArea.tsx`
   - `src/components/chat/desktop/MessageList.tsx`
   - `src/components/chat/desktop/MessageBubble.tsx`
   - `src/components/chat/desktop/ChatHeader.tsx`
   - `src/components/chat/desktop/UserListSidebar.tsx`
   - `src/components/chat/desktop/HistorySidebar.tsx`
   - `src/components/chat/desktop/InboxSidebar.tsx`

3. **Feature Components**
   - `src/components/chat/desktop/ImageUpload.tsx`
   - `src/components/chat/desktop/VoiceRecorder.tsx`
   - `src/components/chat/desktop/ReactionPicker.tsx`
   - `src/components/chat/desktop/TypingIndicator.tsx`
   - `src/components/chat/desktop/BlockModal.tsx`
   - `src/components/chat/desktop/TranslationButton.tsx`

4. **Admin Components**
   - `src/pages/Admin.tsx`

### Phase 3: Test and Verify

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Test Core Functionality**
   - [ ] User registration (anonymous auth)
   - [ ] Real-time messaging
   - [ ] Image uploads
   - [ ] Voice messages
   - [ ] Message reactions
   - [ ] User blocking
   - [ ] Presence tracking
   - [ ] Typing indicators
   - [ ] Message translation
   - [ ] Conversation clearing

3. **Test Real-time Features**
   - [ ] New messages appear instantly
   - [ ] User online/offline status updates
   - [ ] Typing indicators work
   - [ ] Reactions update in real-time

## Key Differences

### Authentication
- **Firebase**: `signInAnonymously()` with Firebase Auth
- **Supabase**: `signInAnonymously()` with Supabase Auth
- *Interface remains the same*

### Real-time Updates
- **Firebase**: Firestore `onSnapshot()` + Realtime Database
- **Supabase**: PostgreSQL changes + Realtime subscriptions
- *Better performance and more reliable*

### File Storage
- **Firebase**: Firebase Storage
- **Supabase**: Supabase Storage with better URL handling
- *Same upload/download patterns*

### Data Querying
- **Firebase**: NoSQL queries with limitations
- **Supabase**: Full SQL queries with joins and aggregations
- *More powerful queries available*

## Rollback Plan

If you need to rollback to Firebase:

1. **Revert Service Imports**
   ```typescript
   // Change back to:
   import { authService } from '../services/authService';
   // Instead of:
   import { authService } from '../services/supabase';
   ```

2. **Comment Out Supabase Config**
   - Comment out Supabase environment variables in `.env`

3. **Restart Development Server**
   ```bash
   npm run dev
   ```

## Performance Benefits

### Expected Improvements:
- **50% faster queries** with PostgreSQL vs NoSQL
- **Better real-time performance** with native subscriptions
- **Reduced bundle size** by removing Firebase SDK
- **Lower latency** with optimized connections
- **Better caching** with HTTP-based API

### Cost Benefits:
- **More predictable pricing** with Supabase
- **Better free tier limits**
- **No Firebase function costs**

## Support

If you encounter issues during migration:

1. Check browser console for errors
2. Verify Supabase project setup
3. Ensure all environment variables are correct
4. Test database connectivity in Supabase dashboard

## Post-Migration Cleanup

After successful migration and testing:

1. **Remove Firebase Dependencies**
   ```bash
   npm uninstall firebase
   ```

2. **Clean Up Firebase Config**
   - Delete `src/config/firebase.ts`
   - Delete original Firebase service files
   - Remove Firebase environment variables

3. **Update Documentation**
   - Update README.md with Supabase setup instructions
   - Document any new features enabled by PostgreSQL

## Migration Checklist

- [ ] Supabase project created
- [ ] Environment variables updated
- [ ] Database schema deployed
- [ ] Storage buckets created
- [ ] Service imports updated
- [ ] All components tested
- [ ] Real-time features verified
- [ ] Performance benchmarked
- [ ] Firebase dependencies removed (post-migration)

## Success Indicators

✅ **Migration is successful when:**
- All existing functionality works exactly as before
- Real-time updates are faster and more reliable  
- No error messages in browser console
- User experience remains identical
- Performance metrics show improvement