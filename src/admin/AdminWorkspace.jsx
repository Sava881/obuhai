import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { trainingModules } from "../data/training";
import { useAuth } from "../contexts/AuthContext";
import { useWorkspace } from "../hooks/useWorkspace";
import { useCommercialOffers } from "../hooks/useCommercialOffers";

const menu = [
  { id: "dashboard", label: "Главная", icon: "home" },
  { id: "training", label: "Шпаргалка", icon: "book" },
  { id: "request", label: "Заявка", icon: "plus" },
  { id: "calculator", label: "Расчёт", icon: "calculator" },
  { id: "clients", label: "Клиенты", icon: "users" },
  { id: "commercial", label: "КП", icon: "briefcase" }
];

const emptyRequest = {
  company: "",
  phone: "+7",
  position: "",
  clientType: "Юрлицо",
  status: "Новая заявка"
};

function Icon({ name }) {
  const icons = {
    home: (
      <>
        <path d="M3 10.8 12 3l9 7.8" />
        <path d="M5.5 9.8V21h13V9.8" />
        <path d="M9.5 21v-7h5v7" />
      </>
    ),

    book: (
      <>
        <path d="M4 4.5A3.5 3.5 0 0 1 7.5 1H11v18H7.5A3.5 3.5 0 0 0 4 22.5z" />
        <path d="M20 4.5A3.5 3.5 0 0 0 16.5 1H13v18h3.5a3.5 3.5 0 0 1 3.5 3.5z" />
      </>
    ),

    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),

    calculator: (
      <>
        <rect x="4" y="2" width="16" height="20" rx="3" />
        <path d="M8 6h8v4H8z" />
        <path d="M8 14h.01M12 14h.01M16 14h.01" />
        <path d="M8 18h.01M12 18h.01M16 18h.01" />
      </>
    ),

    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),

    briefcase: (
      <>
        <rect
          x="3"
          y="7"
          width="18"
          height="13"
          rx="2"
        />

        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M3 12h18" />
        <path d="M10 12v2h4v-2" />
      </>
    )
  };

  return (
    <svg
      className="nav-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  );
}

function money(value) {
  return new Intl.NumberFormat("ru-RU").format(Number(value || 0)) + " ₽";
}

function formatShortDate(value) {
  if (!value) return "Без даты";

  const [year, month, day] = value.split("-");

  return year && month && day
    ? `${day}.${month}.${year}`
    : value;
}

function onlyPositiveInteger(value) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .replace(/^0+(?=\d)/, "");
}

function safeNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return 0;
  }

  return Math.floor(number);
}

function formatRussianPhone(value) {
  let digits = String(value || "")
    .replace(/\D/g, "");

  if (
    digits.startsWith("8") ||
    digits.startsWith("7")
  ) {
    digits = digits.slice(1);
  }

  digits = digits.slice(0, 10);

  let result = "+7";

  if (digits.length > 0) {
    result += ` (${digits.slice(0, 3)}`;
  }

  if (digits.length >= 3) {
    result += ")";
  }

  if (digits.length > 3) {
    result += ` ${digits.slice(3, 6)}`;
  }

  if (digits.length > 6) {
    result += `-${digits.slice(6, 8)}`;
  }

  if (digits.length > 8) {
    result += `-${digits.slice(8, 10)}`;
  }

  return result;
}

function AdminWorkspace() {
  const { user, profile, logout } = useAuth();
  const [page, setPage] = useState("dashboard");

  const {
    clients,
    setClients,
    loading: workspaceLoading,
    syncError
  } = useWorkspace(user.uid);

  const {
    offers,
    setOffers,
    loading: offersLoading,
    syncError: offersSyncError
  } = useCommercialOffers(user.uid);

  const [request, setRequest] = useState(emptyRequest);
  const [notice, setNotice] = useState("");

  function flash(text) {
    setNotice(text);
    window.setTimeout(() => setNotice(""), 2600);
  }

  if (
    workspaceLoading ||
    offersLoading
  ) {
    return (
      <div className="workspace-loading">
        <div className="workspace-loading__logo">РО</div>
        <strong>Загружаем рабочее пространство</strong>
        <span>Получаем заявки и табели из Firebase…</span>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">РО</div>
          <div>
            <strong>Рабочий обзор</strong>
            <span>Обучение администратора</span>
          </div>
        </div>

<nav className="main-nav" aria-label="Основное меню">
  {menu.map((item) => (
    <button
      key={item.id}
      className={page === item.id ? "nav-button active" : "nav-button"}
      onClick={() => setPage(item.id)}
      aria-label={item.label}
    >
      <span className="nav-icon-wrap">
        <Icon name={item.icon} />
      </span>

      <span className="nav-label">
        {item.label}
      </span>
    </button>
  ))}
</nav>

<div className="sidebar-help">
  <strong>Порядок работы</strong>

  <span>
    Заявка → счёт → оплата → табель → акт
  </span>
</div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p>{profile?.name || "Администратор"} · Работа с юридическими лицами и Вахта</p>
            <h1>
              {menu.find((item) => item.id === page)?.label}
            </h1>
          </div>

          <div className="topbar-actions">
            <button className="primary small" onClick={() => setPage("request")}>
              + Новая заявка
            </button>

            <button className="logout-button" type="button" onClick={logout}>
              Выйти
            </button>
          </div>
        </header>

        {notice && <div className="toast">{notice}</div>}
        {(syncError || offersSyncError) && (
          <div className="firebase-warning">
            Не удалось синхронизировать данные с Firebase. Проверьте интернет.
          </div>
        )}

{page === "dashboard" && (
  <Dashboard setPage={setPage} />
)}
{page === "training" && <Training />}
        {page === "request" && (
          <RequestForm
            request={request}
            setRequest={setRequest}
            setClients={setClients}
            flash={flash}
            setPage={setPage}
          />
        )}
        {page === "calculator" && <Calculator />}
        {page === "clients" && (
          <Clients clients={clients} setClients={setClients} flash={flash} />
        )}

        {page === "commercial" && (
          <CommercialOffers
            offers={offers}
            setOffers={setOffers}
            dispatcherName={
              profile?.name ||
              "Администратор"
            }
            flash={flash}
          />
        )}

      </main>
    </div>
  );
}

function Dashboard({ setPage }) {
  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">ПРОСТАЯ ЦЕПОЧКА РАБОТЫ</span>
          <h2>От первого звонка<br />до подписанного акта</h2>
          <p>
            Приложение помогает администратору не забыть вопросы,
            правильно рассчитать цену и вести баланс заказчика.
          </p>
          <div className="hero-actions">
<button
  className="primary"
  onClick={() => setPage("training")}
>
  Открыть шпаргалку
</button>
            <button className="secondary" onClick={() => setPage("calculator")}>
              Открыть калькулятор
            </button>
          </div>
        </div>
        <div className="workflow-card">
          {["Заявка", "Расчёт +15%", "Договор и счёт", "Предоплата", "Табель", "Акт"].map(
            (item, index) => (
              <div key={item}>
                <b>{index + 1}</b>
                <span>{item}</span>
              </div>
            )
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <div>
            <span>ПАМЯТКА</span>
            <h3>Что спросить при разговоре</h3>
          </div>
        </div>
        <div className="question-grid">
          {[
            "Какие работы?",
            "Сколько рабочих?",
            "Дата и время?",
            "Точный адрес?",
            "Город или загород?",
            "Кто доставляет?",
            "Кто встречает?",
            "Кто даёт инструмент?"
          ].map((item, index) => (
            <div className="question-chip" key={item}>
              <b>{index + 1}</b>{item}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function Training() {
  const [opened, setOpened] = useState(
    trainingModules[0].id
  );

  const current = trainingModules.find(
    (item) => item.id === opened
  );

  return (
    <div className="training-layout">
      <section
        className="module-list"
        aria-label="Разделы шпаргалки"
      >
        {trainingModules.map((module) => (
          <button
            key={module.id}
            onClick={() => setOpened(module.id)}
            className={
              opened === module.id
                ? "module-button active"
                : "module-button"
            }
          >
            <span>{module.icon}</span>

            <div>
              <strong>{module.title}</strong>
              <small>{module.summary}</small>
            </div>
          </button>
        ))}
      </section>

      <section className="lesson-card">
        <span className="eyebrow">
          ШАГ {current.icon}
        </span>

        <h2>{current.title}</h2>

        <p className="lesson-summary">
          {current.summary}
        </p>

        <div className="quick-note">
          <strong>Что сделать</strong>

          <span>
            Идите по пунктам сверху вниз. Это готовая
            подсказка во время разговора с заказчиком.
          </span>
        </div>

        <div className="lesson-checklist">
          {current.checklist.map((item, index) => (
            <div key={item}>
              <i>{index + 1}</i>
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className="warning">
          <strong>Не забудьте</strong>
          <p>{current.warning}</p>
        </div>
      </section>
    </div>
  );
}


function RequestForm({
  request,
  setRequest,
  setClients,
  flash,
  setPage
}) {
  function update(name, value) {
    setRequest((old) => ({
      ...old,
      [name]: value
    }));
  }

  function saveRequest(event) {
    event.preventDefault();

    if (
      !request.company.trim() ||
      !request.position.trim()
    ) {
      flash("Укажите компанию и должность заказчика");
      return;
    }

    const phoneDigits =
      request.phone.replace(/\D/g, "");

    if (phoneDigits.length !== 11) {
      flash("Введите полный номер телефона");
      return;
    }

    const client = {
      id: crypto.randomUUID(),
      company: request.company.trim(),
      phone: request.phone,
      position: request.position.trim(),
      clientType: request.clientType,
      status: request.status,
      rows: []
    };

    setClients((items) => [
      client,
      ...items
    ]);

    setRequest(emptyRequest);
    flash("Заявка сохранена");
    setPage("clients");
  }

  return (
    <form
      className="form-panel request-form request-form--simple"
      onSubmit={saveRequest}
    >
      <div className="panel-title">
        <div>
          <span>НОВАЯ ЗАЯВКА</span>
          <h3>Основные данные заказчика</h3>
          <p>
            Заполните только информацию,
            необходимую для начала работы.
          </p>
        </div>
      </div>

      <div className="simple-request-grid">
        <Field
          label="Название компании *"
          value={request.company}
          onChange={(value) =>
            update("company", value)
          }
          placeholder='Например: ООО "СтройПроект"'
        />

        <Field
          label="Номер телефона *"
          type="tel"
          value={request.phone}
          onChange={(value) =>
            update(
              "phone",
              formatRussianPhone(value)
            )
          }
          placeholder="+7 (900) 000-00-00"
          inputMode="tel"
          maxLength="18"
        />

        <Field
          label="Должность заказчика *"
          value={request.position}
          onChange={(value) =>
            update("position", value)
          }
          placeholder="Например: прораб, директор, снабженец"
        />

        <label className="field">
          <span>Тип заявки</span>

          <select
            value={request.clientType}
            onChange={(event) =>
              update(
                "clientType",
                event.target.value
              )
            }
          >
            <option value="Юрлицо">
              Юридическое лицо
            </option>

            <option value="Вахта">
              Вахта
            </option>
          </select>
        </label>

        <label className="field wide">
          <span>Статус заявки</span>

          <select
            value={request.status}
            onChange={(event) =>
              update(
                "status",
                event.target.value
              )
            }
          >
            <option>Новая заявка</option>
            <option>Связались</option>
            <option>В работе</option>
            <option>Приостановлена</option>
            <option>Завершена</option>
          </select>
        </label>
      </div>

      <div className="request-summary">
        <strong>После сохранения</strong>
        <span>
          заказчик появится в разделе «Клиенты»,
          где можно вести табель и сверку.
        </span>
      </div>

      <div className="form-actions">
        <button
          className="primary"
          type="submit"
        >
          Сохранить заявку
        </button>
      </div>
    </form>
  );
}

function FormSection({ title, children }) {
  return (
    <fieldset>
      <legend>{title}</legend>
      <div className="form-grid">{children}</div>
    </fieldset>
  );
}

function Field({ label, value, onChange, type = "text", ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
    </label>
  );
}

function Calculator() {
  const [base, setBase] = useState(4000);
  const [workers, setWorkers] = useState(1);
  const [days, setDays] = useState(1);
  const [transport, setTransport] = useState(0);

  const legalPrice = Math.round(Number(base || 0) * 1.15);
  const workTotal = legalPrice * Number(workers || 0) * Number(days || 0);
  const total = workTotal + Number(transport || 0);

  return (
    <section className="calculator-layout">
      <div className="form-panel calculator-form">
        <div className="panel-title">
          <div>
            <span>АВТОМАТИЧЕСКИЙ РАСЧЁТ</span>
            <h3>Стоимость для юридического лица</h3>
          </div>
        </div>
        <div className="form-grid">
          <Field label="Цена для физлица" type="number" min="0" value={base} onChange={setBase} />
          <Field label="Количество рабочих" type="number" min="1" value={workers} onChange={setWorkers} />
          <Field label="Количество дней" type="number" min="1" value={days} onChange={setDays} />
          <Field label="Транспорт отдельно" type="number" min="0" value={transport} onChange={setTransport} />
        </div>
      </div>

      <div className="result-card">
        <span>РАСЧЁТ</span>
        <div><small>Обычная цена</small><strong>{money(base)}</strong></div>
        <div><small>Наценка 15%</small><strong>{money(legalPrice - base)}</strong></div>
        <div className="highlight"><small>Цена для юрлица</small><strong>{money(legalPrice)}</strong></div>
        <div><small>Работы</small><strong>{money(workTotal)}</strong></div>
        <div className="total"><small>Итого</small><strong>{money(total)}</strong></div>
      </div>
    </section>
  );
}

function CommercialOffers({
  offers,
  setOffers,
  dispatcherName,
  flash
}) {
  function createOffer() {
    const now = new Date();

    const newOffer = {
      id: crypto.randomUUID(),

      date: now
        .toISOString()
        .slice(0, 10),

      time: now
        .toTimeString()
        .slice(0, 5),

      dispatcher: dispatcherName,
      company: "",
      phone: "+7",
      result: "",
      comment: "",
      status: "Новый"
    };

    setOffers((currentOffers) => [
      newOffer,
      ...currentOffers
    ]);

    flash("Добавлена новая строка КП");
  }

  function patchOffer(offerId, patch) {
    setOffers((currentOffers) =>
      currentOffers.map((offer) =>
        offer.id === offerId
          ? {
              ...offer,
              ...patch
            }
          : offer
      )
    );
  }

function deleteOffer(offerId) {
  setOffers((currentOffers) =>
    currentOffers.filter(
      (offer) => offer.id !== offerId
    )
  );

  flash("Запись КП удалена");
}

  function statusClass(status) {
    if (status === "Интересуется") {
      return "commercial-status interested";
    }

    if (status === "Не интересно") {
      return "commercial-status rejected";
    }

    if (status === "Недоступен") {
      return "commercial-status unavailable";
    }

    if (
      status === "Договорён" ||
      status === "Закрыт"
    ) {
      return "commercial-status completed";
    }

    return "commercial-status";
  }

  function downloadOffers() {
    if (!offers.length) {
      flash("Нет записей для скачивания");
      return;
    }

    const rows = offers.map((offer) => ({
      Дата: offer.date || "",
      Время: offer.time || "",
      Диспетчер: offer.dispatcher || "",
      Компания: offer.company || "",
      Телефон: offer.phone || "",
      Результат: offer.result || "",
      Комментарий: offer.comment || "",
      Статус: offer.status || ""
    }));

    const sheet =
      XLSX.utils.json_to_sheet(rows);

    sheet["!cols"] = [
      { wch: 13 },
      { wch: 10 },
      { wch: 22 },
      { wch: 28 },
      { wch: 20 },
      { wch: 35 },
      { wch: 45 },
      { wch: 18 }
    ];

    const book =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      book,
      sheet,
      "Коммерческие предложения"
    );

    XLSX.writeFile(
      book,
      "Коммерческие предложения.xlsx"
    );
  }

  return (
    <section className="commercial-panel">
      <header className="commercial-header">
        <div>
          <span className="eyebrow">
            КОММЕРЧЕСКИЕ ПРЕДЛОЖЕНИЯ
          </span>

          <h2>Журнал звонков компаниям</h2>

          <p>
            Вносите каждый звонок, результат разговора,
            комментарий и текущий статус.
          </p>
        </div>

        <div className="commercial-header__actions">
          <button
            className="secondary"
            type="button"
            onClick={downloadOffers}
            disabled={!offers.length}
          >
            Скачать Excel
          </button>

          <button
            className="primary"
            type="button"
            onClick={createOffer}
          >
            + Добавить звонок
          </button>
        </div>
      </header>

      {!offers.length ? (
        <div className="commercial-empty">
          <strong>Записей пока нет</strong>

          <span>
            Нажмите «Добавить звонок», чтобы внести
            первую компанию.
          </span>
        </div>
      ) : (
        <div className="commercial-table-scroll">
          <table className="commercial-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Время</th>
                <th>Диспетчер</th>
                <th>Компания</th>
                <th>Телефон</th>
                <th>Результат</th>
                <th>Комментарий</th>
                <th>Статус</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {offers.map((offer) => (
                <tr key={offer.id}>
                  <td>
                    <input
                      type="date"
                      value={offer.date || ""}
                      onChange={(event) =>
                        patchOffer(
                          offer.id,
                          {
                            date:
                              event.target.value
                          }
                        )
                      }
                    />
                  </td>

                  <td>
                    <input
                      type="time"
                      value={offer.time || ""}
                      onChange={(event) =>
                        patchOffer(
                          offer.id,
                          {
                            time:
                              event.target.value
                          }
                        )
                      }
                    />
                  </td>

                  <td>
                    <input
                      value={
                        offer.dispatcher || ""
                      }
                      onChange={(event) =>
                        patchOffer(
                          offer.id,
                          {
                            dispatcher:
                              event.target.value
                          }
                        )
                      }
                    />
                  </td>

                  <td>
                    <input
                      value={offer.company || ""}
                      placeholder="Название компании"
                      onChange={(event) =>
                        patchOffer(
                          offer.id,
                          {
                            company:
                              event.target.value
                          }
                        )
                      }
                    />
                  </td>

                  <td>
                    <input
                      type="tel"
                      value={offer.phone || "+7"}
                      placeholder="+7 (900) 000-00-00"
                      maxLength={18}
                      onChange={(event) =>
                        patchOffer(
                          offer.id,
                          {
                            phone:
                              formatRussianPhone(
                                event.target.value
                              )
                          }
                        )
                      }
                    />
                  </td>

                  <td>
                    <textarea
                      value={offer.result || ""}
                      placeholder="Что ответили"
                      onChange={(event) =>
                        patchOffer(
                          offer.id,
                          {
                            result:
                              event.target.value
                          }
                        )
                      }
                    />
                  </td>

                  <td>
                    <textarea
                      value={offer.comment || ""}
                      placeholder="Что сделать дальше"
                      onChange={(event) =>
                        patchOffer(
                          offer.id,
                          {
                            comment:
                              event.target.value
                          }
                        )
                      }
                    />
                  </td>

                  <td>
                    <select
                      className={statusClass(
                        offer.status
                      )}
                      value={
                        offer.status || "Новый"
                      }
                      onChange={(event) =>
                        patchOffer(
                          offer.id,
                          {
                            status:
                              event.target.value
                          }
                        )
                      }
                    >
                      <option>Новый</option>
                      <option>Интересуется</option>
                      <option>Перезвонить</option>
                      <option>Договорён</option>
                      <option>Не интересно</option>
                      <option>Недоступен</option>
                      <option>Закрыт</option>
                    </select>
                  </td>

                  <td>
                    <button
                      className="commercial-delete"
                      type="button"
                      title="Удалить запись"
                      onClick={() =>
                        deleteOffer(offer.id)
                      }
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Clients({
  clients,
  setClients,
  flash
}) {
  const [selectedId, setSelectedId] = useState(
    clients[0]?.id || null
  );

  const [showDetails, setShowDetails] =
    useState(false);

  const [selectedRows, setSelectedRows] =
    useState([]);

  const [calculatedTotal, setCalculatedTotal] =
    useState(null);

const [expandedPaidPeriods, setExpandedPaidPeriods] =
  useState({});

const tableTopRef = useRef(null);

  const client =
    clients.find(
      (item) => item.id === selectedId
    ) || clients[0];

  useEffect(() => {
    if (!selectedId && clients[0]) {
      setSelectedId(clients[0].id);
    }
  }, [clients, selectedId]);

  useEffect(() => {
    setSelectedRows([]);
    setCalculatedTotal(null);
    setShowDetails(false);
  }, [selectedId]);

  function selectClient(id) {
    setSelectedId(id);
  }

  function patchClient(patch) {
    setClients((items) =>
      items.map((item) =>
        item.id === client.id
          ? {
              ...item,
              ...patch
            }
          : item
      )
    );
  }

  function getRows() {
    return Array.isArray(client?.rows)
      ? client.rows
      : [];
  }

function addRow() {
  const newRow = {
    id: crypto.randomUUID(),
    date: new Date()
      .toISOString()
      .slice(0, 10),
    workers: "",
    price: "",
    paid: false,
    paidAt: ""
  };

  patchClient({
    rows: [newRow, ...getRows()]
  });

  setCalculatedTotal(null);

  requestAnimationFrame(() => {
    tableTopRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
}

function patchRow(rowId, patch) {
  setClients((currentClients) =>
    currentClients.map((currentClient) => {
      if (currentClient.id !== client.id) {
        return currentClient;
      }

      const currentRows = Array.isArray(
        currentClient.rows
      )
        ? currentClient.rows
        : [];

      return {
        ...currentClient,

        rows: currentRows.map((row) =>
          row.id === rowId
            ? {
                ...row,
                ...patch
              }
            : row
        )
      };
    })
  );

  setCalculatedTotal(null);
}

  function deleteRow(id) {
    patchClient({
      rows: getRows().filter(
        (row) => row.id !== id
      )
    });

    setSelectedRows((items) =>
      items.filter((rowId) => rowId !== id)
    );

    setCalculatedTotal(null);
  }

  function toggleRow(id) {
    setSelectedRows((items) =>
      items.includes(id)
        ? items.filter((rowId) => rowId !== id)
        : [...items, id]
    );

    setCalculatedTotal(null);
  }

  function toggleAllUnpaid() {
    const unpaidIds = getRows()
      .filter((row) => !row.paid)
      .map((row) => row.id);

    const allSelected =
      unpaidIds.length > 0 &&
      unpaidIds.every((id) =>
        selectedRows.includes(id)
      );

    setSelectedRows(
      allSelected ? [] : unpaidIds
    );

    setCalculatedTotal(null);
  }

function selectedTableRows() {
  return getRows().filter(
    (row) =>
      !row.paid &&
      selectedRows.includes(row.id)
  );
}

function rowTotal(row) {
  const workers = safeNumber(row.workers);
  const price = safeNumber(row.price);

  return workers * price;
}

  function calculateSelected() {
    const rows = selectedTableRows();

    if (rows.length === 0) {
      flash("Выберите дни для сверки");
      return;
    }

const hasEmptyRows = rows.some(
  (row) =>
    !row.date ||
    safeNumber(row.workers) <= 0 ||
    safeNumber(row.price) <= 0
);

    if (hasEmptyRows) {
      flash(
        "Заполните дату, количество и сумму во всех выбранных строках"
      );
      return;
    }

const total = rows.reduce(
  (sum, row) => {
    const currentRowTotal =
      rowTotal(row);

    return sum + currentRowTotal;
  },
  0
);

    setCalculatedTotal(total);
    flash(`Итого к сверке: ${money(total)}`);
  }

function buildAndDownloadExcel(
  rows,
  total,
  documentStatus = "На согласовании"
) {
const informationRows = [
  ["Сверка табеля"],
  [],
  ["Компания", client.company],
  ["Телефон", client.phone || ""],
  [
    "Должность заказчика",
    client.position ||
      client.contact ||
      ""
  ],
  [
    "Тип заявки",
    client.clientType || "Юрлицо"
  ],
  ["Статус заявки", client.status || ""],
  ["Статус сверки", documentStatus],
  ["Итоговая сумма", total],
  []
];

const tableRows = rows.map((row) => ({
  Дата: row.date,
  "Количество человек":
    safeNumber(row.workers),
  "Сумма за одного человека":
    safeNumber(row.price),
  Итого: rowTotal(row),
  Статус: documentStatus
}));

    const worksheet =
      XLSX.utils.aoa_to_sheet(
        informationRows
      );

    XLSX.utils.sheet_add_json(
      worksheet,
      tableRows,
      {
        origin: -1,
        skipHeader: false
      }
    );

    worksheet["!cols"] = [
      { wch: 16 },
      { wch: 22 },
      { wch: 30 },
      { wch: 18 },
      { wch: 18 }
    ];

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Сверка"
    );

    const safeCompanyName =
      client.company
        .replace(/[\\/:*?"<>|]/g, "")
        .trim() || "Заказчик";

const fileStatus =
  documentStatus === "Рассчитано"
    ? "Оплачено"
    : "На согласование";

XLSX.writeFile(
  workbook,
  `Сверка ${safeCompanyName} — ${fileStatus}.xlsx`
);
}
function downloadForApproval() {
  const rows = selectedTableRows();

  if (rows.length === 0) {
    flash("Выберите дни для согласования");
    return;
  }

  const hasEmptyRows = rows.some(
    (row) =>
      !row.date ||
      safeNumber(row.workers) <= 0 ||
      safeNumber(row.price) <= 0
  );

  if (hasEmptyRows) {
    flash(
      "Заполните дату, количество и сумму во всех выбранных строках"
    );
    return;
  }

  const actualTotal = rows.reduce(
    (sum, row) =>
      sum + rowTotal(row),
    0
  );

  setCalculatedTotal(actualTotal);

  buildAndDownloadExcel(
    rows,
    actualTotal,
    "На согласовании"
  );

  flash(
    "Excel для согласования скачан. Дни остались нерассчитанными"
  );
}

function markAsPaid() {
    const rows = selectedTableRows();

    if (
      rows.length === 0 ||
      calculatedTotal === null
    ) {
      flash("Сначала рассчитайте выбранные дни");
      return;
    }

const actualTotal = rows.reduce(
  (sum, row) =>
    sum + rowTotal(row),
  0
);

if (actualTotal !== calculatedTotal) {
  setCalculatedTotal(actualTotal);

  flash(
    "Данные изменились. Итог пересчитан, проверьте сумму ещё раз"
  );

  return;
}

    const paidAt =
      new Date().toISOString();

    patchClient({
      rows: getRows().map((row) =>
        selectedRows.includes(row.id)
          ? {
              ...row,
              paid: true,
              paidAt
            }
          : row
      )
    });

    setSelectedRows([]);
    setCalculatedTotal(null);

flash(
  "Выбранные дни отмечены как рассчитанные"
);
  }

  if (!client) {
    return (
      <div className="empty">
        Пока нет заказчиков. Создайте
        первую заявку.
      </div>
    );
  }

  const rows = getRows();

  const openAmount = rows.reduce(
    (sum, row) =>
      row.paid
        ? sum
        : sum + rowTotal(row),
    0
  );

  const paidAmount = rows.reduce(
    (sum, row) =>
      row.paid
        ? sum + rowTotal(row)
        : sum,
    0
  );

  const allUnpaidSelected =
    rows.filter((row) => !row.paid).length > 0 &&
    rows
      .filter((row) => !row.paid)
      .every((row) =>
        selectedRows.includes(row.id)
      );

const activeRows = rows.filter((row) => !row.paid);

const paidPeriods = Object.values(
  rows
    .filter((row) => row.paid)
    .reduce((groups, row) => {
      const periodKey = row.paidAt || "legacy-paid";

      if (!groups[periodKey]) {
        groups[periodKey] = {
          id: periodKey,
          paidAt: row.paidAt || "",
          rows: []
        };
      }

      groups[periodKey].rows.push(row);

      return groups;
    }, {})
).sort((a, b) =>
  (b.paidAt || "").localeCompare(a.paidAt || "")
);

function getPeriodLabel(periodRows) {
  const dates = periodRows
    .map((row) => row.date)
    .filter(Boolean)
    .sort();

  if (dates.length === 0) {
    return "Рассчитанный период";
  }

  const start = formatShortDate(dates[0]);
  const end = formatShortDate(
    dates[dates.length - 1]
  );

  return start === end
    ? `Период ${start}`
    : `Период ${start} — ${end}`;
}

function togglePaidPeriod(periodId) {
  setExpandedPaidPeriods((current) => ({
    ...current,
    [periodId]: !current[periodId]
  }));
}

  return (
    <div className="clients-page">
      <section className="clients-cards">
        <div className="clients-section-title">
          <div>
            <span>КЛИЕНТЫ</span>
            <h3>Выберите организацию</h3>
          </div>
        </div>

        <div className="clients-card-grid">
          {clients.map((item) => (
            <article
              key={item.id}
              className={
                client.id === item.id
                  ? "client-name-card active"
                  : "client-name-card"
              }
              onClick={() =>
                selectClient(item.id)
              }
            >
              <div className="client-name-icon">
                {item.company
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="client-card-copy">
                <h4>{item.company}</h4>

                <div className="client-mini-badges">
                  <span>
                    {item.clientType ||
                      "Юрлицо"}
                  </span>

                  <span>
                    {item.status ||
                      "Новая заявка"}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="client-workspace">
        <div className="client-header">
          <div>
            <span>
              {client.clientType || "Юрлицо"}
            </span>

            <h2>{client.company}</h2>
          </div>

          <select
            value={
              client.status ||
              "Новая заявка"
            }
            onChange={(event) =>
              patchClient({
                status:
                  event.target.value
              })
            }
          >
            <option>Новая заявка</option>
            <option>Связались</option>
            <option>В работе</option>
            <option>Приостановлена</option>
            <option>Завершена</option>
          </select>
        </div>

        <button
          type="button"
          className="client-details-toggle"
          onClick={() =>
            setShowDetails((value) => !value)
          }
        >
          <span>Данные заказчика</span>

          <b>
            {showDetails
              ? "Скрыть"
              : "Подробнее"}
          </b>
        </button>

        {showDetails && (
          <div className="client-details-panel client-details-panel--simple">
            <DetailItem
              label="Телефон"
              value={client.phone}
            />

            <DetailItem
              label="Должность"
              value={
                client.position ||
                client.contact
              }
            />

            <DetailItem
              label="Тип заявки"
              value={
                client.clientType ||
                "Юрлицо"
              }
            />

            <DetailItem
              label="Статус"
              value={client.status}
            />
          </div>
        )}

        <div className="table-summary-grid">
          <div className="table-summary-card">
            <span>Не рассчитано</span>
            <strong>{money(openAmount)}</strong>
          </div>

          <div className="table-summary-card paid">
            <span>Уже рассчитано</span>
            <strong>{money(paidAmount)}</strong>
          </div>
        </div>

        <div className="table-panel smart-table-panel">
          <div
  className="table-top"
  ref={tableTopRef}
>
            <div>
              <span>ТАБЕЛЬ СВЕРКИ</span>
              <h3>Рабочие по дням</h3>
            </div>

            <button
              type="button"
              className="primary small"
              onClick={addRow}
            >
              + Добавить день
            </button>
          </div>

          {rows.length > 0 && (
            <label className="select-all-row">
              <input
                type="checkbox"
                checked={allUnpaidSelected}
                onChange={toggleAllUnpaid}
              />

              <span>
                Выбрать все нерассчитанные дни
              </span>
            </label>
          )}

          <div className="table-scroll">
            <table className="smart-timesheet">
              <thead>
                <tr>
                  <th>Выбор</th>
                  <th>Дата</th>
                  <th>Человек</th>
                  <th>За одного</th>
                  <th>Итого</th>
                  <th>Статус</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {activeRows.map((row) => (
                  <tr
                    key={row.id}
                    className={
                      row.paid
                        ? "timesheet-row paid"
                        : ""
                    }
                  >
                    <td data-label="Выбор">
<input
  className="row-checkbox"
  type="checkbox"
  disabled={row.paid}
  checked={
    !row.paid &&
    selectedRows.includes(row.id)
  }
  onChange={() => {
    if (!row.paid) {
      toggleRow(row.id);
    }
  }}
/>
                    </td>

<td data-label="Дата">
<input
  type="date"
  value={row.date || ""}
  disabled={row.paid}
  onChange={(event) =>
    patchRow(row.id, {
      date: event.target.value
    })
  }
/>
</td>

<td data-label="Человек">
  <input
    type="text"
    inputMode="numeric"
    pattern="[0-9]*"
    autoComplete="off"
    disabled={row.paid}
    value={row.workers ?? ""}
    onChange={(event) => {
      const cleanValue =
        onlyPositiveInteger(
          event.target.value
        );

      patchRow(row.id, {
        workers: cleanValue
      });
    }}
    onBlur={(event) => {
      const value = safeNumber(
        event.target.value
      );

      patchRow(row.id, {
        workers:
          value > 0
            ? String(value)
            : ""
      });
    }}
    placeholder="0"
  />
</td>

<td data-label="За одного">
  <input
    type="text"
    inputMode="numeric"
    pattern="[0-9]*"
    autoComplete="off"
    disabled={row.paid}
    value={row.price ?? ""}
    onChange={(event) => {
      const cleanValue =
        onlyPositiveInteger(
          event.target.value
        );

      patchRow(row.id, {
        price: cleanValue
      });
    }}
    onBlur={(event) => {
      const value = safeNumber(
        event.target.value
      );

      patchRow(row.id, {
        price:
          value > 0
            ? String(value)
            : ""
      });
    }}
    placeholder="0"
  />
</td>

                    <td data-label="Итого">
                      <strong>
                        {money(rowTotal(row))}
                      </strong>
                    </td>

                    <td data-label="Статус">
                      <span
                        className={
                          row.paid
                            ? "settlement-badge paid"
                            : "settlement-badge"
                        }
                      >
                        {row.paid
                          ? "Рассчитано"
                          : "Ожидает"}
                      </span>
                    </td>

                    <td>
<button
  type="button"
  className="delete"
  disabled={row.paid}
  onClick={() => {
    if (!row.paid) {
      deleteRow(row.id);
    }
  }}
  aria-label={
    row.paid
      ? "Рассчитанную строку удалить нельзя"
      : "Удалить строку"
  }
  title={
    row.paid
      ? "Рассчитанную строку удалить нельзя"
      : "Удалить строку"
  }
>
  ×
</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

{paidPeriods.length > 0 && (
  <div className="paid-periods">
    <div className="paid-periods-title">
      <span>РАССЧИТАННЫЕ ПЕРИОДЫ</span>

    </div>

    {paidPeriods.map((period) => {
      const isExpanded = Boolean(
        expandedPaidPeriods[period.id]
      );

      const periodTotal = period.rows.reduce(
        (sum, row) => sum + rowTotal(row),
        0
      );

      return (
        <section
          className="paid-period"
          key={period.id}
        >
          <button
            type="button"
            className="paid-period-toggle"
            onClick={() =>
              togglePaidPeriod(period.id)
            }
            aria-expanded={isExpanded}
          >
            <span>
              <strong>
                {getPeriodLabel(period.rows)}
              </strong>

              <small>
                {period.rows.length} дн. ·{" "}
                {money(periodTotal)}
              </small>
            </span>

            <b>
              {isExpanded
                ? "Свернуть"
                : "Открыть"}
            </b>
          </button>

          {isExpanded && (
            <div className="paid-period-content">
              {period.rows
                .slice()
                .sort((a, b) =>
                  (a.date || "").localeCompare(
                    b.date || ""
                  )
                )
                .map((row) => (
                  <article
                    className="paid-period-row"
                    key={row.id}
                  >
                    <div>
                      <span>Дата</span>
                      <strong>
                        {formatShortDate(row.date)}
                      </strong>
                    </div>

                    <div>
                      <span>Человек</span>
                      <strong>
                        {row.workers || 0}
                      </strong>
                    </div>

                    <div>
                      <span>За одного</span>
                      <strong>
                        {money(row.price)}
                      </strong>
                    </div>

                    <div>
                      <span>Итого</span>
                      <strong>
                        {money(rowTotal(row))}
                      </strong>
                    </div>
                  </article>
                ))}
            </div>
          )}
        </section>
      );
    })}
  </div>
)}

          {rows.length === 0 && (
            <div className="empty-table">
              Добавьте первый день работы.
            </div>
          )}

          <div className="settlement-panel">
            <div>
              <span>Выбрано дней</span>
<strong>
  {selectedTableRows().length}
</strong>
            </div>

            <div>
              <span>Итог к сверке</span>
              <strong>
                {calculatedTotal === null
                  ? "Не рассчитан"
                  : money(calculatedTotal)}
              </strong>
            </div>

<div className="settlement-actions">
  <button
    type="button"
    className="secondary"
    onClick={calculateSelected}
  >
    Рассчитать итог
  </button>

  <button
    type="button"
    className="approval-excel-button"
    disabled={
      selectedTableRows().length === 0
    }
    onClick={downloadForApproval}
  >
    Скачать Excel для согласования
  </button>

  <button
    type="button"
    className="paid-button"
    disabled={
      calculatedTotal === null ||
      selectedTableRows().length === 0
    }
    onClick={markAsPaid}
  >
    Заказчик рассчитался
  </button>
</div>
          </div>

<div className="share-note">
  <strong>Как вести сверку</strong>

  <p>
    Отметьте нужные дни и рассчитайте итог.
    Скачайте Excel для предварительного
    согласования с заказчиком. Это не изменит
    статус строк. После получения оплаты
    нажмите «Заказчик рассчитался» —
    выбранные дни станут зелёными.
  </p>
</div>
        </div>
      </section>
    </div>
  );
}

function DetailItem({
  label,
  value,
  wide = false
}) {
  return (
    <div
      className={
        wide
          ? "client-detail-item wide"
          : "client-detail-item"
      }
    >
      <span>
        {label}
      </span>

      <strong>
        {value || "Не указано"}
      </strong>
    </div>
  );
}

export default AdminWorkspace;