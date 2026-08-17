import { useCallback, useEffect, useRef, useState } from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";

const EMPTY_DATA = {
  tasks: [],
  notes: []
};

export function useAdminTasks(userId) {
  const [data, setDataState] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState("");

  const loaded = useRef(false);
  const lastRemote = useRef("");
  const saveTimer = useRef(null);
  const localChangesPending = useRef(false);

  const setData = useCallback((nextValue) => {
    localChangesPending.current = true;

    setDataState((current) => {
      const resolved = typeof nextValue === "function" ? nextValue(current) : nextValue;

      return {
        tasks: Array.isArray(resolved?.tasks) ? resolved.tasks : [],
        notes: Array.isArray(resolved?.notes) ? resolved.notes : []
      };
    });
  }, []);

  useEffect(() => {
    if (!userId) return undefined;

    loaded.current = false;
    setLoading(true);

    const reference = doc(db, "adminTasks", userId);

    return onSnapshot(
      reference,
      async (snapshot) => {
        try {
          if (snapshot.exists()) {
            const remote = {
              tasks: Array.isArray(snapshot.data().tasks) ? snapshot.data().tasks : [],
              notes: Array.isArray(snapshot.data().notes) ? snapshot.data().notes : []
            };

            if (!localChangesPending.current) {
              lastRemote.current = JSON.stringify(remote);
              setDataState(remote);
            }
          } else {
            const initial = { tasks: [], notes: [] };
            setDataState(initial);
            lastRemote.current = JSON.stringify(initial);

            await setDoc(reference, {
              ownerId: userId,
              ...initial,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }

          loaded.current = true;
          setSyncError("");
        } catch (error) {
          console.error("Ошибка загрузки задач:", error);
          setSyncError(error.message);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error("Ошибка подписки на задачи:", error);
        setSyncError(error.message);
        setLoading(false);
      }
    );
  }, [userId]);

  useEffect(() => {
    if (!userId || !loaded.current) return undefined;

    const serialized = JSON.stringify(data);
    if (serialized === lastRemote.current) return undefined;

    window.clearTimeout(saveTimer.current);

    saveTimer.current = window.setTimeout(async () => {
      try {
        await setDoc(
          doc(db, "adminTasks", userId),
          {
            ownerId: userId,
            tasks: data.tasks,
            notes: data.notes,
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );

        lastRemote.current = serialized;
        localChangesPending.current = false;
        setSyncError("");
      } catch (error) {
        console.error("Ошибка сохранения задач:", error);
        setSyncError(error.message);
      }
    }, 500);

    return () => window.clearTimeout(saveTimer.current);
  }, [data, userId]);

  return {
    tasks: data.tasks,
    notes: data.notes,
    setTasks: (updater) =>
      setData((current) => ({
        ...current,
        tasks: typeof updater === "function" ? updater(current.tasks) : updater
      })),
    setNotes: (updater) =>
      setData((current) => ({
        ...current,
        notes: typeof updater === "function" ? updater(current.notes) : updater
      })),
    loading,
    syncError
  };
}
