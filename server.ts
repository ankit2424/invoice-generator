import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { requireAuth, type AuthRequest } from "./src/middleware/auth.ts";

function simulateDeliveryProvider(docRef: any, contactDetails: any) {
  setTimeout(async () => {
    try {
      if (!contactDetails || (!contactDetails.email && !contactDetails.phone)) {
        await docRef.update({ deliveryStatus: "Failed", deliveryError: "No contact details provided" });
        return;
      }
      // 50% chance to simulate a provider failure for testing purposes
      const isFailure = Math.random() < 0.5;
      if (isFailure) {
        await docRef.update({ deliveryStatus: "Failed", deliveryError: "Delivery provider timeout: 504 Gateway Time-out" });
      } else {
        await docRef.update({ deliveryStatus: "Sent", deliveryError: null });
      }
    } catch (e) {
      console.error("Delivery simulation error", e);
    }
  }, 3000);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // === API ROUTES ===

  // === MOCK DATABASE ENDPOINTS FOR FRONTEND ===
  app.post("/api/mock-db/query", async (req, res) => {
    try {
      const { collectionPath, constraints } = req.body;
      const { getCollectionData } = await import("./src/lib/firebase-admin.ts");
      let items = getCollectionData(collectionPath);

      if (constraints && Array.isArray(constraints)) {
        for (const c of constraints) {
          if (c.type === 'where') {
            const { field, op, value } = c;
            items = items.filter((item: any) => {
              if (op === '==') return item[field] === value;
              return true;
            });
          }
        }
      }
      res.json({ success: true, data: items });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/mock-db/get-doc", async (req, res) => {
    try {
      const { collectionPath, id } = req.body;
      const { getCollectionData } = await import("./src/lib/firebase-admin.ts");
      const items = getCollectionData(collectionPath);
      const item = items.find((i: any) => i.id === id);
      res.json({ success: true, data: item || null });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/mock-db/add-doc", async (req, res) => {
    try {
      const { collectionPath, data } = req.body;
      const { getCollectionData, saveCollectionData } = await import("./src/lib/firebase-admin.ts");
      const items = getCollectionData(collectionPath);
      const id = Math.random().toString(36).substring(2, 15);
      const newItem = { ...data, id, createdAt: data.createdAt || new Date().toISOString() };
      items.push(newItem);
      saveCollectionData(collectionPath, items);
      res.json({ success: true, data: newItem });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/mock-db/update-doc", async (req, res) => {
    try {
      const { collectionPath, id, data } = req.body;
      const { getCollectionData, saveCollectionData } = await import("./src/lib/firebase-admin.ts");
      const items = getCollectionData(collectionPath);
      const index = items.findIndex((i: any) => i.id === id);
      if (index !== -1) {
        items[index] = { ...items[index], ...data, updatedAt: new Date().toISOString() };
      } else {
        items.push({ ...data, id, createdAt: new Date().toISOString() });
      }
      saveCollectionData(collectionPath, items);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/mock-db/delete-doc", async (req, res) => {
    try {
      const { collectionPath, id } = req.body;
      const { getCollectionData, saveCollectionData } = await import("./src/lib/firebase-admin.ts");
      let items = getCollectionData(collectionPath);
      items = items.filter((i: any) => i.id !== id);
      saveCollectionData(collectionPath, items);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Healthcheck
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Auth / Me
  app.get("/api/me", requireAuth, (req: AuthRequest, res) => {
    try {
      if (!req.user?.uid) {
        return res.status(400).json({ error: "Invalid user token" });
      }
      res.json({ 
        message: "Successfully verified with backend!",
        uid: req.user.uid, 
        email: req.user.email || "guest@local.dev"
      });
    } catch (error: any) {
      console.error("Auth error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Dynamic UPI Payment Session
  app.post("/api/payment/upi-session", requireAuth, (req: AuthRequest, res) => {
    try {
      const { amount, invoiceId, customerName, upiId, storeName } = req.body;
      if (!amount || !invoiceId) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const vpa = upiId || "merchant@upi";
      const name = encodeURIComponent(storeName || "Our Shop");
      const note = encodeURIComponent(`Payment for Invoice ${invoiceId}`);
      const formatAmount = parseFloat(amount).toFixed(2);
      
      const upiString = `upi://pay?pa=${vpa}&pn=${name}&am=${formatAmount}&tn=${note}&tr=${invoiceId}&cu=INR`;
      
      res.json({
        sessionId: `sess_${Date.now()}`,
        upiString,
        amount: formatAmount,
        status: "created"
      });
    } catch (error: any) {
      console.error("Payment session error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Webhook from UPI provider (simulated integration)
  app.post("/api/payment/webhook", async (req, res) => {
    try {
      const signatureHeader = req.headers["x-provider-signature"];
      
      // Providers send various webhook structures. Here we accept { invoiceId, status }
      const { invoiceId, status, utr, amount, paymentMethod, customerDetails, orderItems } = req.body;

      if (!invoiceId) {
        return res.status(400).json({ error: "Missing invoiceId" });
      }

      // Simulated signature verification
      // In a real app, you would hash the payload with your webhook secret and compare
      const expectedSignature = `sim-sig-${invoiceId}`;
      if (signatureHeader !== expectedSignature) {
        console.warn("Invalid webhook signature received");
        return res.status(401).json({ error: "Invalid signature" });
      }

      const { adminDb } = await import("./src/lib/firebase-admin.ts");
      
      // Prevent duplicate processing using UTR as document ID
      if (status === "SUCCESS" && utr) {
        try {
          await adminDb.collection('payments').doc(utr).create({
            invoiceId: invoiceId,
            userId: req.body.userId || "unknown",
            utr: utr,
            amount: amount || 0,
            paymentMethod: paymentMethod || "UPI",
            status: "SUCCESS",
            createdAt: new Date().toISOString()
          });
        } catch (e: any) {
          if (e.code === 6 || e.message.includes('ALREADY_EXISTS')) {
            return res.json({ success: true, message: "Transaction already processed" });
          }
          throw e;
        }
      }

      // Find the invoice with this invoiceIdStr
      const invoicesRef = adminDb.collection('invoices');
      const querySnapshot = await invoicesRef.where('invoiceIdStr', '==', invoiceId).limit(1).get();
      
      let docRef;
      let invoiceData;

      if (querySnapshot.empty) {
        const newInvoiceData = {
          invoiceIdStr: invoiceId,
          userId: req.body.userId || "unknown",
          date: new Date().toISOString().split('T')[0],
          dueDate: new Date().toISOString().split('T')[0],
          items: orderItems || [],
          total: amount || 0,
          status: "Pending",
          createdAt: new Date().toISOString()
        };
        docRef = await invoicesRef.add(newInvoiceData);
        invoiceData = newInvoiceData;
      } else {
        docRef = querySnapshot.docs[0].ref;
        invoiceData = querySnapshot.docs[0].data();

        // Check if it's already paid to avoid duplicate processing
        if (invoiceData.status === 'Paid') {
          return res.json({ success: true, message: "Invoice already marked as paid" });
        }
      }

      if (status === "SUCCESS") {
        if (customerDetails && customerDetails.phone) {
          const customersRef = adminDb.collection('customers');
          const customerQuery = await customersRef.where('phone', '==', customerDetails.phone)
                                                  .where('userId', '==', invoiceData.userId)
                                                  .limit(1).get();
          
          if (customerQuery.empty) {
            await customersRef.add({
               userId: invoiceData.userId,
               name: customerDetails.name || "",
               phone: customerDetails.phone,
               email: customerDetails.email || "",
               customerCode: `CUST-${Date.now().toString().slice(-4)}`,
               createdAt: new Date().toISOString()
            });
          } else {
             const custDocRef = customerQuery.docs[0].ref;
             await custDocRef.update({
                name: customerDetails.name || customerQuery.docs[0].data().name,
                email: customerDetails.email || customerQuery.docs[0].data().email,
                updatedAt: new Date().toISOString()
             });
          }
        }

        let calculatedTotal = 0;
        const itemsToUse = orderItems && orderItems.length > 0 ? orderItems : (invoiceData.items || []);
        if (itemsToUse.length > 0) {
          calculatedTotal = itemsToUse.reduce((sum: number, item: any) => sum + (Number(item.price) * Number(item.quantity || 1)), 0);
        } else {
          calculatedTotal = Number(invoiceData.total) || 0;
        }

        const paymentAmount = Number(amount || 0);
        const isMismatch = Math.abs(calculatedTotal - paymentAmount) > 0.01;
        const newStatus = isMismatch ? "Review Required" : "Paid";

        let invoiceUrl = null;
        let deliveryStatus = null;

        if (newStatus === "Paid") {
          invoiceUrl = `${req.protocol}://${req.get('host')}/api/invoice/${invoiceId}/download`;

          // Simulate sending invoice to customer
          deliveryStatus = "Pending";
          simulateDeliveryProvider(docRef, customerDetails);
        }

        await docRef.update({
          status: newStatus,
          ...(newStatus === "Paid" ? { paidAt: new Date().toISOString() } : { reviewRequiredAt: new Date().toISOString() }),
          ...(invoiceUrl ? { invoiceUrl } : {}),
          ...(deliveryStatus ? { deliveryStatus } : {}),
          paymentDetails: {
            utr: utr || null,
            amount: paymentAmount,
            calculatedTotal: calculatedTotal,
            paymentMethod: paymentMethod || "UPI",
            customerDetails: customerDetails || null,
            orderItems: itemsToUse
          }
        });
        return res.json({ success: true, message: `Invoice updated to ${newStatus}`, invoiceUrl, deliveryStatus });
      } else if (status === "FAILED") {
        await docRef.update({
          status: "Failed",
          failedAt: new Date().toISOString()
        });
        return res.json({ success: true, message: "Invoice updated to Failed" });
      }
      res.json({ success: true, message: `Webhook received with unhandled status: ${status}` });
    } catch (error: any) {
      console.error("Webhook processing error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Add custom server logic here
  app.post("/api/invoice/:invoiceId/resolve-mismatch", async (req, res) => {
    try {
      const { invoiceId } = req.params;
      const { adminDb } = await import("./src/lib/firebase-admin.ts");
      const invoicesRef = adminDb.collection('invoices');
      const querySnapshot = await invoicesRef.where('invoiceIdStr', '==', invoiceId).limit(1).get();

      if (querySnapshot.empty) {
        return res.status(404).json({ success: false, message: "Invoice not found" });
      }

      const docRef = querySnapshot.docs[0].ref;
      const invoiceData = querySnapshot.docs[0].data();

      if (invoiceData.status !== "Review Required") {
        return res.status(400).json({ success: false, message: "Invoice is not in Review Required state" });
      }

      // We accept the paid amount
      const paymentAmount = invoiceData.paymentDetails?.amount || 0;
      
      const invoiceUrl = `${req.protocol}://${req.get('host')}/api/invoice/${invoiceId}/download`;
      const customerDetails = invoiceData.paymentDetails?.customerDetails;
      
      let deliveryStatus = "Pending";
      simulateDeliveryProvider(docRef, customerDetails);

      await docRef.update({
        status: "Paid",
        paidAt: new Date().toISOString(),
        total: paymentAmount, // Fix the total to match payment
        invoiceUrl: invoiceUrl,
        deliveryStatus: deliveryStatus,
        reviewResolvedAt: new Date().toISOString()
      });

      res.json({ success: true, message: "Mismatch resolved, invoice marked as Paid", invoiceUrl, deliveryStatus });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/invoice/:invoiceId/resend", async (req, res) => {
    try {
      const { invoiceId } = req.params;
      const { adminDb } = await import("./src/lib/firebase-admin.ts");
      const invoicesRef = adminDb.collection('invoices');
      const querySnapshot = await invoicesRef.where('invoiceIdStr', '==', invoiceId).limit(1).get();

      if (querySnapshot.empty) {
        return res.status(404).json({ success: false, message: "Invoice not found" });
      }

      const docRef = querySnapshot.docs[0].ref;
      const invoiceData = querySnapshot.docs[0].data();

      if (!invoiceData.paymentDetails?.customerDetails) {
        return res.status(400).json({ success: false, message: "No customer details found on this invoice" });
      }

      console.log(`[Mock] Try resending invoice ${invoiceId}`);
      simulateDeliveryProvider(docRef, invoiceData.paymentDetails.customerDetails);

      await docRef.update({
        deliveryStatus: "Pending",
        lastResentAt: new Date().toISOString()
      });

      res.json({ success: true, message: "Invoice resend initiated", deliveryStatus: "Pending" });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/invoice/:invoiceId/download", async (req, res) => {
    try {
      const { invoiceId } = req.params;
      const { adminDb } = await import("./src/lib/firebase-admin.ts");
      const invoicesRef = adminDb.collection('invoices');
      const querySnapshot = await invoicesRef.where('invoiceIdStr', '==', invoiceId).limit(1).get();

      if (querySnapshot.empty) {
        return res.status(404).send("Invoice not found");
      }

      const invoiceData = querySnapshot.docs[0].data();
      
      const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoiceId}</title>
        <style>
          body { font-family: sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #333; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 20px; }
          .details { margin-top: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { text-align: left; padding: 12px; border-bottom: 1px solid #eee; }
          th { background: #f9f9f9; }
          .total { text-align: right; margin-top: 20px; font-size: 1.2em; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>INVOICE</h1>
            <p>Invoice #: ${invoiceId}</p>
            <p>Date: ${new Date(invoiceData.createdAt || Date.now()).toLocaleDateString()}</p>
            <p>Status: ${invoiceData.status}</p>
          </div>
        </div>
        
        <div class="details">
          <h3>Customer Details</h3>
          ${invoiceData.paymentDetails?.customerDetails ? `
            <p>Name: ${invoiceData.paymentDetails.customerDetails.name || 'N/A'}</p>
            <p>Email: ${invoiceData.paymentDetails.customerDetails.email || 'N/A'}</p>
            <p>Phone: ${invoiceData.paymentDetails.customerDetails.phone || 'N/A'}</p>
          ` : '<p>No customer details available</p>'}
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${(invoiceData.items || []).map((item: any) => `
              <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>$${Number(item.price).toFixed(2)}</td>
                <td>$${Number(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total">
          Total Amount: $${Number(invoiceData.total || 0).toFixed(2)}
        </div>
        
        ${invoiceData.paymentDetails?.utr ? `
        <div style="margin-top: 40px; font-size: 0.9em; color: #666;">
          Payment UTR: ${invoiceData.paymentDetails.utr}
        </div>` : ''}

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      res.send(html);

    } catch (error: any) {
      console.error(error);
      res.status(500).send(error.message);
    }
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
