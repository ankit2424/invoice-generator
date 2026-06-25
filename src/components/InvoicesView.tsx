import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Plus, Edit2, Trash2, X, Download, Search, MessageSquare, Mail, ExternalLink, Filter, Send } from 'lucide-react';
import { motion } from 'motion/react';

export default function InvoicesView({ user }: { user: any }) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Form State
  const [invoiceIdStr, setInvoiceIdStr] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [status, setStatus] = useState('Draft');

  const fetchData = async () => {
    setLoading(true);
    try {
      const invoicesQ = query(collection(db, "invoices"), where("userId", "==", user.uid));
      const customersQ = query(collection(db, "customers"), where("userId", "==", user.uid));
      const productsQ = query(collection(db, "products"), where("userId", "==", user.uid));

      const [invSnap, custSnap, prodSnap] = await Promise.all([
        getDocs(invoicesQ),
        getDocs(customersQ),
        getDocs(productsQ)
      ]);

      const invList = invSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const custList = custSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const prodList = prodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setInvoices(invList);
      setCustomers(custList);
      setProducts(prodList);
    } catch (e) {
      console.error("Error fetching data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const handleCreateNew = () => {
    const nextId = (invoices.length + 1).toString().padStart(3, '0');
    setInvoiceIdStr(`INV-${nextId}`);
    setCustomerId('');
    setDate(new Date().toISOString().split('T')[0]);
    // default due date to 14 days from now
    const next14Days = new Date();
    next14Days.setDate(next14Days.getDate() + 14);
    setDueDate(next14Days.toISOString().split('T')[0]);
    setItems([{ productId: '', quantity: 1, price: 0 }]);
    setStatus('Draft');
    setIsModalOpen(true);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  };

  const handleProductSelect = (index: number, productId: string) => {
    const newItems = [...items];
    const product = products.find(p => p.id === productId);
    newItems[index] = {
      ...newItems[index],
      productId,
      price: product ? product.price : 0
    };
    setItems(newItems);
  };

  const addNewItemLine = () => {
    setItems([...items, { productId: '', quantity: 1, price: 0 }]);
  };

  const removeItemLine = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || items.length === 0 || !items[0].productId) {
      alert("Please select a customer and add at least one product.");
      return;
    }

    try {
      const invoiceData = {
        userId: user.uid,
        invoiceIdStr,
        customerId,
        date,
        dueDate,
        items,
        total: calculateTotal(),
        status,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, "invoices"), invoiceData);
      setIsModalOpen(false);
      fetchData();
    } catch (e) {
      console.error("Error saving invoice", e);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this invoice?")) {
      try {
        await deleteDoc(doc(db, "invoices", id));
        fetchData();
      } catch (e) {
        console.error("Error deleting invoice", e);
      }
    }
  };

  const getCustomerName = (invoice: any) => {
    if (invoice.paymentDetails?.customerDetails?.name) {
      return invoice.paymentDetails.customerDetails.name;
    }
    return customers.find(c => c.id === invoice.customerId)?.name || 'Unknown Customer';
  };

  const handleResendInvoice = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoice/${invoiceId}/resend`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert("Invoice resent successfully");
      } else {
        alert("Failed to resend: " + data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Error resending invoice");
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      (inv.invoiceIdStr || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      getCustomerName(inv).toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

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
      className="p-4 sm:p-8 max-w-7xl mx-auto"
    >
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Invoices</h2>
          <p className="text-sm text-gray-500 mt-1">Manage and track your customer invoices.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search invoices..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:max-w-[200px] pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
            />
          </div>
          <div className="relative w-full sm:w-auto">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white cursor-pointer font-medium"
            >
              <option value="All">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Draft">Draft</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
          <button 
            onClick={handleCreateNew}
            className="flex items-center justify-center space-x-2 bg-black text-white px-5 py-3 rounded-full font-bold hover:bg-gray-800 active:scale-95 transition-all shadow-sm w-full sm:w-auto"
          >
            <Plus size={18} />
            <span>Create</span>
          </button>
        </div>
      </motion.div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 flex items-center justify-center"><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: "linear", duration: 1 }} className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full" /></div>
      ) : invoices.length === 0 ? (
        <motion.div variants={itemVariants} className="bg-white border border-black/10 shadow-sm rounded-2xl p-12 text-center">
          <motion.div 
            animate={{ scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="w-16 h-16 border border-black/10 rounded-full flex items-center justify-center mx-auto mb-4 text-black"
          >
            <Plus size={32} />
          </motion.div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">No invoices yet</h3>
          <p className="text-gray-500 mb-6 text-sm">Create your first invoice to get started.</p>
          <button 
            onClick={handleCreateNew}
            className="text-black font-bold hover:underline transition-colors"
          >
            + Create Invoice
          </button>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="bg-white border border-black/10 shadow-sm rounded-2xl overflow-hidden overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Invoice ID</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredInvoices.map((invoice) => (
                <motion.tr 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  key={invoice.id} className="hover:bg-gray-50 transition-colors group"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-bold text-gray-900 border-b border-dashed border-gray-300 pb-0.5">
                      {invoice.invoiceIdStr}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{getCustomerName(invoice)}</div>
                    {invoice.paymentDetails?.customerDetails?.phone && (
                      <div className="text-xs text-gray-500 mt-1">{invoice.paymentDetails.customerDetails.phone}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {invoice.date || new Date(invoice.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      invoice.status === 'Paid' ? 'bg-green-100 text-green-800' :
                      invoice.status === 'Draft' ? 'bg-gray-100 text-gray-800' :
                      invoice.status === 'Failed' ? 'bg-red-100 text-red-800' :
                      invoice.status === 'Review Required' ? 'bg-purple-100 text-purple-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {invoice.status}
                    </span>
                    {invoice.deliveryStatus && (
                      <div className={`mt-1 text-xs flex flex-col ${
                        invoice.deliveryStatus === 'Sent' ? 'text-blue-600' :
                        invoice.deliveryStatus === 'Failed' ? 'text-red-600 font-medium' :
                        'text-amber-500'
                      }`}>
                        <span>Deliv: {invoice.deliveryStatus}</span>
                        {invoice.deliveryStatus === 'Failed' && invoice.deliveryError && (
                          <span className="text-[10px] font-normal max-w-[150px] truncate" title={invoice.deliveryError}>
                            {invoice.deliveryError}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">${Number(invoice.total || 0).toFixed(2)}</span>
                    {invoice.status === 'Review Required' && (
                      <div className="mt-1 text-xs text-purple-600">
                        Paid: ${invoice.paymentDetails?.amount?.toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex gap-3 justify-end items-center h-[72px]">
                    {invoice.status === 'Review Required' && (
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/invoice/${invoice.invoiceIdStr}/resolve-mismatch`, { method: 'POST' });
                            const data = await res.json();
                            if (data.success) alert('Mismatch resolved successfully');
                            else alert('Failed to resolve: ' + data.message);
                          } catch (e) {
                            alert('Error resolving mismatch');
                          }
                        }}
                        className="bg-black text-white px-3 py-1 rounded-full hover:bg-gray-800 transition font-medium text-xs mr-2"
                      >
                        Accept & Fix
                      </button>
                    )}
                    <a
                      href={`/api/invoice/${invoice.invoiceIdStr}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-black hover:text-gray-600 font-medium text-xs flex items-center gap-1 pr-2 border-r border-black/10"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" /> PDF
                    </a>
                    {invoice.invoiceUrl && (
                      <>
                        <button
                          onClick={() => {
                            const phone = invoice.paymentDetails?.customerDetails?.phone;
                            if (!phone) return alert('No phone number');
                            const text = encodeURIComponent(`Hi ${invoice.paymentDetails?.customerDetails?.name || ''}, your invoice ${invoice.invoiceIdStr} for $${invoice.total} is ready. You can view it here: ${invoice.invoiceUrl}`);
                            window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${text}`, '_blank');
                          }}
                          className="text-green-600 hover:text-green-800 font-medium text-xs flex items-center gap-1"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            const email = invoice.paymentDetails?.customerDetails?.email;
                            if (!email) return alert('No email address provided');
                            const subject = encodeURIComponent(`Invoice ${invoice.invoiceIdStr}`);
                            const body = encodeURIComponent(`Hi ${invoice.paymentDetails?.customerDetails?.name || ''},\n\nYour invoice is ready. View it here: ${invoice.invoiceUrl}\n\nTotal: $${invoice.total}`);
                            window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
                          }}
                          className="text-blue-600 hover:text-blue-800 font-medium text-xs flex items-center gap-1"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleResendInvoice(invoice.invoiceIdStr)}
                          className="text-gray-600 hover:text-gray-900 font-medium text-xs flex items-center gap-1 pr-2 border-r border-gray-200"
                          title="Resend via System"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => handleDelete(invoice.id)}
                      className="text-red-500 hover:text-red-700 ml-1"
                      title="Delete Invoice"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* CREATE INVOICE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">
                New Invoice
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="invoice-form" onSubmit={handleSaveInvoice} className="space-y-6">
                
                {/* Header Information */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Invoice #</label>
                    <input
                      type="text"
                      readOnly
                      value={invoiceIdStr}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700 font-mono"
                    />
                  </div>
                  
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Sent">Sent</option>
                      <option value="Paid">Paid</option>
                    </select>
                  </div>

                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                  <select
                    required
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  >
                    <option value="" disabled>Select a customer...</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.customerCode})</option>
                    ))}
                  </select>
                </div>

                {/* Line Items */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 border-b pb-2 mb-3 mt-6">Line Items</h4>
                  
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div key={index} className="flex gap-3 items-start">
                        <div className="flex-1">
                          <select
                            required
                            value={item.productId}
                            onChange={(e) => handleProductSelect(index, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                          >
                            <option value="" disabled>Select product...</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name} - ${p.price}</option>
                            ))}
                          </select>
                        </div>
                        <div className="w-24">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[index].quantity = parseInt(e.target.value) || 1;
                              setItems(newItems);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            title="Quantity"
                          />
                        </div>
                        <div className="w-28 text-right px-3 py-2 bg-gray-50 rounded-lg text-sm font-medium text-gray-700">
                          ${(item.quantity * item.price).toFixed(2)}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItemLine(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition mt-0.5"
                          disabled={items.length === 1}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addNewItemLine}
                    className="mt-3 text-sm text-indigo-600 font-medium hover:text-indigo-700 flex items-center"
                  >
                    <Plus size={16} className="mr-1" /> Add Line Item
                  </button>
                </div>

                {/* Totals */}
                <div className="pt-4 border-t flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-base font-bold text-gray-900">
                      <span>Grand Total</span>
                      <span>${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>

              </form>
            </div>

            <div className="px-6 py-4 border-t border-black/10 flex justify-end bg-gray-50/50 space-x-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="bg-white border border-black/10 text-black px-6 py-3 rounded-full font-bold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="invoice-form"
                className="bg-black text-white px-6 py-3 rounded-full font-bold hover:bg-gray-800 transition"
              >
                Save Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

