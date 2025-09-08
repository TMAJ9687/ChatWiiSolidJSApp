#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Service mapping from Firebase to Supabase
const serviceUpdates = [
  {
    from: 'import { authService } from "../services/authService";',
    to: 'import { authService } from "../services/supabase";'
  },
  {
    from: 'import { authService } from "../../services/authService";',
    to: 'import { authService } from "../../services/supabase";'
  },
  {
    from: 'import { authService } from "../../../services/authService";',
    to: 'import { authService } from "../../../services/supabase";'
  },
  {
    from: 'import { messageService } from "../services/messageService";',
    to: 'import { messageService } from "../services/supabase";'
  },
  {
    from: 'import { messageService } from "../../services/messageService";',
    to: 'import { messageService } from "../../services/supabase";'
  },
  {
    from: 'import { messageService } from "../../../services/messageService";',
    to: 'import { messageService } from "../../../services/supabase";'
  },
  {
    from: 'import { presenceService } from "../services/presenceService";',
    to: 'import { presenceService } from "../services/supabase";'
  },
  {
    from: 'import { presenceService } from "../../services/presenceService";',
    to: 'import { presenceService } from "../../services/supabase";'
  },
  {
    from: 'import { presenceService } from "../../../services/presenceService";',
    to: 'import { presenceService } from "../../../services/supabase";'
  },
  {
    from: 'import { imageService } from "../services/imageService";',
    to: 'import { imageService } from "../services/supabase";'
  },
  {
    from: 'import { imageService } from "../../services/imageService";',
    to: 'import { imageService } from "../../services/supabase";'
  },
  {
    from: 'import { imageService } from "../../../services/imageService";',
    to: 'import { imageService } from "../../../services/supabase";'
  },
  {
    from: 'import { voiceService } from "../services/voiceService";',
    to: 'import { voiceService } from "../services/supabase";'
  },
  {
    from: 'import { voiceService } from "../../services/voiceService";',
    to: 'import { voiceService } from "../../services/supabase";'
  },
  {
    from: 'import { voiceService } from "../../../services/voiceService";',
    to: 'import { voiceService } from "../../../services/supabase";'
  },
  {
    from: 'import { reactionService } from "../services/reactionService";',
    to: 'import { reactionService } from "../services/supabase";'
  },
  {
    from: 'import { reactionService } from "../../services/reactionService";',
    to: 'import { reactionService } from "../../services/supabase";'
  },
  {
    from: 'import { reactionService } from "../../../services/reactionService";',
    to: 'import { reactionService } from "../../../services/supabase";'
  },
  {
    from: 'import { blockingService } from "../services/blockingService";',
    to: 'import { blockingService } from "../services/supabase";'
  },
  {
    from: 'import { blockingService } from "../../services/blockingService";',
    to: 'import { blockingService } from "../../services/supabase";'
  },
  {
    from: 'import { blockingService } from "../../../services/blockingService";',
    to: 'import { blockingService } from "../../../services/supabase";'
  },
  {
    from: 'import { conversationService } from "../services/conversationService";',
    to: 'import { conversationService } from "../services/supabase";'
  },
  {
    from: 'import { conversationService } from "../../services/conversationService";',
    to: 'import { conversationService } from "../../services/supabase";'
  },
  {
    from: 'import { conversationService } from "../../../services/conversationService";',
    to: 'import { conversationService } from "../../../services/supabase";'
  },
  {
    from: 'import { photoTrackingService } from "../services/photoTrackingService";',
    to: 'import { photoTrackingService } from "../services/supabase";'
  },
  {
    from: 'import { photoTrackingService } from "../../services/photoTrackingService";',
    to: 'import { photoTrackingService } from "../../services/supabase";'
  },
  {
    from: 'import { photoTrackingService } from "../../../services/photoTrackingService";',
    to: 'import { photoTrackingService } from "../../../services/supabase";'
  },
  {
    from: 'import { translationService } from "../services/translationService";',
    to: 'import { translationService } from "../services/supabase";'
  },
  {
    from: 'import { translationService } from "../../services/translationService";',
    to: 'import { translationService } from "../../services/supabase";'
  },
  {
    from: 'import { translationService } from "../../../services/translationService";',
    to: 'import { translationService } from "../../../services/supabase";'
  },
  {
    from: 'import { typingService } from "../services/typingService";',
    to: 'import { typingService } from "../services/supabase";'
  },
  {
    from: 'import { typingService } from "../../services/typingService";',
    to: 'import { typingService } from "../../services/supabase";'
  },
  {
    from: 'import { typingService } from "../../../services/typingService";',
    to: 'import { typingService } from "../../../services/supabase";'
  }
];

// Update type imports as well
const typeUpdates = [
  {
    from: 'import { imageService, type ImageUploadResult } from',
    to: 'import { imageService, type ImageUploadResult } from'
  },
  {
    from: 'import { voiceService, type VoiceRecording } from',
    to: 'import { voiceService, type VoiceUploadResult } from'
  },
  {
    from: ', type VoiceRecording',
    to: ', type VoiceUploadResult'
  },
  {
    from: ': VoiceRecording',
    to: ': VoiceUploadResult'
  }
];

// Find all TypeScript/TSX files
const files = glob.sync('src/**/*.{ts,tsx}', { ignore: ['node_modules/**', 'src/services/supabase/**'] });

console.log(`Found ${files.length} files to update`);

let updatedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  let hasChanges = false;
  
  // Apply service updates
  serviceUpdates.forEach(update => {
    if (content.includes(update.from)) {
      content = content.replace(new RegExp(escapeRegExp(update.from), 'g'), update.to);
      hasChanges = true;
    }
  });
  
  // Apply type updates
  typeUpdates.forEach(update => {
    if (content.includes(update.from)) {
      content = content.replace(new RegExp(escapeRegExp(update.from), 'g'), update.to);
      hasChanges = true;
    }
  });
  
  if (hasChanges) {
    fs.writeFileSync(file, content);
    console.log(`Updated: ${file}`);
    updatedFiles++;
  }
});

console.log(`\nCompleted! Updated ${updatedFiles} files.`);

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}