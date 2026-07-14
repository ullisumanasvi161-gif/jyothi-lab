# 🔬 Jyothi Lab — Diagnostic Management Portal

A full-stack laboratory management system for **Jyothi Diagnostic Centre, Kurnool** built with React + Node.js + SQLite/PostgreSQL.

---

## ✨ Features

| Module | Description |
|---|---|
| 🏥 **Patient Registration** | UHID generation, Insurance / Corporate / General patients |
| 💳 **Billing Desk** | Bill creation, discounts, GST, cashless billing |
| 📊 **Reports Queue** | Lab test results entry, pathologist sign-off, PDF generation |
| 📁 **Tests & Packages Catalog** | 200+ pre-loaded lab tests with reference ranges |
| 💊 **Payment History** | Full payment audit trail with filters |
| 🏦 **Insurance & Claims** | Cashless billing, claim status tracking |
| 👨‍⚕️ **Digital Signatures** | Doctor/Pathologist signature upload & auto-placement on reports |
| 📱 **WhatsApp Delivery** | Send approved PDF reports to patients via WhatsApp API |
| 🔍 **Barcode Scanner** | Hardware scanner + camera QR support across all modules |
| 📤 **Data Exports** | Excel/CSV export of patients, bills, reports |
| 👥 **Staff Management** | Role-based access control (Admin, Receptionist, Pathologist, etc.) |
| ⚙️ **Settings** | Lab header, letterhead, GST, WhatsApp API configuration |

---

## 🛠️ Tech Stack

**Frontend**
- React 18 + Vite
- Vanilla CSS + Tailwind utility classes
- Lucide React icons
- jsbarcode + html5-qrcode
- Axios

**Backend**
- Node.js + Express
- SQLite (local) / PostgreSQL (production)
- PDFKit (report PDF generation)
- JWT authentication
- Multer (file uploads)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/jyothi-lab.git
cd jyothi-lab
```

### 2. Setup Server
```bash
cd server
cp .env.example .env
# Edit .env with your settings
npm install
npm run dev
```

### 3. Setup Client
```bash
cd client
npm install
npm run dev
```

### 4. Open the app
Visit: **http://localhost:5173**

Default login (after first run):
- Phone: `9999999999`  
- Password: `admin123`

---

## 🔑 Environment Variables

Copy `server/.env.example` to `server/.env` and fill in:

```env
PORT=5000
JWT_SECRET=your_secret_key
DB_DIALECT=sqlite          # or postgres

# WhatsApp Business API (optional — simulation mode if blank)
WHATSAPP_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
PUBLIC_SERVER_URL=http://localhost:5000
```

---

## 📁 Project Structure

```
LAB SOFTWARE/
├── client/               # React frontend (Vite)
│   └── src/
│       ├── pages/        # Route pages
│       ├── components/   # Shared components
│       ├── hooks/        # Custom React hooks
│       ├── services/     # API service layer
│       └── context/      # Auth & Theme context
└── server/               # Node.js backend
    └── src/
        ├── controllers/  # Business logic
        ├── routes/       # Express routes
        ├── middleware/   # Auth & role guards
        ├── utils/        # PDF, WhatsApp, notifications
        └── config/       # DB init & migrations
```

---

## 📄 License

MIT — Built for Jyothi Diagnostic Centre, Kurnool.
