export interface DialogueChoice {
  label: string;
  next: string | null;
}

export interface DialogueNode {
  text: string;
  choices?: DialogueChoice[];
  next?: string | null;
}

export interface Dialogue {
  id: string;
  start: string;
  nodes: Record<string, DialogueNode>;
}
