export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  artifact?: {
    type: string;
    code: string;
  };
  timestamp: number;
};

export type Chat = {
  id: string;
  title: string;
  messages: Message[];
  created: number;
};