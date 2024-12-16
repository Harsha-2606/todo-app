import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom'
import './styles/main.css';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signOut, signInWithPopup } from 'firebase/auth';
import { app } from './firebaseConfig';
import Dashboard from './components/Dashboard';
import Login from '../src/Login';
import { useLocation } from 'react-router-dom';

interface UserModal {
  displayName: string;
  token: string;
  email: string;
}
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

const AppRouter: React.FC = () => {
const [loading, setloading] = useState(true);
const [user, setUser] = useState<UserModal | undefined>(undefined);
const [tasks, setTasks] = useState<any[]>([]);

  const handleGoogleSignIn = async () => {
    try {
      const response = await signInWithPopup(auth, googleProvider);
      if(response.user.email &&
        response.user.displayName && response.providerId){
            setUser({
                email: response.user.email,
                displayName: response.user.displayName,
                token: response.providerId
              })
        }
     
    } catch (error) {
      console.error('Error during sign-in:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(undefined);
      console.log('User signed out');
    } catch (error) {
      console.error('Error during sign-out:', error);
    }
  };


useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        firebaseUser.getIdToken().then((token) => {
          setUser({
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '',
            token: token,
          });
        });
      } else {
        setUser(undefined);
      }
      setloading(false);
    });
    return () => unsubscribe();
  }, []);
  

useEffect(() => {
    console.log(user)
}, [user])

if (loading) {
  return (
    <div className="loading-container">
       <div className="loading-content">
         <img src="/images/todoist-logo.png" alt="Todoist Logo" className="loading-logo" />
         <div className="loading-spinner"></div>
       </div>
     </div>
   );
 }

  return (
    <Routes>
      <Route path="/" element={user ? <Dashboard user={user} handleSignOut={handleSignOut} tasks={tasks} setTasks={setTasks} /> : <Login handleGoogleSignIn={handleGoogleSignIn} />} />
      <Route path="/update" element={<UpdateWrapper />} />
    </Routes>
  );
};

const UpdateWrapper = () => {
  const { state } = useLocation();
  const taskId = state?.taskId;
    const currentTaskName = state?.currentTaskName;
    const currentDueDate = state?.currentDueDate;

  if (!taskId || !currentTaskName || !currentDueDate) {
    return <p>Error: Missing task details Please navigate from the dashboard.</p>;
  }
};

export default AppRouter;