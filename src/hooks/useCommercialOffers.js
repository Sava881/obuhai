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
  const [offers, setOffersState] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState("");

  const loaded = useRef(false);
  const lastRemote = useRef("");
  const saveTimer = useRef(null);

  /*
   * Последняя актуальная локальная версия.
   * Нужна, чтобы быстрый ввод не заменялся
   * более старым снимком из Firebase.
   */
  const latestOffersRef = useRef([]);

  /*
   * Номер локального изменения.
   * Каждое нажатие клавиши увеличивает его.
   */
  const changeVersionRef = useRef(0);

  /*
   * true — пока имеются изменения,
   * ещё не подтверждённые последним сохранением.
   */
  const localChangesPending = useRef(false);

  const setOffers = useCallback((nextValue) => {
    localChangesPending.current = true;
    changeVersionRef.current += 1;

    setOffersState((currentOffers) => {
      const resolvedOffers =
        typeof nextValue === "function"
          ? nextValue(currentOffers)
          : nextValue;

      const safeOffers = Array.isArray(resolvedOffers)
        ? resolvedOffers
        : [];

      latestOffersRef.current = safeOffers;

      return safeOffers;
    });
  }, []);

  useEffect(() => {
    if (!userId) {
      return undefined;
    }

    loaded.current = false;
    localChangesPending.current = false;
    changeVersionRef.current = 0;

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
            const nextOffers = Array.isArray(
              snapshot.data().items
            )
              ? snapshot.data().items
              : [];

            const serializedRemote =
              JSON.stringify(nextOffers);

            /*
             * Пока пользователь что-то вводит,
             * серверный снимок не заменяет
             * незавершённое локальное значение.
             */
            if (!localChangesPending.current) {
              lastRemote.current =
                serializedRemote;

              latestOffersRef.current =
                nextOffers;

              setOffersState(nextOffers);
            }
          } else {
            const initial = [];

            latestOffersRef.current = initial;
            setOffersState(initial);

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
          console.error(
            "Ошибка загрузки КП:",
            error
          );

          setSyncError(error.message);
        } finally {
          setLoading(false);
        }
      },

      (error) => {
        console.error(
          "Ошибка подписки на КП:",
          error
        );

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

    if (serialized === lastRemote.current) {
      if (
        JSON.stringify(latestOffersRef.current) ===
        serialized
      ) {
        localChangesPending.current = false;
      }

      return undefined;
    }

    clearTimeout(saveTimer.current);

    /*
     * Запоминаем номер именно этой версии.
     * Более старое сохранение не сможет снять
     * флаг с более нового ввода.
     */
    const savingVersion =
      changeVersionRef.current;

    saveTimer.current = window.setTimeout(
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

          /*
           * Сбрасываем ожидание только тогда,
           * когда после начала сохранения
           * пользователь ничего нового не ввёл.
           */
          if (
            changeVersionRef.current ===
            savingVersion
          ) {
            lastRemote.current = serialized;
            localChangesPending.current = false;
          }

          setSyncError("");
        } catch (error) {
          console.error(
            "Ошибка сохранения КП:",
            error
          );

          /*
           * Не сбрасываем pending:
           * введённый текст остаётся на экране.
           */
          setSyncError(error.message);
        }
      },
      700
    );

    return () => {
      window.clearTimeout(
        saveTimer.current
      );
    };
  }, [offers, userId]);

  return {
    offers,
    setOffers,
    loading,
    syncError
  };
}