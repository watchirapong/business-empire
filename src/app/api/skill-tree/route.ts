import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import skillTreeData from '@/data/skillTreeData';
import { SkillTreeNode } from '@/types/skillTree';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const mongoose = await import('mongoose');
    const userId = (session.user as any).id;

    // Get user's skill tree progress
    const UserSkillTreeSchema = new mongoose.Schema({
      userId: { type: String, required: true, unique: true },
      unlockedNodes: [String],
      purchasedNodes: [String],
      totalSpent: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: Date.now }
    });

    const UserSkillTree = mongoose.models.UserSkillTree || mongoose.model('UserSkillTree', UserSkillTreeSchema);
    
    let userProgress = await UserSkillTree.findOne({ userId });
    
    if (!userProgress) {
      // Create new user progress with only root nodes unlocked
      userProgress = new UserSkillTree({
        userId,
        unlockedNodes: ['gaming-root', 'business-root', 'creative-root', 'lifestyle-root'],
        purchasedNodes: ['gaming-root', 'business-root', 'creative-root', 'lifestyle-root'],
        totalSpent: 0
      });
      await userProgress.save();
    }

    // Update skill tree data with user's progress
    const updatedBranches = skillTreeData.branches.map(branch => ({
      ...branch,
      nodes: branch.nodes.map(node => ({
        ...node,
        isUnlocked: userProgress.unlockedNodes.includes(node.id),
        isPurchased: userProgress.purchasedNodes.includes(node.id)
      }))
    }));

    const updatedSkillTree = {
      ...skillTreeData,
      branches: updatedBranches,
      unlockedNodes: userProgress.unlockedNodes.length,
      purchasedNodes: userProgress.purchasedNodes.length
    };

    return NextResponse.json({
      success: true,
      skillTree: updatedSkillTree,
      userProgress: {
        totalSpent: userProgress.totalSpent,
        lastUpdated: userProgress.lastUpdated
      }
    });

  } catch (error) {
    console.error('Error fetching skill tree:', error);
    return NextResponse.json({ error: 'Failed to fetch skill tree' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { nodeId, action } = await request.json();

    if (!nodeId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();
    
    const mongoose = await import('mongoose');
    const userId = (session.user as any).id;

    // Get user's skill tree progress
    const UserSkillTreeSchema = new mongoose.Schema({
      userId: { type: String, required: true, unique: true },
      unlockedNodes: [String],
      purchasedNodes: [String],
      totalSpent: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: Date.now }
    });

    const UserSkillTree = mongoose.models.UserSkillTree || mongoose.model('UserSkillTree', UserSkillTreeSchema);
    
    let userProgress = await UserSkillTree.findOne({ userId });
    
    if (!userProgress) {
      return NextResponse.json({ error: 'User progress not found' }, { status: 404 });
    }

    // Find the node in skill tree data
    let targetNode: SkillTreeNode | null = null;
    for (const branch of skillTreeData.branches) {
      const node = branch.nodes.find(n => n.id === nodeId);
      if (node) {
        targetNode = node;
        break;
      }
    }

    if (!targetNode) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    if (action === 'purchase') {
      // Check if node is unlocked and not already purchased
      if (!userProgress.unlockedNodes.includes(nodeId)) {
        return NextResponse.json({ error: 'Node is not unlocked' }, { status: 400 });
      }

      if (userProgress.purchasedNodes.includes(nodeId)) {
        return NextResponse.json({ error: 'Node already purchased' }, { status: 400 });
      }

      // Check if user has enough currency
      const CurrencySchema = new mongoose.Schema({
        userId: { type: String, required: true, unique: true },
        hamsterCoins: { type: Number, default: 0 },
        totalEarned: { type: Number, default: 0 },
        totalSpent: { type: Number, default: 0 },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
      });

      const Currency = mongoose.models.Currency || mongoose.model('Currency', CurrencySchema);
      
      let userCurrency = await Currency.findOne({ userId });
      
      if (!userCurrency) {
        return NextResponse.json({ error: 'User currency not found' }, { status: 404 });
      }

      if (userCurrency.hamsterCoins < targetNode.cost) {
        return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });
      }

      // Deduct cost and update currency
      userCurrency.hamsterCoins -= targetNode.cost;
      userCurrency.totalSpent += targetNode.cost;
      userCurrency.updatedAt = new Date();
      await userCurrency.save();

      // Add node to purchased nodes
      userProgress.purchasedNodes.push(nodeId);
      userProgress.totalSpent += targetNode.cost;
      userProgress.lastUpdated = new Date();

      // Unlock child nodes
      if (targetNode.connections && targetNode.connections.length > 0) {
        for (const childId of targetNode.connections) {
          if (!userProgress.unlockedNodes.includes(childId)) {
            userProgress.unlockedNodes.push(childId);
          }
        }
      }

      await userProgress.save();

      return NextResponse.json({
        success: true,
        message: 'Node purchased successfully',
        newBalance: userCurrency.hamsterCoins,
        unlockedNodes: targetNode.connections || []
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error processing skill tree action:', error);
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 });
  }
}
