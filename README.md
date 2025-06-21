# Quick Test!

## Login with this credential

### email: admin@vending.com
### password: VEndingadmin123




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



# Comprehensive CLI Commands Reference

## 🎯 Main Commands Overview

| Command | Type | Description | Time | Best For |
|---------|------|-------------|------|----------|
| `npm run seed` | Interactive | Menu with 5 seeding options | 1-5 min | Flexible seeding |
| `npm run clear-db` | Interactive | Menu with 5 cleanup options | 30 sec - 2 min | Selective cleanup |
| `npm run seed-quick` | Preset | Quick development seed | 30-60 sec | Daily development |
| `npm run seed-full` | Preset | Comprehensive test data | 2-5 min | Demos & presentations |

---

## 📊 Detailed Command Breakdown

### 1. `npm run seed` - Interactive Seeding Menu

**What it does:** Opens an interactive menu with 5 seeding options

| Option | Name | Days | Products | Sales | Revenue | Use Case |
|--------|------|------|----------|-------|---------|----------|
| **1** | Quick seed | 7 | 10 | ~100-175 | ~$300-500 | Development testing |
| **2** | Full seed | 30 | 10 | ~800-1200 | ~$2000-3500 | Feature testing |
| **3** | Large seed | 60 | 10 | ~2000-3000 | ~$5000-8500 | Comprehensive testing |
| **4** | Custom seed | Custom | 10 | Custom | Custom | Specific requirements |
| **5** | Products only | 0 | 10 | 0 | $0 | Setup products first |

**Example Usage:**
```bash
npm run seed
# Select option (1-5): 2
# ✅ Creates 30 days of realistic sales data
```

---

### 2. `npm run clear-db` - Interactive Cleanup Menu

**What it does:** Opens an interactive menu with 5 cleanup options

| Option | Name | Clears | Keeps | Safety | Use Case |
|--------|------|--------|-------|--------|----------|
| **1** | Clear all data | Products, Sales, Inventory | Nothing | ⚠️ High | Complete reset |
| **2** | Clear sales only | Sales | Products, Inventory | ✅ Safe | Reset sales data |
| **3** | Clear products only | Products, Inventory | Sales | ⚠️ Medium | Reset product catalog |
| **4** | Clear inventory only | Inventory | Products, Sales | ✅ Safe | Reset stock levels |
| **5** | Custom cleanup | Choose what to clear | Choose what to keep | ⚠️ Variable | Selective cleanup |

**Example Usage:**
```bash
npm run clear-db
# Select option (1-5): 2
# ⚠️ This will permanently delete data. Continue? (y/N): y
# ✅ Clears only sales, keeps products
```

---

### 3. `npm run seed-quick` - Quick Development Preset

**What it does:** Fast seeding for daily development work

| Aspect | Details |
|--------|---------|
| **Products** | 10 realistic items (Coca Cola, Kit Kat, etc.) |
| **Time Range** | Last 7 days |
| **Sales Volume** | 10-25 sales per day |
| **Total Sales** | ~100-175 records |
| **Revenue Generated** | ~$300-500 |
| **Execution Time** | 30-60 seconds |
| **Inventory Levels** | Random realistic stock (2-80% full) |
| **Payment Methods** | Cash, Card, Contactless, Mobile |
| **Business Hours** | Weighted (lunch rush, morning rush) |
| **Weekend Effect** | 40% fewer sales on weekends |

**Perfect For:**
- ✅ Daily development testing
- ✅ Quick feature verification
- ✅ Lightweight test data
- ✅ Fast iteration cycles

---

### 4. `npm run seed-full` - Comprehensive Preset

**What it does:** Creates extensive realistic dataset for thorough testing

| Aspect | Details |
|--------|---------|
| **Products** | 10 diverse items across 4 categories |
| **Time Range** | Last 60 days |
| **Sales Volume** | 20-50 sales per day |
| **Total Sales** | ~2000-3000 records |
| **Revenue Generated** | ~$5000-8500 |
| **Execution Time** | 2-5 minutes |
| **Special Events** | Busy days, promotional pricing |
| **Seasonal Patterns** | Realistic business fluctuations |
| **Product Distribution** | Weighted popularity (Coca Cola #1) |
| **Analytics Ready** | Rich data for all dashboard features |

**Perfect For:**
- ✅ Demo preparations
- ✅ Client presentations
- ✅ Performance testing
- ✅ Full feature testing
- ✅ Screenshot/video content

---

## 🗂️ Data Generation Details

### Product Catalog (All Commands)

| Slot | Product | Category | Price | Max Capacity | Popularity |
|------|---------|----------|-------|--------------|------------|
| **A1** | Coca Cola | Beverages | $2.50 | 20 | ⭐⭐⭐⭐⭐ (25%) |
| **A2** | Pepsi | Beverages | $2.50 | 20 | ⭐⭐⭐⭐ (20%) |
| **A3** | Sprite | Beverages | $2.00 | 15 | ⭐⭐⭐ (15%) |
| **B1** | Kit Kat | Candy | $3.00 | 25 | ⭐⭐⭐⭐ (20%) |
| **B2** | Snickers | Candy | $3.50 | 25 | ⭐⭐⭐⭐ (18%) |
| **C1** | Lays Classic | Snacks | $2.80 | 18 | ⭐⭐⭐ (12%) |
| **C2** | Doritos | Snacks | $3.20 | 18 | ⭐⭐ (10%) |
| **D1** | Granola Bar | Healthy | $4.00 | 12 | ⭐⭐ (8%) |
| **D2** | Trail Mix | Healthy | $4.50 | 15 | ⭐ (6%) |
| **D3** | Water Bottle | Beverages | $1.50 | 30 | ⭐⭐⭐ (15%) |

### Sales Patterns (Realistic Business Logic)

| Time Period | Sales Multiplier | Description |
|-------------|------------------|-------------|
| **7am-9am** | 1.5x | Morning rush (coffee, quick items) |
| **12pm-2pm** | 2.5x | Lunch peak (highest sales) |
| **3pm-5pm** | 1.2x | Afternoon moderate |
| **5pm-7pm** | 2.0x | Evening rush (end of workday) |
| **Weekends** | 0.6x | 40% fewer sales |
| **Weekdays** | 1.0x | Normal business volume |

### Payment Method Distribution

| Method | Percentage | Realistic Usage |
|--------|------------|-----------------|
| **Cash** | 35% | Traditional, small purchases |
| **Card** | 30% | Credit/debit cards |
| **Contactless** | 25% | Tap payments, modern trend |
| **Mobile** | 10% | Phone payments, tech-savvy users |

---

## 🎯 Command Selection Guide

### Choose Your Command Based On:

#### **For Development Work:**
```bash
npm run seed-quick
# ✅ Fast, lightweight, perfect for coding
```

#### **For Feature Testing:**
```bash
npm run seed
# Choose option 2 (Full seed)
# ✅ 30 days, comprehensive but not overwhelming
```

#### **For Demos/Presentations:**
```bash
npm run seed-full
# ✅ 60 days, impressive dataset, all features showcased
```

#### **For Custom Requirements:**
```bash
npm run seed
# Choose option 4 (Custom seed)
# Specify: days, min/max sales per day
```

#### **For Clean Setup:**
```bash
npm run clear-db     # Clean old data
npm run seed-quick   # Add fresh data
```

#### **For Database Reset:**
```bash
npm run clear-db
# Choose option 1 (Clear all data)
# ✅ Complete database reset
```

---

## ⚡ Quick Reference Commands

| Need | Command | Result |
|------|---------|--------|
| **Daily development** | `npm run seed-quick` | 7 days, ~150 sales |
| **Feature testing** | `npm run seed` → option 2 | 30 days, ~1000 sales |
| **Demo preparation** | `npm run seed-full` | 60 days, ~2500 sales |
| **Clean slate** | `npm run clear-db` → option 1 | Empty database |
| **New sales data** | `npm run clear-db` → option 2, then seed | Fresh sales, keep products |
| **Interactive choices** | `npm run seed` | Choose from 5 options |
| **Custom timeframe** | `npm run seed` → option 4 | Specify your parameters |

---

## 🔍 Verification After Running Commands

### Check Your React App Should Show:

#### **Dashboard:**
- ✅ Total revenue matching generated amount
- ✅ Sales count matching records created
- ✅ Low stock alerts for realistic items
- ✅ Charts with meaningful data points

#### **Sales Analytics:**
- ✅ Date range covering seeded period
- ✅ Revenue trends with business patterns
- ✅ Top products showing Coca Cola as #1
- ✅ Payment method distribution

#### **Inventory Management:**
- ✅ 10 products in slots A1-D3
- ✅ Varied stock levels (not all full/empty)
- ✅ Color-coded status indicators
- ✅ Professional product images

#### **Product Management:**
- ✅ Complete product catalog
- ✅ Proper categories and pricing
- ✅ SKU codes and slot assignments
- ✅ Active status for all items

This comprehensive reference gives you everything you need to choose the right command for any situation! 🚀



//Push notifications

firebase > Project settings > Messaging > Web Push certificates

generate your Key pair and update you .env and your github secrets


//updates firestore rules
firebase deploy --only firestore:rules
