# Haven Hotel Management System

A beginner-friendly academic project using HTML, CSS, JavaScript, Node.js, Express and MySQL.

## Project features

### Customer website
- Browse rooms and services.
- Check room availability by dates and guest count.
- Make a reservation.
- Continue to a separate demo payment page.
- Look up a booking using reservation ID and email.
- Cancel a confirmed booking.
- View the Google Maps location of the real-world reference hotel.

### Admin dashboard
- Separate admin login.
- Dashboard statistics.
- View reservations, payments and guests.
- Update reservation, room and payment statuses.
- Add rooms and services.

## Important notes

- The project is named **Haven Hotel**.
- It uses **Hotel Woodland Deluxe, Paharganj, New Delhi** only as a real-world location/reference for the academic project. Haven Hotel is not affiliated with that hotel.
- The QR shown on the payment page is a demonstration QR, not a real UPI QR. The "Simulate successful payment" button only changes the local project database status. It does not collect or transfer money.
- The admin credentials below are starter credentials. Change them in `.env` before showing or deploying the project.
- The built-in Express session MemoryStore is suitable for a local classroom demo, not production deployment.

## Step 1: Install Node.js

Install the current LTS version of Node.js if it is not already installed.

Open Command Prompt in this project folder and run:

```bash
npm install
```

## Step 2: Configure MySQL

1. Open MySQL Workbench.
2. Open `database/hotel_management.sql`.
3. Run the complete script.
4. It creates the `HotelManagement` database and the five tables if they do not already exist.
5. It adds sample rooms and services only when the same room number/service name is not already present.

If you already have the five tables, do not drop them. Check that their column names match the schema in the SQL file.

## Step 3: Create your .env file

1. Copy `.env.example`.
2. Rename the copy to `.env`.
3. Put your MySQL password after `DB_PASSWORD=`.
4. Set an admin username and password of your choice.

Example:

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=HotelManagement
SESSION_SECRET=make-this-a-long-random-secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourStrongPasswordHere
```

Do not share your `.env` file or upload it to GitHub.

## Step 4: Start the project

In Command Prompt, inside the project folder, run:

```bash
npm start
```

When the terminal says the server is running, open:

- Customer website: http://localhost:3000/
- Admin login: http://localhost:3000/admin-login

Log in using the username and password from your `.env` file.

## Step 5: Test the booking flow

1. Open the customer website.
2. Select check-in and check-out dates.
3. Click **Check availability**.
4. Select one room.
5. Enter guest details and click **Continue to payment**.
6. On the payment page, read the demo payment notice and click **Simulate successful payment**.
7. Return to the customer website and use the reservation ID and email to find the booking.
8. Open the admin dashboard to see the reservation and payment status.

## Step 6: Test admin access

1. Open `http://localhost:3000/admin` in a private/incognito window.
2. You should be redirected to the admin login page.
3. Log in with your `.env` credentials.
4. Try logging out. The admin dashboard should no longer be accessible without logging in again.

## Troubleshooting

### MySQL connection error
- Make sure MySQL Server is running.
- Check `DB_USER`, `DB_PASSWORD`, and `DB_NAME` in `.env`.
- Confirm the database is named `HotelManagement`.

### Port 3000 is already in use
Run this in Command Prompt:

```bat
netstat -ano | findstr :3000
```

Find the PID at the end of the matching line. Check it before stopping anything:

```bat
tasklist /FI "PID eq YOUR_PID"
```

If it is an old Node process for this project, stop it:

```bat
taskkill /PID YOUR_PID /F
```

Then run `npm start` again.

### Page opens but rooms/services do not load
- Check that the server terminal has no SQL errors.
- Confirm that sample rows exist in `rooms` and `services`.
- Open `http://localhost:3000/api/health` to check that the server is responding.

## Suggested viva explanation

"Haven Hotel is a web-based hotel management system developed using HTML, CSS, JavaScript, Node.js, Express and MySQL. It has a public customer website and a separate protected admin dashboard. Customers can view rooms, check date-wise availability, create reservations, view their booking and use a simulated payment flow. The admin can manage rooms, services, reservations and payment statuses. MySQL stores the records, and Express exposes REST APIs. The booking operation uses a database transaction and checks overlapping reservations to reduce the chance of double booking."

## Project structure

```text
Haven_Hotel_Complete_Project/
├── admin/
│   ├── index.html
│   ├── admin.css
│   └── admin.js
├── database/
│   └── hotel_management.sql
├── public/
│   ├── customer.html
│   ├── customer.css
│   ├── customer.js
│   ├── payment.html
│   ├── payment.css
│   ├── payment.js
│   ├── admin-login.html
│   ├── admin-login.css
│   └── admin-login.js
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── server.js
```
