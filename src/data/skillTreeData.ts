import { SkillTreeData, SkillTreeBranch } from '@/types/skillTree';

// Dynamic skill tree data - populated from database
export const skillTreeData: SkillTreeData = {
  branches: [
    // This will be populated dynamically from the database
    // through the /api/skill-tree/branches endpoint
  ],
  totalNodes: 0,
  unlockedNodes: 0,
  purchasedNodes: 0
};

export default skillTreeData;