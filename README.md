# SRI CHENNA KESAVA TRADERS — Dynamic Tax Invoice Generator & Wholesale ERP

A production-grade, full-stack **Dynamic Tax Invoice Generator** and wholesale distribution ERP built for wholesale FMCG and confectionery businesses using the **MERN Stack** (MongoDB, Express.js, React.js, Node.js).

---

## Key Features

1. **Exact PDF Reference Reproduction**:
   - Matches the official wholesale tax invoice layout of **Sri Chenna Kesava Traders**.
   - Outer boxed border, 3-column block (`Bill To`, `Ship To`, `Invoice Details`), bordered line-item table, `Sub Total`, `Grand Total`, `Amount in Words`, `Terms & Conditions`, and authorized signature blocks.
2. **Authoritative Server-Side Tax & GST Recalculations**:
   - GST calculations are strictly performed server-side upon creation and update (client totals are never blindly trusted).
   - Intrastate Supply (AP to AP): Auto-applies CGST + SGST (2.5% each or customized rate).
   - Interstate Supply: Auto-switches to IGST (5.0%).
3. **Atomic Sequential Invoice Numbering**:
   - Utilizes MongoDB counter collections with atomic `$inc` updates (`findOneAndUpdate`) to prevent race conditions or duplicate numbering under concurrent invoicing (`SCKT/2026-27/0001`, `SCKT/2026-27/0002`, ...).
4. **Indian Numbering Currency to Words**:
   - Automated conversion following the Indian numbering system (Crores, Lakhs, Thousands, Rupees, and Paise).
5. **Dual PDF & Instant Print Engine**:
   - **Server-Side PDF Generation**: High-performance vector PDF generated on the fly via `PDFKit` (`GET /api/invoices/:id/pdf`).
   - **Client-Side Pixel-Perfect Print**: Instant zero-latency print dialogue using `@media print` CSS styling.
6. **Cloudinary Asset Storage**:
   - Direct upload of company logo and digital authorized signatory stamp to Cloudinary CDN via Multer memory streaming.
7. **Full CRUD Modules**:
   - **Products / SKUs**: Search, category filters (`Choco`, `Vanila`, `Strawberry`, `Coffee`), pack types (`24-pack`, `Jar`, `Jumbo`, `Pilo`), MRP, and HSN codes.
   - **Customers**: Retail store accounts, billing and delivery addresses with "Same as billing" toggle, GSTIN, and interstate flag.
   - **Invoices**: Search, filter by status (`Draft`, `Sent`, `Paid`, `Overdue`, `Cancelled`), date range, pagination, status patching, and delete protection for paid bills.
   - **Company Profile**: Editable settings, bank account details, 5-point terms and conditions, and invoice prefix.
   - **Dashboard**: Financial overview metrics (This Month Invoiced, Pending Receivables, Invoice Count, Top Selling SKUs).

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, TailwindCSS, Lucide React, Axios, React Router, React Hot Toast, Canvas Confetti |
| **Backend** | Node.js, Express.js, Mongoose ODM, Multer, Cloudinary SDK, PDFKit, bcryptjs, jsonwebtoken, express-rate-limit |
| **Database** | MongoDB Atlas (Cluster 0) |
| **Cloud Storage** | Cloudinary |

---

## Directory Structure

```
d:\invoice\
├── backend\
│   ├── config\
│   │   ├── db.js                 # Mongoose connection with Windows DNS fallback
│   │   └── cloudinary.js         # Cloudinary configuration
│   ├── controllers\
│   │   ├── authController.js     # Register, Login, Me
│   │   ├── companyController.js  # Settings & Cloudinary logo/stamp upload
│   │   ├── productController.js  # Product SKU CRUD & filters
│   │   ├── customerController.js # Customer accounts CRUD & interstate rules
│   │   ├── invoiceController.js  # Atomic invoicing, calculation, PDF streaming
│   │   └── dashboardController.js# Wholesale stats & top SKUs
│   ├── middleware\
│   │   ├── auth.js               # JWT verification & role authorization
│   │   ├── errorMiddleware.js    # Centralized JSON error handler
│   │   └── upload.js             # Multer memory storage
│   ├── models\
│   │   ├── User.js               # Auth & roles (Admin, Staff)
│   │   ├── CompanyProfile.js     # Single-tenant settings & terms
│   │   ├── Product.js            # SKU, packType, MRP, GST %
│   │   ├── Customer.js           # Bill-to, ship-to, GSTIN, interstate
│   │   ├── Invoice.js            # Immutable snapshot, items, tax breakdown
│   │   └── Counter.js            # Atomic sequence counter
│   ├── routes\
│   │   ├── authRoutes.js
│   │   ├── companyRoutes.js
│   │   ├── productRoutes.js
│   │   ├── customerRoutes.js
│   │   ├── invoiceRoutes.js
│   │   └── dashboardRoutes.js
│   ├── utils\
│   │   ├── amountInWords.js      # Indian currency word converter
│   │   ├── gstCalculator.js      # Authoritative recalculation engine
│   │   └── pdfGenerator.js       # PDFKit generator matching invoice layout
│   ├── seed\
│   │   └── seedData.js           # Seeds 16 SKUs, Sri Chenna Kesava Traders, & reference invoice
│   ├── .env                      # Live environment credentials
│   ├── .env.example
│   ├── package.json
│   └── server.js
│
└── frontend\
    ├── src\
    │   ├── api\
    │   │   └── apiClient.js      # Axios instance with JWT interceptors
    │   ├── components\
    │   │   ├── layout\           # Sidebar, Navbar, AppLayout
    │   │   ├── invoice\          # PrintableInvoice matching reference PDF
    │   │   └── common\           # ProtectedRoute
    │   ├── context\
    │   │   └── AuthContext.jsx   # Authentication context
    │   ├── pages\
    │   │   ├── Auth\Login.jsx
    │   │   ├── Auth\Register.jsx
    │   │   ├── Dashboard\Dashboard.jsx
    │   │   ├── Products\ProductList.jsx
    │   │   ├── Customers\CustomerList.jsx
    │   │   ├── Invoices\InvoiceList.jsx
    │   │   ├── Invoices\CreateEditInvoice.jsx   # Dynamic line item builder
    │   │   ├── Invoices\InvoiceDetail.jsx       # Printable view & PDF download
    │   │   └── Settings\CompanySettings.jsx     # Cloudinary upload & company profile
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css             # Tailwind & @media print styles
    ├── vite.config.js            # Server proxy configuration
    ├── tailwind.config.js
    └── package.json
```

---

## Getting Started

### 1. Backend Setup

```bash
cd backend
npm install
```

Ensure `.env` contains your MongoDB and Cloudinary credentials:
```env
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=30d
CLIENT_URL=http://localhost:5173

CLOUDINARY_CLOUD_NAME=fyy14zpp
CLOUDINARY_API_KEY=899988684679524
CLOUDINARY_API_SECRET=AGkz-dWexrIffbOlbvJkaOFkdHU
CLOUDINARY_URL=cloudinary://899988684679524:AGkz-dWexrIffbOlbvJkaOFkdHU@fyy14zpp
```

Seed the database with the **16 confectionery SKUs**, **Sri Chenna Kesava Traders company profile**, and the reference invoice **`SCKT/2026-27/0001`**:
```bash
npm run seed
```

Start the backend API server:
```bash
npm start
# Server will run on http://localhost:5000
```

### 2. Frontend Setup

```bash
cd ../frontend
npm install
npm run dev
# App will run on http://localhost:5173
```

---

## Demo Credentials

- **Email**: `admin@chennakesava.com`
- **Password**: `admin123`
- *(Pre-loaded into the login form for 1-click access)*

---

## Pre-Seeded 16 Product SKUs (from Reference Invoice)

| S.No | SKU Name | Category | Pack Type | MRP (Rs.) | CGST % |
|:---:|:---|:---|:---|:---:|:---:|
| 1 | Choco 24 | Choco | 24-pack | 480.00 | 2.5% |
| 2 | Vanila 24 | Vanila | 24-pack | 480.00 | 2.5% |
| 3 | Strawberry 24 | Strawberry | 24-pack | 480.00 | 2.5% |
| 4 | Coffee 24 | Coffee | 24-pack | 480.00 | 2.5% |
| 5 | Choco Jar | Choco | Jar | 620.00 | 2.5% |
| 6 | Vanila Jar | Vanila | Jar | 620.00 | 2.5% |
| 7 | Strawberry Jar | Strawberry | Jar | 620.00 | 2.5% |
| 8 | Coffee Jar | Coffee | Jar | 620.00 | 2.5% |
| 9 | Choco Jumbo | Choco | Jumbo | 750.00 | 2.5% |
| 10 | Vanila Jumbo | Vanila | Jumbo | 750.00 | 2.5% |
| 11 | Strawberry Jumbo | Strawberry | Jumbo | 750.00 | 2.5% |
| 12 | Coffee Jumbo | Coffee | Jumbo | 750.00 | 2.5% |
| 13 | Choco Pilo | Choco | Pilo | 540.00 | 2.5% |
| 14 | Vanila Pilo | Vanila | Pilo | 540.00 | 2.5% |
| 15 | Strawberry Pilo | Strawberry | Pilo | 540.00 | 2.5% |
| 16 | Coffee Pilo | Coffee | Pilo | 540.00 | 2.5% |

---

## REST API Reference

### Authentication
- `POST /api/auth/register` — Register a new admin/staff user
- `POST /api/auth/login` — Sign in and receive JWT token
- `GET /api/auth/me` — Retrieve current authenticated user profile

### Dashboard
- `GET /api/dashboard/stats` — Retrieve monthly revenue, pending receivables, top SKUs, and recent invoices

### Products / SKUs
- `GET /api/products` — Filter products by category, packType, search, or pagination (`?all=true` for dropdowns)
- `GET /api/products/:id` — Single SKU details
- `POST /api/products` — Create new SKU
- `PUT /api/products/:id` — Update SKU details
- `DELETE /api/products/:id` — Soft-deactivate SKU

### Customers
- `GET /api/customers` — Search and list retail customers
- `GET /api/customers/:id` — Customer detail
- `POST /api/customers` — Create retail customer account
- `PUT /api/customers/:id` — Update customer account
- `DELETE /api/customers/:id` — Soft-deactivate customer

### Invoices
- `GET /api/invoices` — List invoices with pagination, status filters, and customer search
- `GET /api/invoices/:id` — Full invoice document
- `POST /api/invoices` — Generate new tax invoice with atomic numbering and server-side GST
- `PUT /api/invoices/:id` — Edit existing invoice (restricted if Paid)
- `PATCH /api/invoices/:id/status` — Update payment/delivery status (`Draft`, `Sent`, `Paid`, `Overdue`, `Cancelled`)
- `DELETE /api/invoices/:id` — Delete invoice (restricted if Paid)
- `GET /api/invoices/:id/pdf` — Stream generated print-ready PDF

### Company Settings
- `GET /api/settings/company` — Retrieve company settings & bank details
- `PUT /api/settings/company` — Update company settings
- `POST /api/settings/company/upload-image` — Upload company logo or stamp to Cloudinary
