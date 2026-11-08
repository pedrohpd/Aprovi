import { useCallback, useEffect, useRef, useState } from "react";
import { Auth } from "./Auth";
import {
  AddCategoryDialog,
  AddMaterialDialog,
  AddTaskDialog,
  DateDialog,
  EventDialog,
  EventDraft,
  JoinClassDialog,
  MaterialDialog,
  MaterialDraft,
  MaterialViewDialog,
  NewClassDialog,
  TimerDialog,
} from "./Dialogs";
import {
  CalEvent,
  Classroom,
  Db,
  Material,
  Role,
  User,
  classesOf,
  eventsOfClass,
  loadDb,
  materialsOfClass,
  membersOfClass,
  nextFullHour,
  parseLocal,
  pickClassColor,
  saveDb,
  startOfDay,
  toLocalInput,
  uid,
  visibleEvents,
} from "./data";
import { Calendar, ClassDetail, Classes, Profile, Tasks, Timer } from "./screens";
import { allowedScreens, BottomNav, Screen, Toast } from "./ui";
import { useTimer } from "./useTimer";

type Modal =
  | { type: "timer" }
  | { type: "date" }
  | { type: "class" }
  | { type: "addCategory"; classCode: string }
  | { type: "addMaterial"; classCode: string; categoryName: string }
  | { type: "addTask"; classCode: string }
  | {
      type: "event";
      id?: string;
      title: string;
      preset?: { start: string; end: string; subject?: string; classCode?: string };
    }
  | {
      type: "material";
      id?: string;
      title: string;
      preset?: { classCode: string; subject: string };
    }
  | {
      type: "materialView";
      material: Material;
    }
  | null;

const emailTaken = (db: Db, email: string, exceptId?: string) =>
  db.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.id !== exceptId);

export default function App() {
  const [db, setDb] = useState<Db>(loadDb);
  const [userId, setUserId] = useState<string | null>(null);
  const [authKind, setAuthKind] = useState<"login" | "signup">("login");
  const [screen, setScreen] = useState<Screen>("timer");
  const [selectedClassCode, setSelectedClassCode] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [openSubject, setOpenSubject] = useState("Matemática");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number>(0);

  useEffect(() => saveDb(db), [db]);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const timer = useTimer((finished) =>
    notify(
      finished === "focus"
        ? "Pomodoro concluído! Hora da pausa."
        : "Pausa encerrada. Vamos voltar a estudar!",
    ),
  );

  const user = db.users.find((u) => u.id === userId) ?? null;

  /* ------------------------------ Autenticação ------------------------------ */

  const enter = (u: User) => {
    setUserId(u.id);
    setScreen(u.role === "teacher" ? "calendar" : "timer");
    setSelectedClassCode(null);
    setDay(startOfDay(new Date()));
    setModal(null);
  };

  const login = (email: string, password: string) => {
    const found = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!found || found.password !== password) return "Email ou senha incorretos.";
    enter(found);
    return null;
  };

  const signup = (data: { name: string; email: string; password: string; role: Role }) => {
    if (emailTaken(db, data.email)) return "Já existe uma conta com esse email.";
    const created: User = { id: uid(), ...data, email: data.email.trim() };
    setDb((d) => ({ ...d, users: [...d.users, created] }));
    enter(created);
    return null;
  };

  const logout = () => {
    setUserId(null);
    setSelectedClassCode(null);
    setAuthKind("login");
    setModal(null);
  };

  if (!user) {
    return (
      <Auth
        kind={authKind}
        api={{ login, signup }}
        onSwitch={() => setAuthKind(authKind === "login" ? "signup" : "login")}
      />
    );
  }

  /* --------------------------------- Dados --------------------------------- */

  const isTeacher = user.role === "teacher";
  const myClasses = classesOf(db, user);
  const events = visibleEvents(db, user);
  const closeModal = () => setModal(null);

  const goTo = (next: Screen) => {
    if (allowedScreens(user.role).includes(next)) {
      if (next === "classes" && screen === "classes" && selectedClassCode) {
        setSelectedClassCode(null);
      } else {
        setScreen(next);
        setSelectedClassCode(null);
      }
      setModal(null);
    }
  };

  const openClass = (code: string) => {
    setSelectedClassCode(code);
    setScreen("classes");
    setModal(null);
  };

  const saveProfile = (data: { name: string; email: string; password: string }) => {
    if (emailTaken(db, data.email, user.id)) return "Já existe uma conta com esse email.";
    setDb((d) => ({
      ...d,
      users: d.users.map((u) =>
        u.id === user.id
          ? {
              ...u,
              name: data.name,
              email: data.email.trim(),
              password: data.password || u.password,
            }
          : u,
      ),
    }));
    notify("Perfil atualizado.");
    return null;
  };

  const hourPreset = (base: Date, hour: number) => {
    const start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hour, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return { start: toLocalInput(start), end: toLocalInput(end) };
  };

  const openNewEvent = (from: "tasks" | "calendar", hour?: number) => {
    const today = startOfDay(new Date()).getTime() === day.getTime();
    let preset: { start: string; end: string; subject?: string };
    if (hour !== undefined) {
      preset = hourPreset(day, hour);
    } else if (from === "calendar" && !today) {
      preset = hourPreset(day, 8);
    } else {
      const start = nextFullHour();
      preset = {
        start: toLocalInput(start),
        end: toLocalInput(new Date(start.getTime() + 60 * 60 * 1000)),
      };
    }
    if (from === "tasks" && openSubject) preset.subject = openSubject;
    setModal({ type: "event", title: from === "tasks" ? "Nova tarefa" : "Novo evento", preset });
  };

  const saveEvent = (draft: EventDraft) => {
    if (modal?.type !== "event") return;
    const editingId = modal.id;
    setDb((d) => ({
      ...d,
      events: editingId
        ? d.events.map((e) => (e.id === editingId ? { ...e, ...draft } : e))
        : [...d.events, { id: uid(), ownerId: user.id, ...draft } satisfies CalEvent],
    }));
    if (!isTeacher) setOpenSubject(draft.subject);
    if (screen === "calendar") setDay(startOfDay(parseLocal(draft.start)));
    notify(
      editingId
        ? "Evento atualizado."
        : screen === "tasks"
          ? "Tarefa adicionada."
          : "Evento adicionado.",
    );
    closeModal();
  };

  const deleteEvent = () => {
    if (modal?.type !== "event" || !modal.id) return;
    const id = modal.id;
    setDb((d) => ({ ...d, events: d.events.filter((e) => e.id !== id) }));
    notify("Evento excluído.");
    closeModal();
  };

  const toggleTask = (taskId: string) => {
    setDb((d) => ({
      ...d,
      events: d.events.map((e) => {
        if (e.id !== taskId) return e;
        const completed = e.completedBy ?? [];
        const isDone = completed.includes(user.id);
        const nextCompleted = isDone
          ? completed.filter((id) => id !== user.id)
          : [...completed, user.id];
        return { ...e, completedBy: nextCompleted };
      }),
    }));
    notify("Status da tarefa atualizado.");
  };

  const saveMaterial = (draft: MaterialDraft) => {
    if (modal?.type !== "material") return;
    const editingId = modal.id;
    setDb((d) => ({
      ...d,
      materials: editingId
        ? (d.materials ?? []).map((m) => (m.id === editingId ? { ...m, ...draft } : m))
        : [
            ...(d.materials ?? []),
            {
              id: uid(),
              authorId: user.id,
              createdAt: toLocalInput(new Date()),
              ...draft,
            },
          ],
    }));
    notify(editingId ? "Material atualizado." : "Material adicionado.");
    closeModal();
  };

  const deleteMaterial = () => {
    if (modal?.type !== "material" || !modal.id) return;
    const id = modal.id;
    setDb((d) => ({
      ...d,
      materials: (d.materials ?? []).filter((m) => m.id !== id),
    }));
    notify("Material excluído.");
    closeModal();
  };

  const createClass = (data: { name: string; subject: string; code: string }) => {
    setDb((d) => ({
      ...d,
      classes: [
        ...d.classes,
        {
          ...data,
          teacherId: user.id,
          color: pickClassColor(
            data.subject,
            d.classes.filter((c) => c.teacherId === user.id),
          ),
        },
      ],
    }));
    notify(`Turma criada! Compartilhe o código ${data.code}.`);
    closeModal();
    openClass(data.code);
  };

  const joinClass = (raw: string) => {
    const code = raw.trim().toUpperCase();
    const found = db.classes.find((c) => c.code === code);
    if (!found) return "Nenhuma turma encontrada com esse código.";
    if ((db.memberships[user.id] ?? []).includes(code)) return "Você já participa desta turma.";
    setDb((d) => ({
      ...d,
      memberships: { ...d.memberships, [user.id]: [...(d.memberships[user.id] ?? []), code] },
    }));
    setOpenSubject(found.subject);
    notify(`Você entrou em ${found.name}.`);
    closeModal();
    openClass(found.code);
    return null;
  };

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code).then(
      () => notify(`Código ${code} copiado.`),
      () => notify(`Código da turma: ${code}`),
    );
    if (!navigator.clipboard) notify(`Código da turma: ${code}`);
  };

  const handleAddCategory = (categoryName: string) => {
    if (modal?.type !== "addCategory") return;
    const code = modal.classCode;
    setDb((d) => ({
      ...d,
      classes: d.classes.map((c) => {
        if (c.code !== code) return c;
        const existing = c.categories ?? [];
        if (existing.some((cat) => cat.name.toLowerCase() === categoryName.toLowerCase())) {
          return c;
        }
        return {
          ...c,
          categories: [...existing, { id: uid(), name: categoryName, files: [] }],
        };
      }),
    }));
    notify(`Categoria "${categoryName}" adicionada.`);
    closeModal();
  };

  const handleAddMaterial = (fileName: string) => {
    if (modal?.type !== "addMaterial") return;
    const { classCode, categoryName } = modal;
    setDb((d) => ({
      ...d,
      classes: d.classes.map((c) => {
        if (c.code !== classCode) return c;
        const existing = c.categories ?? [];
        return {
          ...c,
          categories: existing.map((cat) => {
            if (cat.name !== categoryName) return cat;
            return {
              ...cat,
              files: [...cat.files, { id: uid(), name: fileName }],
            };
          }),
        };
      }),
    }));
    notify(`Material "${fileName}" adicionado em ${categoryName}.`);
    closeModal();
  };

  const handleAddTask = (title: string, fileName: string) => {
    if (modal?.type !== "addTask") return;
    const code = modal.classCode;
    setDb((d) => ({
      ...d,
      classes: d.classes.map((c) => {
        if (c.code !== code) return c;
        const existing = c.tasks ?? [];
        const nextNum = String(existing.length + 1).padStart(2, "0");
        const taskTitle = `${nextNum} - ${title.replace(/^\d+\s*-\s*/, "")}`;
        return {
          ...c,
          tasks: [...existing, { id: uid(), title: taskTitle, fileName }],
        };
      }),
    }));
    notify("Tarefa adicionada com sucesso.");
    closeModal();
  };

  const handleOpenFile = (fileName: string) => {
    const content = `Aprov! - Arquivo da Turma: ${activeClass?.name ?? ""}\nArquivo: ${fileName}\nData: ${new Date().toLocaleDateString("pt-BR")}`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify(`Abrindo ${fileName}...`);
  };

  const editingEvent =
    modal?.type === "event" && modal.id ? db.events.find((e) => e.id === modal.id) : undefined;
  const editingMaterial =
    modal?.type === "material" && modal.id
      ? (db.materials ?? []).find((m) => m.id === modal.id)
      : undefined;
  const activeClass = selectedClassCode
    ? (db.classes.find((c) => c.code === selectedClassCode) ?? null)
    : null;

  return (
    <main className="app-shell">
      {screen === "timer" && !isTeacher && (
        <Timer
          seconds={timer.seconds}
          running={timer.running}
          phase={timer.phase}
          onToggle={timer.toggle}
          onRestart={timer.restart}
          openSettings={() => setModal({ type: "timer" })}
        />
      )}
      {screen === "tasks" && (
        <Tasks
          events={events}
          classes={myClasses}
          open={openSubject}
          setOpen={setOpenSubject}
          onAdd={() => openNewEvent("tasks")}
          onOpen={(id) => setModal({ type: "event", id, title: "Editar evento" })}
          onOpenClass={openClass}
        />
      )}
      {screen === "calendar" && (
        <Calendar
          day={day}
          events={events}
          classes={isTeacher ? myClasses : db.classes}
          userId={user.id}
          onChooseDate={() => setModal({ type: "date" })}
          onAdd={() => openNewEvent("calendar")}
          onSlot={(hour) => openNewEvent("calendar", hour)}
          onOpen={(id) => setModal({ type: "event", id, title: "Editar evento" })}
        />
      )}
      {screen === "classes" &&
        (activeClass ? (
          <ClassDetail
            classroom={activeClass}
            isTeacher={isTeacher}
            onBack={() => setSelectedClassCode(null)}
            onAddCategory={() => setModal({ type: "addCategory", classCode: activeClass.code })}
            onAddMaterial={(categoryName) =>
              setModal({ type: "addMaterial", classCode: activeClass.code, categoryName })
            }
            onAddTask={() => setModal({ type: "addTask", classCode: activeClass.code })}
            onOpenFile={handleOpenFile}
          />
        ) : (
          <Classes
            classes={myClasses}
            isTeacher={isTeacher}
            onSelectClass={openClass}
            onAdd={() => setModal({ type: "class" })}
          />
        ))}
      {screen === "profile" && (
        <Profile key={user.id} user={user} onSave={saveProfile} onLogout={logout} />
      )}

      <BottomNav active={screen} role={user.role} onGo={goTo} />
      <Toast message={toast} />

      {modal?.type === "timer" && (
        <TimerDialog config={timer.config} onChange={timer.updateConfig} onClose={closeModal} />
      )}
      {modal?.type === "date" && (
        <DateDialog
          day={day}
          onPick={(picked) => {
            setDay(picked);
            closeModal();
          }}
          onClose={closeModal}
        />
      )}
      {modal?.type === "event" && (!modal.id || editingEvent) && (
        <EventDialog
          user={user}
          classes={myClasses}
          event={editingEvent}
          preset={modal.preset}
          newTitle={modal.title}
          onSave={saveEvent}
          onDelete={deleteEvent}
          onOpenClass={openClass}
          onClose={closeModal}
        />
      )}
      {modal?.type === "addCategory" && (
        <AddCategoryDialog onAdd={handleAddCategory} onClose={closeModal} />
      )}
      {modal?.type === "addMaterial" && (
        <AddMaterialDialog
          categoryName={modal.categoryName}
          onAdd={handleAddMaterial}
          onClose={closeModal}
        />
      )}
      {modal?.type === "addTask" && <AddTaskDialog onAdd={handleAddTask} onClose={closeModal} />}
      {modal?.type === "material" && (
        <MaterialDialog
          classes={myClasses}
          material={editingMaterial}
          preset={modal.preset}
          onSave={saveMaterial}
          onDelete={deleteMaterial}
          onClose={closeModal}
        />
      )}
      {modal?.type === "materialView" && (
        <MaterialViewDialog
          material={modal.material}
          classroom={db.classes.find((c) => c.code === modal.material.classCode)}
          onClose={closeModal}
        />
      )}
      {modal?.type === "class" &&
        (isTeacher ? (
          <NewClassDialog existing={db.classes} onCreate={createClass} onClose={closeModal} />
        ) : (
          <JoinClassDialog onJoin={joinClass} onClose={closeModal} />
        ))}
    </main>
  );
}
