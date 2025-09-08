rules_version = '2';
service firebase.storage {
match /b/{bucket}/o {
// User avatars
match /avatars/{userId}/{fileName} {
allow read: if request.auth != null;
allow write: if request.auth != null && request.auth.uid == userId
&& request.resource.size < 5 * 1024 * 1024 // Max 5MB
&& request.resource.contentType.matches('image/.*');
}

    // Image messages (original structure)
    match /images/{userId}/{conversationId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId
        && request.resource.size < 10 * 1024 * 1024 // Max 10MB
        && request.resource.contentType.matches('image/.*');
    }

    // Chat images (new structure)
    match /chat-images/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
        && request.resource.size < 10 * 1024 * 1024 // Max 10MB
        && request.resource.contentType.matches('image/.*');
    }

    // Voice messages
    match /voice/{userId}/{conversationId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId
        && request.resource.size < 5 * 1024 * 1024 // Max 5MB
        && request.resource.contentType.matches('audio/.*');
    }

}
}
