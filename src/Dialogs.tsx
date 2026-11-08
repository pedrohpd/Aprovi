import { FormEvent, useState } from "react";
import {
  CalEvent,
  Classroom,
  SUBJECTS,
  User,
  fromDateInput,
  makeClassCode,
  parseLocal,
  toDateInput,
} from "./data";
import type { TimerConfig } from "./useTimer";
import { DialogShell, Field, FormError, SelectField } from "./ui";

/* ------------------------------------------------------------------ */
/* Personalização do Timer                                             */
/* ------------------------------------------------------------------ */

export function TimerDialog({
  config,
  onChange,
  onClose,
}: {
  config: TimerConfig;
  onChange: (next: TimerConfig) => void;
  onClose: () => void;
}) {
  const [focus, setFocus] = useState(String(config.focus));
  const [rest, setRest] = useState(String(config.rest));

  // Valores válidos são aplicados na hora; "Voltar" apenas fecha.
  const apply = (nextFocus: string, nextRest: string) => {
    const f = Number(nextFocus);
    const r = Number(nextRest);
    if (Number.isInteger(f) && f >= 1 && f <= 180 && Number.isInteger(r) && r >= 1 && r <= 60) {
      onChange({ focus: f, rest: r });
    }
  };

  return (
    <DialogShell
      kind="timer"
      title="Personalização do Timer"
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <label className="inline-field">
        <b>Pomodoro:</b>
        <input
          type="number"
          min={1}
          max={180}
          value={focus}
          onChange={(e) => {
            setFocus(e.target.value);
            apply(e.target.value, rest);
          }}
        />
        <b>min.</b>
      </label>
      <label className="inline-field">
        <b>Pausa:</b>
        <input
          type="number"
          min={1}
          max={60}
          value={rest}
          onChange={(e) => {
            setRest(e.target.value);
            apply(focus, e.target.value);
          }}
        />
        <b>min.</b>
      </label>
      <button className="primary dialog-submit" type="submit">
        Voltar
      </button>
    </DialogShell>
  );
}

/* ------------------------------------------------------------------ */
/* Escolher dia                                                        */
/* ------------------------------------------------------------------ */

export function DateDialog({
  day,
  onPick,
  onClose,
}: {
  day: Date;
  onPick: (day: Date) => void;
  onClose: () => void;
}) {
  const todayValue = toDateInput(new Date());
  const [value, setValue] = useState(toDateInput(day));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (value) onPick(fromDateInput(value));
  };

  return (
    <DialogShell kind="date" title="Escolher dia" onClose={onClose} onSubmit={submit}>
      <Field label="Data:" type="date" value={value} onChange={setValue} required autoFocus />
      <button className="primary dialog-submit" type="submit" disabled={!value}>
        {value === todayValue ? "Hoje" : "Ir para o dia"}
      </button>
    </DialogShell>
  );
}

/* ------------------------------------------------------------------ */
/* Novo evento / tarefa (aluno e professor)                            */
/* ------------------------------------------------------------------ */

export type EventDraft = Pick<CalEvent, "title" | "subject" | "classCode" | "start" | "end">;

export function EventDialog({
  user,
  classes,
  event,
  preset,
  newTitle,
  onSave,
  onDelete,
  onClose,
}: {
  user: User;
  /** Turmas do professor (usadas no campo "Turma"). */
  classes: Classroom[];
  event?: CalEvent;
  preset?: { start: string; end: string; subject?: string };
  newTitle: string;
  onSave: (draft: EventDraft) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const isTeacher = user.role === "teacher";
  const readOnly = Boolean(event && event.ownerId !== user.id);

  const [title, setTitle] = useState(event?.title ?? "");
  const [subject, setSubject] = useState(event?.subject ?? preset?.subject ?? SUBJECTS[0].name);
  const [classCode, setClassCode] = useState(event?.classCode ?? classes[0]?.code ?? "");
  const [start, setStart] = useState(event?.start ?? preset?.start ?? "");
  const [end, setEnd] = useState(event?.end ?? preset?.end ?? "");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const heading = readOnly ? "Evento da turma" : event ? "Editar evento" : newTitle;
  const noClasses = isTeacher && classes.length === 0 && !event;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (readOnly) return onClose();
    if (!title.trim()) return setError("Informe um título.");
    if (parseLocal(end).getTime() <= parseLocal(start).getTime()) {
      return setError("O fim precisa ser depois do início.");
    }
    if (isTeacher) {
      const cls = classes.find((c) => c.code === classCode);
      if (!cls) return setError("Escolha uma turma.");
      onSave({ title: title.trim(), subject: cls.subject, classCode: cls.code, start, end });
    } else {
      onSave({ title: title.trim(), subject, classCode: event?.classCode ?? null, start, end });
    }
  };

  return (
    <DialogShell kind="event" title={heading} onClose={onClose} onSubmit={submit}>
      <Field label="Título:" value={title} onChange={setTitle} required readOnly={readOnly} autoFocus={!readOnly} />
      {isTeacher ? (
        <SelectField
          label="Turma:"
          value={classCode}
          onChange={setClassCode}
          required
          disabled={readOnly || Boolean(event)}
          placeholder={noClasses ? "Crie uma turma primeiro" : "Selecione"}
          options={classes.map((c) => ({ value: c.code, label: c.name }))}
        />
      ) : (
        <SelectField
          label="Disciplina:"
          value={subject}
          onChange={setSubject}
          required
          disabled={readOnly}
          options={SUBJECTS.map((s) => ({ value: s.name, label: s.name }))}
        />
      )}
      <Field label="Início:" type="datetime-local" value={start} onChange={setStart} required readOnly={readOnly} />
      <Field label="Fim:" type="datetime-local" value={end} onChange={setEnd} required readOnly={readOnly} />
      <FormError>{error}</FormError>
      <button className="primary dialog-submit" type="submit" disabled={noClasses}>
        {readOnly ? "Voltar" : event ? "Salvar" : "Adicionar"}
      </button>
      {event && !readOnly && onDelete && (
        <button
          type="button"
          className="link-danger"
          onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
        >
          {confirmDelete ? "Toque de novo para confirmar" : "Excluir evento"}
        </button>
      )}
    </DialogShell>
  );
}

/* ------------------------------------------------------------------ */
/* Turmas: professor cria / aluno entra com código                     */
/* ------------------------------------------------------------------ */

export function NewClassDialog({
  existing,
  onCreate,
  onClose,
}: {
  existing: Classroom[];
  onCreate: (data: { name: string; subject: string; code: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [code] = useState(() => makeClassCode(existing));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !subject) return;
    onCreate({ name: name.trim(), subject, code });
  };

  return (
    <DialogShell kind="class" title="Adicionar Nova Turma" onClose={onClose} onSubmit={submit}>
      <Field label="Nome da turma:" value={name} onChange={setName} required autoFocus />
      <SelectField
        label="Disciplina:"
        value={subject}
        onChange={setSubject}
        required
        placeholder="Selecione"
        options={SUBJECTS.map((s) => ({ value: s.name, label: s.name }))}
      />
      <Field label="Código da turma (só leitura):" value={code} readOnly />
      <button className="primary dialog-submit" type="submit">
        Adicionar
      </button>
    </DialogShell>
  );
}

export function JoinClassDialog({
  onJoin,
  onClose,
}: {
  onJoin: (code: string) => string | null;
  onClose: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(onJoin(code));
  };

  return (
    <DialogShell kind="class" title="Entrar em uma Turma" onClose={onClose} onSubmit={submit}>
      <Field
        label="Código da turma:"
        value={code}
        onChange={(v) => {
          setCode(v.toUpperCase());
          setError(null);
        }}
        required
        autoFocus
        maxLength={8}
        autoComplete="off"
      />
      <FormError>{error}</FormError>
      <button className="primary dialog-submit" type="submit">
        Entrar
      </button>
    </DialogShell>
  );
}
