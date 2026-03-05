# GauchoGrub

GauchoGrub is a web app built for UCSB students that allows people with unused meal swipes at Ortega Dining Commons to sell or give them to other students instead of letting them go to waste.

The idea is simple: one student orders food using their meal plan, sends the QR code for pickup, and another student picks up the meal at Ortega. No middleman, no extra fees — the seller keeps the full payment.

The goal is to make meal sharing easier while reducing wasted meal swipes.

---

## How it Works

1. A student logs in using their UCSB email.
2. They create a username during onboarding.
3. Sellers can list an Ortega meal they are willing to order.
4. Buyers can claim a listing.
5. The buyer customizes the meal (entrée, side, fruit, dessert).
6. The seller places the order through the dining app.
7. The seller uploads the QR code.
8. The buyer scans the QR code at Ortega and picks up the meal.

---

## Rules / Constraints

To prevent abuse and match Ortega's ordering system:

* A seller can only have **one active listing at a time**
* After completing a listing there is a **90 minute cooldown** before another listing can be created
* Orders must follow the Ortega meal structure:

  * 1 entrée
  * 1 side
  * 1 dessert OR 2 fruits
* Orders can only be created during Ortega hours:

  * 10:00 AM – 3:00 PM
  * 3:00 PM – 8:00 PM
* Ortega is **closed on weekends**, so listings are disabled then

---

## Tech Stack

* **Next.js (App Router)**
* **React + TypeScript**
* **Supabase**

  * Authentication
  * Database
  * Storage (QR code uploads)
* **TailwindCSS**

---

## Running the Project Locally

Clone the repository:

```
git clone https://github.com/Einike/GauchoGrub.git
cd GauchoGrub
```

Install dependencies:

```
npm install
```

Create environment variables:

```
cp .env.local.example .env.local
```

Fill in your Supabase values:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_URL=
```

Apply the database schema:

```
npm run schema:apply
```

Create the storage bucket:

```
npm run storage:setup
```

(Optional) seed test data:

```
npm run seed
```

Run the development server:

```
npm run dev
```

The app will start at:

```
http://localhost:3000
```

---

## Development Test Accounts

You can create test users in the Supabase dashboard:

**Seller**

```
seller_test@ucsb.edu
TestPass123!
```

**Buyer**

```
buyer_test@ucsb.edu
TestPass123!
```

Login page:

```
http://localhost:3000/dev/login
```

---

## Current Status

The core flow currently works:

* Login
* Onboarding (username required)
* Listings
* Claiming meals
* Order customization
* QR code upload
* QR pickup

More improvements and security checks are still being added.

---

## Future Plans

* Seller rating system
* Fraud protection
* In-app notifications
* Payment integration
* Mobile-friendly UI improvements
* Deployment for UCSB student testing

---

## Disclaimer

This project is an independent student-built tool and is not affiliated with UCSB Dining Services.
