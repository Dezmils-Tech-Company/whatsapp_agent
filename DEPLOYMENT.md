# Deployment Guide - Render

This guide explains how to deploy the WhatsApp Bot to Render.

## Prerequisites

- GitHub account with this repository
- Render account (https://render.com)
- MongoDB Atlas account (for hosted MongoDB) or an existing MongoDB instance
- WhatsApp Business Account (for bot credentials)

## Step 1: Prepare Your Repository

Make sure the following files are in your repository root:
- `Procfile` - Tells Render how to start the application
- `.env.example` - Example environment variables (DO NOT commit `.env`)
- `package.json` - With proper build and start scripts

Ensure `.env` is in `.gitignore` so credentials are never committed.

## Step 2: Database Setup

1. **If using MongoDB Atlas:**
   - Create a cluster at https://www.mongodb.com/cloud/atlas
   - Create a database user and whitelist your IP (or allow all IPs: 0.0.0.0/0)
   - Copy the connection string (format: `mongodb+srv://username:password@cluster.mongodb.net/database-name`)

2. **If using local MongoDB:**
   - Ensure your MongoDB instance is running
   - Use connection string format: `mongodb://localhost:27017/whatsapp-bot`

## Step 3: Set Up on Render

### Option A: Using render.yaml (Recommended)

1. Push your repository to GitHub
2. Go to https://dashboard.render.com
3. Click "New +" and select "Web Service"
4. Connect your GitHub repository
5. Render will automatically detect `render.yaml` and use the configuration
6. Deploy!

### Option B: Manual Setup

1. Go to https://dashboard.render.com
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name:** whatsapp-bot
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
   - **Plan:** Free (or Starter for better performance)

## Step 4: Configure Environment Variables

1. In the Render dashboard, go to your service settings
2. Scroll to "Environment" section
3. Add all variables from `.env.example`:
   - `MONGO_URI` - Your MongoDB connection string (mark as secret)
   - `OWNER_JID` - Your WhatsApp JID (mark as secret)
   - Other configuration values as needed

**Important:** Mark sensitive values (MONGO_URI, OWNER_JID) as "Secret" so they're encrypted.

## Step 5: Handle Authentication Data

The bot stores WhatsApp session authentication in the `auth_info/` directory. On Render:

1. The `auth_info/` directory will be created on first run
2. Session data persists in Render's disk
3. **Important:** Do NOT commit `auth_info/` to Git (it's in `.gitignore`)
4. Ensure `.env` with `AUTH_FOLDER=./auth_info` is set

## Step 6: Handle Log Files

Log files are written to `./logs/bot.log` by default. On Render:

1. Logs are created during runtime
2. View logs in Render dashboard: Service → Logs
3. `logs/` directory should be in `.gitignore` (it already is)

## Step 7: Deploy

1. Push your changes to GitHub:
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push
   ```

2. Render will automatically detect the push and deploy
3. Monitor the deployment in the Render dashboard
4. Check the logs to ensure the bot starts correctly

## Troubleshooting

### Issue: Build fails with TypeScript errors
- Run `npm run build` locally to check for errors
- Ensure all dependencies are in `package.json`

### Issue: Bot crashes on startup
- Check the logs in Render dashboard
- Verify all required environment variables are set
- Ensure MongoDB connection string is correct

### Issue: Bot starts but doesn't respond
- Check bot logs for errors
- Verify OWNER_JID is correct and properly formatted
- Ensure MongoDB is accessible from Render's servers

### Issue: QR code not displaying
- This is expected on Render (headless environment)
- The bot will attempt to reuse stored credentials from `auth_info/`
- First deployment may need manual QR scanning:
  1. Run locally first to generate credentials
  2. Commit `auth_info/` contents (or manually transfer them)

## Monitoring

1. Set up email notifications in Render for service failures
2. Monitor logs regularly for errors
3. Set up a health check endpoint if needed (future enhancement)

## Updating the Bot

1. Make changes locally
2. Test with `npm run dev`
3. Commit and push to GitHub
4. Render automatically redeploys on push
5. Monitor the new deployment in the dashboard

## Cost Considerations

- **Free Plan:** Limited runtime, may sleep after 15 minutes of inactivity
- **Starter Plan ($7/month):** Continuous running, recommended for production bots
- **MongoDB Atlas:** Free tier includes 512 MB storage, which is usually sufficient for small bots

## Production Recommendations

1. Upgrade to Starter plan (or higher) for always-on operation
2. Use MongoDB Atlas for reliable database hosting
3. Set up error monitoring (e.g., Sentry)
4. Regularly backup MongoDB data
5. Implement rate limiting to prevent abuse
6. Monitor WhatsApp API rate limits

## Additional Resources

- [Render Documentation](https://docs.render.com/)
- [MongoDB Atlas Documentation](https://www.mongodb.com/docs/atlas/)
- [Baileys Documentation](https://adiwajshing.github.io/Baileys/)
