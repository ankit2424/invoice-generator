import { useState, useEffect } from 'react';
import { FileText, List, UserCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import DashboardView from './components/DashboardView';
import InvoicesView from './components/InvoicesView';
import ProfileView from './components/ProfileView';
import { doc, onSnapshot, db } from './lib/db';

export default function App() {
  const [user, setUser] = useState<any>({
    uid: 'dev-user-123',
    email: 'developer@payslipkit.local',
    displayName: 'Guest Developer',
    photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=developer'
  });
  const [activeTab, setActiveTab] = useState<string>('receipt');
  const [loading, setLoading] = useState(false);

  const login = async () => {};
  const loginAnonymously = async () => {};

  useEffect(() => {
    if (!user?.uid) return;
    const profileRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(profileRef, (docSnap: any) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUser((prevUser: any) => ({
          ...prevUser,
          displayName: data.name || prevUser.displayName,
          email: data.email || prevUser.email || 'developer@payslipkit.local'
        }));
      }
    });
    return () => unsubscribe();
  }, [user?.uid]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-[10%] left-[15%] opacity-20 pointer-events-none w-32 h-32 hidden md:block">
          <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M100 0L105 85L190 90L105 95L100 180L95 95L10 90L95 85L100 0Z" fill="black"/></svg>
        </div>
        <div className="absolute bottom-[15%] right-[10%] opacity-20 pointer-events-none w-24 h-24 hidden md:block">
           <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 100 Q 50 0, 100 100 T 200 100" stroke="black" strokeWidth="10" fill="none"/></svg>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-10 rounded-[40px] border-2 border-black max-w-sm w-full text-center relative z-10 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
        >
          <div className="mb-8 mt-2">
            <h1 className="text-4xl font-bold text-black tracking-tight mb-3 font-display">Payslipkit</h1>
            <p className="text-gray-600 text-sm leading-relaxed max-w-[250px] mx-auto">Quick payment receipts + daily sales record for local businesses.</p>
          </div>
          
          <button 
            onClick={login} 
            className="w-full bg-black text-white px-5 py-4 rounded-full font-bold hover:bg-gray-800 active:scale-[0.98] transition-all flex items-center justify-center gap-3 relative group overflow-hidden"
          >
            <motion.div 
               className="absolute inset-0 bg-white/10 -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" 
            />
            <svg className="w-5 h-5 relative z-10 bg-white rounded-full p-1" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="relative z-10 group-hover:tracking-wide transition-all duration-300">Sign in with Google</span>
          </button>

          <button 
            onClick={loginAnonymously} 
            className="w-full mt-3 bg-white text-black border-2 border-black px-5 py-4 rounded-full font-bold hover:bg-gray-50 active:scale-[0.98] transition-all flex items-center justify-center gap-3 relative group overflow-hidden"
          >
            <motion.div 
               className="absolute inset-0 bg-black/5 -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" 
            />
            <UserCircle className="w-5 h-5 relative z-10 text-black" />
            <span className="relative z-10 group-hover:tracking-wide transition-all duration-300">Continue as Guest</span>
          </button>
        </motion.div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'receipt': return <DashboardView user={user} />;
      case 'sales': return <InvoicesView user={user} />;
      case 'profile': return <ProfileView user={user} onUserUpdate={(newUser) => setUser(newUser)} />;
      default: return <DashboardView user={user} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-white flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-64 bg-white border-r border-black/10 flex-col shrink-0">
        <div className="h-20 flex items-center px-8 border-b border-black/10">
          <h1 className="text-2xl font-bold text-black tracking-tight font-display">Payslipkit</h1>
        </div>
        
        <div className="p-6 flex flex-col space-y-2 flex-1 overflow-y-auto">
          <button
            onClick={() => setActiveTab('receipt')}
            className={`flex items-center space-x-3 px-4 py-3 rounded-full text-sm font-medium transition-all relative ${activeTab === 'receipt' ? 'bg-black text-white' : 'text-gray-500 hover:text-black'}`}
          >
            {activeTab === 'receipt' && <motion.div layoutId="active-navIndicator" className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-1 h-1 bg-black rounded-full" />}
            <FileText size={20} />
            <span>Quick Receipt</span>
          </button>

          <button
            onClick={() => setActiveTab('sales')}
            className={`flex items-center space-x-3 px-4 py-3 rounded-full text-sm font-medium transition-all relative ${activeTab === 'sales' ? 'bg-black text-white' : 'text-gray-500 hover:text-black'}`}
          >
            {activeTab === 'sales' && <motion.div layoutId="active-navIndicator" className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-1 h-1 bg-black rounded-full" />}
            <List size={20} />
            <span>Daily Sales</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center space-x-3 px-4 py-3 rounded-full text-sm font-medium transition-all relative ${activeTab === 'profile' ? 'bg-black text-white' : 'text-gray-500 hover:text-black'}`}
          >
            {activeTab === 'profile' && <motion.div layoutId="active-navIndicator" className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-1 h-1 bg-black rounded-full" />}
            <UserCircle size={20} />
            <span>Business Profile</span>
          </button>
        </div>

        <div className="p-6 border-t border-black/10">
          <div className="flex items-center px-2">
            {user.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full bg-gray-100" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold">
                {(user.email || 'Guest').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-bold text-black truncate">{user.displayName || 'Guest Developer'}</p>
              <p className="text-xs text-gray-500 truncate">{user.email || 'guest@local.dev'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-black/10 flex items-center justify-between px-6 sticky top-0 z-10" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', minHeight: 'calc(4rem + env(safe-area-inset-top, 0px))' }}>
          <h1 className="text-xl font-bold text-black tracking-tight font-display">Payslipkit</h1>
          {user.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-black/10" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">
              {(user.email || 'Guest').charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full relative"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation - only 3 tabs */}
      <nav className="md:hidden shrink-0 bg-white border-t border-black/10 flex justify-around px-4 py-2 z-20" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <button onClick={() => setActiveTab('receipt')} className={`relative flex flex-col items-center p-2 min-w-0 transition-colors ${activeTab === 'receipt' ? 'text-black' : 'text-gray-400'}`}>
          <FileText size={22} strokeWidth={activeTab === 'receipt' ? 2.5 : 2} />
          <span className="text-[10px] mt-1 font-medium">Receipt</span>
        </button>
        <button onClick={() => setActiveTab('sales')} className={`relative flex flex-col items-center p-2 min-w-0 transition-colors ${activeTab === 'sales' ? 'text-black' : 'text-gray-400'}`}>
          <List size={22} strokeWidth={activeTab === 'sales' ? 2.5 : 2} />
          <span className="text-[10px] mt-1 font-medium">Sales</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`relative flex flex-col items-center p-2 min-w-0 transition-colors ${activeTab === 'profile' ? 'text-black' : 'text-gray-400'}`}>
          <UserCircle size={22} strokeWidth={activeTab === 'profile' ? 2.5 : 2} />
          <span className="text-[10px] mt-1 font-medium">Profile</span>
        </button>
      </nav>
    </div>
  );
}
