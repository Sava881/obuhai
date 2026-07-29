import {
  deleteApp,
  initializeApp
} from "firebase/app";

import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  signOut,
  updateProfile
} from "firebase/auth";

import {
  doc,
  serverTimestamp,
  updateDoc,
  writeBatch
} from "firebase/firestore";

import {
  db,
  firebaseConfig
} from "../firebase/firebase";

import {
  normalizePhone,
  phoneToLoginEmail
} from "../utils/phone";

export async function createAdministrator(data) {
const name = String(
  data?.name || ""
).trim();

const phone = normalizePhone(
  data?.phone
);

const city = String(
  data?.city || ""
).trim();

const birthDate = String(
  data?.birthDate || ""
).trim();

const password = String(
  data?.password || ""
);

  if (name.length < 2) {
    throw new Error("Укажите имя администратора.");
  }

if (!phone) {
  throw new Error(
    "Введите полный номер телефона."
  );
}

if (!city) {
  throw new Error(
    "Укажите город администратора."
  );
}

if (
  !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)
) {
  throw new Error(
    "Укажите дату рождения администратора."
  );
}

if (password.length < 6) {
    throw new Error(
      "Пароль должен содержать не менее 6 символов."
    );
  }

  const email = phoneToLoginEmail(phone);

  /*
   * Используем отдельный экземпляр Firebase.
   * Поэтому аккаунт техподдержки не будет заменён
   * новым аккаунтом администратора.
   */
  const secondaryApp = initializeApp(
    firebaseConfig,
    `create-user-${Date.now()}`
  );

  const secondaryAuth = getAuth(secondaryApp);

  let createdUser = null;

  try {
    const credential =
      await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        password
      );

    createdUser = credential.user;

    await updateProfile(createdUser, {
      displayName: name
    });

    const batch = writeBatch(db);

    const userReference = doc(
      db,
      "users",
      createdUser.uid
    );

    const workspaceReference = doc(
      db,
      "workspaces",
      createdUser.uid
    );

batch.set(userReference, {
  name,
  phone,
  city,
  birthDate,
  role: "administrator",
  active: true,
  createdAt: serverTimestamp()
});

    batch.set(workspaceReference, {
      ownerId: createdUser.uid,
      clients: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await batch.commit();

    return {
      success: true,
      userId: createdUser.uid
    };
  } catch (error) {
    console.error(
      "Ошибка создания администратора:",
      error
    );

    /*
     * Если Auth-пользователь создался,
     * а Firestore не сохранился,
     * удаляем незавершённый аккаунт.
     */
    if (createdUser) {
      try {
        await deleteUser(createdUser);
      } catch (deleteError) {
        console.error(
          "Не удалось удалить незавершённый аккаунт:",
          deleteError
        );
      }
    }

    if (
      error.code === "auth/email-already-in-use"
    ) {
      throw new Error(
        "Администратор с таким телефоном уже существует."
      );
    }

    if (error.code === "auth/weak-password") {
      throw new Error(
        "Придумайте более надёжный пароль."
      );
    }

    if (
      error.code === "permission-denied" ||
      error.code === "firestore/permission-denied"
    ) {
      throw new Error(
        "Недостаточно прав Firestore. Обновите правила базы."
      );
    }

    throw new Error(
      error.message ||
      "Не удалось создать администратора."
    );
  } finally {
    try {
      await signOut(secondaryAuth);
    } catch {
      // Вторичная сессия могла уже завершиться.
    }

    await deleteApp(secondaryApp);
  }
}

export async function setAdministratorAccess(
  userId,
  active
) {
  if (!userId) {
    throw new Error("Администратор не выбран.");
  }

  await updateDoc(
    doc(db, "users", userId),
    {
      active: active === true,
      accessUpdatedAt: serverTimestamp()
    }
  );

  return {
    success: true,
    active: active === true
  };
}