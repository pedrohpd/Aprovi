export type Role = "student" | "teacher";

export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
};

export type MaterialFile = {
  id: string;
  name: string;
  url?: string;
};

export type MaterialCategory = {
  id: string;
  name: string;
  files: MaterialFile[];
};

export type ClassTask = {
  id: string;
  title: string;
  fileName?: string;
  url?: string;
};

export type Classroom = {
  code: string;
  name: string;
  subject: string;
  color: string;
  teacherId: string;
  categories?: MaterialCategory[];
  tasks?: ClassTask[];
};

/** `start` / `end` usam o formato local "YYYY-MM-DDTHH:mm" (mesmo valor do input datetime-local). */
export type CalEvent = {
  id: string;
  title: string;
  description?: string;
  subject: string;
  classCode: string | null;
  ownerId: string;
  start: string;
  end: string;
  completedBy?: string[];
};

export type MaterialType = "document" | "link" | "video" | "exercise";

export type Material = {
  id: string;
  title: string;
  description?: string;
  classCode: string;
  subject: string;
  type: MaterialType;
  url?: string;
  fileName?: string;
  createdAt: string;
  authorId: string;
};

export type Db = {
  users: User[];
  classes: Classroom[];
  /** id do aluno -> códigos das turmas em que entrou */
  memberships: Record<string, string[]>;
  events: CalEvent[];
  materials: Material[];
};

/* ------------------------------------------------------------------ */
/* Disciplinas                                                         */
/* ------------------------------------------------------------------ */

export const SUBJECTS = [
  { name: "Matemática", color: "#438fdd" },
  { name: "Física", color: "#ff9a3c" },
  { name: "Biologia", color: "#6df573" },
  { name: "Química", color: "#f86565" },
  { name: "Português", color: "#7c72f7" },
  { name: "História", color: "#c98b4a" },
  { name: "Geografia", color: "#2fb9a7" },
  { name: "Inglês", color: "#e2559a" },
] as const;

/** Disciplinas que sempre aparecem na aba Tarefas (como no design). */
export const DEFAULT_SUBJECTS = ["Matemática", "Física", "Biologia"];

export const subjectColor = (name: string) =>
  SUBJECTS.find((s) => s.name === name)?.color ?? "#438fdd";

/** Texto escuro sobre cores muito claras (ex.: o verde de Biologia). */
export function textOn(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.72 ? "#1d1b20" : "#ffffff";
}

/* ------------------------------------------------------------------ */
/* Datas                                                               */
/* ------------------------------------------------------------------ */

const pad = (n: number) => String(n).padStart(2, "0");

export const toLocalInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const toDateInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fromDateInput = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const parseLocal = (value: string) => new Date(value);

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const isSameDay = (a: Date, b: Date) => toDateInput(a) === toDateInput(b);

export function formatLongDate(d: Date) {
  const text = d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const formatShortDate = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;

export const formatTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Próxima hora cheia a partir de agora (padrão para novos eventos). */
export function nextFullHour(base = new Date()) {
  const d = new Date(base);
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

/* ------------------------------------------------------------------ */
/* Persistência                                                        */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "aprov-db-v1";

export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function seed(): Db {
  const now = new Date();
  const at = (offset: number, h: number, m: number) =>
    toLocalInput(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, h, m));

  return {
    users: [
      {
        id: "u-aluno",
        name: "Ana Souza",
        email: "aluno@aprov.com",
        password: "123456",
        role: "student",
      },
      {
        id: "u-prof",
        name: "Carlos Lima",
        email: "professor@aprov.com",
        password: "123456",
        role: "teacher",
      },
    ],
    classes: [
      {
        code: "HGSS",
        name: "Matemática/Cursinho",
        subject: "Matemática",
        color: "#438fdd",
        teacherId: "u-prof",
        categories: [
          {
            id: "cat-conjuntos",
            name: "Conjuntos",
            files: [
              { id: "f-c1", name: "conjuntos01.pdf" },
              { id: "f-c2", name: "conjuntos02.pdf" },
            ],
          },
          {
            id: "cat-funcoes",
            name: "Funções",
            files: [],
          },
        ],
        tasks: [
          { id: "t-1", title: "01 - lista_conjuntos", fileName: "lista_conjuntos.pdf" },
          { id: "t-2", title: "02 - lista_funcoes", fileName: "lista_funcoes.pdf" },
        ],
      },
      {
        code: "PKMN",
        name: "Geometria - 2o Ano",
        subject: "Matemática",
        color: "#7c72f7",
        teacherId: "u-prof",
        categories: [
          {
            id: "cat-geom",
            name: "Geometria Espacial",
            files: [{ id: "f-g1", name: "prismas_e_piramides.pdf" }],
          },
        ],
        tasks: [{ id: "t-g1", title: "01 - lista_geometria", fileName: "lista_geometria.pdf" }],
      },
    ],
    memberships: { "u-aluno": ["HGSS", "PKMN"] },
    events: [
      {
        id: "e-funcoes",
        title: "Entrega: Funções Afins e Quadráticas",
        description:
          "Resolver os exercícios do capítulo 3 (páginas 42 a 46). Atenção ao cálculo de raízes e vértice da parábola.",
        subject: "Matemática",
        classCode: "HGSS",
        ownerId: "u-prof",
        start: at(0, 8, 15),
        end: at(0, 9, 15),
        completedBy: [],
      },
      {
        id: "e-geometria",
        title: "Entrega: Geometria Espacial",
        description:
          "Lista preparatória sobre prismas retos, pirâmides e cálculo de volume em situações práticas do ENEM.",
        subject: "Matemática",
        classCode: "PKMN",
        ownerId: "u-prof",
        start: at(9, 13, 0),
        end: at(9, 14, 0),
        completedBy: ["u-aluno"],
      },
    ],
    materials: [
      {
        id: "m-funcoes-apostila",
        title: "Apostila Completa - Funções de 1º e 2º Graus",
        description:
          "Resumo teórico, fórmulas comentadas e coletânea com mais de 40 questões resolvidas dos principais vestibulares.",
        classCode: "HGSS",
        subject: "Matemática",
        type: "document",
        fileName: "Apostila_Funcoes_Cursinho.pdf",
        url: "https://exemplo.com/materiais/apostila-funcoes.pdf",
        createdAt: at(-3, 10, 0),
        authorId: "u-prof",
      },
      {
        id: "m-funcoes-video",
        title: "Videoaula: Resolução de Questões ENEM sobre Funções",
        description:
          "Revisão detalhada de interpretação de gráficos e equações com dicas para otimizar o tempo de prova.",
        classCode: "HGSS",
        subject: "Matemática",
        type: "video",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        createdAt: at(-2, 14, 30),
        authorId: "u-prof",
      },
      {
        id: "m-geometria-lista",
        title: "Lista de Exercícios: Trigonometria e Triângulos",
        description: "Material prático para fixação de fórmulas de seno, cosseno e lei das áreas.",
        classCode: "PKMN",
        subject: "Matemática",
        type: "exercise",
        fileName: "Lista_Fixacao_Trigonometria.pdf",
        url: "https://exemplo.com/materiais/lista-trigonometria.pdf",
        createdAt: at(-1, 9, 0),
        authorId: "u-prof",
      },
    ],
  };
}

export function loadDb(): Db {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Db;
      if (
        Array.isArray(parsed.users) &&
        Array.isArray(parsed.classes) &&
        Array.isArray(parsed.events) &&
        parsed.memberships
      ) {
        if (!Array.isArray(parsed.materials)) {
          parsed.materials = seed().materials;
        }
        parsed.classes = parsed.classes.map((c) => {
          const s = seed().classes.find((x) => x.code === c.code);
          return {
            ...c,
            categories:
              c.categories && c.categories.length > 0 ? c.categories : (s?.categories ?? []),
            tasks: c.tasks && c.tasks.length > 0 ? c.tasks : (s?.tasks ?? []),
          };
        });
        return parsed;
      }
    }
  } catch {
    /* dados inválidos: recomeça do zero */
  }
  return seed();
}

export function saveDb(db: Db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    /* armazenamento indisponível: o app segue funcionando em memória */
  }
}

/* ------------------------------------------------------------------ */
/* Consultas                                                           */
/* ------------------------------------------------------------------ */

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeClassCode(existing: Classroom[]) {
  for (;;) {
    const code = Array.from(
      { length: 4 },
      () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
    ).join("");
    if (!existing.some((c) => c.code === code)) return code;
  }
}

const EXTRA_COLORS = ["#7c72f7", "#2fb9a7", "#e2559a", "#c98b4a", "#f86565", "#ff9a3c"];

/** Usa a cor da disciplina; se o professor já a usa em outra turma, escolhe outra. */
export function pickClassColor(subject: string, teacherClasses: Classroom[]) {
  const used = new Set(teacherClasses.map((c) => c.color));
  const base = subjectColor(subject);
  if (!used.has(base)) return base;
  return EXTRA_COLORS.find((c) => !used.has(c)) ?? base;
}

export const classesOf = (db: Db, user: User): Classroom[] =>
  user.role === "teacher"
    ? db.classes.filter((c) => c.teacherId === user.id)
    : (db.memberships[user.id] ?? [])
        .map((code) => db.classes.find((c) => c.code === code))
        .filter((c): c is Classroom => Boolean(c));

/** Aluno: eventos próprios + eventos das turmas em que entrou. Professor: os seus. */
export function visibleEvents(db: Db, user: User): CalEvent[] {
  const joined = new Set(db.memberships[user.id] ?? []);
  return db.events.filter(
    (e) =>
      e.ownerId === user.id ||
      (user.role === "student" && e.classCode !== null && joined.has(e.classCode)),
  );
}

export function eventMeta(ev: CalEvent, classes: Classroom[]) {
  const cls = ev.classCode ? classes.find((c) => c.code === ev.classCode) : undefined;
  return { label: cls?.name ?? ev.subject, color: cls?.color ?? subjectColor(ev.subject) };
}

/** "Entrega: Funções" vira "Funções" na lista de tarefas. */
export const taskName = (title: string) => title.replace(/^Entrega:\s*/i, "");

export const materialsOfClass = (db: Db, classCode: string): Material[] =>
  (db.materials ?? []).filter((m) => m.classCode === classCode);

export const eventsOfClass = (db: Db, classCode: string): CalEvent[] =>
  db.events.filter((e) => e.classCode === classCode);

export function membersOfClass(db: Db, classCode: string): User[] {
  const studentIds = Object.entries(db.memberships)
    .filter(([, codes]) => codes.includes(classCode))
    .map(([id]) => id);
  return db.users.filter((u) => studentIds.includes(u.id));
}

export const isTaskCompleted = (event: CalEvent, userId: string) =>
  Boolean(event.completedBy?.includes(userId));

export function materialTypeLabel(type: MaterialType): string {
  switch (type) {
    case "document":
      return "Documento / PDF";
    case "video":
      return "Videoaula";
    case "link":
      return "Link Externo";
    case "exercise":
      return "Lista de Exercícios";
  }
}

export function materialTypeBadge(type: MaterialType): { bg: string; fg: string; label: string } {
  switch (type) {
    case "document":
      return { bg: "#e6f0fa", fg: "#1a56db", label: "Documento / PDF" };
    case "video":
      return { bg: "#fde8e8", fg: "#c81e1e", label: "Videoaula" };
    case "link":
      return { bg: "#def7ec", fg: "#03543f", label: "Link" };
    case "exercise":
      return { bg: "#edebfe", fg: "#5521b5", label: "Exercício" };
  }
}

/* ------------------------------------------------------------------ */
/* Calendário: posicionamento no dia                                   */
/* ------------------------------------------------------------------ */

export const HOUR_HEIGHT = 82;
const MIN_VISUAL_MINUTES = 30;

export type Segment = {
  event: CalEvent;
  startMin: number;
  endMin: number;
  lane: number;
  lanes: number;
};

/** Recorta os eventos ao dia escolhido (eventos podem durar vários dias) e distribui em colunas quando se sobrepõem. */
export function layoutDay(events: CalEvent[], day: Date): Segment[] {
  const d0 = startOfDay(day).getTime();
  const d1 = d0 + 24 * 60 * 60 * 1000;

  const raw = events
    .map((event) => {
      const s = Math.max(parseLocal(event.start).getTime(), d0);
      const e = Math.min(parseLocal(event.end).getTime(), d1);
      return { event, startMin: (s - d0) / 60000, endMin: (e - d0) / 60000, keep: e > s };
    })
    .filter((x) => x.keep)
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

  const out: Segment[] = [];
  let cluster: Segment[] = [];
  let clusterEnd = -1;
  let laneEnds: number[] = [];

  const flush = () => {
    cluster.forEach((s) => (s.lanes = laneEnds.length));
    out.push(...cluster);
    cluster = [];
    laneEnds = [];
    clusterEnd = -1;
  };

  for (const item of raw) {
    if (item.startMin >= clusterEnd && cluster.length) flush();
    const visualEnd = Math.max(item.endMin, item.startMin + MIN_VISUAL_MINUTES);
    let lane = laneEnds.findIndex((end) => end <= item.startMin);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = visualEnd;
    clusterEnd = Math.max(clusterEnd, visualEnd);
    cluster.push({
      event: item.event,
      startMin: item.startMin,
      endMin: item.endMin,
      lane,
      lanes: 1,
    });
  }
  flush();
  return out;
}
