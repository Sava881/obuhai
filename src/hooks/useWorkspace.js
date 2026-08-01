import {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";

export function useWorkspace(userId) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState("");

  const loaded = useRef(false);
const lastRemote = useRef("");
const saveTimer = useRef(null);

/*
 * Пока пользователь вводит данные,
 * серверный снимок не должен заменять
 * локальное незавершённое значение.
 */
const localChangesPending = useRef(false);

const updateClients = useCallback(
  (nextValue) => {
    /*
     * Ставим флаг до изменения состояния.
     * Это важно при быстром вводе цифр.
     */
    localChangesPending.current = true;

    setClients(nextValue);
  },
  []
);

  useEffect(() => {
    if (!userId) return undefined;

    const ref = doc(db, "workspaces", userId);

    return onSnapshot(
      ref,
      async (snapshot) => {
        try {
if (snapshot.exists()) {
  const nextClients =
    snapshot.data().clients || [];

  const serializedRemote =
    JSON.stringify(nextClients);

  /*
   * Если пользователь прямо сейчас меняет поля,
   * не подменяем его ввод предыдущей серверной
   * версией документа.
   */
  if (!localChangesPending.current) {
    lastRemote.current = serializedRemote;
    setClients(nextClients);
  }
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
localChangesPending.current = false;
setSyncError("");
} catch (error) {
  console.error(error);

  /*
   * Не сбрасываем localChangesPending:
   * пользовательские значения остаются
   * на экране и не заменяются старой копией.
   */
  setSyncError(error.message);
}
    }, 500);

    return () => clearTimeout(saveTimer.current);
  }, [clients, userId]);

return {
  clients,
  setClients: updateClients,
  loading,
  syncError
};

}
