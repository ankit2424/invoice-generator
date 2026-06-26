class MockAuth {
  private listeners: ((user: any) => void)[] = [];
  public currentUser: any = null;

  constructor() {
    const savedUser = localStorage.getItem('mock_user');
    if (savedUser) {
      this.currentUser = JSON.parse(savedUser);
    }
  }

  onAuthStateChanged(callback: (user: any) => void) {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private emit() {
    this.listeners.forEach(l => l(this.currentUser));
  }

  async signInWithPopup() {
    const user = {
      uid: 'dev-user-123',
      email: 'developer@creatiwise.local',
      displayName: 'Guest Developer',
      photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=developer',
      getIdToken: async () => 'mock-token-xyz-123'
    };
    this.currentUser = user;
    localStorage.setItem('mock_user', JSON.stringify(user));
    this.emit();
    return { user };
  }

  async signInAnonymously() {
    const user = {
      uid: 'guest-user-999',
      email: null,
      displayName: 'Guest User',
      photoURL: null,
      getIdToken: async () => 'mock-token-guest-999'
    };
    this.currentUser = user;
    localStorage.setItem('mock_user', JSON.stringify(user));
    this.emit();
    return { user };
  }

  async signOut() {
    this.currentUser = null;
    localStorage.removeItem('mock_user');
    this.emit();
  }
}

const authInstance = new MockAuth();

export function getAuth() {
  return authInstance;
}

export function signInWithPopup() {
  return authInstance.signInWithPopup();
}

export function signInAnonymously() {
  return authInstance.signInAnonymously();
}

export function signOut() {
  return authInstance.signOut();
}

export class GoogleAuthProvider {}
