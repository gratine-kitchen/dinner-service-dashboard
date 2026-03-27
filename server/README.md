# Kitchen Dashboard Backend

Node.js Express server that fetches orders from Google Sheets and serves them to the kitchen dashboard frontend.

## Setup

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Configure Google Sheets API

#### Option A: Using Service Account (Recommended)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Sheets API
4. Create a service account (Service Accounts → Create Service Account)
5. Create a JSON key for the service account
6. Share your Google Sheet with the service account email (from the JSON key)
7. Add the private key to `.env`:
   ```
   GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
   ```

#### Option B: Using API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Google Sheets API
3. Create an API key
4. Make your Google Sheet publicly readable (or restrict API key)
5. Add to `.env`:
   ```
   GOOGLE_API_KEY=your_api_key
   ```

### 3. Set Environment Variables
Copy `.env.example` to `.env` and fill in:
```bash
cp .env.example .env
```

Then edit `.env` with:
- `GOOGLE_SHEET_ID` - Your sheet ID (already filled)
- Google authentication (API key OR service account)
- `PORT` - Server port (default: 3000)

### 4. Run Locally
```bash
npm install
npm run dev    # with auto-reload (nodemon)
# or
npm start      # standard run
```

Server will start at `http://localhost:3000`

## API Endpoints

### GET `/api/status`
Health check endpoint.
```bash
curl http://localhost:3000/api/status
```

### GET `/api/orders`
Fetch all kitchen orders grouped by booking and course.
```bash
curl http://localhost:3000/api/orders
```

Response format:
```json
{
  "success": true,
  "data": [
    {
      "bookingId": "B-001",
      "guestName": "John Doe",
      "date": "2026-03-24",
      "time": "19:00",
      "numGuests": 4,
      "remarks": "Allergy to nuts",
      "specialRequest": "Early seating",
      "courses": {
        "Starter": [
          {"dish": "Garlic Bread", "qty": 2, "remarks": "Extra garlic", "sent": false},
          ...
        ],
        "Main": [...],
        "Dessert": [...]
      }
    },
    ...
  ]
}
```

## Deployment

### Railway
1. Push code to GitHub
2. Connect GitHub repo to Railway
3. Add environment variables in Railway dashboard
4. Deploy automatically

### Render
1. Push code to GitHub
2. Create new Web Service on Render
3. Connect GitHub repo
4. Add environment variables
5. Deploy

### Other Platforms
Set environment variables and run:
```bash
npm install
npm start
```

## Development

- `npm run dev` - Run with auto-reload
- Check logs for errors
- Verify Google Sheets auth is working with `/api/status`
