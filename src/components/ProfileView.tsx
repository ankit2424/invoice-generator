import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, db } from '../lib/db';
import { Save, UserCircle } from 'lucide-react';

export default function ProfileView({
  user,
  onUserUpdate
}: {
  user: any;
  onLogout?: () => void;
  onUserUpdate?: (newUser: any) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.displayName || '',
    storeName: '',
    phone: '',
    upiId: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.uid) return;
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData({
            name: data.name || user?.displayName || '',
            storeName: data.storeName || '',
            phone: data.phone || '',
            upiId: data.upiId || ''
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user?.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.storeName.trim()) {
      alert('Please enter business name');
      return;
    }
    setSaving(true);
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          name: formData.name.trim(),
          storeName: formData.storeName.trim(),
          phone: formData.phone.trim(),
          upiId: formData.upiId.trim(),
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );

      if (onUserUpdate) {
        onUserUpdate({
          ...user,
          displayName: formData.name.trim() || formData.storeName.trim()
        });
      }

      alert('Profile saved');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center text-gray-500">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-lg mx-auto space-y-6">
      <div className="flex items-center space-x-3">
        <UserCircle size={28} className="text-black" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Business Profile</h2>
          <p className="text-sm text-gray-500 mt-0.5">Shown on receipts and WhatsApp messages.</p>
        </div>
      </div>

      <div className="bg-white border border-black/10 rounded-2xl p-5 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Business name *
            </label>
            <input
              type="text"
              value={formData.storeName}
              onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/10 focus:border-black outline-none"
              placeholder="e.g. Sharma Coaching Center"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Your name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/10 focus:border-black outline-none"
              placeholder="e.g. Rahul Sharma"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/10 focus:border-black outline-none"
              placeholder="91XXXXXXXXXX"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              UPI ID / Payment ID
            </label>
            <input
              type="text"
              value={formData.upiId}
              onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black/10 focus:border-black outline-none"
              placeholder="e.g. business@upi"
            />
            <p className="text-xs text-gray-400 mt-1">
              Optional for now. Used later for QR / payment reference.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-black text-white px-6 py-3.5 rounded-full font-bold hover:bg-gray-800 active:scale-[0.98] transition disabled:opacity-60"
            >
              <Save size={18} />
              <span>{saving ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
