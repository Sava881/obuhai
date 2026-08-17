import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import "./TasksModal.css";

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "Без срока";
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function TasksModal({
  open,
  onClose,
  tasks,
  setTasks,
  notes,
  setNotes,
  administratorName = "Администратор",
  syncError = ""
}) {
  const [tab, setTab] = useState("tasks");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDate, setTaskDate] = useState(todayValue());
  const [taskPriority, setTaskPriority] = useState("Обычная");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteText, setNoteText] = useState("");

  const activeTasks = useMemo(
    () => tasks.filter((item) => !item.completed),
    [tasks]
  );

  const completedTasks = useMemo(
    () => tasks.filter((item) => item.completed),
    [tasks]
  );

  if (!open) return null;

  function addTask(event) {
    event.preventDefault();
    const title = taskTitle.trim();
    if (!title) return;

    setTasks((current) => [
      {
        id: makeId("task"),
        title,
        dueDate: taskDate,
        priority: taskPriority,
        completed: false,
        createdAt: new Date().toISOString(),
        completedAt: ""
      },
      ...current
    ]);

    setTaskTitle("");
    setTaskDate(todayValue());
    setTaskPriority("Обычная");
  }

  function toggleTask(id) {
    setTasks((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              completed: !item.completed,
              completedAt: !item.completed ? new Date().toISOString() : ""
            }
          : item
      )
    );
  }

  function deleteTask(id) {
    setTasks((current) => current.filter((item) => item.id !== id));
  }

  function addNote(event) {
    event.preventDefault();
    const text = noteText.trim();
    if (!text) return;

    setNotes((current) => [
      {
        id: makeId("note"),
        title: noteTitle.trim() || "Важная заметка",
        text,
        createdAt: new Date().toISOString()
      },
      ...current
    ]);

    setNoteTitle("");
    setNoteText("");
  }

  function deleteNote(id) {
    setNotes((current) => current.filter((item) => item.id !== id));
  }

  function exportToExcel() {
    const taskRows = tasks.map((item, index) => ({
      "№": index + 1,
      "Задача": item.title,
      "Срок": formatDate(item.dueDate),
      "Приоритет": item.priority,
      "Статус": item.completed ? "Выполнена" : "В работе",
      "Создана": item.createdAt ? new Date(item.createdAt).toLocaleString("ru-RU") : "",
      "Выполнена": item.completedAt ? new Date(item.completedAt).toLocaleString("ru-RU") : ""
    }));

    const noteRows = notes.map((item, index) => ({
      "№": index + 1,
      "Заголовок": item.title,
      "Заметка": item.text,
      "Создана": item.createdAt ? new Date(item.createdAt).toLocaleString("ru-RU") : ""
    }));

    const workbook = XLSX.utils.book_new();
    const tasksSheet = XLSX.utils.json_to_sheet(taskRows.length ? taskRows : [{ "Задача": "Нет задач" }]);
    const notesSheet = XLSX.utils.json_to_sheet(noteRows.length ? noteRows : [{ "Заметка": "Нет заметок" }]);

    tasksSheet["!cols"] = [
      { wch: 5 }, { wch: 42 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 20 }
    ];
    notesSheet["!cols"] = [
      { wch: 5 }, { wch: 28 }, { wch: 70 }, { wch: 20 }
    ];

    XLSX.utils.book_append_sheet(workbook, tasksSheet, "Задачи");
    XLSX.utils.book_append_sheet(workbook, notesSheet, "Заметки");

    const safeName = administratorName.replace(/[\\/:*?"<>|]/g, "_");
    XLSX.writeFile(workbook, `Мои_задачи_${safeName}_${todayValue()}.xlsx`);
  }

  return (
    <div className="tasks-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="tasks-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Мои задачи и заметки"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="tasks-modal__header">
          <div>
            <span className="tasks-modal__eyebrow">ЛИЧНОЕ РАБОЧЕЕ ПРОСТРАНСТВО</span>
            <h2>Мои задачи</h2>
            <p>{activeTasks.length} в работе · {completedTasks.length} выполнено</p>
          </div>

          <div className="tasks-modal__header-actions">
            <button className="tasks-export-button" type="button" onClick={exportToExcel}>
              ↓ Excel
            </button>
            <button className="tasks-close-button" type="button" onClick={onClose} aria-label="Закрыть">
              ×
            </button>
          </div>
        </header>

        {syncError && (
          <div className="tasks-sync-warning">
            Данные сейчас не синхронизируются с Firebase. Проверьте интернет.
          </div>
        )}

        <div className="tasks-tabs" role="tablist">
          <button
            type="button"
            className={tab === "tasks" ? "active" : ""}
            onClick={() => setTab("tasks")}
          >
            Задачи <b>{activeTasks.length}</b>
          </button>
          <button
            type="button"
            className={tab === "notes" ? "active" : ""}
            onClick={() => setTab("notes")}
          >
            Заметки <b>{notes.length}</b>
          </button>
        </div>

        <div className="tasks-modal__body">
          {tab === "tasks" && (
            <div className="tasks-layout">
              <form className="tasks-create-card" onSubmit={addTask}>
                <div className="tasks-section-title">
                  <span>НОВАЯ ЗАДАЧА</span>
                  <h3>Что нужно сделать?</h3>
                </div>

                <label className="tasks-field tasks-field--wide">
                  <span>Задача</span>
                  <input
                    value={taskTitle}
                    onChange={(event) => setTaskTitle(event.target.value)}
                    placeholder="Например: перезвонить заказчику"
                    maxLength={160}
                  />
                </label>

                <div className="tasks-form-row">
                  <label className="tasks-field">
                    <span>Срок</span>
                    <input
                      type="date"
                      value={taskDate}
                      onChange={(event) => setTaskDate(event.target.value)}
                    />
                  </label>

                  <label className="tasks-field">
                    <span>Приоритет</span>
                    <select
                      value={taskPriority}
                      onChange={(event) => setTaskPriority(event.target.value)}
                    >
                      <option>Обычная</option>
                      <option>Важная</option>
                      <option>Срочная</option>
                    </select>
                  </label>
                </div>

                <button className="tasks-add-button" type="submit">
                  + Добавить задачу
                </button>
              </form>

              <div className="tasks-list-card">
                <div className="tasks-section-title tasks-section-title--row">
                  <div>
                    <span>СПИСОК</span>
                    <h3>Текущие задачи</h3>
                  </div>
                  <small>{tasks.length} всего</small>
                </div>

                <div className="tasks-list">
                  {activeTasks.length === 0 && completedTasks.length === 0 && (
                    <div className="tasks-empty">
                      <strong>Задач пока нет</strong>
                      <span>Создайте первую задачу слева.</span>
                    </div>
                  )}

                  {activeTasks.map((item) => (
                    <article className="task-item" key={item.id}>
                      <button
                        type="button"
                        className="task-check"
                        onClick={() => toggleTask(item.id)}
                        aria-label="Отметить выполненной"
                      />
                      <div className="task-item__content">
                        <strong>{item.title}</strong>
                        <div className="task-meta">
                          <span>{formatDate(item.dueDate)}</span>
                          <span className={`task-priority task-priority--${item.priority.toLowerCase()}`}>
                            {item.priority}
                          </span>
                        </div>
                      </div>
                      <button className="task-delete" type="button" onClick={() => deleteTask(item.id)} aria-label="Удалить">
                        ×
                      </button>
                    </article>
                  ))}

                  {completedTasks.length > 0 && (
                    <div className="tasks-completed-label">Выполнено</div>
                  )}

                  {completedTasks.map((item) => (
                    <article className="task-item task-item--completed" key={item.id}>
                      <button
                        type="button"
                        className="task-check task-check--done"
                        onClick={() => toggleTask(item.id)}
                        aria-label="Вернуть задачу"
                      >
                        ✓
                      </button>
                      <div className="task-item__content">
                        <strong>{item.title}</strong>
                        <div className="task-meta"><span>{formatDate(item.dueDate)}</span></div>
                      </div>
                      <button className="task-delete" type="button" onClick={() => deleteTask(item.id)} aria-label="Удалить">
                        ×
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "notes" && (
            <div className="notes-layout">
              <form className="tasks-create-card" onSubmit={addNote}>
                <div className="tasks-section-title">
                  <span>ВАЖНАЯ ИНФОРМАЦИЯ</span>
                  <h3>Новая заметка</h3>
                </div>

                <label className="tasks-field">
                  <span>Заголовок</span>
                  <input
                    value={noteTitle}
                    onChange={(event) => setNoteTitle(event.target.value)}
                    placeholder="Короткое название"
                    maxLength={80}
                  />
                </label>

                <label className="tasks-field">
                  <span>Текст заметки</span>
                  <textarea
                    value={noteText}
                    onChange={(event) => setNoteText(event.target.value)}
                    placeholder="Запишите важную информацию..."
                    rows={7}
                    maxLength={2000}
                  />
                </label>

                <button className="tasks-add-button" type="submit">
                  + Сохранить заметку
                </button>
              </form>

              <div className="notes-list-card">
                <div className="tasks-section-title tasks-section-title--row">
                  <div>
                    <span>ЗАМЕТКИ</span>
                    <h3>Важное под рукой</h3>
                  </div>
                  <small>{notes.length} всего</small>
                </div>

                <div className="notes-grid">
                  {notes.length === 0 && (
                    <div className="tasks-empty">
                      <strong>Заметок пока нет</strong>
                      <span>Здесь удобно хранить важную рабочую информацию.</span>
                    </div>
                  )}

                  {notes.map((item) => (
                    <article className="note-item" key={item.id}>
                      <div className="note-item__top">
                        <strong>{item.title}</strong>
                        <button type="button" onClick={() => deleteNote(item.id)} aria-label="Удалить заметку">×</button>
                      </div>
                      <p>{item.text}</p>
                      <small>
                        {item.createdAt ? new Date(item.createdAt).toLocaleString("ru-RU") : ""}
                      </small>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}