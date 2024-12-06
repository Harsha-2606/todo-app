import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyAyZayG7oehoaRoTBpK3taaVHrjMQ4IYUQ",
    authDomain: "todo-app-6c87f.firebaseapp.com",
    databaseURL: "https://todo-app-6c87f-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "todo-app-6c87f",
    storageBucket: "todo-app-6c87f.appspot.com",
    messagingSenderId: "810722690888",
    appId: "1:810722690888:web:3d3f82f30c1cd56ae3957d",
    measurementId: "G-D39G6HFR4R",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

export { app, db, auth };