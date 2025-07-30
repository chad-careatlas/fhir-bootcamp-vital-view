// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "vitalview-kygt8",
  "appId": "1:805830616244:web:83ca77119dc3988db463e1",
  "storageBucket": "vitalview-kygt8.firebasestorage.app",
  "apiKey": "AIzaSyDH2o61nT_RZlMR2vZ2hLxv53_s5znW8AY",
  "authDomain": "vitalview-kygt8.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "805830616244"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export { app };
