# Technical Requirements Document

## Product Name
UPI QR Auto Invoice Generator for Small Shops

## Related Document
- PRD: `PRD.md`

## Purpose
This document defines the technical plan for building an India-only system that generates and sends invoices for small shops using UPI QR payments. It translates the product requirements into architecture, APIs, data storage, integrations, validation rules, security needs, and implementation phases.

## Technical Goals
- Generate an invoice after a verified UPI QR payment.
- Support static UPI QR with manual transaction reference entry for the first MVP.
- Support dynamic UPI QR with provider callback/webhook for automation.
- Prevent duplicate invoices for the same UPI transaction reference.
- Store customer, payment, invoice, and delivery records.
- Provide invoice PDF download and customer invoice links.
- Support manual invoice generation for MVP testing.
- Support UPI provider webhook integration for production use.
- Support email and WhatsApp invoice delivery.

## Recommended MVP Stack

### Frontend
- React or plain HTML/CSS/JavaScript for prototype.
- React is recommended if the dashboard will grow.

### Backend
- Node.js with Express.
- REST API for shop dashboard, invoice generation, and webhooks.

### Database
- SQLite for local prototype.
- PostgreSQL for production.

### PDF Generation
- Server-side HTML invoice template converted to PDF.
- Recommended libraries:
  - Puppeteer for high-quality PDF rendering.
  - PDFKit for lighter server-side PDF generation.

### UPI Payment Provider
- MVP: existing static UPI QR with manual transaction reference entry.
- First automation integration: one India UPI provider such as Razorpay, Cashfree, PhonePe, Paytm, or BharatPe-style merchant APIs.
- Non-MVP: cards, wallets, net banking, and international payments.

### Delivery Providers
- Email: Resend, SendGrid, or SMTP.
- WhatsApp MVP: generated WhatsApp share URL.
- WhatsApp production: WhatsApp Business API.
- SMS optional: Twilio, MSG91, or other local provider.

## System Architecture

### Static UPI QR MVP

```text
Customer scans shop UPI QR
  -> Customer pays through UPI app
  -> Shop staff enters UPI reference number and amount
  -> Backend creates payment record
  -> Backend generates invoice
  -> Backend generates PDF/link
  -> Staff sends invoice by WhatsApp or email
```

### Dynamic UPI QR Automation

```text
Shop creates bill
  -> Backend creates dynamic UPI QR session
  -> Customer scans and pays
  -> UPI provider sends success callback/webhook
  -> Backend verifies provider signature
  -> Backend creates payment record
  -> Backend generates invoice
  -> Backend sends invoice link/PDF
```

## Main Components

### 1. Shop Dashboard
Responsibilities:
- Manage shop profile.
- Upload or configure static UPI QR.
- Store shop UPI ID, also known as VPA.
- Create manual invoices.
- View invoice history.
- Search invoices.
- Download invoice PDF.
- Resend invoice link.

### 2. Backend API
Responsibilities:
- Authenticate shop users.
- Store business and invoice data.
- Receive payment webhooks.
- Verify payment authenticity.
- Generate invoices.
- Generate PDF files.
- Trigger delivery messages.

### 3. UPI Webhook Service
Responsibilities:
- Accept UPI provider webhook events for dynamic QR payments.
- Verify webhook signature.
- Process only successful UPI payment events.
- Reject duplicate UPI transaction references.
- Log all webhook attempts.

### 4. Invoice Service
Responsibilities:
- Generate invoice number.
- Calculate subtotal, tax, discount, and total.
- Create invoice record.
- Create public invoice token.
- Render invoice HTML and PDF.

### 5. Delivery Service
Responsibilities:
- Send invoice email.
- Generate WhatsApp message link.
- Track delivery status.
- Support resend attempts.

## Database Schema

### shops
```sql
CREATE TABLE shops (
  id UUID PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  logo_url TEXT,
  address TEXT NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(150) NOT NULL,
  gstin VARCHAR(30),
  upi_vpa VARCHAR(120),
  static_upi_qr_url TEXT,
  invoice_prefix VARCHAR(20) NOT NULL,
  default_tax_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'owner',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### customers
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id),
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(150),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### payments
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id),
  customer_id UUID REFERENCES customers(id),
  provider_name VARCHAR(50) NOT NULL DEFAULT 'manual_upi',
  upi_transaction_id VARCHAR(120) NOT NULL,
  upi_vpa VARCHAR(120),
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  payment_method VARCHAR(50) NOT NULL DEFAULT 'UPI',
  status VARCHAR(30) NOT NULL,
  paid_at TIMESTAMP,
  raw_provider_payload JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (provider_name, upi_transaction_id)
);
```

### upi_qr_sessions
```sql
CREATE TABLE upi_qr_sessions (
  id UUID PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id),
  customer_id UUID REFERENCES customers(id),
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  provider_name VARCHAR(50) NOT NULL,
  provider_order_id VARCHAR(150),
  qr_payload TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'created',
  expires_at TIMESTAMP,
  paid_payment_id UUID REFERENCES payments(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (provider_name, provider_order_id)
);
```

### invoices
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  payment_id UUID REFERENCES payments(id),
  invoice_number VARCHAR(80) NOT NULL UNIQUE,
  public_token VARCHAR(120) NOT NULL UNIQUE,
  subtotal DECIMAL(12,2) NOT NULL,
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'generated',
  pdf_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### invoice_items
```sql
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  name VARCHAR(180) NOT NULL,
  description TEXT,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL
);
```

### invoice_deliveries
```sql
CREATE TABLE invoice_deliveries (
  id UUID PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  channel VARCHAR(30) NOT NULL,
  recipient VARCHAR(150) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  provider_message_id VARCHAR(150),
  error_message TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### webhook_events
```sql
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY,
  provider_name VARCHAR(50) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  upi_transaction_id VARCHAR(120),
  signature_valid BOOLEAN NOT NULL DEFAULT false,
  processed BOOLEAN NOT NULL DEFAULT false,
  payload JSONB NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## API Requirements

### Auth APIs

#### POST /api/auth/register
Creates a shop owner account.

Required body:
```json
{
  "shopName": "AV Shop",
  "ownerName": "Arnav",
  "email": "owner@example.com",
  "password": "secure-password"
}
```

#### POST /api/auth/login
Returns an auth token for dashboard access.

### Shop APIs

#### GET /api/shop
Returns current shop profile.

#### PUT /api/shop
Updates shop profile, invoice prefix, tax settings, UPI ID, static UPI QR image, and contact details.

### Customer APIs

#### POST /api/customers
Creates or updates a customer.

#### GET /api/customers
Returns customer list with search support.

### Manual Invoice APIs

#### POST /api/invoices
Creates an invoice manually.

Required body:
```json
{
  "customer": {
    "name": "Customer Name",
    "phone": "9999999999",
    "email": "customer@example.com"
  },
  "payment": {
    "providerName": "manual_upi",
    "upiTransactionId": "UPI1234567890",
    "upiVpa": "shopname@upi",
    "amount": 1180,
    "paymentMethod": "UPI",
    "paidAt": "2026-06-09T10:30:00+05:30"
  },
  "items": [
    {
      "name": "Product Name",
      "quantity": 1,
      "unitPrice": 1000,
      "taxRate": 18
    }
  ],
  "discountAmount": 0
}
```

Response:
```json
{
  "invoiceId": "uuid",
  "invoiceNumber": "AVSHOP-20260609-0001",
  "publicInvoiceUrl": "https://example.com/invoice/token",
  "pdfUrl": "https://example.com/invoice/token/pdf"
}
```

#### GET /api/invoices
Returns invoice list.

Query parameters:
- `search`
- `status`
- `fromDate`
- `toDate`
- `page`
- `limit`

#### GET /api/invoices/:id
Returns invoice details for dashboard users.

#### POST /api/invoices/:id/resend
Resends invoice through selected channel.

Required body:
```json
{
  "channel": "email"
}
```

### Public Customer Invoice APIs

#### GET /invoice/:publicToken
Shows public invoice page.

#### GET /invoice/:publicToken/pdf
Downloads invoice PDF.

### UPI QR APIs

#### GET /api/upi/static-qr
Returns the shop's configured static UPI QR image and UPI ID.

#### POST /api/upi/qr-sessions
Creates a dynamic UPI QR payment session for automation.

Required body:
```json
{
  "customer": {
    "name": "Customer Name",
    "phone": "9999999999"
  },
  "amount": 1180,
  "items": [
    {
      "name": "Product Name",
      "quantity": 1,
      "unitPrice": 1000,
      "taxRate": 18
    }
  ]
}
```

Response:
```json
{
  "qrSessionId": "uuid",
  "qrPayload": "upi://pay?...",
  "status": "created",
  "expiresAt": "2026-06-09T10:45:00+05:30"
}
```

### UPI Provider Webhook APIs

#### POST /api/webhooks/upi/:providerName
Receives successful UPI payment events from the configured dynamic QR provider.

Processing requirements:
- Read raw request body.
- Verify provider signature.
- Store webhook event.
- Process only successful UPI payment events.
- Create or update payment record.
- Generate invoice if no invoice exists for UPI transaction reference.
- Trigger delivery service.

## Invoice Generation Rules

### Invoice Number
Format:

```text
{SHOP_PREFIX}-{YYYYMMDD}-{SEQUENCE}
```

Example:

```text
AVSHOP-20260609-0001
```

Rules:
- Sequence resets daily per shop.
- Sequence must be generated transactionally to avoid duplicates.
- Invoice number must be immutable after creation.

### Tax Calculation
For each item:

```text
line_total = quantity * unit_price
item_tax = line_total * tax_rate / 100
item_total = line_total + item_tax
```

Invoice totals:

```text
subtotal = sum(line_total)
tax_amount = sum(item_tax)
total_amount = subtotal + tax_amount - discount_amount
```

Validation:
- Total amount should match UPI payment amount for automatic payment invoices.
- If mismatch occurs, mark invoice as `review_required`.

### Duplicate Prevention
- `payments.provider_name + payments.upi_transaction_id` must be unique.
- Before creating an invoice, check whether an invoice already exists for `payment_id`.
- UPI provider callback/webhook processing must be idempotent.

## UPI Payment Processing

### Static UPI QR MVP Processing
1. Customer scans the shop's existing UPI QR.
2. Customer pays through any UPI app.
3. Staff confirms payment on the shop's UPI app or bank notification.
4. Staff enters the UPI transaction reference, amount, and customer details.
5. Backend validates that the transaction reference is not already used.
6. Backend creates payment and invoice records.
7. Backend creates PDF/link and prepares WhatsApp/email delivery.

### Dynamic UPI Provider Signature Verification
The backend must verify webhook signature using the provider webhook secret.

Expected logic:
```text
expected_signature = HMAC_SHA256(raw_body, webhook_secret)
compare expected_signature with provider signature header
```

Reject webhook if signature is invalid.

### Dynamic UPI QR Webhook Flow
1. Receive webhook request.
2. Store raw payload in `webhook_events`.
3. Verify signature.
4. If invalid, mark event as unprocessed and return 400.
5. If event is not successful UPI payment, store event and return 200.
6. Extract UPI transaction reference, amount, customer metadata, and QR session/order metadata.
7. Upsert customer.
8. Insert payment if UPI transaction reference is new.
9. Generate invoice.
10. Generate PDF.
11. Send invoice delivery.
12. Mark webhook event as processed.

## Delivery Requirements

### Email
Email should include:
- Shop name
- Invoice number
- Total amount
- Payment date
- Invoice link
- PDF attachment or download link

### WhatsApp MVP
Generate a WhatsApp share URL:

```text
https://wa.me/{customer_phone}?text={encoded_message}
```

Message should include:
- Thank you note
- Shop name
- Invoice number
- Total amount
- Invoice link

### Delivery Status
Possible statuses:
- `pending`
- `sent`
- `failed`
- `opened`, optional for tracked links

## Security Requirements

### Authentication
- Dashboard APIs require authentication.
- Use JWT or secure cookie sessions.
- Passwords must be hashed using bcrypt or Argon2.

### Authorization
- Users can access only invoices and customers belonging to their own shop.
- Public invoice URLs should only expose invoice data needed by the customer.

### Payment Security
- Verify UPI provider webhook signatures for dynamic QR payments.
- Do not store bank account numbers or sensitive financial data.
- Store only UPI transaction reference, amount, provider name, method type, and required metadata.

### Public Invoice Links
- Use random tokens with at least 128 bits of entropy.
- Tokens must not be predictable.
- Optional: allow shops to expire links.

### Environment Variables
Required environment variables:

```text
DATABASE_URL=
JWT_SECRET=
UPI_PROVIDER_NAME=
UPI_PROVIDER_KEY_ID=
UPI_PROVIDER_KEY_SECRET=
UPI_PROVIDER_WEBHOOK_SECRET=
EMAIL_PROVIDER_API_KEY=
APP_BASE_URL=
```

## Error Handling

### Payment Mismatch
If payment amount does not match invoice total:
- Create invoice with status `review_required`.
- Do not auto-send invoice until staff reviews it.
- Show warning in dashboard.

### Duplicate UPI Reference or Webhook
If the same UPI transaction reference or webhook is received again:
- Do not create a second invoice.
- Return existing invoice reference.
- Mark webhook as processed.

### Delivery Failure
If email/SMS/WhatsApp sending fails:
- Keep invoice as generated.
- Mark delivery status as `failed`.
- Allow manual resend from dashboard.

### PDF Failure
If PDF generation fails:
- Keep invoice record.
- Show invoice page link.
- Retry PDF generation in background.

## Logging and Monitoring
- Log webhook event ID, UPI transaction reference, and processing result.
- Log invoice generation errors.
- Log delivery provider errors.
- Avoid logging sensitive customer or payment data unnecessarily.
- Track webhook processing time.
- Track invoice generation time.

## Performance Requirements
- Invoice should be generated within 5 seconds of payment confirmation.
- Dashboard invoice list should load within 2 seconds for 1,000 invoices.
- Webhook endpoint should respond within 3 seconds when possible.
- Long-running PDF or delivery tasks may run in background jobs.

## Background Jobs
Recommended background jobs:
- Generate invoice PDF.
- Send email invoice.
- Retry failed delivery.
- Clean old unprocessed webhook logs after retention period.

For MVP, background jobs can be replaced by synchronous processing if traffic is low.

## Testing Requirements

### Unit Tests
- Tax calculation.
- Invoice number generation.
- Duplicate UPI transaction prevention.
- UPI provider webhook signature verification.

### Integration Tests
- Static UPI manual invoice creation.
- Dynamic UPI webhook to invoice generation.
- PDF generation.
- Email/WhatsApp delivery record creation.

### Security Tests
- Invalid webhook signature rejected.
- Shop user cannot access another shop's invoice.
- Public token cannot expose private dashboard data.

### Manual QA Checklist
- Create shop profile.
- Add UPI ID and static UPI QR.
- Generate manual UPI invoice.
- Download PDF.
- Send invoice by WhatsApp link.
- Search invoice history.
- Enter duplicate UPI transaction reference and confirm no duplicate invoice is created.
- Send duplicate dynamic UPI webhook and confirm no duplicate invoice is created.
- Test failed email delivery.

## Implementation Phases

### Phase 1: Local MVP
- Create backend API.
- Add shop, customer, payment, invoice, invoice item, and delivery tables.
- Add UPI ID and static UPI QR setup.
- Add manual UPI transaction reference invoice creation.
- Add invoice preview page.
- Add PDF download.
- Add WhatsApp share link.
- Add invoice history page.

### Phase 2: Dynamic UPI QR Automation
- Add dynamic UPI QR session table and API.
- Add one India UPI provider webhook endpoint.
- Verify provider webhook signature.
- Save webhook events.
- Generate invoice automatically after successful UPI payment.
- Prevent duplicate invoices.

### Phase 3: Delivery Automation
- Add email provider.
- Send invoice email automatically.
- Store delivery attempts.
- Add resend invoice button.

### Phase 4: Production Hardening
- Add authentication and authorization.
- Add PostgreSQL deployment.
- Add monitoring.
- Add retry jobs.
- Add secure public invoice tokens.
- Add rate limits.

## Deployment Requirements
- Backend and frontend can be deployed together or separately.
- Recommended hosting:
  - Backend: Render, Railway, Fly.io, or AWS.
  - Database: Managed PostgreSQL.
  - File/PDF storage: S3-compatible storage or local storage for prototype.
- Production must use HTTPS.
- Payment webhook URL must be publicly reachable.

## Risks
- Static UPI QR cannot generate a fully automatic invoice unless staff enters/confirms the transaction reference.
- UPI provider webhook format differs by provider.
- WhatsApp automated sending requires approved WhatsApp Business API access.
- GST/tax invoice compliance must be verified by a finance/legal expert.
- Duplicate UPI events can create billing issues if idempotency is not implemented.
- PDF generation can be slow if done synchronously under high traffic.

## Open Technical Questions
- Should first implementation use SQLite or PostgreSQL?
- Should invoice PDF files be stored permanently or generated on demand?
- Should customer invoice links expire?
- Should the system support multiple branches per shop?
- Should the MVP include login, or should it start as a single-shop local prototype?
- Which dynamic UPI QR provider should be integrated first?

## Recommended First Build
Start with a single-shop web MVP:
- Static UPI QR display/configuration.
- Manual UPI transaction reference entry.
- Invoice generation.
- Invoice preview.
- PDF download.
- WhatsApp share link.
- Local invoice history.

After the MVP works, add dynamic UPI QR automation through one India UPI provider so invoices are created immediately after real UPI payments.
