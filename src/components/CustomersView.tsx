import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, db } from '../lib/db';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { motion } from 'motion/react';

export default function CustomersView({ user }: { user: any }) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    customerCode: ''
  });

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "customers"), where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      const items: any[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      setCustomers(items);
    } catch (e) {
      console.error("Error fetching customers", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchCustomers();
  }, [user]);

  const handleOpenModal = (customer: any = null) => {
    if (customer) {
      setEditingId(customer.id);
      setFormData({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        customerCode: customer.customerCode || ''
      });
    } else {
      setEditingId(null);
      // Auto-suggest a formatted ID based on current count
      const nextId = (customers.length + 1).toString().padStart(3, '0');
      setFormData({ name: '', email: '', phone: '', customerCode: `CUST-${nextId}` });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: '', email: '', phone: '', customerCode: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.customerCode) return;

    try {
      const customerData = {
        userId: user.uid,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        customerCode: formData.customerCode
      };

      if (editingId) {
        await updateDoc(doc(db, "customers", editingId), customerData);
      } else {
        await addDoc(collection(db, "customers"), customerData);
      }
      
      handleCloseModal();
      fetchCustomers();
    } catch (e) {
      console.error("Error saving customer", e);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this customer?")) {
      try {
        await deleteDoc(doc(db, "customers", id));
        fetchCustomers();
      } catch (e) {
        console.error("Error deleting customer", e);
      }
    }
  };

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
      <motion.div variants={itemVariants} className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Customers</h2>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center space-x-2 bg-black text-white px-5 py-3 rounded-full font-bold hover:bg-gray-800 active:scale-95 transition-all shadow-md"
        >
          <Plus size={20} />
          <span>Add Customer</span>
        </button>
      </motion.div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 flex items-center justify-center"><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: "linear", duration: 1 }} className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full" /></div>
      ) : customers.length === 0 ? (
        <motion.div variants={itemVariants} className="bg-white border border-black/10 shadow-sm rounded-2xl p-12 text-center">
          <div className="w-16 h-16 border border-black/10 rounded-full flex items-center justify-center mx-auto mb-4 text-black">
            <Plus size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">No customers yet</h3>
          <p className="text-gray-500 mb-6 text-sm">Get started by adding your first customer.</p>
          <button 
            onClick={() => handleOpenModal()}
            className="text-black font-bold hover:underline transition-colors"
          >
            + Add Customer
          </button>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="bg-white border border-black/10 shadow-sm rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {customers.map((customer) => (
                <motion.tr 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  key={customer.id} className="hover:bg-gray-50 transition-colors group"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-md bg-gray-100 text-gray-800 border border-black/10">
                      {customer.customerCode}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{customer.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{customer.email || '—'}</div>
                    <div className="text-sm text-gray-500">{customer.phone || '—'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => handleOpenModal(customer)}
                      className="text-black hover:text-gray-600 mr-4 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(customer.id)}
                      className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          </div>
        </motion.div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 transition">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer ID / Code</label>
                  <input
                    type="text"
                    value={formData.customerCode}
                    onChange={(e) => setFormData({ ...formData, customerCode: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 font-mono"
                    placeholder="e.g. CUST-001"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">This is a readable ID used for invoices and references.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name or Company</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700"
                    placeholder="e.g. Acme Corp"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700"
                      placeholder="+1..."
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex space-x-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-white border border-black/10 text-black px-4 py-3 rounded-full font-bold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-black text-white px-4 py-3 rounded-full font-bold hover:bg-gray-900 transition"
                >
                  {editingId ? 'Save Changes' : 'Add Customer'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
