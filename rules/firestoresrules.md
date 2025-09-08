rules_version = '2';
service cloud.firestore {
match /databases/{database}/documents {
// Allow users to read all user profiles when authenticated
match /users/{userId} {
allow read: if request.auth != null;
allow create: if request.auth != null && request.auth.uid == userId;
allow update: if request.auth != null && request.auth.uid == userId;
allow delete: if false; // Never allow deletion
}

    // Messages between users
    match /messages/{messageId} {
      allow read: if request.auth != null &&
        (request.auth.uid == resource.data.senderId ||
         request.auth.uid == resource.data.receiverId);
      allow create: if request.auth != null &&
        request.auth.uid == request.resource.data.senderId;
      allow update: if request.auth != null &&
        (request.auth.uid == resource.data.senderId ||
         request.auth.uid == resource.data.receiverId);
      allow delete: if false;
    }

    // Block list
    match /blocks/{blockId} {
      allow read: if request.auth != null &&
        (request.auth.uid == resource.data.blockerId ||
         request.auth.uid == resource.data.blockedId);
      allow create: if request.auth != null &&
        request.auth.uid == request.resource.data.blockerId;
      allow update: if false;
      allow delete: if request.auth != null &&
        request.auth.uid == resource.data.blockerId;
    }

    // Reports
    match /reports/{reportId} {
      allow read: if false; // Only admins via Admin SDK
      allow create: if request.auth != null;
      allow update: if false;
      allow delete: if false;
    }

    // Photo usage tracking (usageId format: userId_date)
    match /photoUsage/{usageId} {
      allow read: if request.auth != null &&
        (request.auth.uid == resource.data.userId ||
         usageId.matches(request.auth.uid + '_.*'));
      allow create: if request.auth != null &&
        (request.auth.uid == request.resource.data.userId &&
         usageId.matches(request.auth.uid + '_.*'));
      allow update: if request.auth != null &&
        (request.auth.uid == resource.data.userId &&
         usageId.matches(request.auth.uid + '_.*'));
      allow delete: if false;
    }

    // Message reactions
    match /reactions/{reactionId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null &&
        request.auth.uid == request.resource.data.userId;
      allow update: if false;
      allow delete: if request.auth != null &&
        request.auth.uid == resource.data.userId;
    }

}
}
