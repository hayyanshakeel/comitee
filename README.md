# UqbaTrack on Vercel

This is a Next.js starter project for UqbaTrack, configured for deployment on Vercel while using Firebase for authentication and database services.

## Getting Started

1.  **Set up your Git repository** and push the code.
2.  **Create a Firebase project** and enable Authentication (Email/Password) and Firestore.
3.  **Configure Environment Variables on Vercel** as described in detail below.
4.  **Deploy to Vercel** from your Git repository.
5.  **Configure Firestore** with Security Rules and a Database Index as described below.
6.  **Configure a Razorpay Webhook** for online payments.

---

## IMPORTANT: Environment Variables for Vercel

To run and deploy this project, you **must** configure several environment variables in your Vercel project settings. Go to your project on Vercel, then click **Settings > Environment Variables**.

### 1. Firebase Client Keys

These keys allow your application's frontend (the user's browser) to connect to your Firebase project for login and data display.

-   `NEXT_PUBLIC_FIREBASE_API_KEY`
-   `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
-   `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
-   `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
-   `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
-   `NEXT_PUBLIC_FIREBASE_APP_ID`

**How to find these keys:**
1.  Go to your project in the [Firebase Console](https://console.firebase.google.com/).
2.  Click the **gear icon** next to "Project Overview" and select **Project settings**.
3.  In the **General** tab, scroll down to the **"Your apps"** card.
4.  Select your web app (or create one if you haven't).
5.  Under **"SDK setup and configuration"**, select **Config**.
6.  You will see a `firebaseConfig` object containing all the keys you need. Copy the corresponding values.

### 2. Razorpay API Keys & Webhook Secret

These keys enable online payment processing and secure communication from Razorpay to your server.

-   `RAZORPAY_KEY_ID`: Your Razorpay Live Key ID. Used to identify you to Razorpay.
-   `RAZORPAY_KEY_SECRET`: Your Razorpay Live Key Secret. Used to authenticate your server's API calls.
-   `RAZORPAY_WEBHOOK_SECRET`: A secret you create to verify that webhooks are actually coming from Razorpay.

**How to find these keys:**
1.  Log in to your **Razorpay Dashboard**.
2.  Navigate to **Account & Settings** in the bottom left menu.
3.  Go to the **API Keys** tab.
4.  Generate a new set of **Live Keys**.
5.  Copy the `Key Id` and `Key Secret` and add them to Vercel.
6.  Now, go to the **Webhooks** tab (in the same Account & Settings section).
7.  Click **+ Add New Webhook**.
8.  For the **Webhook URL**, enter `https://<YOUR_VERCEL_APP_URL>/api/webhooks/razorpay`. Replace `<YOUR_VERCEL_APP_URL>` with your actual Vercel deployment URL.
9.  Create a strong, unique **Secret** (e.g., using a password generator). This is your `RAZORPAY_WEBHOOK_SECRET`. **Do not** use your API Key Secret here.
10. Under **Active Events**, check the box for `payment.captured`.
11. Click **Create Webhook**.

### 3. Firebase Service Account Key (for Webhooks)

This is a special, secret key that allows your server-side Razorpay webhook (running on Vercel) to securely write payment data back to your Firestore database.

-   `FIREBASE_SERVICE_ACCOUNT_KEY`: The JSON content of your Firebase service account key.

**How to get your service account key:**
1.  Go to your **Firebase Project settings**.
2.  Click on the **Service accounts** tab.
3.  Click the **"Generate new private key"** button. A JSON file will be downloaded.
4.  **Open the JSON file** and copy its **entire contents**.
5.  In your Vercel project settings, create a new environment variable named `FIREBASE_SERVICE_ACCOUNT_KEY` and paste the **entire JSON content** as its value.

---

## IMPORTANT: Firestore Configuration

For the application to function correctly, you **must** configure both Security Rules and a Database Index in Firestore. Without these, you will see errors like "Could not fetch dashboard data" or "Could not fetch user data".

### 1. Firestore Security Rules

These rules protect your data by ensuring that users can only access their own information, while admins have full access. The rules in this project are designed to allow admin pages to query data across all users, which is essential for the dashboard and user management pages.

**How to Deploy Rules:**
1.  Go to your project in the [Firebase Console](https://console.firebase.google.com/).
2.  In the left-hand menu, under the **Build** section, click on **Firestore Database**.
3.  Click on the **Rules** tab at the top of the page.
4.  Open the `firestore.rules` file from this project.
5.  Copy its entire content and paste it into the editor in the Firebase Console, replacing any existing rules.
6.  Click **Publish**.

### 2. Firestore Composite Index (for Admin Pages)

The Admin Dashboard and User Management pages need to search across all user payments at once. This requires a special "composite index" in Firestore. You can create this easily.

**How to Create the Index:**
1.  After deploying your app to Vercel and setting up the security rules, log in as an admin and navigate to the **Admin Dashboard** or the **User Management** page.
2.  Open your browser's **Developer Console** (usually by pressing F12 or right-clicking and selecting "Inspect").
3.  You will likely see a red Firestore error message in the console. This is expected.
4.  This error message will contain a long **URL**. Click this link.
5.  The link will take you to the Firestore index creation page in your Firebase project, with all the necessary settings already filled in for you.
6.  Click the **"Create Index"** button. The index will start building, which may take a few minutes.
7.  Once the index has finished building, refresh your Admin page. The error should be gone, and the data will load correctly.
