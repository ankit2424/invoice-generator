import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, doc, getDoc, onSnapshot, db } from '../lib/db';
import { MessageSquare, Plus, IndianRupee } from 'lucide-react';
import { motion } from 'motion/react';

export default function QuickReceiptView({ user }: { user: any }) {
  const [amount, setAmount] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [note, setNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  const [todayReceipts, setTodayReceipts] = useState<any[]>([]);
  const [lastReceipt, setLastReceipt] = useState<any>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!user?.uid) return;

    const loadProfile = async () => {
      const profileDoc = await getDoc(doc(db, 'users', user.uid));
      if (profileDoc.exists()) {
        setBusinessProfile(profileDoc.data());
      }
    };
    loadProfile();

    const q = query(collection(db, 'invoices'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      const today = list.filter((r: any) => {
        const date = (r.date || r.createdAt || '').toString().slice(0, 10);
        return date === todayStr;
      });
      setTodayReceipts(today);
    });

    return () => unsubscribe();
  }, [user?.uid, todayStr]);

  const todayTotal = todayReceipts.reduce((sum, r) => sum + Number(r.total || 0), 0);

  const handleCreateReceipt = async () => {
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setIsProcessing(true);
    try {
      const nextId = (todayReceipts.length + 1).toString().padStart(3, '0');
      const receiptId = `RCP-${todayStr.replace(/-/g, '')}-${nextId}`;

      const receiptData = {
        userId: user.uid,
        invoiceIdStr: receiptId,
        date: todayStr,
        total: value,
        status: 'Paid',
        note: note.trim() || '',
        createdAt: new Date().toISOString(),
        paymentDetails: {
          customerDetails: {
            name: customerName.trim() || '',
            phone: customerPhone.trim() || ''
          },
          paymentMethod: 'UPI',
          amount: value
        }
      };

      const ref = await addDoc(collection(db, 'invoices'), receiptData);
      const created = { id: ref.id, ...receiptData };
      setLastReceipt(created);

      setAmount('');
      setCustomerName('');
      setCustomerPhone('');
      setNote('');
    } catch (e) {
      console.error(e);
      alert('Could not create receipt. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const shareOnWhatsApp = (receipt: any) => {
    const businessName = businessProfile?.storeName || 'Business';
    const phone = (receipt.paymentDetails?.customerDetails?.phone || '').replace(/\D/g, '');
    const name = receipt.paymentDetails?.customerDetails?.name || 'Customer';
    const amt = Number(receipt.total || 0).toFixed(2);
    const receiptNote = receipt.note ? `\nNote: ${receipt.note}` : '';

    const text = encodeURIComponent(
      `Hi ${name},\n\nPayment received of ₹${amt}.\nReceipt: ${receipt.invoiceIdStr}\nFrom: ${businessName}${receiptNote}\n\nThank you!`
    );

    if (phone) {
      window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-lg mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Quick Receipt</h2>
        <p className="text-sm text-gray-500 mt-1">Enter amount after payment and share proof.</p>
      </div>

      {/* Today's summary */}
      <div className="bg-black text-white rounded-2xl p-5 flex justify-between items-center">
        <div>
          <p className="text-xs text-white/70 uppercase tracking-wider">Today's Sales</p>
          <p className="text-2xl font-bold mt-1">₹{todayTotal.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/70">Receipts</p>
          <p className="text-xl font-bold mt-1">{todayReceipts.length}</p>
        </div>
      </div>

      {/* Create form */}
      <div className="bg-white border border-black/10 rounded-2xl p-5 space-y-4 shadow-sm">
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Amount (₹) *</label>
          <div className="relative">
            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-lg font-semibold focus:ring-2 focus:ring-black/10 focus:border-black outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Customer name <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
          <input
            type="text"
            placeholder="Name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/10 focus:border-black outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">WhatsApp number <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
          <input
            type="tel"
            placeholder="91XXXXXXXXXX"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/10 focus:border-black outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Note <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
          <input
            type="text"
            placeholder="e.g. Month fee / Service"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/10 focus:border-black outline-none"
          />
        </div>

        <button
          onClick={handleCreateReceipt}
          disabled={isProcessing || !amount}
          className={`w-full py-3.5 rounded-full font-bold flex items-center justify-center gap-2 transition-all ${
            isProcessing || !amount
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-black text-white hover:bg-gray-800 active:scale-[0.98]'
          }`}
        >
          <Plus size={18} />
          {isProcessing ? 'Creating...' : 'Create Receipt'}
        </button>
      </div>

      {/* Last created receipt - share prompt */}
      {lastReceipt && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3"
        >
          <p className="text-sm font-semibold text-emerald-800">Receipt created</p>
          <div className="flex justify-between items-center">
            <div>
              <p className="font-bold text-gray-900">{lastReceipt.invoiceIdStr}</p>
              <p className="text-lg font-bold text-gray-900">₹{Number(lastReceipt.total).toFixed(2)}</p>
            </div>
            <button
              onClick={() => shareOnWhatsApp(lastReceipt)}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-full font-bold text-sm hover:bg-green-700 active:scale-95 transition"
            >
              <MessageSquare size={16} />
              WhatsApp
            </button>
          </div>
        </motion.div>
      )}

      {/* Today's receipts list */}
      {todayReceipts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Today</h3>
          {todayReceipts.map((r) => (
            <div
              key={r.id}
              className="bg-white border border-black/10 rounded-xl p-4 flex justify-between items-center"
            >
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {r.paymentDetails?.customerDetails?.name || 'Walk-in'}
                </p>
                <p className="text-xs text-gray-500">{r.invoiceIdStr}</p>
                {r.note && <p className="text-xs text-gray-400 mt-0.5">{r.note}</p>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <p className="font-bold text-gray-900">₹{Number(r.total || 0).toFixed(2)}</p>
                <button
                  onClick={() => shareOnWhatsApp(r)}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-full transition"
                  title="Share on WhatsApp"
                >
                  <MessageSquare size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
