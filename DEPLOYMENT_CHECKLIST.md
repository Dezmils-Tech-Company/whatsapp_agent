# Render Deployment Checklist

Before deploying to Render, ensure the following:

## Configuration Files ✓
- [x] `Procfile` - Created with proper web process definition
- [x] `render.yaml` - Created with complete service configuration
- [x] `.env.example` - Created with all required environment variables documented
- [x] `.node-version` - Specified for consistent Node runtime
- [x] `package.json` - Updated with proper scripts and engine requirements

## Code Preparation ✓
- [x] `npm run build` - Ensure builds successfully locally
- [x] TypeScript compilation - No errors (run `npm run build`)
- [x] Dependencies - All required packages in package.json
- [x] Source code - All files committed to Git

## Repository Setup ✓
- [x] `.gitignore` - Updated to exclude sensitive files and runtime directories
- [x] Authentication data - `auth_info/` is in .gitignore
- [x] Environment files - `.env` is in .gitignore
- [x] Log files - `logs/` directory is in .gitignore

## Environment Variables - REQUIRED BEFORE DEPLOYMENT
Complete these steps in Render dashboard:

```
Required Variables (mark sensitive ones as "Secret"):
□ MONGO_URI - MongoDB connection string (SECRET)
□ OWNER_JID - WhatsApp owner JID (SECRET)
□ BUSINESS_ID - Business identifier
□ BUSINESS_NAME - Display name for business
□ QUOTE_TIME - Time to send daily quotes (format: HH:MM)
□ QUIET_WINDOW_START - Quiet period start (format: HH:MM)
□ QUIET_WINDOW_END - Quiet period end (format: HH:MM)
□ REPLY_COOLDOWN_SECONDS - Cooldown between autoreplies (seconds)
□ AUTH_FOLDER - Path for auth data (default: ./auth_info)
□ LOG_FILE - Path for logs (default: ./logs/bot.log)
```

## Database Setup ✓
- [x] MongoDB Atlas account created (or local MongoDB available)
- [x] Database user created with proper permissions
- [x] IP whitelist configured (or allow all: 0.0.0.0/0)
- [x] Connection string verified and ready to set as MONGO_URI

## Deployment Steps

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```

2. **Connect to Render:**
   - Visit https://dashboard.render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Render will auto-detect render.yaml configuration

3. **Set Environment Variables in Render:**
   - Go to Service Settings → Environment
   - Add all variables from the list above
   - Mark MONGO_URI and OWNER_JID as "Secret"

4. **Deploy:**
   - Click "Create Web Service"
   - Monitor deployment progress in Logs tab
   - Verify bot starts successfully (check logs)

## Post-Deployment Verification

After deployment succeeds:

- [ ] Check logs in Render dashboard - no errors
- [ ] Verify MongoDB connection is working
- [ ] Send a test message to the bot
- [ ] Confirm autoreply functionality works
- [ ] Check appointment booking flow
- [ ] Verify daily quotes are scheduled

## Troubleshooting

**Build fails:**
- Run `npm run build` locally to check for errors
- Ensure all dependencies are listed in package.json

**Bot crashes on startup:**
- Check environment variables are set correctly
- Verify MONGO_URI is accessible
- Check bot logs in Render dashboard for specific errors

**QR code issues:**
- Expected - Render is headless
- Bot will reuse stored credentials from auth_info/
- Monitor logs for connection status

## First-Time Authentication

If this is a fresh bot (no auth_info yet):
1. Bot will attempt to display QR code in logs
2. Since Render is headless, you may need to:
   - Run locally first to generate credentials
   - Transfer auth_info files to Render (via environment or manual setup)
   - Or wait for Render to generate credentials on first run

## Important Links

- Render Dashboard: https://dashboard.render.com
- Render Docs: https://docs.render.com/
- MongoDB Atlas: https://www.mongodb.com/cloud/atlas
- GitHub Push: `git push origin main`

## Post-Deployment Optimization

**Recommended for production:**
- Upgrade from Free to Starter plan ($7/month) for continuous running
- Set up error notifications in Render settings
- Configure backup strategy for MongoDB
- Monitor service health and logs regularly
- Implement rate limiting for WhatsApp messages

---

**Status:** Ready for deployment ✓
