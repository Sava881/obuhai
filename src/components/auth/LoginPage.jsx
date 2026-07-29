import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { formatPhoneInput } from "../../utils/phone";
import "./LoginPage.css";

export default function LoginPage() {
  const { login } = useAuth();
  const [phone, setPhone] = useState("+7");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(phone, password);
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-promo">
        <div className="login-brand">
          <div className="login-brand__mark">РО</div>
          <div>
            <strong>Рабочий обзор</strong>
            <span>Система обучения и управления</span>
          </div>
        </div>

        <div className="login-promo__content">
          <span className="login-eyebrow">РАБОЧЕЕ ПРОСТРАНСТВО</span>
          <h1>Все этапы работы администратора в одной системе</h1>
          <p>Заявки, заказчики, расчёты и табели доступны сотрудникам с выданным доступом.</p>
        </div>
      </section>

      <section className="login-form-side">
        <form className="login-card" onSubmit={handleSubmit}>
          <span className="login-card__label">ВХОД В СИСТЕМУ</span>
          <h2>Добро пожаловать</h2>
          <p>Введите номер телефона и пароль, выданные технической поддержкой.</p>

          <label className="login-field">
            <span>Номер телефона</span>
            <input
              type="tel"
              value={phone}
              maxLength={18}
              onChange={(event) => setPhone(formatPhoneInput(event.target.value))}
            />
          </label>

          <label className="login-field">
            <span>Пароль</span>
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button type="button" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? "Скрыть" : "Показать"}
              </button>
            </div>
          </label>

          {error && <div className="login-error">{error}</div>}

          <button className="login-submit" type="submit" disabled={submitting}>
            {submitting ? "Выполняется вход…" : "Войти в систему"}
          </button>
        </form>
      </section>
    </main>
  );
}
