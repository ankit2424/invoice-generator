# Product Requirements Document

## Product Name
UPI QR Auto Invoice Generator for Small Shops

## Overview
This product helps small shops in India generate invoices from UPI QR payments. When a customer pays using a UPI QR code, the shop can generate a tax-ready invoice, save it in invoice history, and send it to the customer through WhatsApp, SMS, or email.

The goal is to reduce manual billing work for small shop owners, avoid invoice mistakes, and give customers instant payment proof without needing a full POS or accounting system.

## UPI QR Payment Approach
There are two possible UPI QR flows:

### Static UPI QR MVP
A shop uses its existing static UPI QR code. After the customer pays, shop staff enters or confirms the UPI transaction reference number and amount. The system then generates the invoice.

This is the fastest MVP because it does not require direct bank or UPI provider integration.

### Dynamic UPI QR Automation
The system generates a payment-specific UPI QR code for each bill. After the customer pays, a payment provider sends confirmation to the backend. The system automatically generates and sends the invoice.

This is required for fully automatic invoice generation without manual confirmation.

## Problem Statement
Many small and medium shops accept UPI QR payments but still create invoices manually. This causes delays, missed invoices, wrong customer details, and extra work during busy hours. Customers also often ask for proof of purchase after payment.

## Target Users
- Small retail shop owners in India
- Kirana stores
- Food stalls and cafes
- Salons and local service shops
- Cashiers and billing staff
- Customers paying through UPI

## Goals
- Generate invoices from UPI QR payments.
- Support manual UPI transaction confirmation for the first MVP.
- Support automatic invoice generation through dynamic UPI QR in a later phase.
- Send invoices to customers with minimum manual work.
- Maintain a searchable invoice history for the shop.
- Make billing simple enough for small shop staff to use during busy hours.

## Non-Goals
- Full accounting software in the MVP.
- Inventory management in the MVP.
- GST filing automation in the MVP.
- Card, wallet, net banking, or international payment support in the MVP.
- Multi-country tax support.
- Direct bank statement reconciliation in the MVP.

## MVP Features

### 1. Shop Account Setup
Shop owners can create a business profile with:
- Shop name
- Logo
- Address
- Phone number
- Email
- GSTIN or tax ID, optional
- Invoice prefix
- Default tax rate
- UPI ID, also known as VPA
- Static UPI QR image, optional

### 2. Payment Confirmation
The system should support payment confirmation through:
- Manual UPI transaction reference entry for MVP
- Static UPI QR payment confirmation by shop staff
- Dynamic UPI QR webhook or callback for automation

For the production version, the first payment integration should support UPI QR payments in India through a provider such as Razorpay, Cashfree, PhonePe, Paytm, or BharatPe-style merchant payment APIs.

### 3. Automatic Invoice Generation
After successful payment, the system generates an invoice containing:
- Invoice number
- UPI transaction reference ID
- Date and time
- Shop details
- Customer name
- Customer phone/email
- Item or service details
- Quantity
- Amount
- Tax
- Discount, optional
- Total paid amount
- Payment method as UPI
- Invoice status

### 4. Invoice Delivery
The system sends the invoice to the customer through:
- Email
- WhatsApp share link
- SMS link, optional

For MVP, WhatsApp and email links can be generated even if automated sending is not yet connected.

### 5. Invoice History Dashboard
Shop users can view:
- All invoices
- Customer name
- Payment amount
- Payment status
- Invoice date
- Delivery status

Users can search invoices by:
- Invoice number
- Customer phone
- Customer email
- Transaction ID

### 6. Invoice Download
Shop users and customers can download invoices as PDF.

### 7. Customer Invoice Page
Each invoice should have a public or secure link where the customer can:
- View invoice details
- Download PDF
- Contact shop if there is an issue

## User Flow

### Shop Owner Setup Flow
1. Shop owner creates account.
2. Shop owner enters business details.
3. Shop owner adds UPI ID and static UPI QR image.
4. Shop owner chooses manual UPI confirmation or dynamic UPI QR automation.
5. Shop owner configures invoice format and tax settings.

### Payment to Invoice Flow
1. Customer scans the shop's UPI QR code and pays.
2. For static QR MVP, shop staff enters the UPI transaction reference and amount.
3. For dynamic QR automation, payment provider sends successful UPI payment event to the system.
4. System verifies or records the payment status.
5. System generates an invoice.
6. System stores invoice in shop dashboard.
7. System sends invoice link or PDF to the customer.
8. Customer receives and views/downloads invoice.

### Manual MVP Flow
1. Shop staff enters customer and payment details.
2. Staff enters the UPI transaction reference number.
3. Staff clicks "Generate Invoice".
4. System creates invoice instantly.
5. Staff sends it via WhatsApp/email link.

## Functional Requirements
- The system must create a unique invoice number for every successful payment.
- The system must avoid duplicate invoices for the same UPI transaction reference ID.
- The system must store invoice records permanently unless deleted by an admin.
- The system must allow shop users to resend invoice links.
- The system must show whether an invoice was sent successfully.
- The system must allow invoice PDF download.
- The system must validate required customer and payment details.
- The system must support tax calculation.

## UPI Provider Callback Requirements
- Accept webhook events from UPI payment providers when dynamic UPI QR is used.
- Verify webhook signature before processing.
- Process only successful UPI payment events.
- Ignore failed, pending, or duplicate payment events.
- Match payment details with order/customer information.
- Log webhook events for debugging.

For static UPI QR MVP, webhook support is not required because the shop staff confirms payment manually.

## Invoice Number Format
Recommended format:

```text
SHOPPREFIX-YYYYMMDD-0001
```

Example:

```text
AVSHOP-20260609-0001
```

## Data Model

### Shop
- id
- name
- logo_url
- address
- phone
- email
- gstin
- invoice_prefix
- default_tax_rate
- created_at

### Customer
- id
- name
- phone
- email
- created_at

### Payment
- id
- provider_name
- upi_transaction_id
- upi_vpa
- amount
- currency, default INR
- payment_method, always UPI for MVP
- status
- paid_at
- raw_provider_payload

### Invoice
- id
- invoice_number
- shop_id
- customer_id
- payment_id
- subtotal
- tax_amount
- discount_amount
- total_amount
- status
- pdf_url
- public_invoice_url
- sent_email_status
- sent_sms_status
- sent_whatsapp_status
- created_at

### Invoice Item
- id
- invoice_id
- name
- description
- quantity
- unit_price
- tax_rate
- total

## Success Metrics
- Invoice generated within 5 seconds after payment confirmation.
- 95% or more successful invoice deliveries.
- Reduction in manual invoice creation by shop staff.
- Less than 1% duplicate or incorrect invoices.
- At least 30% of customers open invoice links.

## Security Requirements
- Payment webhook signatures must be verified.
- Customer invoice links should use secure random tokens.
- Sensitive payment data must not be stored unless required.
- Admin access must be protected by authentication.
- Customer data must be handled according to applicable privacy laws.

## Compliance Considerations
- GST/tax invoice rules may vary by Indian business type and turnover.
- Invoice format should support GSTIN, tax breakdown, and business address.
- The system should allow shops to update tax settings.
- Legal compliance should be reviewed before production launch.

## MVP Tech Recommendation
- Frontend: HTML/CSS/JavaScript or React
- Backend: Node.js/Express or Python/FastAPI
- Database: PostgreSQL or SQLite for prototype
- PDF generation: Puppeteer, jsPDF, or server-side HTML-to-PDF
- UPI MVP: static UPI QR with manual transaction reference entry
- UPI automation: Razorpay, Cashfree, PhonePe, Paytm, or another India UPI provider
- Email: SendGrid, Resend, or SMTP, optional for MVP
- WhatsApp: generated WhatsApp share link for MVP, WhatsApp Business API later

## MVP Delivery Plan

### Phase 1: Prototype
- Static UPI QR setup
- Manual UPI transaction reference entry form
- Invoice generation
- Invoice preview
- PDF download
- WhatsApp/email sharing links
- Invoice history stored locally or in database

### Phase 2: Dynamic UPI QR Integration
- Add dynamic UPI QR generation
- Connect one India UPI payment provider
- Add webhook endpoint
- Verify successful UPI payments
- Generate invoices automatically
- Prevent duplicate invoices

### Phase 3: Automated Delivery
- Add email sending
- Add SMS or WhatsApp Business API
- Track delivery status
- Add resend feature

### Phase 4: Business Dashboard
- Search and filter invoices
- Customer records
- Shop settings
- Tax settings
- Export invoice reports

## Open Questions
- Which UPI provider should be integrated first for dynamic QR?
- Should invoices be GST-compliant from day one, or start with simple receipts?
- Should customer delivery be WhatsApp-first, SMS-first, or both?
- Will shop staff enter item details manually, or should the system support quick item presets?
- Should the MVP be a web app, mobile app, or both?

## Initial MVP Scope Recommendation
Build a web app for a single small shop in India. The shop displays its existing static UPI QR code, staff enters the UPI transaction reference after payment, and the system instantly generates an invoice with a WhatsApp share link and PDF download. After this works, add dynamic UPI QR integration so invoices are generated automatically after real UPI payments.
