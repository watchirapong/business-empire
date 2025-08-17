export type Player = {
  id?: string;
  name: string;
  remainingMoney: number;
  investments: Record<string, number>;
  finalValue?: number;
};

export type Company = {
  name: string;
  totalInvestment: number;
  growth: number;
};

export type GameState = {
  players: Player[];
  companies: Company[];
  currentPhase: 'setup' | 'investment' | 'results';
  currentPlayerIndex?: number;
  currentCompanyIndex?: number;
};
