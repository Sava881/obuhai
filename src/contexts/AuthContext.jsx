import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import { phoneToLoginEmail } from "../utils/phone";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          setUser(null);
          setProfile(null);
          return;
        }

        const snapshot = await getDoc(doc(db, "users", firebaseUser.uid));

        if (!snapshot.exists()) {
          await signOut(auth);
          setUser(null);
          setProfile(null);
          return;
        }

        const data = snapshot.data();

        if (data.active === false) {
          await signOut(auth);
          setUser(null);
          setProfile(null);
          return;
        }

        setUser(firebaseUser);
        setProfile({ id: firebaseUser.uid, ...data });
      } catch (error) {
        console.error("Ошибка загрузки профиля:", error);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  async function login(phone, password) {
    const email = phoneToLoginEmail(phone);

    if (!email) throw new Error("Введите полный номер телефона.");
    if (!password || password.length < 6) {
      throw new Error("Пароль должен содержать не менее 6 символов.");
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error(error);
      throw new Error("Неверный номер телефона или пароль.");
    }
  }

  async function logout() {
    await signOut(auth);
  }

  const value = useMemo(
    () => ({ user, profile, loading, login, logout }),
    [user, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth используется вне AuthProvider");
  return value;
}
