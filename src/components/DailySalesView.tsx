import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, db } from '../lib/db';
import { MessageSquare } from 'lucide-react';

export default function DailySalesView({ user }: { user: any }) {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
      setReceipts(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const todayReceipts = receipts.filter((r) => {
    const date = (r.date || r.createdAt || '').toString().slice(0, 10);
    return date === todayStr;
  });

  const todayTotal = todayReceipts.reduce((sum, r) => sum + Number(r.total || 0), 0);
  const allTotal = receipts.reduce((sum, r) => sum + Number(r.total || 0), 0);

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

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center text-gray-500">
        Loading sales...
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-lg mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Daily Sales</h2>
        <p className="text-sm text-gray-500 mt-1">Today's receipts and totals.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-black text-white rounded-2xl p-4">
          <p className="text-xs text-white/70 uppercase tracking-wider">Today</p>
          <p className="text-xl font-bold mt-1">₹{todayTotal.toFixed(2)}</p>
          <p className="text-xs text-white/60 mt-1">{todayReceipts.length} receipts</p>
        </div>
        <div className="bg-white border border-black/10 rounded-2xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">All time</p>
          <p className="text-xl font-bold text-gray-900 mt-1">₹{allTotal.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">{receipts.length} receipts</p>
        </div>
      </div>

      {/* Today's list */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Today</h3>

        {todayReceipts.length === 0 ? (
          <div className="bg-white border border-black/10 rounded-2xl p-8 text-center">
            <p className="text-gray-500 text-sm">No receipts yet today.</p>
            <p className="text-gray-400 text-xs mt-1">Create one from Quick Receipt.</p>
          </div>
        ) : (
          todayReceipts.map((r) => (
            <div
              key={r.id}
              className="bg-white border border-black/10 rounded-xl p-4 flex justify-between items-center"
            >
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {r.paymentDetails?.customerDetails?.name || 'Walk-in'}
                </p>
                <p className="text-xs text-gray-500">
                  {r.invoiceIdStr} · {formatTime(r.createdAt)}
                </p>
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
          ))
        )}
      </div>

      {/* Earlier receipts (if any beyond today) */}
      {receipts.length > todayReceipts.length && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Earlier</h3>
          {receipts
            .filter((r) => {
              const date = (r.date || r.createdAt || '').toString().slice(0, 10);
              return date !== todayStr;
            })
            .slice(0, 20)
            .map((r) => (
              <div
                key={r.id}
                className="bg-white border border-black/5 rounded-xl p-4 flex justify-between items-center opacity-90"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {r.paymentDetails?.customerDetails?.name || 'Walk-in'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {r.invoiceIdStr} · {formatDate(r.createdAt || r.date)}
                  </p>
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
