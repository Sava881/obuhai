import {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc
} from "firebase/firestore";

import { db } from "../firebase/firebase";

export function useCommercialOffers(userId) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState("");

  const loaded = useRef(false);
  const lastRemote = useRef("");
  const saveTimer = useRef(null);
  const localChangesPending = useRef(false);

  const updateOffers = useCallback(
    (nextValue) => {
      localChangesPending.current = true;
      setOffers(nextValue);
    },
    []
  );

  useEffect(() => {
    if (!userId) {
      return undefined;
    }

    const reference = doc(
      db,
      "commercialOffers",
      userId
    );

    return onSnapshot(
      reference,

      async (snapshot) => {
        try {
          if (snapshot.exists()) {
            const nextOffers =
              snapshot.data().items || [];

            const serializedRemote =
              JSON.stringify(nextOffers);

            if (!localChangesPending.current) {
              lastRemote.current =
                serializedRemote;

              setOffers(nextOffers);
            }
          } else {
            const initial = [];

            setOffers(initial);

            lastRemote.current =
              JSON.stringify(initial);

            await setDoc(reference, {
              ownerId: userId,
              items: initial,
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
    if (
      !userId ||
      !loaded.current
    ) {
      return undefined;
    }

    const serialized =
      JSON.stringify(offers);

    if (
      serialized === lastRemote.current
    ) {
      localChangesPending.current = false;
      return undefined;
    }

    clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(
      async () => {
        try {
          await setDoc(
            doc(
              db,
              "commercialOffers",
              userId
            ),
            {
              ownerId: userId,
              items: offers,
              updatedAt: serverTimestamp()
            },
            {
              merge: true
            }
          );

          lastRemote.current = serialized;
          localChangesPending.current = false;
          setSyncError("");
        } catch (error) {
          console.error(error);
          setSyncError(error.message);
        }
      },
      500
    );

    return () => {
      clearTimeout(saveTimer.current);
    };
  }, [offers, userId]);

  return {
    offers,
    setOffers: updateOffers,
    loading,
    syncError
  };
}