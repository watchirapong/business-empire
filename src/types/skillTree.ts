export interface SkillTreeNode {
  id: string;
  name: string;
  description: string;
  icon: string;
  level: number; // 0 = root, 1 = main branch, 2 = sub-branch, 3 = leaf
  parentId?: string;
  children?: string[];
  isUnlocked: boolean;
  isPurchased: boolean;
  cost: number;
  currency: 'hamstercoin';
  requirements?: {
    level?: number;
    items?: string[];
    achievements?: string[];
  };
  benefits?: {
    statBoosts?: Record<string, number>;
    unlocks?: string[];
    specialAbilities?: string[];
  };
  position: {
    x: number;
    y: number;
  };
  connections?: string[]; // IDs of connected nodes
}

export interface SkillTreeBranch {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  nodes: SkillTreeNode[];
  isUnlocked: boolean;
  unlockCost: number;
}

export interface SkillTreeData {
  branches: SkillTreeBranch[];
  totalNodes: number;
  unlockedNodes: number;
  purchasedNodes: number;
}
