
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, GithubAuthProvider, OAuthProvider, signOut, onAuthStateChanged, User, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
// Analytics disabled to prevent network errors in restricted environments
// import { getAnalytics } from "firebase/analytics";

// ------------------------------------------------------------------
// 🔴 CONFIGURATION: Firebase config loaded from environment variables.
// ------------------------------------------------------------------
// Set these in your .env file (see .env.example for reference).
// Ensure your domain is in Firebase Console -> Authentication -> Authorized Domains.
// ------------------------------------------------------------------

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

let db: ReturnType<typeof getFirestore> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
// Analytics disabled - causes network errors in restricted environments
// let analytics: any = null;
let isFirestoreAvailable = true; // Circuit breaker flag

try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    // Analytics disabled to prevent ERR_CONNECTION_CLOSED errors
    // analytics = getAnalytics(app);
} catch (e) {
    console.warn("Firebase Init Warning:", e);
    isFirestoreAvailable = false;
}

export interface UserRecord {
    id: string;
    username: string;
    email?: string;
    snapshot?: string; // Avatar URL
    loginTime: any;
    provider: string;
    isLocal: boolean;
}

// --- Helper: Mock User for Fallback ---
const createMockUser = (provider: string) => ({
    uid: `guest-${Date.now()}`,
    displayName: `Guest Operator`,
    email: `guest@${provider.toLowerCase()}.local`,
    photoURL: null,
    isAnonymous: true,
    providerData: []
});

// --- Helper: Local Storage Management (For Authenticated Users Offline Mode) ---
const saveToLocal = (user: User, provider: string) => {
    try {
        const existingStr = localStorage.getItem('gemini_demo_users');
        let users = existingStr ? JSON.parse(existingStr) : [];
        // Remove existing if any to update
        users = users.filter((u: any) => u.uid !== user.uid);

        users.push({
            id: user.uid,
            username: user.displayName || "User",
            email: user.email,
            snapshot: user.photoURL,
            provider: provider,
            lastLogin: { seconds: Date.now() / 1000 }, // Mock Firestore timestamp
            uid: user.uid,
            isLocal: true
        });
        localStorage.setItem('gemini_demo_users', JSON.stringify(users));
    } catch (e) { console.warn("Local storage error", e); }
};

// --- Helper: Robust Sign In Wrapper ---
const safeSignIn = async (authProvider: any, providerName: string) => {
    if (!auth) return { success: false, error: "Firebase Config Error: Auth not initialized" };
    try {
        // Race condition: If popup hangs, we timeout. 
        // 30s timeout to allow user interaction time.
        const result: any = await Promise.race([
            signInWithPopup(auth, authProvider),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Auth Timeout - Popup unresponsive")), 30000))
        ]);

        await saveUserToFirestore(result.user, providerName.toLowerCase());
        return { success: true, user: result.user };
    } catch (error: any) {
        console.warn(`${providerName} Auth Failed:`, error.message);
        // Return both message and code for better UI handling
        return { success: false, error: error.message, code: error.code };
    }
};

// --- REDIRECT FALLBACK (For Environments where Popups fail, e.g. IDX) ---
export const signInWithGoogleRedirect = async () => {
    if (!auth) return { success: false, error: "Firebase Auth not initialized" };
    try {
        await signInWithRedirect(auth, new GoogleAuthProvider());
        return { success: true };
    } catch (e: any) {
        console.error("Redirect Error", e);
        return { success: false, error: e.message, code: e.code };
    }
};

export const checkRedirectResult = async () => {
    if (!auth) return { success: false, error: null };
    try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
            await saveUserToFirestore(result.user, 'Google-Redirect');
            return { success: true, user: result.user };
        }
    } catch (error: any) {
        console.error("Redirect Result Error", error);
        return { success: false, error: error.message || "Redirect Failed", code: error.code };
    }
    return { success: false, error: null };
};

// --- Explicit Guest Login ---
export const signInAsGuest = async () => {
    const guestUser = createMockUser('Guest') as unknown as User;
    saveToLocal(guestUser, 'guest');
    return { success: true, user: guestUser };
};

// --- Auth Providers ---

export const signInWithGoogle = async () => safeSignIn(new GoogleAuthProvider(), 'Google');

export const signInWithGithub = async () => safeSignIn(new GithubAuthProvider(), 'GitHub');

export const signInWithApple = async () => safeSignIn(new OAuthProvider('apple.com'), 'Apple');

export const registerWithEmail = async (email: string, pass: string) => {
    if (!auth) return { success: false, error: "Firebase Auth not initialized" };
    try {
        const result = await createUserWithEmailAndPassword(auth, email, pass);
        await saveUserToFirestore(result.user, 'Email');
        return { success: true, user: result.user };
    } catch (e: any) {
        return { success: false, error: e.message, code: e.code };
    }
};

export const signInWithEmail = async (email: string, pass: string) => {
    if (!auth) return { success: false, error: "Firebase Auth not initialized" };
    try {
        const result = await signInWithEmailAndPassword(auth, email, pass);
        await saveUserToFirestore(result.user, 'Email');
        return { success: true, user: result.user };
    } catch (e: any) {
        return { success: false, error: e.message, code: e.code };
    }
};

export const signOutUser = async () => {
    if (!auth) return;
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Sign Out Error", error);
    }
};

// --- User Persistence ---

const saveUserToFirestore = async (user: User, providerName: string) => {
    if (user.isAnonymous) return;

    // Try Firestore first, ONLY if marked as available
    if (db && isFirestoreAvailable) {
        try {
            const userRef = doc(db, "users", user.uid);
            await setDoc(userRef, {
                username: user.displayName || "Anonymous",
                email: user.email,
                snapshot: user.photoURL,
                provider: providerName,
                lastLogin: serverTimestamp(),
                uid: user.uid
            }, { merge: true });
            return;
        } catch (e: any) {
            console.warn("Firestore save failed (switching to local storage mode):", e.message);
            // Check for specific error codes that indicate persistent failure
            if (
                e.code === 'permission-denied' ||
                e.code === 'unavailable' ||
                e.message?.includes('Cloud Firestore API')
            ) {
                isFirestoreAvailable = false;
            }
        }
    }

    // Fallback if DB is null, unavailable, or save failed
    saveToLocal(user, providerName);
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
    if (!auth) return () => { };
    return onAuthStateChanged(auth, callback);
};

export const getUsers = async (): Promise<UserRecord[]> => {
    const allUsers: UserRecord[] = [];

    // Helper: timeout wrapper
    const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
        return Promise.race([
            promise,
            new Promise<T>((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), ms)
            )
        ]);
    };

    // 1. Try Firestore with timeout (Circuit Breaker check)
    if (db && isFirestoreAvailable) {
        try {
            const querySnapshot = await withTimeout(getDocs(collection(db, "users")), 3000);
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                allUsers.push({
                    id: doc.id,
                    username: data.username || "Unknown",
                    email: data.email,
                    snapshot: data.snapshot,
                    loginTime: data.lastLogin,
                    provider: data.provider || 'unknown',
                    isLocal: false
                });
            });
        } catch (e: any) {
            console.warn("Firestore fetch failed (timeout or error), falling back to local storage:", e.message);
            // Disable Firestore for this session to avoid repeated failures
            isFirestoreAvailable = false;
        }
    }

    // 2. Load Local Users (Always load local users to merge, or as fallback)
    try {
        const existingStr = localStorage.getItem('gemini_demo_users');
        if (existingStr) {
            const parsed = JSON.parse(existingStr);
            // Deduplicate based on ID if FS worked
            parsed.forEach((u: any) => {
                if (!allUsers.find(existing => existing.id === u.id)) {
                    allUsers.push({ ...u, isLocal: true });
                }
            });
        }
    } catch (e) { }

    return allUsers;
};

export const deleteUser = async (id: string, isLocal: boolean): Promise<boolean> => {
    if (isLocal) {
        const existingStr = localStorage.getItem('gemini_demo_users');
        if (!existingStr) return false;
        let users = JSON.parse(existingStr);
        users = users.filter((u: any) => u.id !== id);
        localStorage.setItem('gemini_demo_users', JSON.stringify(users));
        return true;
    } else if (db && isFirestoreAvailable) {
        try {
            await deleteDoc(doc(db, "users", id));
            return true;
        } catch (e: any) {
            console.warn("Firestore delete failed:", e);
            if (e.code === 'permission-denied' || e.message?.includes('Cloud Firestore API')) {
                isFirestoreAvailable = false;
            }
            return false;
        }
    }
    return false;
};

export const isFirebaseConfigured = () => auth !== null;
