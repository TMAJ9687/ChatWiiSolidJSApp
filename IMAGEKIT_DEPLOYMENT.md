# ImageKit Cloudflare Worker Deployment

## Overview
This guide helps you deploy the ImageKit authentication endpoint as a Cloudflare Pages Function.

## Deployment Steps

### 1. Move Worker to Correct Location
```bash
# Create the functions directory if it doesn't exist
mkdir -p functions/api

# Move the worker file to the correct location
cp workers/imagekit-auth.js functions/api/imagekit-auth.js
```

### 2. Set Environment Variables in Cloudflare Pages
Go to your Cloudflare Pages dashboard and add these environment variables:

**Required Variables:**
- `IMAGEKIT_PRIVATE_KEY`: Your ImageKit private key from https://imagekit.io/dashboard/developer/api-keys
- `IMAGEKIT_PUBLIC_KEY`: Your ImageKit public key (optional, already in code)

**How to add:**
1. Go to [Cloudflare Pages Dashboard](https://dash.cloudflare.com/pages)
2. Select your project (chatwii)
3. Go to Settings → Environment Variables
4. Add the variables for both Production and Preview environments

### 3. Deploy
```bash
# Add files to git
git add functions/api/imagekit-auth.js
git add src/services/supabase/imagekitService.ts

# Commit changes
git commit -m "🚀 ADD: ImageKit authentication endpoint with Cloudflare Worker

- Add authentication endpoint at /api/imagekit-auth
- Update ImageKit service to use authenticated uploads
- Enable secure image uploads with proper signatures

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to trigger deployment
git push
```

### 4. Test the Endpoint
After deployment, test the authentication endpoint:
```bash
curl https://chatwii.pages.dev/api/imagekit-auth
```

Expected response:
```json
{
  "token": "32-character-random-string",
  "expire": 1234567890,
  "signature": "hexadecimal-signature"
}
```

## Troubleshooting

### Environment Variable Issues
- Make sure `IMAGEKIT_PRIVATE_KEY` is set in Cloudflare Pages environment variables
- The private key should start with "private_"
- Get your keys from: https://imagekit.io/dashboard/developer/api-keys

### CORS Issues
The worker already includes CORS headers:
```javascript
'Access-Control-Allow-Origin': '*'
'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
'Access-Control-Allow-Headers': 'Content-Type'
```

### Testing Upload
Once deployed, image uploads should work automatically. Check browser console for any authentication errors.

## File Structure
```
chatwii/
├── functions/
│   └── api/
│       └── imagekit-auth.js    # Authentication endpoint
└── src/
    └── services/
        └── supabase/
            └── imagekitService.ts  # Updated service
```