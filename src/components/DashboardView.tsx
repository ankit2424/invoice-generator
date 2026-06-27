import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, addDoc, doc, getDoc, onSnapshot, updateDoc, db } from '../lib/db';
import { Package, Users, FileText, ShoppingCart, Plus, Trash2, X, MessageSquare, Mail, ExternalLink, Send, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export const printInvoiceLocally = (invoiceData: any) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Popup blocked! Please allow popups to print.");
    return;
  }
  
  const dateStr = new Date(invoiceData.createdAt || Date.now()).toLocaleDateString();
  const totalAmount = Number(invoiceData.total || 0).toFixed(2);
  const customerDetails = invoiceData.paymentDetails?.customerDetails;
  
  const itemsHtml = (invoiceData.items || []).map((item: any) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">$${Number(item.price).toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">$${Number(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice ${invoiceData.invoiceIdStr}</title>
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
          <h1 style="margin: 0; font-size: 2.2em; font-weight: 800; text-transform: uppercase;">INVOICE</h1>
          <p>Invoice #: ${invoiceData.invoiceIdStr}</p>
          <p>Date: ${dateStr}</p>
          <p>Status: ${invoiceData.status}</p>
        </div>
      </div>
      
      <div class="details">
        <h3>Customer Details</h3>
        ${customerDetails ? `
          <p>Name: ${customerDetails.name || 'N/A'}</p>
          <p>Email: ${customerDetails.email || 'N/A'}</p>
          <p>Phone: ${customerDetails.phone || 'N/A'}</p>
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
          ${itemsHtml}
        </tbody>
      </table>

      <div class="total">
        Total Amount: $${totalAmount}
      </div>
      
      ${invoiceData.paymentDetails?.utr ? `
      <div style="margin-top: 40px; font-size: 0.9em; color: #666;">
        Payment UTR: ${invoiceData.paymentDetails.utr}
      </div>` : ''}
    </body>
    </html>
  `;
  
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
};

export default function DashboardView({ user }: { user: any }) {
  const [stats, setStats] = useState({
    products: 0,
    customers: 0,
    invoices: 0
  });
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  
  // POS State
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [staffProfile, setStaffProfile] = useState<any>(null);
  
  // Manual Item Entry State
  const [manualItemName, setManualItemName] = useState('');
  const [manualItemQty, setManualItemQty] = useState(1);
  const [manualItemPrice, setManualItemPrice] = useState('');

  // Recent invoices state
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);

  // Payment Session
  const [paymentSession, setPaymentSession] = useState<{ upiString: string, invoiceIdStr: string, invoiceDocId: string, amount: number } | null>(null);

  // Webhook listener
  useEffect(() => {
    if (!paymentSession?.invoiceDocId) return;
    
    console.log("Listening to invoice", paymentSession.invoiceDocId);
    const unsub = onSnapshot(doc(db, "invoices", paymentSession.invoiceDocId), (docSnap) => {
      if (docSnap.exists() && docSnap.data().status === 'Paid') {
        // Webhook successfully marked as paid!
        setCart([]);
        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
        setPaymentSession(null);
        fetchDashboardData(); 
        alert(`Payment successful via Webhook! Bill generated: ${paymentSession.invoiceIdStr}`);
      }
    });

    return () => unsub();
  }, [paymentSession?.invoiceDocId]);

  const handleManualNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setManualItemName(name);
    const product = products.find(p => 
      p.name.toLowerCase() === name.toLowerCase() || 
      p.code.toLowerCase() === name.toLowerCase()
    );
    if (product) {
      setManualItemPrice(product.price.toString());
    }
  };

  const addManualItem = () => {
    if (!manualItemName.trim()) return;
    const price = parseFloat(manualItemPrice) || 0;
    
    const existingIndex = cart.findIndex(item => item.name.toLowerCase() === manualItemName.toLowerCase());
    if (existingIndex >= 0 && cart[existingIndex].price === price) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += manualItemQty;
      setCart(newCart);
    } else {
      setCart([...cart, { 
        productId: `manual-${Date.now()}`, 
        name: manualItemName, 
        price: price, 
        quantity: manualItemQty 
      }]);
    }
    
    setManualItemName('');
    setManualItemQty(1);
    setManualItemPrice('');
  };

  const fetchDashboardData = async () => {
    if (!user) return;
    try {
      const profileDoc = await getDoc(doc(db, 'users', user.uid));
      if (profileDoc.exists()) {
        setStaffProfile(profileDoc.data());
      }

      const [productsSnap, customersSnap] = await Promise.all([
        getDocs(query(collection(db, "products"), where("userId", "==", user.uid))),
        getDocs(query(collection(db, "customers"), where("userId", "==", user.uid)))
      ]);

      setStats(prev => ({
        ...prev,
        products: productsSnap.size,
        customers: customersSnap.size
      }));

      const prodList = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prodList);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 500);
    
    let unsubscribe: (() => void) | undefined;
    if (user) {
      const q = query(collection(db, "invoices"), where("userId", "==", user.uid));
      unsubscribe = onSnapshot(q, (snapshot) => {
        setStats(prev => ({ ...prev, invoices: snapshot.size }));
        const invoiceList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        invoiceList.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setRecentInvoices(invoiceList.slice(0, 10));
      });
    }

    return () => {
      clearTimeout(timer);
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    const newCart = [...cart];
    newCart[index].quantity = newQuantity;
    setCart(newCart);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCreateInvoice = async () => {
    if (cart.length === 0 || !customerName || !customerPhone) {
      alert("Please enter customer name, phone, and add at least one product.");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Auto-create customer
      const nextCustId = (stats.customers + 1).toString().padStart(3, '0');
      const custRef = await addDoc(collection(db, "customers"), {
        userId: user.uid,
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        customerCode: `CUST-${nextCustId}`
      });

      // Create invoice as Pending
      const nextInvId = (stats.invoices + 1).toString().padStart(3, '0');
      const invoiceIdStr = `INV-${nextInvId}`;
      const invoiceData = {
        userId: user.uid,
        invoiceIdStr,
        customerId: custRef.id,
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        items: cart.map(item => ({ productId: item.productId, quantity: item.quantity, price: item.price, name: item.name })),
        total: cartTotal,
        status: 'Pending',
        createdAt: new Date().toISOString()
      };
      
      const invoiceRef = await addDoc(collection(db, "invoices"), invoiceData);
      
      let upiString = '';
      if (import.meta.env.VITE_USE_REAL_FIREBASE !== 'true') {
        const vpa = staffProfile?.upiId || 'merchant@upi';
        const name = encodeURIComponent(staffProfile?.storeName || 'Our Shop');
        const note = encodeURIComponent(`Payment for Invoice ${invoiceIdStr}`);
        const formatAmount = parseFloat(cartTotal.toString()).toFixed(2);
        upiString = `upi://pay?pa=${vpa}&pn=${name}&am=${formatAmount}&tn=${note}&tr=${invoiceIdStr}&cu=INR`;
      } else {
        const token = await user.getIdToken();
        const res = await fetch("/api/payment/upi-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            amount: cartTotal,
            invoiceId: invoiceIdStr,
            customerName: customerName,
            upiId: staffProfile?.upiId || '',
            storeName: staffProfile?.storeName || ''
          })
        });
        
        if (!res.ok) {
          throw new Error("Failed to create payment session");
        }
        
        const data = await res.json();
        upiString = data.upiString;
      }
      
      setPaymentSession({
        upiString,
        invoiceIdStr,
        invoiceDocId: invoiceRef.id,
        amount: cartTotal
      });
      
      fetchDashboardData(); 
    } catch (e) {
      console.error("Checkout error", e);
      alert("Error generating checkout session");
    } finally {
      setIsProcessing(false);
    }
  };

  const cancelPayment = async () => {
    if (paymentSession?.invoiceDocId) {
       updateDoc(doc(db, "invoices", paymentSession.invoiceDocId), { status: 'Cancelled' }).catch(console.error);
    }
    setPaymentSession(null);
  };

  const simulateWebhook = async () => {
    if (!paymentSession) return;
    setIsProcessing(true);
    try {
      if (import.meta.env.VITE_USE_REAL_FIREBASE !== 'true') {
        const utrVal = `UPI${Date.now()}`;
        
        // Prevent duplicate payment
        const payDocRef = doc(db, "payments", utrVal);
        const payDocSnap = await getDoc(payDocRef);
        if (payDocSnap.exists()) {
          alert("Transaction already processed");
          setIsProcessing(false);
          return;
        }

        await setDoc(payDocRef, {
          invoiceId: paymentSession.invoiceIdStr,
          userId: user.uid,
          utr: utrVal,
          amount: paymentSession.amount,
          paymentMethod: "UPI",
          status: "SUCCESS",
          createdAt: new Date().toISOString()
        });

        // Add customer if needed
        if (customerPhone) {
          const custQ = query(collection(db, "customers"), where("phone", "==", customerPhone), where("userId", "==", user.uid));
          const custSnap = await getDocs(custQ);
          if (custSnap.empty) {
            await addDoc(collection(db, "customers"), {
              userId: user.uid,
              name: customerName || "",
              phone: customerPhone,
              email: customerEmail || "",
              customerCode: `CUST-${Date.now().toString().slice(-4)}`,
              createdAt: new Date().toISOString()
            });
          }
        }

        const invoiceRef = doc(db, "invoices", paymentSession.invoiceDocId);
        
        const itemsToUse = cart.map(item => ({ name: item.name, quantity: item.quantity, price: item.price }));
        const calculatedTotal = itemsToUse.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
        const paymentAmount = Number(paymentSession.amount);
        const isMismatch = Math.abs(calculatedTotal - paymentAmount) > 0.01;
        const newStatus = isMismatch ? "Review Required" : "Paid";

        await updateDoc(invoiceRef, {
          status: newStatus,
          ...(newStatus === "Paid" ? { paidAt: new Date().toISOString() } : { reviewRequiredAt: new Date().toISOString() }),
          invoiceUrl: newStatus === "Paid" ? `local-download://${paymentSession.invoiceIdStr}` : null,
          deliveryStatus: newStatus === "Paid" ? "Pending" : null,
          paymentDetails: {
            utr: utrVal,
            amount: paymentAmount,
            calculatedTotal: calculatedTotal,
            paymentMethod: "UPI",
            customerDetails: {
              name: customerName,
              phone: customerPhone,
              email: customerEmail
            },
            orderItems: itemsToUse
          }
        });

        // Trigger snapshot updates
        window.dispatchEvent(new Event('storage'));

        // Simulate delivery
        if (newStatus === "Paid") {
          setTimeout(async () => {
            const isFailure = Math.random() < 0.5;
            await updateDoc(invoiceRef, {
              deliveryStatus: isFailure ? "Failed" : "Sent",
              deliveryError: isFailure ? "Delivery provider timeout: 504 Gateway Time-out" : null
            });
            window.dispatchEvent(new Event('storage'));
          }, 3000);
        }

        setCart([]);
        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
        setPaymentSession(null);
        fetchDashboardData();
      } else {
        const res = await fetch("/api/payment/webhook", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-provider-signature": `sim-sig-${paymentSession.invoiceIdStr}`
          },
          body: JSON.stringify({
            invoiceId: paymentSession.invoiceIdStr,
            status: "SUCCESS",
            utr: `UPI${Date.now()}`,
            amount: paymentSession.amount,
            paymentMethod: "UPI",
            customerDetails: {
              name: customerName,
              phone: customerPhone,
              email: customerEmail
            },
            orderItems: cart.map(item => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price
            })),
            userId: user.uid
          })
        });
        if (!res.ok) throw new Error("Webhook call failed");
      }
    } catch (e) {
      console.error(e);
      alert("Error simulating webhook");
      setIsProcessing(false);
    }
  };

  const confirmPayment = async () => {
    if (!paymentSession) return;
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, "invoices", paymentSession.invoiceDocId), {
        status: 'Paid',
        paidAt: new Date().toISOString()
      });
      
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setPaymentSession(null);
      fetchDashboardData(); 
      alert(`Payment marked as paid manually! Bill generated: ${paymentSession.invoiceIdStr}`);
    } catch (e) {
      console.error("Confirmation error", e);
      alert("Error confirming invoice");
    } finally {
      setIsProcessing(false);
    }
  };

  const chartData = useMemo(() => {
    // Basic mock data if not enough invoices
    if (recentInvoices.length < 3) {
      return Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
          name: d.toLocaleDateString(undefined, { weekday: 'short' }),
          revenue: Math.floor(Math.random() * 500) + 100,
          invoices: Math.floor(Math.random() * 5) + 1,
        };
      });
    }
    
    // Group existing invoices by date
    const grouped = [...recentInvoices].reverse().reduce((acc: Record<string, any>, inv) => {
      const d = new Date(inv.createdAt);
      const key = d.toLocaleDateString(undefined, { weekday: 'short' });
      if (!acc[key]) acc[key] = { name: key, revenue: 0, invoices: 0 };
      acc[key].revenue += inv.total || 0;
      acc[key].invoices += 1;
      return acc;
    }, {});
    return Object.values(grouped);
  }, [recentInvoices]);

  if (loading) return <div className="p-4 sm:p-8 text-gray-500 flex items-center justify-center h-full"><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: "linear", duration: 1 }} className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full" /></div>;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8"
    >
      <motion.div variants={itemVariants} className="flex justify-between items-end">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard Overview</h2>
      </motion.div>
      
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm flex items-center space-x-4 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-xl">
            <Package size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Products</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.products}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm flex items-center space-x-4 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
          <div className="p-4 bg-green-50 text-green-600 rounded-xl">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Customers</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.customers}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm flex items-center space-x-4 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
          <div className="p-4 bg-purple-50 text-purple-600 rounded-xl">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Invoices Created</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.invoices}</p>
          </div>
        </div>
      </motion.div>
      
      {/* Chart Section */}
      <motion.div variants={itemVariants} className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-900">Revenue Overview</h3>
          <p className="text-sm text-gray-500">Last 7 days performance</p>
        </div>
        <div className="h-64 w-full min-w-0">
          {isMounted && (
            <ResponsiveContainer width="99%" height="100%">
              <AreaChart data={chartData as any} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(val) => `$${val}`} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cart / Current Bill */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm flex flex-col min-h-[600px] overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-white">
            <h3 className="text-lg font-bold text-gray-900 flex items-center"><FileText size={20} className="mr-2 text-indigo-600"/> Create Invoice</h3>
          </div>
          
          <div className="p-5 border-b border-gray-100 bg-gray-50 flex flex-col space-y-4">
             <div className="space-y-1.5">
               <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider ml-1">Customer Name *</label>
               <input
                 type="text"
                 placeholder="Jane Doe"
                 value={customerName}
                 onChange={(e) => setCustomerName(e.target.value)}
                 className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
               />
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="space-y-1.5">
                 <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider ml-1">Phone Number *</label>
                 <input
                   type="tel"
                   placeholder="+1 (555) 000-0000"
                   value={customerPhone}
                   onChange={(e) => setCustomerPhone(e.target.value)}
                   className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                 />
               </div>
               <div className="space-y-1.5">
                 <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider ml-1">Email <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
                 <input
                   type="email"
                   placeholder="jane@example.com"
                   value={customerEmail}
                   onChange={(e) => setCustomerEmail(e.target.value)}
                   className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                 />
               </div>
             </div>
          </div>

          <div className="p-5 border-b border-gray-100 bg-white">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider ml-1 block mb-2">Add Line Item</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input 
                  type="text"
                  list="product-list"
                  placeholder="Item Name or Code"
                  value={manualItemName}
                  onChange={handleManualNameChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                />
                <datalist id="product-list">
                  {products.map(p => <option key={p.id} value={p.name} />)}
                </datalist>
              </div>
              <div className="flex gap-2">
                <div className="w-20">
                  <input 
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={manualItemQty}
                    onChange={(e) => setManualItemQty(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                  />
                </div>
                <div className="w-24 flex-1 sm:flex-none">
                  <input 
                    type="number"
                    step="0.01"
                    placeholder="Price"
                    value={manualItemPrice}
                    onChange={(e) => setManualItemPrice(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                  />
                </div>
                <button
                  onClick={addManualItem}
                  className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 bg-gray-50/50">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 p-6 text-center">
                <motion.div 
                   animate={{ y: [0, -10, 0] }}
                   transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                   className="w-16 h-16 bg-white border border-black/10 rounded-full shadow-sm flex items-center justify-center mb-4 text-black"
                >
                  <ShoppingCart size={32} />
                </motion.div>
                <p className="text-sm font-medium text-gray-500">No items added</p>
                <p className="text-xs mt-1 text-gray-400">Select products or manually add items to the invoice.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-indigo-100 transition-colors group">
                    <div className="flex-1 min-w-0 pr-4">
                      <h5 className="text-sm font-semibold text-gray-900 truncate">{item.name}</h5>
                      <p className="text-xs text-gray-500 mt-0.5">${item.price.toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50">
                        <button 
                          onClick={() => updateQuantity(index, item.quantity - 1)}
                          className="px-3 py-1.5 hover:bg-gray-200 hover:text-gray-900 text-gray-500 font-medium transition-colors rounded-l-lg"
                        >-</button>
                        <span className="px-2 text-sm font-semibold w-10 text-center text-gray-900">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(index, item.quantity + 1)}
                          className="px-3 py-1.5 hover:bg-gray-200 hover:text-gray-900 text-gray-500 font-medium transition-colors rounded-r-lg"
                        >+</button>
                      </div>
                      <button 
                        onClick={() => removeFromCart(index)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 border-t border-gray-100 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
            <div className="flex justify-between items-center mb-5 text-lg">
              <span className="font-semibold text-gray-500">Total Amount</span>
              <span className="text-2xl font-bold text-gray-900">${cartTotal.toFixed(2)}</span>
            </div>
            <button
              onClick={handleCreateInvoice}
              disabled={cart.length === 0 || isProcessing || !customerName || !customerPhone}
              className={`w-full py-4 rounded-xl font-bold flex justify-center items-center transition-all ${
                cart.length === 0 || isProcessing || !customerName || !customerPhone
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-black text-white hover:bg-gray-800 shadow-xl shadow-black/10 active:scale-[0.98]'
              }`}
            >
              {isProcessing ? 'Processing request...' : 'Generate Invoice'}
            </button>
          </div>
        </div>
        
        {/* Recent Invoices Panel */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm flex flex-col max-h-[600px] overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-white">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">Recent Invoices</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30">
            {recentInvoices.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 p-6 text-center">
                <motion.div 
                   animate={{ scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] }}
                   transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                   className="w-16 h-16 bg-white border border-black/10 rounded-full shadow-sm flex items-center justify-center mb-4 text-black"
                >
                  <FileText size={32} />
                </motion.div>
                <p className="text-sm font-medium text-gray-500">No invoices created yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentInvoices.map((inv, idx) => (
                  <div key={idx} className="flex flex-col p-5 bg-white border border-gray-100 rounded-xl hover:border-indigo-200 transition-colors shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="font-bold text-gray-900 border-b border-dashed border-gray-300 pb-0.5 text-base">{inv.invoiceIdStr}</span>
                        <div className="text-xs text-gray-400 mt-1.5 font-medium">
                          {new Date(inv.createdAt).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                          inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' :
                          inv.status === 'Failed' ? 'bg-red-50 text-red-600' :
                          inv.status === 'Review Required' ? 'bg-purple-50 text-purple-600' :
                          'bg-amber-50 text-amber-600'
                        }`}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                    {(inv.paymentDetails?.customerDetails?.name || inv.paymentDetails?.customerDetails?.phone) && (
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-medium text-gray-700">{inv.paymentDetails.customerDetails.name}</span> • {inv.paymentDetails.customerDetails.phone}
                      </div>
                    )}
                    {inv.status === 'Review Required' && (
                      <div className="mt-2 p-2 bg-purple-50 rounded text-xs text-purple-800 border border-purple-100 flex items-center justify-between">
                        <div>
                          <strong>Payment Mismatch:</strong> Expected ${inv.paymentDetails?.calculatedTotal?.toFixed(2) || inv.total}, received ${inv.paymentDetails?.amount?.toFixed(2)}
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              if (import.meta.env.VITE_USE_REAL_FIREBASE !== 'true') {
                                const invoiceRef = doc(db, "invoices", inv.id);
                                const paymentAmount = inv.paymentDetails?.amount || 0;
                                await updateDoc(invoiceRef, {
                                  status: "Paid",
                                  paidAt: new Date().toISOString(),
                                  total: paymentAmount,
                                  invoiceUrl: `local-download://${inv.invoiceIdStr}`,
                                  deliveryStatus: "Pending",
                                  reviewResolvedAt: new Date().toISOString()
                                });
                                setTimeout(async () => {
                                  const isFailure = Math.random() < 0.5;
                                  await updateDoc(invoiceRef, {
                                    deliveryStatus: isFailure ? "Failed" : "Sent",
                                    deliveryError: isFailure ? "Delivery provider timeout: 504 Gateway Time-out" : null
                                  });
                                  window.dispatchEvent(new Event('storage'));
                                }, 3000);
                                alert('Mismatch resolved successfully');
                              } else {
                                const res = await fetch(`/api/invoice/${inv.invoiceIdStr}/resolve-mismatch`, { method: 'POST' });
                                const data = await res.json();
                                if (data.success) alert('Mismatch resolved successfully');
                                else alert('Failed to resolve: ' + data.message);
                              }
                            } catch (e) {
                              alert('Error resolving mismatch');
                            }
                          }}
                          className="bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 transition font-medium"
                        >
                          Accept & Fix
                        </button>
                      </div>
                    )}
                    <div className="border-t border-gray-100 mt-3 pt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="text-lg font-bold text-gray-900">
                        ${Number(inv.total).toFixed(2)}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 text-sm items-start sm:items-center w-full sm:w-auto">
                        {inv.deliveryStatus && (
                          <div className={`text-xs flex flex-col ${
                            inv.deliveryStatus === 'Sent' ? 'text-blue-600' :
                            inv.deliveryStatus === 'Failed' ? 'text-red-600 font-medium tracking-tight' :
                            'text-amber-500'
                          }`}>
                            <span>Delivery: {inv.deliveryStatus}</span>
                            {inv.deliveryStatus === 'Failed' && inv.deliveryError && (
                              <span className="text-[10px] font-normal leading-tight mt-0.5 max-w-[200px] truncate" title={inv.deliveryError}>
                                {inv.deliveryError}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => {
                              if (import.meta.env.VITE_USE_REAL_FIREBASE !== 'true') {
                                printInvoiceLocally(inv);
                              } else {
                                window.open(`/api/invoice/${inv.invoiceIdStr}/download`, '_blank');
                              }
                            }}
                            className="text-indigo-600 hover:text-indigo-800 font-medium text-xs flex items-center gap-1"
                            title="Download PDF"
                          >
                            <Download className="w-3 h-3" /> PDF
                          </button>
                          {inv.invoiceUrl && (
                            <>
                              <button
                                onClick={() => {
                                  const phone = inv.paymentDetails?.customerDetails?.phone;
                                  if (!phone) return alert('No phone number');
                                  const text = encodeURIComponent(`Hi ${inv.paymentDetails?.customerDetails?.name || ''}, your invoice ${inv.invoiceIdStr} for $${inv.total} is ready. You can view it here: ${inv.invoiceUrl}`);
                                  window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${text}`, '_blank');
                                }}
                                className="text-green-600 hover:text-green-800 font-medium text-xs flex items-center gap-1"
                              >
                                <MessageSquare className="w-3 h-3" /> WhatsApp
                              </button>
                              <button
                                onClick={() => {
                                  const email = inv.paymentDetails?.customerDetails?.email;
                                  if (!email) return alert('No email address provided');
                                  const subject = encodeURIComponent(`Invoice ${inv.invoiceIdStr}`);
                                  const body = encodeURIComponent(`Hi ${inv.paymentDetails?.customerDetails?.name || ''},\n\nYour invoice is ready. View it here: ${inv.invoiceUrl}\n\nTotal: $${inv.total}`);
                                  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
                                }}
                                className="text-blue-600 hover:text-blue-800 font-medium text-xs flex items-center gap-1"
                              >
                                <Mail className="w-3 h-3" /> Email
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    if (import.meta.env.VITE_USE_REAL_FIREBASE !== 'true') {
                                      const invoiceRef = doc(db, "invoices", inv.id);
                                      await updateDoc(invoiceRef, {
                                        deliveryStatus: "Pending",
                                        lastResentAt: new Date().toISOString()
                                      });
                                      setTimeout(async () => {
                                        const isFailure = Math.random() < 0.5;
                                        await updateDoc(invoiceRef, {
                                          deliveryStatus: isFailure ? "Failed" : "Sent",
                                          deliveryError: isFailure ? "Delivery provider timeout: 504 Gateway Time-out" : null
                                        });
                                        window.dispatchEvent(new Event('storage'));
                                      }, 3000);
                                      alert('Invoice resent successfully');
                                    } else {
                                      const res = await fetch(`/api/invoice/${inv.invoiceIdStr}/resend`, { method: 'POST' });
                                      const data = await res.json();
                                      if (data.success) alert('Invoice resent successfully');
                                      else alert('Failed to resend: ' + data.message);
                                    }
                                  } catch (e) {
                                    alert('Error resending invoice');
                                  }
                                }}
                                className="text-gray-600 hover:text-gray-900 font-medium text-xs flex items-center gap-1"
                                title="Resend via System"
                              >
                                <Send className="w-3 h-3" /> Resend
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Payment Modal */}
      {paymentSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col items-center p-8 relative">
            <button 
              onClick={cancelPayment} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition"
              disabled={isProcessing}
            >
              <X size={24} />
            </button>
            
            <h3 className="text-xl font-bold text-gray-900 mb-1">UPI Payment</h3>
            <p className="text-sm text-gray-500 mb-6 text-center">
              Have the customer scan this code with any UPI app to pay.
            </p>
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-center pointer-events-none select-none">
              <QRCodeSVG 
                value={paymentSession.upiString} 
                size={200}
                level="M"
              />
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500 mb-1">Amount to Pay</p>
              <p className="text-3xl font-bold text-gray-900">${paymentSession.amount.toFixed(2)}</p>
            </div>
            
            <div className="mt-8 w-full space-y-3">
              <button
                onClick={simulateWebhook}
                disabled={isProcessing}
                className="w-full py-3 rounded-full font-bold flex justify-center items-center transition bg-black text-white hover:bg-gray-900 shadow-md"
              >
                {isProcessing ? 'Waiting...' : 'Simulate Webhook Success'}
              </button>
              <button
                onClick={confirmPayment}
                disabled={isProcessing}
                className="w-full py-3 rounded-full font-bold flex justify-center items-center transition bg-gray-100 text-black hover:bg-gray-200 border border-black/10"
              >
                Mark as Paid Manually
              </button>
              <button
                onClick={cancelPayment}
                disabled={isProcessing}
                className="w-full py-3 rounded-xl font-bold flex justify-center items-center transition bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
