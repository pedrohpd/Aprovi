import { FormEvent, useState } from "react";
import type { Role } from "./data";
import { Field, FormError, Logo, SelectField } from "./ui";

export type AuthApi = {
  login: (email: string, password: string) => string | null;
  signup: (data: { name: string; email: string; password: string; role: Role }) => string | null;
};

export function Auth({
  kind,
  api,
  onSwitch,
}: {
  kind: "login" | "signup";
  api: AuthApi;
  onSwitch: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [account, setAccount] = useState("Estudante");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setNotice(null);
    if (kind === "login") {
      setError(api.login(email, password));
      return;
    }
    if (password.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");
    if (password !== confirm) return setError("As senhas não coincidem.");
    setError(
      api.signup({
        name: name.trim(),
        email,
        password,
        role: account === "Professor" ? "teacher" : "student",
      }),
    );
  };

  const switchKind = () => {
    setError(null);
    setNotice(null);
    onSwitch();
  };

  return (
    <main className={`auth page-enter ${kind}`}>
      <Logo />
      <form className="auth-card" onSubmit={submit}>
        {kind === "signup" && (
          <Field label="Nome" value={name} onChange={setName} required autoComplete="name" />
        )}
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          required
          autoComplete="email"
        />
        {kind === "signup" && (
          <SelectField
            label="Tipo de Conta"
            value={account}
            onChange={setAccount}
            options={[
              { value: "Estudante", label: "Estudante" },
              { value: "Professor", label: "Professor" },
            ]}
          />
        )}
        <Field
          label="Senha"
          type="password"
          value={password}
          onChange={setPassword}
          required
          autoComplete={kind === "login" ? "current-password" : "new-password"}
        />
        {kind === "signup" && (
          <Field
            label="Confirmar senha"
            type="password"
            value={confirm}
            onChange={setConfirm}
            required
            autoComplete="new-password"
          />
        )}
        <FormError>{error}</FormError>
        {notice && <p className="form-note">{notice}</p>}
        {kind === "login" && (
          <button
            className="auth-link forgot"
            type="button"
            onClick={() => {
              setError(null);
              setNotice("A recuperação de senha ainda não está disponível neste protótipo.");
            }}
          >
            Esqueci minha senha
          </button>
        )}
        {kind === "login" && (
          <button className="auth-link" type="button" onClick={switchKind}>
            Não possuo uma conta
          </button>
        )}
        <button className="primary auth-submit" type="submit">
          {kind === "login" ? "Entrar" : "Cadastrar"}
        </button>
      </form>
      {kind === "signup" && (
        <div className="already">
          <span>Já possui uma conta?</span>
          <button onClick={switchKind}>Fazer login</button>
        </div>
      )}
    </main>
  );
}
