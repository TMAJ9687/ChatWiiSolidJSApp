{
"rules": {
"presence": {
"$userId": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid == $userId"
      }
    },
    "typing": {
      "$conversationId": {
"$userId": {
          ".read": "auth != null",
          ".write": "auth != null && auth.uid == $userId"
        }
      }
    },
    "users": {
      "$userId": {
".read": "auth != null",
".write": "auth != null && auth.uid == $userId"
}
}
}
}
