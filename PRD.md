# Product Requirements Document

## Product Name
**Payslipkit**

Quick payment receipts + daily sales record for local businesses.

## Overview
Payslipkit helps local businesses that accept UPI (and other payments) quickly create a payment receipt/slip, share it with the customer (mainly via WhatsApp), and keep a simple automatic daily sales record.

It is designed for businesses that need basic payment proof and sales tracking, without the complexity of full accounting or POS software.

## Target Users (Primary)
- Shops & retail stores
- Coaching / tuition centers
- Gyms & fitness centers
- Small clinics & doctors
- Local businesses and service providers

## Target Users (Secondary)
- Staff who handle billing in the above businesses
- Customers who ask for payment proof

## Problem Statement
Many local businesses accept payments every day but:
- Have no fast way to give customers a payment proof
- Find it hard to keep simple daily sales records
- Find full accounting software too heavy and complicated

Customers also often ask for proof of payment after paying.

## Goals
- Make receipt generation after payment very fast
- Allow easy sharing of receipt via WhatsApp
- Maintain a simple daily / basic sales record
- Keep the product simple enough for non-technical users
- Support manual payment confirmation first (MVP)
- Later support more automatic flows and additional payment methods

## Non-Goals (MVP)
- Full accounting software
- Inventory management
- GST filing automation
- Complex multi-branch systems
- Heavy formal GST invoice as the default experience

## Core MVP Features

### 1. Business Profile
- Business name
- Phone number
- UPI ID / Payment ID
- Optional: address, logo, GSTIN

### 2. Quick Receipt Generation
After payment (manual confirmation in MVP):
- Enter / confirm amount
- Optional customer name / phone
- Optional short description of service/item
- Generate receipt instantly

### 3. WhatsApp Share
- One-tap WhatsApp share link for the customer
- Receipt contains business name, amount, date, and basic details

### 4. Daily Sales Record
- Automatic listing of receipts
- Simple daily total
- Basic history view

### 5. Receipt History
- Search by date, amount, or customer phone
- Ability to re-share receipt

## Later / Optional Features
- Formal GST-style invoice format
- PDF download
- Dynamic UPI QR (auto receipt after payment)
- Email delivery
- Multiple staff accounts
- Support for additional payment methods

## Payment Flow (MVP)
**Static QR / Payment ID + Manual Confirmation**
1. Customer pays using the business’s existing UPI QR or payment method
2. Staff confirms payment (sees it in payment app / notification)
3. Staff enters amount + optional customer details
4. System creates receipt
5. Staff shares via WhatsApp

This is the fastest path to a usable product without full payment gateway integration.

## Success Metrics (MVP)
- Receipt can be created in under 30–60 seconds
- Staff can share on WhatsApp in one or two taps
- Daily sales total is visible without extra work
- Product feels simple enough for non-technical users

## Language & Experience Direction
- Prefer simple words: Receipt, Payment Proof, Slip, Sales Record
- Avoid heavy “Invoice / Accounting” language in the main UI
- Keep steps minimum
- Hindi + English friendly direction for future UI

## Open Questions
- Should customer phone be compulsory or optional in MVP?
- How much item/service detail is needed vs just amount + note?
- Is a public receipt link needed in first version, or only WhatsApp share?
- When should formal GST invoice be introduced?

## Initial MVP Recommendation
Build a very simple web app focused on:
1. Business profile + payment ID
2. Manual amount entry after payment
3. Instant receipt
4. WhatsApp share
5. Daily sales list + total

Keep everything else for later.
