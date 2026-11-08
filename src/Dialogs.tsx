import { FormEvent, useRef, useState } from "react";
import {
  CalEvent,
  Classroom,
  Material,
  MaterialType,
  SUBJECTS,
  User,
  fromDateInput,
  makeClassCode,
  materialTypeBadge,
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
/* ------------------------------------------------------------------ */
/* Novo evento / tarefa (aluno e professor)                            */
/* ------------------------------------------------------------------ */

export type EventDraft = Pick<
  CalEvent,
  "title" | "description" | "subject" | "classCode" | "start" | "end"
>;

export function EventDialog({
  user,
  classes,
  event,
  preset,
  newTitle,
  onSave,
  onDelete,
  onOpenClass,
  onClose,
}: {
  user: User;
  /** Turmas do professor (usadas no campo "Turma"). */
  classes: Classroom[];
  event?: CalEvent;
  preset?: { start: string; end: string; subject?: string; classCode?: string };
  newTitle: string;
  onSave: (draft: EventDraft) => void;
  onDelete?: () => void;
  onOpenClass?: (classCode: string) => void;
  onClose: () => void;
}) {
  const isTeacher = user.role === "teacher";
  const readOnly = Boolean(event && event.ownerId !== user.id);

  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [subject, setSubject] = useState(event?.subject ?? preset?.subject ?? SUBJECTS[0].name);
  const [classCode, setClassCode] = useState(
    event?.classCode ?? preset?.classCode ?? classes[0]?.code ?? "",
  );
  const [start, setStart] = useState(event?.start ?? preset?.start ?? "");
  const [end, setEnd] = useState(event?.end ?? preset?.end ?? "");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const heading = readOnly ? "Evento da turma" : event ? "Editar evento" : newTitle;
  const noClasses = isTeacher && classes.length === 0 && !event;

  const currentClass = classes.find((c) => c.code === (event?.classCode ?? classCode));

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
      onSave({
        title: title.trim(),
        description: description.trim(),
        subject: cls.subject,
        classCode: cls.code,
        start,
        end,
      });
    } else {
      onSave({
        title: title.trim(),
        description: description.trim(),
        subject,
        classCode: event?.classCode ?? null,
        start,
        end,
      });
    }
  };

  return (
    <DialogShell kind="event" title={heading} onClose={onClose} onSubmit={submit}>
      <Field
        label="Título:"
        value={title}
        onChange={setTitle}
        required
        readOnly={readOnly}
        autoFocus={!readOnly}
      />
      {isTeacher ? (
        <SelectField
          label="Turma:"
          value={classCode}
          onChange={setClassCode}
          required
          disabled={readOnly || Boolean(event) || Boolean(preset?.classCode)}
          placeholder={noClasses ? "Crie uma turma primeiro" : "Selecione"}
          options={classes.map((c) => ({ value: c.code, label: `${c.name} (${c.subject})` }))}
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
      <Field
        label="Início:"
        type="datetime-local"
        value={start}
        onChange={setStart}
        required
        readOnly={readOnly}
      />
      <Field
        label="Fim (Prazo):"
        type="datetime-local"
        value={end}
        onChange={setEnd}
        required
        readOnly={readOnly}
      />
      <label className="field">
        <span>Descrição / Instruções:</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          readOnly={readOnly}
          placeholder="Instruções sobre a tarefa, páginas de exercício, etc."
        />
      </label>
      {currentClass && onOpenClass && (
        <button
          type="button"
          className="dialog-class-jump"
          onClick={() => {
            onClose();
            onOpenClass(currentClass.code);
          }}
        >
          <span>
            Acessar página da turma: <strong>{currentClass.name}</strong> →
          </span>
        </button>
      )}
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
/* Materiais de Estudo (Adicionar / Editar)                           */
/* ------------------------------------------------------------------ */

export type MaterialDraft = {
  title: string;
  description: string;
  type: MaterialType;
  url: string;
  fileName: string;
  classCode: string;
  subject: string;
};

export function MaterialDialog({
  classes,
  material,
  preset,
  onSave,
  onDelete,
  onClose,
}: {
  classes: Classroom[];
  material?: Material;
  preset?: { classCode: string; subject: string };
  onSave: (draft: MaterialDraft) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(material?.title ?? "");
  const [description, setDescription] = useState(material?.description ?? "");
  const [type, setType] = useState<MaterialType>(material?.type ?? "document");
  const [url, setUrl] = useState(material?.url ?? "");
  const [fileName, setFileName] = useState(material?.fileName ?? "");
  const [classCode, setClassCode] = useState(
    material?.classCode ?? preset?.classCode ?? classes[0]?.code ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError("Informe um título para o material.");
    const cls = classes.find((c) => c.code === classCode);
    if (!cls) return setError("Selecione uma turma.");

    onSave({
      title: title.trim(),
      description: description.trim(),
      type,
      url: url.trim(),
      fileName: fileName.trim(),
      classCode: cls.code,
      subject: cls.subject,
    });
  };

  return (
    <DialogShell
      kind="class"
      title={material ? "Editar Material" : "Novo Material"}
      onClose={onClose}
      onSubmit={submit}
    >
      <Field label="Título do material:" value={title} onChange={setTitle} required autoFocus />
      <SelectField
        label="Turma:"
        value={classCode}
        onChange={setClassCode}
        required
        disabled={Boolean(material) || Boolean(preset?.classCode)}
        options={classes.map((c) => ({ value: c.code, label: `${c.name} (${c.subject})` }))}
      />
      <SelectField
        label="Tipo de material:"
        value={type}
        onChange={(v) => setType(v as MaterialType)}
        required
        options={[
          { value: "document", label: "Documento / PDF" },
          { value: "video", label: "Videoaula" },
          { value: "link", label: "Link Externo" },
          { value: "exercise", label: "Lista de Exercícios" },
        ]}
      />
      <Field
        label="Link ou URL:"
        type="url"
        value={url}
        onChange={setUrl}
        placeholder="https://exemplo.com/apostila.pdf"
      />
      <Field
        label="Nome do arquivo ou anexo (opcional):"
        value={fileName}
        onChange={setFileName}
        placeholder="ex.: Apostila_Capitulo_1.pdf"
      />
      <label className="field">
        <span>Descrição / Instruções (opcional):</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Orientações aos alunos, páginas recomendadas, etc."
        />
      </label>
      <FormError>{error}</FormError>
      <button className="primary dialog-submit" type="submit">
        {material ? "Salvar alterações" : "Adicionar Material"}
      </button>
      {material && onDelete && (
        <button
          type="button"
          className="link-danger"
          onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
        >
          {confirmDelete ? "Toque de novo para confirmar" : "Excluir material"}
        </button>
      )}
    </DialogShell>
  );
}

/* ------------------------------------------------------------------ */
/* Visualizador de Detalhes do Material                                */
/* ------------------------------------------------------------------ */

export function MaterialViewDialog({
  material,
  classroom,
  onClose,
}: {
  material: Material;
  classroom?: Classroom;
  onClose: () => void;
}) {
  const badge = materialTypeBadge(material.type);

  const openLink = () => {
    if (material.url) {
      window.open(material.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <DialogShell
      kind="class"
      title="Detalhes do Material"
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="material-view-card">
        <div className="material-view-meta">
          <span className="material-type-pill" style={{ background: badge.bg, color: badge.fg }}>
            {badge.label}
          </span>
          {classroom && <span className="material-class-pill">{classroom.name}</span>}
        </div>
        <h3 className="material-view-title">{material.title}</h3>
        {material.description && <p className="material-view-desc">{material.description}</p>}
        {material.fileName && (
          <div className="material-file-box">
            <span>📄 {material.fileName}</span>
          </div>
        )}
        {material.url ? (
          <button type="button" className="primary material-open-action" onClick={openLink}>
            <span>Abrir material / recurso externo ↗</span>
          </button>
        ) : (
          <p className="material-no-link-note">Este material não possui link externo anexado.</p>
        )}
      </div>
      <button className="secondary dialog-submit" type="submit">
        Fechar
      </button>
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

/* ------------------------------------------------------------------ */
/* Upload Box e Ícone de Envio (conforme modelo visual)                */
/* ------------------------------------------------------------------ */

export function UploadIcon() {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#1d1b20"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      <polyline points="16 8 12 4 8 8" />
      <line x1="12" y1="4" x2="12" y2="16" />
    </svg>
  );
}

export function UploadBox({
  fileName,
  onSelectFile,
}: {
  fileName: string;
  onSelectFile: (name: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="popup-upload-area">
      <button
        type="button"
        className="upload-box-button"
        onClick={() => fileInputRef.current?.click()}
        aria-label="Selecionar arquivo para envio"
      >
        <UploadIcon />
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onSelectFile(file.name);
          }}
        />
      </button>
      {fileName ? (
        <span className="upload-box-filename" title={fileName}>
          📄 {fileName}
        </span>
      ) : (
        <input
          type="text"
          className="upload-box-name-input"
          placeholder="Ou digite o nome do arquivo (ex.: aula01.pdf)"
          value={fileName}
          onChange={(e) => onSelectFile(e.target.value)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pop-up Adicionar Categoria                                          */
/* ------------------------------------------------------------------ */

export function AddCategoryDialog({
  onAdd,
  onClose,
}: {
  onAdd: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Informe o nome da categoria.");
    onAdd(name.trim());
    onClose();
  };

  return (
    <DialogShell kind="class" title="Adicionar Categoria" onClose={onClose} onSubmit={submit}>
      <Field label="Categoria:" value={name} onChange={setName} required autoFocus />
      <FormError>{error}</FormError>
      <button className="primary dialog-submit" type="submit">
        Adicionar
      </button>
    </DialogShell>
  );
}

/* ------------------------------------------------------------------ */
/* Pop-up Adicionar Material                                           */
/* ------------------------------------------------------------------ */

export function AddMaterialDialog({
  categoryName,
  onAdd,
  onClose,
}: {
  categoryName: string;
  onAdd: (fileName: string) => void;
  onClose: () => void;
}) {
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) return setError("Selecione ou informe um arquivo.");
    onAdd(fileName.trim());
    onClose();
  };

  return (
    <DialogShell kind="class" title="Adicionar Material" onClose={onClose} onSubmit={submit}>
      <div className="popup-category-heading">
        <strong>Categoria: {categoryName}</strong>
      </div>
      <div className="popup-upload-section">
        <span className="popup-upload-title">Submeta o arquivo:</span>
        <UploadBox
          fileName={fileName}
          onSelectFile={(name) => {
            setFileName(name);
            setError(null);
          }}
        />
      </div>
      <FormError>{error}</FormError>
      <button className="primary dialog-submit" type="submit">
        Adicionar
      </button>
    </DialogShell>
  );
}

/* ------------------------------------------------------------------ */
/* Pop-up Adicionar Tarefa                                             */
/* ------------------------------------------------------------------ */

export function AddTaskDialog({
  onAdd,
  onClose,
}: {
  onAdd: (title: string, fileName: string) => void;
  onClose: () => void;
}) {
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) return setError("Selecione ou informe um arquivo para a tarefa.");
    const cleanName = fileName.trim();
    const baseTitle = cleanName.replace(/\.[^/.]+$/, "");
    onAdd(baseTitle, cleanName);
    onClose();
  };

  return (
    <DialogShell kind="class" title="Adicionar Tarefa" onClose={onClose} onSubmit={submit}>
      <div className="popup-upload-section">
        <span className="popup-upload-title">Submeta o arquivo:</span>
        <UploadBox
          fileName={fileName}
          onSelectFile={(name) => {
            setFileName(name);
            setError(null);
          }}
        />
      </div>
      <FormError>{error}</FormError>
      <button className="primary dialog-submit" type="submit">
        Adicionar
      </button>
    </DialogShell>
  );
}
