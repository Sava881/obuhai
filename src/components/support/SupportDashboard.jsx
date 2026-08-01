import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import * as XLSX from "xlsx";
import { db } from "../../firebase/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { createAdministrator, setAdministratorAccess } from "../../services/supportService";
import { formatPhoneInput, normalizePhone } from "../../utils/phone";
import "./SupportDashboard.css";

function money(value) {
  return new Intl.NumberFormat("ru-RU").format(Number(value || 0)) + " ₽";
}

function rowTotal(row) {
  return Number(row.workers || 0) * Number(row.price || 0);
}

function formatShortDate(value) {
  if (!value) {
    return "—";
  }

  const parts = String(value).split("-");

  if (parts.length !== 3) {
    return value;
  }

  const [year, month, day] = parts;

  return `${day}.${month}.${year.slice(-2)}`;
}

function getFullAge(birthDate) {
  if (!birthDate) return null;

  const [year, month, day] = birthDate
    .split("-")
    .map(Number);

  if (!year || !month || !day) return null;

  const today = new Date();
  let age = today.getFullYear() - year;

  const birthdayHasNotPassed =
    today.getMonth() + 1 < month ||
    (
      today.getMonth() + 1 === month &&
      today.getDate() < day
    );

  if (birthdayHasNotPassed) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function ageLabel(age) {
  if (age === null) {
    return "Возраст не указан";
  }

  const lastTwoDigits = age % 100;
  const lastDigit = age % 10;

  if (
    lastTwoDigits >= 11 &&
    lastTwoDigits <= 14
  ) {
    return `${age} лет`;
  }

  if (lastDigit === 1) {
    return `${age} год`;
  }

  if (
    lastDigit >= 2 &&
    lastDigit <= 4
  ) {
    return `${age} года`;
  }

  return `${age} лет`;
}

export default function SupportDashboard() {
  const { profile, logout } = useAuth();
  const [administrators, setAdministrators] = useState([]);
  const [selectedAdminId, setSelectedAdminId] = useState("");
  const [workspace, setWorkspace] = useState({ clients: [] });
const [form, setForm] = useState({
  name: "",
  phone: "+7",
  city: "",
  birthDate: "",
  password: ""
});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"));

    return onSnapshot(usersQuery, (snapshot) => {
      const list = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .filter((item) => item.role === "administrator");

      setAdministrators(list);
      setSelectedAdminId((current) => current || list[0]?.id || "");
    });
  }, []);

  useEffect(() => {
    if (!selectedAdminId) {
      setWorkspace({ clients: [] });
      return undefined;
    }

    return onSnapshot(doc(db, "workspaces", selectedAdminId), (snapshot) => {
      setWorkspace(snapshot.exists() ? snapshot.data() : { clients: [] });
    });
  }, [selectedAdminId]);

const selectedAdministrator = administrators.find(
  (item) => item.id === selectedAdminId
);

const selectedAdministratorAge = getFullAge(
  selectedAdministrator?.birthDate
);

const clients = workspace.clients || [];

  const totals = useMemo(() => {
    let rows = 0;
    let spent = 0;

    clients.forEach((client) => {
      (client.rows || []).forEach((row) => {
        rows += 1;
        spent += rowTotal(row);
      });
    });

    return { clients: clients.length, rows, spent };
  }, [clients]);

  async function handleCreate(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    const phone = normalizePhone(form.phone);

if (!form.name.trim()) {
  return setError(
    "Укажите имя администратора."
  );
}

if (!phone) {
  return setError(
    "Введите полный номер телефона."
  );
}

if (!form.city.trim()) {
  return setError(
    "Укажите город администратора."
  );
}

if (!form.birthDate) {
  return setError(
    "Укажите дату рождения администратора."
  );
}

if (getFullAge(form.birthDate) === null) {
  return setError(
    "Проверьте дату рождения администратора."
  );
}

if (form.password.length < 6) {
  return setError(
    "Пароль должен быть не короче 6 символов."
  );
}

    setCreating(true);

    try {
await createAdministrator({
  name: form.name.trim(),
  phone,
  city: form.city.trim(),
  birthDate: form.birthDate,
  password: form.password
});

setForm({
  name: "",
  phone: "+7",
  city: "",
  birthDate: "",
  password: ""
});
      setMessage("Администратор создан, доступ активен.");
    } catch (createError) {
      console.error(createError);
      setError(createError.message || "Не удалось создать администратора.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleAccess() {
    if (!selectedAdministrator) return;

    const nextActive = selectedAdministrator.active === false;

    try {
      await setAdministratorAccess(selectedAdministrator.id, nextActive);
      setMessage(nextActive ? "Доступ включён." : "Доступ отключён.");
    } catch (accessError) {
      console.error(accessError);
      setError("Не удалось изменить доступ.");
    }
  }

  function downloadAll() {
    const rows = [];

    clients.forEach((client) => {
      (client.rows || []).forEach((row) => {
rows.push({
  Заказчик: client.company || "",
  Телефон: client.phone || "",
  Дата: row.date || "",
  Рабочих: Number(row.workers || 0),
  "Цена за одного": Number(row.price || 0),
  Итого: rowTotal(row),
  "Статус оплаты": row.paid
    ? "Оплата получена"
    : "Ожидается оплата",
  "Дата оплаты": row.paidAt
    ? new Date(row.paidAt).toLocaleString("ru-RU")
    : ""
});
      });
    });

    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Табели");
    XLSX.writeFile(book, `Табели_${selectedAdministrator?.name || "администратор"}.xlsx`);
  }

  return (
    <div className="support-shell">
      <aside className="support-sidebar">
        <div className="support-brand">
          <div>РО</div>
          <span>
            <strong>Рабочий обзор</strong>
            <small>Техническая поддержка</small>
          </span>
        </div>

        <div className="support-user">
          <span>Вы вошли как</span>
          <strong>{profile?.name || "Техподдержка"}</strong>
        </div>

        <button className="support-logout" type="button" onClick={logout}>Выйти</button>
      </aside>

      <main className="support-main">
        <header className="support-header">
          <div>
            <span>УПРАВЛЕНИЕ ДОСТУПАМИ</span>
            <h1>Администраторы</h1>
            <p>Выдача доступов и просмотр заказов и табелей.</p>
          </div>
        </header>

        {message && <div className="support-message success">{message}</div>}
        {error && <div className="support-message error">{error}</div>}

        <section className="support-grid">
          <form className="support-card" onSubmit={handleCreate}>
            <h2>Новый администратор</h2>

            <label>
              <span>Имя</span>
              <input
                value={form.name}
                onChange={(event) => setForm((old) => ({ ...old, name: event.target.value }))}
              />
            </label>

            <label>
              <span>Телефон</span>
              <input
                value={form.phone}
                maxLength={18}
                onChange={(event) => setForm((old) => ({
                  ...old,
                  phone: formatPhoneInput(event.target.value)
                }))}
              />
            </label>

<label>
  <span>Город</span>

  <input
    value={form.city}
    placeholder="Например, Томск"
    onChange={(event) =>
      setForm((old) => ({
        ...old,
        city: event.target.value
      }))
    }
  />
</label>

<label>
  <span>Дата рождения</span>

  <input
    type="date"
    value={form.birthDate}
    max={new Date()
      .toISOString()
      .slice(0, 10)}
    onChange={(event) =>
      setForm((old) => ({
        ...old,
        birthDate: event.target.value
      }))
    }
  />
</label>

<label>
  <span>Пароль</span>

  <input
    type="password"
    value={form.password}
    onChange={(event) =>
      setForm((old) => ({
        ...old,
        password: event.target.value
      }))
    }
  />
</label>

            <button type="submit" disabled={creating}>
              {creating ? "Создание…" : "Выдать доступ"}
            </button>
          </form>

          <section className="support-card">
            <h2>Список администраторов</h2>

            <div className="administrator-list">
              {administrators.map((administrator) => (
                <button
                  key={administrator.id}
                  type="button"
                  className={administrator.id === selectedAdminId ? "administrator-row active" : "administrator-row"}
                  onClick={() => setSelectedAdminId(administrator.id)}
                >
<strong>{administrator.name}</strong>

<span>{administrator.phone}</span>

<small>
  {administrator.city ||
    "Город не указан"}{" "}
  ·{" "}
  {ageLabel(
    getFullAge(administrator.birthDate)
  )}
</small>
                </button>
              ))}
            </div>
          </section>
        </section>

        {selectedAdministrator && (
          <section className="support-workspace">
            <header className="administrator-profile">
              <div>
                <span>ВЫБРАННЫЙ АДМИНИСТРАТОР</span>
<h2>{selectedAdministrator.name}</h2>

<p>{selectedAdministrator.phone}</p>

<div className="administrator-meta">
  <span>
    {selectedAdministrator.city ||
      "Город не указан"}
  </span>

  <span>
    {ageLabel(selectedAdministratorAge)}
  </span>
</div>
              </div>

              <button type="button" onClick={toggleAccess}>
                {selectedAdministrator.active === false ? "Включить доступ" : "Отключить доступ"}
              </button>
            </header>

            <div className="workspace-summary">
              <div><span>Заказчиков</span><strong>{totals.clients}</strong></div>
              <div><span>Строк в табелях</span><strong>{totals.rows}</strong></div>
              <div><span>Сумма работ</span><strong>{money(totals.spent)}</strong></div>
              <button type="button" onClick={downloadAll} disabled={!clients.length}>Скачать все табели</button>
            </div>

            <div className="support-clients">
              {clients.map((client) => (
                <article className="support-client-card" key={client.id}>
                  <header>
                    <div>
                      <span>{client.clientType || "Заказчик"}</span>
                      <h3>{client.company}</h3>
                      <p>{client.phone || "Телефон не указан"} · {client.status || "Без статуса"}</p>
                    </div>
                  </header>

                  <div className="support-table-scroll">
                    <table>
<thead>
  <tr>
    <th>Дата</th>
    <th>Рабочих</th>
    <th>Цена</th>
    <th>Итого</th>
    <th>Статус</th>
  </tr>
</thead>

<tbody>
  {(client.rows || []).map((row) => (
    <tr
      key={row.id}
      className={
        row.paid
          ? "support-payment-row paid"
          : "support-payment-row"
      }
    >
<td title={row.date || ""}>
  {formatShortDate(row.date)}
</td>

      <td>{row.workers || 0}</td>

      <td>{money(row.price)}</td>

      <td>
        <strong>
          {money(rowTotal(row))}
        </strong>
      </td>

<td className="support-status-cell">
  <span
    className={
      row.paid
        ? "support-payment-status paid"
        : "support-payment-status"
    }
  >
    <span className="support-status-desktop">
      {row.paid
        ? "Оплата получена"
        : "Ожидается оплата"}
    </span>

    <span className="support-status-mobile">
      {row.paid
        ? "Получена"
        : "Ожидается"}
    </span>
  </span>
</td>
    </tr>
  ))}
</tbody>
                    </table>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
