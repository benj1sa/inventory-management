// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore'
import  { getStorage } from 'firebase/storage'
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBaKvzssYvKYbje2ez0WHodEDGjTcqE6LI",
  authDomain: "inventory-management-690cc.firebaseapp.com",
  projectId: "inventory-management-690cc",
  storageBucket: "inventory-management-690cc.appspot.com",
  messagingSenderId: "286082453508",
  appId: "1:286082453508:web:9531aa2a1cc641b808e551",
  measurementId: "G-DXQC3R34YK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const firestore = getFirestore(app);
export const storage = getStorage(app);