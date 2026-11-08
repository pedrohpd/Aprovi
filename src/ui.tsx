import { FormEvent, ReactNode, useEffect } from "react";
import type { Role } from "./data";

export const A = `${import.meta.env.BASE_URL}assets`;

export type Screen = "timer" | "tasks" | "calendar" | "classes" | "profile";

const studentNav = [
  { id: "timer", label: "Timer", icon: "d097e.svg" },
  { id: "tasks", label: "Tarefas", icon: "7f981.svg" },
  { id: "calendar", label: "Calendário", icon: "f4b76.svg" },
  { id: "classes", label: "Turmas", icon: "c2017.svg" },
  { id: "profile", label: "Perfil", icon: "cbab6.svg" },
] as const;

const teacherNav = [
  { id: "calendar", label: "Calendário", icon: "f4b76.svg" },
  { id: "classes", label: "Turmas", icon: "c2017.svg" },
  { id: "profile", label: "Perfil", icon: "cbab6.svg" },
] as const;

export const allowedScreens = (role: Role): Screen[] =>
  (role === "teacher" ? teacherNav : studentNav).map((i) => i.id);

export function Logo() {
  return <img className="logo" src={`${A}/44f19.png`} alt="Aprov!" />;
}

type FieldProps = {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  maxLength?: number;
  autoComplete?: string;
  min?: string | number;
  max?: string | number;
};

export function Field({ label, value, onChange, type = "text", ...rest }: FieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(e) => onChange?.(e.target.value)} {...rest} />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
      >
        {placeholder !== undefined && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p className="form-error" role="alert">
      {children}
    </p>
  );
}

export function Header({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <header className="app-header">
      <h1>{title}</h1>
      <div className="header-actions">{children}</div>
    </header>
  );
}

export function BottomNav({
  active,
  role,
  onGo,
}: {
  active: Screen;
  role: Role;
  onGo: (screen: Screen) => void;
}) {
  const items = role === "teacher" ? teacherNav : studentNav;
  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {items.map((item) => (
        <button
          key={item.id}
          className={active === item.id ? "active" : ""}
          aria-current={active === item.id ? "page" : undefined}
          onClick={() => onGo(item.id)}
        >
          <span className="nav-icon">
            <img src={`${A}/${item.icon}`} alt="" />
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

/** Casca visual dos pop-ups (cabeçalho vinho + corpo amarelo), igual ao design. */
export function DialogShell({
  kind,
  title,
  onClose,
  onSubmit,
  children,
}: {
  kind: "timer" | "date" | "event" | "class";
  title: string;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="modal-layer"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        className={`dialog dialog-${kind}`}
        onSubmit={onSubmit}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="dialog-head">
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <img src={`${A}/11be9.svg`} alt="" />
          </button>
        </div>
        <div className="dialog-body">{children}</div>
      </form>
    </div>
  );
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}
