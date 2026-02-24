export type TemaModo = "dark" | "light";

export type AbaPrincipal = "inicio" | "quests" | "comunidade" | "perfil" | "configuracoes";

export type CategoriaQuest = "estudo" | "projeto" | "rotina" | "lazer";

export interface UsuarioApp {
  uid: string;
  nomeExibido: string;
  nomeUsuario: string;
  nomeUsuarioLower: string;
  email: string;
  temaPreferido: TemaModo;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Quest {
  id: string;
  titulo: string;
  categoria: CategoriaQuest;
  prioridade: 1 | 2 | 3;
  concluida: boolean;
  criadaPor: string;
  criadoEm: string;
  atualizadoEm: string;
  concluidaEm: string | null;
}

export interface StatusOnline {
  uid: string;
  nomeExibido: string;
  online: boolean;
  ultimoPulso: string;
}

export interface RegistroAtividade {
  id: string;
  uid: string;
  data: string;
  mes: string;
  quantidade: number;
  atualizadoEm: string;
}

export interface RegistroLocalizacao {
  uid: string;
  nomeExibido: string;
  ativo: boolean;
  latitude: number | null;
  longitude: number | null;
  atualizadoEm: string;
}

export interface EstadoAviso {
  tipo: "sucesso" | "erro" | "neutro";
  mensagem: string;
}
