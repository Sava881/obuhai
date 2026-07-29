import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";

export function useWorkspace(userId) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState("");
  const loaded = useRef(false);
  const lastRemote = useRef("");
  const saveTimer = useRef(null);

  useEffect(() => {
    if (!userId) return undefined;

    const ref = doc(db, "workspaces", userId);

    return onSnapshot(
      ref,
      async (snapshot) => {
        try {
          if (snapshot.exists()) {
            const nextClients = snapshot.data().clients || [];
            lastRemote.current = JSON.stringify(nextClients);
            setClients(nextClients);
          } else {
            const local = JSON.parse(localStorage.getItem("legalClients") || "[]");
            const initial = Array.isArray(local) ? local : [];
            setClients(initial);
            lastRemote.current = JSON.stringify(initial);

            await setDoc(ref, {
              ownerId: userId,
              clients: initial,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }

          loaded.current = true;
          setSyncError("");
        } catch (error) {
          console.error(error);
          setSyncError(error.message);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error(error);
        setSyncError(error.message);
        setLoading(false);
      }
    );
  }, [userId]);

  useEffect(() => {
    if (!userId || !loaded.current) return undefined;

    const serialized = JSON.stringify(clients);
    if (serialized === lastRemote.current) return undefined;

    clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(async () => {
      try {
        await setDoc(
          doc(db, "workspaces", userId),
          {
            ownerId: userId,
            clients,
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );

        lastRemote.current = serialized;
        setSyncError("");
      } catch (error) {
        console.error(error);
        setSyncError(error.message);
      }
    }, 500);

    return () => clearTimeout(saveTimer.current);
  }, [clients, userId]);

  return { clients, setClients, loading, syncError };
}
