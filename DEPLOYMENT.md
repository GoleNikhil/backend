# Deployment Guide: AVNS Backend on Render

## Prerequisites

1. **GitHub Account**: Your code must be in a GitHub repository
2. **Render Account**: Sign up at [render.com](https://render.com)
3. **Third-party Service Accounts** (if using these features):
   - Cloudinary (for file uploads)
   - Razorpay (for payments)
   - Gmail (for email notifications)
   - Google API (for chatbot)

## Step-by-Step Deployment

### 1. Prepare Your Repository

1. **Push your code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for Render deployment"
   git branch -M main
   git remote add origin https://github.com/yourusername/your-repo-name.git
   git push -u origin main
   ```

### 2. Deploy to Render

#### Option A: Using render.yaml (Recommended)

1. **Connect GitHub to Render**:
   - Go to [render.com](https://render.com)
   - Sign up/Login with GitHub
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository
   - Render will automatically detect the `render.yaml` file

2. **Configure Environment Variables**:
   The following variables need to be set manually in Render dashboard:
   ```
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   RAZORPAY_KEY_ID=your-razorpay-key-id
   RAZORPAY_KEY_SECRET=your-razorpay-key-secret
   GOOGLE_API_KEY=your-google-api-key
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-gmail-app-password
   VAPID_PUBLIC_KEY=your-vapid-public-key
   VAPID_PRIVATE_KEY=your-vapid-private-key
   SUPER_ADMIN_EMAIL=admin@yourdomain.com
   SUPER_ADMIN_PASSWORD=secure-admin-password-123
   SUPER_ADMIN_PHONE=1234567890
   SUPER_ADMIN_ADDRESS=Admin Address
   ```

#### Option B: Manual Setup

1. **Create PostgreSQL Database**:
   - Go to Render Dashboard
   - Click "New +" → "PostgreSQL"
   - Choose "Free" plan
   - Name: `avns-database`
   - Database Name: `AVNSDB`
   - User: `avns_user`

2. **Create Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name**: `avns-backend`
     - **Region**: Oregon (US West)
     - **Branch**: `main`
     - **Runtime**: Node
     - **Build Command**: `npm ci`
     - **Start Command**: `npm start`
     - **Plan**: Free

3. **Set Environment Variables**:
   In the web service settings, add all variables from `env.production.example`

### 3. Post-Deployment Setup

1. **Update Frontend URL**: 
   - Once deployed, update `FRONTEND_URL` in environment variables
   - Format: `https://your-frontend-app.onrender.com`

2. **Update Backend URL**:
   - Update `BACKEND_BASE_URL` to your actual Render URL
   - Format: `https://avns-backend.onrender.com`

3. **Test Health Endpoints**:
   - `https://your-app.onrender.com/` - Main health check
   - `https://your-app.onrender.com/health` - Detailed health status

## Important Notes for Free Plan

### Limitations:
- **Sleep Mode**: Service sleeps after 15 minutes of inactivity
- **Build Time**: 500 build minutes/month
- **Bandwidth**: 100GB/month
- **Database**: 1GB storage, expires after 90 days

### Optimization Tips:
1. **Keep Service Awake**: Use a service like UptimeRobot to ping your API every 14 minutes
2. **Database Backup**: Regularly backup your database data
3. **Monitor Usage**: Check your dashboard for build minutes and bandwidth usage

## Troubleshooting

### Common Issues:

1. **Build Failures**:
   - Check build logs in Render dashboard
   - Ensure all dependencies are in `package.json`
   - Verify Node.js version compatibility

2. **Database Connection Issues**:
   - Verify `DATABASE_URL` is properly set
   - Check database service status
   - Ensure database and web service are in same region

3. **Environment Variables**:
   - Double-check all required variables are set
   - Ensure no typos in variable names
   - Check for special characters that need escaping

4. **CORS Issues**:
   - Verify `FRONTEND_URL` matches your frontend domain exactly
   - Check CORS configuration in `src/server.js`

### Logs and Monitoring:
- **View Logs**: Render Dashboard → Your Service → Logs
- **Monitor Performance**: Render Dashboard → Your Service → Metrics
- **Database Logs**: Database Service → Logs

## Security Checklist

- [ ] Strong JWT_SECRET (at least 32 characters)
- [ ] Secure admin password
- [ ] Gmail App Password (not regular password)
- [ ] All API keys are kept secret
- [ ] HTTPS enforced (automatic on Render)
- [ ] CORS properly configured

## Scaling Considerations

When ready to upgrade from free plan:
1. **Starter Plan** ($7/month): No sleep mode, custom domains
2. **Standard Plan** ($25/month): More resources, autoscaling
3. **Pro Plan** ($85/month): High performance, priority support

## Support

- **Render Documentation**: [render.com/docs](https://render.com/docs)
- **Render Community**: [community.render.com](https://community.render.com)
- **Status Page**: [status.render.com](https://status.render.com)