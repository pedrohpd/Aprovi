import { CSSProperties, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  CalEvent,
  Classroom,
  DEFAULT_SUBJECTS,
  HOUR_HEIGHT,
  SUBJECTS,
  User,
  eventMeta,
  formatLongDate,
  formatShortDate,
  formatTime,
  isSameDay,
  layoutDay,
  parseLocal,
  startOfDay,
  taskName,
  textOn,
} from "./data";
import { formatClock, TimerPhase } from "./useTimer";
import { A, Field, FormError, Header, Logo } from "./ui";

/* ------------------------------------------------------------------ */
/* Timer                                                               */
/* ------------------------------------------------------------------ */

export function Timer({
  seconds,
  running,
  phase,
  onToggle,
  onRestart,
  openSettings,
}: {
  seconds: number;
  running: boolean;
  phase: TimerPhase;
  onToggle: () => void;
  onRestart: () => void;
  openSettings: () => void;
}) {
  return (
    <section className="screen page-enter">
      <Header title="Tempo de Estudo">
        <button className="restart" onClick={onRestart}>
          Reiniciar
        </button>
        <button className="icon-button" onClick={openSettings} aria-label="Configurações do timer">
          <img src={`${A}/66a4d.svg`} alt="" />
        </button>
      </Header>
      <div className={`timer-ring ${running ? "running" : ""} ${phase}`} role="timer" aria-live="off">
        <div className="timer-face">
          <small>{phase === "focus" ? "Pomodoro" : "Pausa"}</small>
          <span>{formatClock(seconds)}</span>
        </div>
      </div>
      <button className="primary timer-button" onClick={onToggle}>
        {running ? "Pausar" : "Iniciar"}
      </button>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Tarefas                                                             */
/* ------------------------------------------------------------------ */

export function Tasks({
  events,
  classes,
  open,
  setOpen,
  onAdd,
  onOpen,
}: {
  events: CalEvent[];
  classes: Classroom[];
  open: string;
  setOpen: (subject: string) => void;
  onAdd: () => void;
  onOpen: (id: string) => void;
}) {
  const subjects = useMemo(() => {
    const present = new Set<string>(DEFAULT_SUBJECTS);
    events.forEach((e) => present.add(e.subject));
    classes.forEach((c) => present.add(c.subject));
    return SUBJECTS.filter((s) => present.has(s.name));
  }, [events, classes]);

  const now = Date.now();

  return (
    <section className="screen page-enter">
      <Header title="Tarefas">
        <button className="icon-button add-button" onClick={onAdd} aria-label="Adicionar tarefa">
          <img src={`${A}/52a0c.svg`} alt="" />
        </button>
      </Header>
      <div className="subject-list">
        {subjects.map((subject) => {
          const expanded = open === subject.name;
          const tasks = events
            .filter((e) => e.subject === subject.name)
            .sort((a, b) => parseLocal(a.end).getTime() - parseLocal(b.end).getTime());
          return (
            <div
              className={`subject ${expanded ? "expanded" : ""}`}
              style={{ background: subject.color, color: textOn(subject.color) }}
              key={subject.name}
            >
              <button
                className="subject-head"
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? "" : subject.name)}
              >
                <span className="subject-title">{subject.name}</span>
                <span className="chevron">
                  <img src={`${A}/${expanded ? "b6b0c.svg" : "18f39.svg"}`} alt="" />
                </span>
              </button>
              {expanded && (
                <div className="task-lines">
                  {tasks.length === 0 && <span className="task-empty">Nenhuma tarefa por aqui.</span>}
                  {tasks.map((task) => (
                    <button
                      key={task.id}
                      className={`task-line ${parseLocal(task.end).getTime() < now ? "past" : ""}`}
                      onClick={() => onOpen(task.id)}
                    >
                      <span>•&nbsp; {taskName(task.title)}</span>
                      <span>{formatShortDate(parseLocal(task.end))}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Calendário (dia rolável, 00h–24h)                                   */
/* ------------------------------------------------------------------ */

const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

export function Calendar({
  day,
  events,
  classes,
  userId,
  onChooseDate,
  onAdd,
  onSlot,
  onOpen,
}: {
  day: Date;
  events: CalEvent[];
  classes: Classroom[];
  userId: string;
  onChooseDate: () => void;
  onAdd: () => void;
  onSlot: (hour: number) => void;
  onOpen: (id: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [nowMin, setNowMin] = useState(() => minutesNow());
  const today = isSameDay(day, new Date());
  const segments = useMemo(() => layoutDay(events, day), [events, day]);
  const dayId = startOfDay(day).getTime();

  useEffect(() => {
    const id = window.setInterval(() => setNowMin(minutesNow()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Ao abrir ou trocar de dia, rola até o primeiro compromisso (ou até o horário atual / 08h).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const first = segments.length ? Math.min(...segments.map((s) => s.startMin)) : null;
    const anchor = first !== null ? first - 30 : today ? minutesNow() - 60 : 7.5 * 60;
    el.scrollTo({ top: Math.max(0, (anchor / 60) * HOUR_HEIGHT) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayId]);

  return (
    <section className="screen page-enter calendar-screen">
      <Header
        title={
          <button className="date-title" onClick={onChooseDate} aria-label="Trocar dia">
            <span>{formatLongDate(day)}</span>
            <img src={`${A}/64f6e.svg`} alt="" />
          </button>
        }
      >
        <button className="icon-button add-button" onClick={onAdd} aria-label="Adicionar evento">
          <img src={`${A}/52a0c.svg`} alt="" />
        </button>
      </Header>
      <div className="schedule-scroll" ref={scrollRef}>
        <div className="schedule" style={{ height: HOURS.length * HOUR_HEIGHT }}>
          {HOURS.map((hour, i) => (
            <div className="hour" key={hour} style={{ height: HOUR_HEIGHT }}>
              <span>{hour}</span>
              <button className="hour-slot" onClick={() => onSlot(i)} aria-label={`Adicionar evento às ${hour}`} />
            </div>
          ))}
          {segments.map((seg) => {
            const { label, color } = eventMeta(seg.event, classes);
            const height = Math.max(((seg.endMin - seg.startMin) / 60) * HOUR_HEIGHT, 41);
            const mine = seg.event.ownerId === userId;
            return (
              <button
                key={`${seg.event.id}-${seg.startMin}`}
                className={`event-card ${height < 70 ? "compact" : ""} ${seg.lanes > 1 ? "multi" : ""}`}
                style={
                  {
                    top: (seg.startMin / 60) * HOUR_HEIGHT,
                    height,
                    "--c": color,
                    "--fg": textOn(color),
                    "--lane": seg.lane,
                    "--lanes": seg.lanes,
                  } as CSSProperties
                }
                title={`${formatTime(parseLocal(seg.event.start))} – ${formatTime(parseLocal(seg.event.end))}${mine ? "" : " (turma)"}`}
                onClick={() => onOpen(seg.event.id)}
              >
                <strong>{label}</strong>
                {height >= 70 && <span>{seg.event.title}</span>}
              </button>
            );
          })}
          {today && (
            <div className="now-line" style={{ top: (nowMin / 60) * HOUR_HEIGHT }} aria-hidden="true" />
          )}
        </div>
      </div>
    </section>
  );
}

function minutesNow() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/* ------------------------------------------------------------------ */
/* Turmas                                                              */
/* ------------------------------------------------------------------ */

export function Classes({
  classes,
  isTeacher,
  onAdd,
  onCopy,
}: {
  classes: Classroom[];
  isTeacher: boolean;
  onAdd: () => void;
  onCopy: (code: string) => void;
}) {
  return (
    <section className="screen page-enter">
      <Header title="Turmas" />
      <div className="class-list">
        {classes.length === 0 && (
          <p className="empty-note">
            {isTeacher
              ? "Você ainda não criou nenhuma turma."
              : "Você ainda não participa de nenhuma turma. Peça o código ao seu professor."}
          </p>
        )}
        {classes.map((c) => (
          <button
            key={c.code}
            style={{ background: c.color, color: textOn(c.color) }}
            onClick={() => onCopy(c.code)}
            title="Toque para copiar o código"
          >
            <strong>{c.name}</strong>
            <span>Código: {c.code}</span>
          </button>
        ))}
      </div>
      <button className="primary new-class" onClick={onAdd}>
        <img src={`${A}/ce022.svg`} alt="" />
        <span>{isTeacher ? "Nova Turma" : "Entrar em Turma"}</span>
      </button>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Perfil                                                              */
/* ------------------------------------------------------------------ */

export function Profile({
  user,
  onSave,
  onLogout,
}: {
  user: User;
  onSave: (data: { name: string; email: string; password: string }) => string | null;
  onLogout: () => void;
}) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const initials = (user.name || user.email)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (password && password.length < 6) return setError("A nova senha precisa ter pelo menos 6 caracteres.");
    if (password !== confirm) return setError("As senhas não coincidem.");
    const result = onSave({ name: name.trim(), email, password });
    setError(result);
    if (!result) {
      setPassword("");
      setConfirm("");
    }
  };

  return (
    <section className="screen page-enter">
      <Header title="Perfil" />
      <form className="profile-card" onSubmit={submit}>
        <div className="avatar" aria-hidden="true">
          {initials || <Logo />}
        </div>
        <h2>{user.name || "Minha conta"}</h2>
        <p className="role-chip">{user.role === "teacher" ? "Professor" : "Estudante"}</p>
        <div className="profile-fields">
          <Field label="Nome" value={name} onChange={setName} required autoComplete="name" />
          <Field label="Email" type="email" value={email} onChange={setEmail} required autoComplete="email" />
          <Field
            label="Nova senha"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />
          <Field
            label="Confirmar nova senha"
            type="password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
          />
          <FormError>{error}</FormError>
        </div>
        <div className="profile-actions">
          <button className="primary" type="submit">
            Salvar alterações
          </button>
          <button className="secondary" type="button" onClick={onLogout}>
            Sair
          </button>
        </div>
      </form>
    </section>
  );
}

