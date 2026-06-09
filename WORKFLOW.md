# Workflow Document

## Product Name
UPI QR Auto Invoice Generator for Small Shops

## Related Documents
- PRD: `PRD.md`
- TRD: `TRD.md`

## Purpose
This document explains the end-to-end workflow for an India-only invoice system for small shops using UPI QR payments. It covers static UPI QR manual confirmation for the MVP and dynamic UPI QR automation for the production version.

## Main Workflow Summary

```text
Shop setup
  -> Customer scans UPI QR
  -> Customer pays through UPI
  -> Staff confirms payment or provider sends callback
  -> System generates invoice
  -> System sends invoice to customer
  -> Shop can view invoice history
```

## Actors

### Shop Owner
Sets up business details, invoice settings, tax rates, UPI ID, and static UPI QR.

### Shop Staff
Creates manual invoices, views payment records, checks invoice history, and resends invoices when needed.

### Customer
Pays through UPI and receives invoice through WhatsApp, SMS, email, or invoice link.

### UPI Payment Provider
For dynamic UPI QR automation, processes the UPI payment and sends payment success callback/webhook to the system.

### System
Verifies payment, creates invoice, generates PDF, stores records, and sends invoice to customer.

## Workflow 1: Shop Setup

### Goal
Prepare the shop account so invoices can be generated correctly.

### Steps
1. Shop owner creates an account.
2. Shop owner enters business details:
   - Shop name
   - Address
   - Phone number
   - Email
   - GSTIN or tax ID
   - Logo, optional
3. Shop owner sets invoice configuration:
   - Invoice prefix
   - Default tax rate
   - Currency
4. Shop owner adds UPI configuration:
   - UPI ID, also known as VPA
   - Static UPI QR image
5. Shop owner chooses static UPI QR MVP or dynamic UPI QR automation.
6. System stores shop settings.
7. Shop is ready to generate invoices.

### Output
- Shop profile created.
- Invoice settings saved.
- Static UPI QR ready or dynamic UPI provider connected.

## Workflow 2: Static UPI QR MVP Invoice Generation

### Goal
Allow shop staff to generate invoices after customers pay using the shop's existing UPI QR code.

### Steps
1. Shop staff opens the dashboard.
2. Staff clicks "Create Invoice".
3. Staff enters customer details:
   - Name
   - Phone number
   - Email, optional
4. Customer scans the shop's UPI QR and pays.
5. Staff confirms the payment in the shop's UPI app or bank notification.
6. Staff enters UPI payment details:
   - UPI transaction reference ID
   - Paid amount
   - Payment date
7. Staff adds item details:
   - Item name
   - Quantity
   - Unit price
   - Tax rate
   - Discount, optional
8. System validates required data.
9. System checks that the UPI transaction reference was not already used.
10. System calculates subtotal, tax, discount, and total.
11. System creates invoice number.
12. System saves invoice.
13. System shows invoice preview.
14. Staff downloads PDF or sends invoice link.

### Output
- Invoice generated.
- Invoice available in dashboard history.
- Customer can receive invoice link or PDF.

## Workflow 3: Dynamic UPI QR Automatic Invoice

### Goal
Generate and send invoice automatically after successful UPI QR payment.

### Steps
1. Shop staff creates a bill in the dashboard.
2. Backend creates a dynamic UPI QR payment session.
3. Customer scans the dynamic UPI QR and pays.
4. UPI provider sends payment success callback/webhook to backend.
5. Backend receives callback/webhook request.
6. Backend verifies provider signature.
7. Backend checks payment status.
8. If payment is successful, backend extracts:
   - UPI transaction reference ID
   - Amount
   - Payment method as UPI
   - Customer details
   - Order or item details
9. Backend checks if UPI transaction reference already exists.
10. If transaction is new, backend creates payment record.
11. Backend creates or updates customer record.
12. Backend generates invoice number.
13. Backend calculates invoice totals.
14. Backend creates invoice record.
15. Backend generates invoice PDF or invoice link.
16. Backend sends invoice to customer.
17. Backend stores delivery status.
18. Shop dashboard shows the new invoice.

### Output
- Payment saved.
- Invoice generated.
- Invoice sent to customer.
- Invoice visible in shop dashboard.

## Workflow 4: Customer Invoice Delivery

### Goal
Send the generated invoice to the customer quickly.

### Email Flow
1. System prepares invoice email.
2. Email includes:
   - Invoice number
   - Shop name
   - Total amount
   - Invoice link
   - PDF attachment or download link
3. Email provider sends message.
4. System stores delivery status as `sent` or `failed`.

### WhatsApp MVP Flow
1. System creates WhatsApp share link.
2. Message includes:
   - Thank you note
   - Shop name
   - Invoice number
   - Total amount
   - Invoice link
3. Staff opens link and sends message to customer.

### WhatsApp Production Flow
1. System sends message through WhatsApp Business API.
2. Provider returns delivery response.
3. System stores delivery status.

### SMS Flow
1. System sends short invoice link by SMS.
2. SMS provider returns delivery response.
3. System stores delivery status.

## Workflow 5: Invoice History and Search

### Goal
Help shop staff find and manage past invoices.

### Steps
1. Staff opens invoice history dashboard.
2. System displays invoice list with:
   - Invoice number
   - Customer name
   - Amount
   - Payment status
   - Delivery status
   - Invoice date
3. Staff searches by:
   - Invoice number
   - Customer phone
   - Customer email
   - Transaction ID
4. Staff opens invoice details.
5. Staff can download PDF, copy invoice link, or resend invoice.

### Output
- Staff can quickly find and manage invoices.

## Workflow 6: Resend Invoice

### Goal
Allow shop staff to resend an invoice if the customer did not receive it.

### Steps
1. Staff opens invoice details.
2. Staff clicks "Resend".
3. Staff selects delivery channel:
   - Email
   - WhatsApp
   - SMS
4. System sends or prepares delivery.
5. System records delivery attempt.
6. Dashboard updates delivery status.

### Output
- Invoice resent.
- Delivery attempt stored for tracking.

## Workflow 7: Duplicate UPI Payment Handling

### Goal
Prevent duplicate invoices when the same UPI transaction reference is entered twice or the UPI provider sends the same callback more than once.

### Steps
1. Backend receives manual UPI entry or dynamic UPI callback.
2. Backend verifies provider signature when using dynamic QR.
3. Backend checks `provider_name` and `upi_transaction_id`.
4. If UPI transaction already exists, backend checks for existing invoice.
5. If invoice already exists, backend returns existing invoice reference.
6. System does not create a second invoice.
7. Callback event is marked as processed when applicable.

### Output
- No duplicate invoice is created.
- Existing invoice remains linked to the payment.

## Workflow 8: Payment Amount Mismatch

### Goal
Prevent incorrect invoices when payment amount and invoice total do not match.

### Steps
1. System calculates invoice total from item details.
2. System compares calculated total with payment amount.
3. If both match, invoice status becomes `generated`.
4. If mismatch exists, invoice status becomes `review_required`.
5. System shows warning in dashboard.
6. Staff reviews and fixes invoice before sending.

### Output
- Incorrect invoices are not automatically sent.

## Workflow 9: Failed Delivery

### Goal
Handle failed email, SMS, or WhatsApp delivery.

### Steps
1. System tries to send invoice.
2. Delivery provider returns failure or timeout.
3. System marks delivery status as `failed`.
4. System stores error message.
5. Dashboard shows failed delivery.
6. Staff can retry using resend workflow.

### Output
- Invoice remains available.
- Staff can retry delivery manually.

## Invoice Statuses

```text
draft
generated
sent
review_required
cancelled
```

## Payment Statuses

```text
pending
successful
failed
refunded
```

## Delivery Statuses

```text
pending
sent
failed
opened
```

## Recommended MVP Workflow

For the first build, use this simple workflow:

```text
Shop displays existing static UPI QR
  -> Customer pays through UPI
  -> Staff confirms payment
  -> Staff enters UPI reference and customer details
  -> System generates invoice
  -> Staff previews invoice
  -> Staff downloads PDF
  -> Staff sends WhatsApp/email invoice link
  -> Invoice appears in history
```

After this works, add the dynamic UPI QR callback workflow.

## Production Workflow

For production, use this workflow:

```text
Customer pays through dynamic UPI QR
  -> UPI provider sends callback/webhook
  -> Backend verifies callback/webhook
  -> Backend creates payment record
  -> Backend generates invoice
  -> Backend sends invoice automatically
  -> Shop dashboard updates invoice status
```

## Workflow Success Criteria
- Invoice is generated within 5 seconds after successful payment.
- Duplicate payment webhooks do not create duplicate invoices.
- Customer receives invoice link or PDF.
- Shop staff can search invoice history.
- Failed delivery can be retried.
- Payment mismatch is flagged before invoice is sent.
