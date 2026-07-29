const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

function normalizePhone(value) {
  let digits = String(value || "").replace(/\D/g, "");

  if (digits.startsWith("8") && digits.length === 11) {
    digits = `7${digits.slice(1)}`;
  }

  if (digits.length === 10) {
    digits = `7${digits}`;
  }

  if (!digits.startsWith("7") || digits.length !== 11) return "";
  return `+${digits}`;
}

function phoneToEmail(phone) {
  return `${phone.replace(/\D/g, "")}@login.rabochiy-obzor.local`;
}

async function requireSupport(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Необходимо войти.");
  }

  const snapshot = await db.collection("users").doc(request.auth.uid).get();
  const data = snapshot.data();

  if (!snapshot.exists || data.role !== "support" || data.active === false) {
    throw new HttpsError("permission-denied", "Недостаточно прав.");
  }
}

exports.createAdministrator = onCall({ region: "europe-west1" }, async (request) => {
  await requireSupport(request);

  const name = String(request.data?.name || "").trim();
  const phone = normalizePhone(request.data?.phone);
  const password = String(request.data?.password || "");

  if (name.length < 2) throw new HttpsError("invalid-argument", "Укажите имя.");
  if (!phone) throw new HttpsError("invalid-argument", "Некорректный телефон.");
  if (password.length < 6) throw new HttpsError("invalid-argument", "Короткий пароль.");

  const user = await getAuth().createUser({
    email: phoneToEmail(phone),
    phoneNumber: phone,
    password,
    displayName: name,
    disabled: false
  });

  await db.collection("users").doc(user.uid).set({
    name,
    phone,
    role: "administrator",
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: request.auth.uid
  });

  await db.collection("workspaces").doc(user.uid).set({
    ownerId: user.uid,
    clients: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });

  return { success: true, userId: user.uid };
});

exports.setAdministratorAccess = onCall({ region: "europe-west1" }, async (request) => {
  await requireSupport(request);

  const userId = String(request.data?.userId || "");
  const active = request.data?.active === true;

  if (!userId) throw new HttpsError("invalid-argument", "Не указан пользователь.");

  await getAuth().updateUser(userId, { disabled: !active });
  await db.collection("users").doc(userId).update({
    active,
    accessUpdatedAt: FieldValue.serverTimestamp(),
    accessUpdatedBy: request.auth.uid
  });

  return { success: true, active };
});
