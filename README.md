
# 🔧 How to Change Domain for Password Reset

This guide shows you how to update the domain used for password reset emails in your Vending Machine Admin System.

## 🎯 Current Setup

Your system is currently configured to use custom domains for password reset flows. This guide will help you switch between different domain options.

## 🔀 Domain Options

### Option 1: Firebase Default Auth Domain (Development)
```
https://iot-vending-machine-e2f54.firebaseapp.com
```
- ✅ No verification required
- ✅ Works immediately
- ✅ Firebase handles everything
- ✅ Free forever
- 🔧 **Perfect for development and testing**

### Option 2: Custom Domain (Production)
```
https://yourdomain.com
```
- ✅ Professional branding
- ✅ Production-ready
- ⚠️ Requires domain verification
- 💰 Costs money for domain
- 🚀 **Recommended for production deployment**

---

## 📋 Step-by-Step Instructions

### 🔥 Method 1: Firebase Default Auth Domain (Development)

**Use this for development, testing, and quick deployment**

**⚠️ Note: This method uses Firebase's default authentication domain**

#### Step 1: Set Up Firebase Hosting (Optional)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Navigate to **Hosting**
3. Deploy your React app to Firebase Hosting (if not already done)
4. Your app will be available at `https://iot-vending-machine-e2f54.web.app`

#### Step 2: Configure Firebase Authentication

1. Navigate to **Authentication** → **Templates**
2. Click on **Password reset**
3. Click the **pencil icon** (edit button)

#### Step 3: Keep Default Domain Settings

1. **Do not click** "Customize domain" - keep using Firebase default
2. Firebase will use the default authentication domain
3. No DNS configuration needed

#### Step 4: No DNS Records Required

- ✅ **Skip this step** - Firebase handles everything automatically
- ✅ **No domain provider setup** needed
- ✅ **Instant setup** - works immediately

#### Step 5: No Domain Verification Needed

- ✅ **Skip this step** - Firebase default domain is pre-verified
- ✅ **No waiting time** required
- ✅ **Ready to use** immediately

#### Step 6: Configure Action URL

1. In the password reset template page
2. **Scroll down** to find the **Action URL** field
3. Make sure it shows:
   ```
   https://iot-vending-machine-e2f54.firebaseapp.com/reset-password
   ```
   **⚠️ Important**: Make sure to include `/reset-password` route if you're developing a custom reset page

#### Step 7: Update React App Configuration

**File: `src/services/auth.js`**
```javascript
const CUSTOM_DOMAIN = process.env.REACT_APP_CUSTOM_DOMAIN;
```

**File: `.env`**
```env
REACT_APP_CUSTOM_DOMAIN=https://iot-vending-machine-e2f54.firebaseapp.com
```

**⚠️ Important: GitHub Actions CI/CD**

1. Go to your **GitHub repository**
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add or update the secret:
   - **Name**: `REACT_APP_CUSTOM_DOMAIN`
   - **Value**: `https://iot-vending-machine-e2f54.firebaseapp.com`

---

### 🏢 Method 2: Custom Domain (Production)

**Use this for production deployment with professional branding**

#### Step 1: Set Up Custom Domain in Firebase Hosting

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Navigate to **Hosting**
3. Click **Add custom domain**
4. Enter your domain (e.g., `yourdomain.com`)
5. Follow Firebase's verification process
6. Deploy your React app to this custom domain

**⚠️ Note**: This step also requires DNS configuration and typically takes **1.5 to 48 hours** for propagation.

#### Step 2: Add Domain to Authorized Domains

1. Navigate to **Authentication** → **Settings**
2. Click on **Authorized domains** tab
3. Click **Add domain**
4. Add your custom domain (e.g., `yourdomain.com`)
5. Click **Save**

#### Step 3: Configure Custom Domain for Authentication

1. Navigate to **Authentication** → **Templates**
2. Click on **Password reset**
3. Click the **pencil icon** (edit button)

#### Step 4: Customize Domain

1. In the password reset template page, click **"Customize domain"**
2. Enter your custom domain (e.g., `yourdomain.com`)
3. Click **"Verify domain"**
4. Firebase will now provide DNS records to add to your domain

#### Step 5: Add DNS Records to Your Domain Provider

| Type  | Name                   | Value                                                                 |
|-------|------------------------|----------------------------------------------------------------------|
| TXT   | @                      | v=spf1 include:_spf.firebasemail.com ~all                            |
| TXT   | @                      | firebase=iot-vending-machine-e2f54                                   |
| CNAME | firebase1._domainkey   | mail-iot-vending-machine-e2f54-web-app.dkim1._domainkey.firebasemail.com |
| CNAME | firebase2._domainkey   | mail-iot-vending-machine-e2f54-web-app.dkim2._domainkey.firebasemail.com |

**⚠️ Note**: DNS propagation may take **1.5 to 48 hours**.

#### Step 6: Wait for DNS Propagation

- **Wait time**: 1.5 to 48 hours for DNS records to propagate
- **Check status**: Firebase will show verification status
- **Tip**: Use [DNS Checker](https://dnschecker.org) to verify propagation

#### Step 7: Customize Action URL

1. After domain verification is complete
2. **Scroll down** in the same password reset template page
3. Click **"Customize action URL"**
4. Change the domain to your custom domain with the correct route:
   ```
   https://yourdomain.com/reset-password
   ```
   **⚠️ Important**: Make sure to include `/reset-password` route

#### Step 8: Update React App Configuration

**File: `src/services/auth.js`**
```javascript
const CUSTOM_DOMAIN = process.env.REACT_APP_CUSTOM_DOMAIN;
```

**File: `.env`**
```env
REACT_APP_CUSTOM_DOMAIN=https://yourdomain.com
```

**For development/testing:**
```env
REACT_APP_CUSTOM_DOMAIN=https://iot-vending-machine-e2f54.firebaseapp.com
```

**⚠️ Important: GitHub Actions CI/CD**

1. Go to your **GitHub repository**
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add or update the secret:
   - **Name**: `REACT_APP_CUSTOM_DOMAIN`
   - **Value**: `https://yourdomain.com`

---

## 🧪 Testing the Setup

1. Go to your login page and click **"Forgot Password"**
2. Enter your email and check the reset link in your inbox
3. Verify the link uses the correct domain
4. Reset your password and test logging in with the new credentials

---

## 🚨 Troubleshooting

- **Email link doesn't work?**  
  ➡️ Check that the Action URL in Firebase matches your deployed domain.

- **Domain verification fails?**  
  ➡️ Double-check DNS records, wait up to 48 hours, use DNS checker tools.

- **Reset page shows 404?**  
  ➡️ Ensure React app is deployed and routes to `/reset-password` are configured.

- **CORS errors?**  
  ➡️ Add domain to Firebase authorized domains in **Authentication → Settings**.

- **Customize domain button doesn't work?**  
  ➡️ Ensure Firebase Hosting is set up and DNS records are verified.

---

## 📝 Notes

- **Firebase default domain** is easiest for dev/testing.
- **Custom domains** offer professional branding but require DNS setup.
- **DNS changes** may take **1.5 to 48 hours** to propagate.
- **Always test** the password reset flow after changes.

---

## 🔗 Useful Links

- [Firebase Auth Docs](https://firebase.google.com/docs/auth)
- [Firebase Custom Domain Setup](https://firebase.google.com/docs/auth/custom-email-handler)
- [DNS Checker](https://dnschecker.org)
- [Firebase Console](https://console.firebase.google.com)

---

## ✅ Checklist

- [ ] Firebase email template updated
- [ ] React app configuration updated
- [ ] Environment variables updated
- [ ] App deployed to new domain
- [ ] DNS records configured (if custom domain)
- [ ] Domain verification completed in Firebase
- [ ] Action URL customized with correct route
- [ ] Email flow tested end-to-end
- [ ] Password reset page accessible
- [ ] Email links work correctly

---

