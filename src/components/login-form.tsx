import { loginAction } from "@/app/actions";

export function LoginForm({ error }: { error?: string }) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            P
          </div>
          <div>
            <h1>佩欣每日工作台</h1>
            <p>Public Vercel URL，資料讀取需密碼保護。</p>
          </div>
        </div>
        <form action={loginAction}>
          <label>
            工作台密碼
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          {error === "invalid" ? <p className="error-text">密碼不正確，請再確認一次。</p> : null}
          <button className="primary-button" type="submit">
            進入工作台
          </button>
        </form>
        <p className="muted">
          工作台只會讀取 Google Sheet，不會寫回、不會發送、不會建立 Calendar。
        </p>
      </section>
    </main>
  );
}
