// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "parseflow-bdghq",
  "appId": "1:63140923560:web:7d6b94b28545babaf3da9d",
  "storageBucket": "parseflow-bdghq.firebasestorage.app",
  "apiKey": "AIzaSyC7aASP1OMDkzGAuxVN-6fSjBOL7mSxZ2o",
  "authDomain": "parseflow-bdghq.firebaseapp.com",
  "messagingSenderId": "63140923560"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export { app };
