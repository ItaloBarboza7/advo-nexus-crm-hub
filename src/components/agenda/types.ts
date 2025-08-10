
export type Task = {
  id: string;
  date: string; // yyyy-MM-dd
  title: string;
  description?: string;
  owner?: string;
  time?: string; // HH:mm
  color?: string; // CSS color (hsl(...) or hex)
};
