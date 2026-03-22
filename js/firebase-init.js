import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCb_IX8i1L44PQ1XjLXwNb8XuFs4Zfiqvc",
  authDomain: "nriigbo-a9e30.firebaseapp.com",
  projectId: "nriigbo-a9e30",
  storageBucket: "nriigbo-a9e30.firebasestorage.app",
  messagingSenderId: "604677483818",
  appId: "1:604677483818:web:5dbf9ef2aa4a6cf9888253",
  databaseURL: "https://nriigbo-a9e30-default-rtdb.firebaseio.com",
};

const app = initializeApp(firebaseConfig);
export { app };
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
