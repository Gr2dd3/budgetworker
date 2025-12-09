import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyD8B8qwp91a6N8_B_hwds5j8jsGZhrFtyk",
    authDomain: "ourbudget-d2b40.firebaseapp.com",
    projectId: "ourbudget-d2b40",
    storageBucket: "ourbudget-d2b40.firebasestorage.app",
    messagingSenderId: "10785224419",
    appId: "1:10785224419:web:2bfa5295fb70102934f7d6",
    measurementId: "G-94E36FGRMZ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

/**
 * Försöker logga in en användare med e-post och lösenord.
 * @param {string} email - Användarens e-postadress.
 * @param {string} password - Användarens lösenord.
 * @returns {Promise<object>} Ett Promise som löses med användarobjektet vid framgång,
 *                       eller avvisas med ett felobjekt vid misslyckande.
 */
export async function signInUser(email, password) {
  try {
    console.log("trying to login");
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    // Returnera felobjektet för detaljerad hantering i UI
    return { success: false, error: error };
  }
}

// Du kan lägga till fler Firebase-relaterade funktioner här, t.ex. för utloggning, lösenordsåterställning, etc.