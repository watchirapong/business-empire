# 🌳 Skill Tree Shop System

## Overview
The Skill Tree Shop is a branching progression system where users can purchase skills that unlock new paths and abilities. Each category is a main branch that splits into specialized sub-branches.

## 🎯 How It Works

### Tree Structure
- **Root Nodes**: Free starting points for each main branch
- **Level 1**: Main branch skills (50-75 coins)
- **Level 2**: Specialized sub-branch skills (80-150 coins)
- **Connections**: Purchasing a skill unlocks its connected child skills

### Main Branches

#### 🎮 Gaming Branch (Red)
- **Combat Skills**: Melee Weapons, Ranged Weapons, Defense Equipment
- **Strategy Skills**: Resource Management, Map Knowledge, Quick Thinking  
- **Luck & RNG**: Lucky Charms, Gambling Tools, Mystery Boxes

#### 💼 Business Branch (Teal)
- **Investment Skills**: Stock Trading, Real Estate, Precious Metals
- **Management Skills**: Team Leadership, Project Management, Analytics
- **Innovation**: Research & Development, Startup Tools, Creative Solutions

#### 🎨 Creative Branch (Blue)
- **Visual Arts**: Digital Art Tools, Photography Equipment, Video Production
- **Audio & Music**: Recording Equipment, Instruments, Sound Systems
- **Writing & Content**: Writing Tools, Research Materials, Publishing Platforms

#### 🏠 Lifestyle Branch (Green)
- **Health & Fitness**: Workout Equipment, Nutrition Supplements, Wellness Tools
- **Home & Living**: Furniture & Decor, Kitchen Appliances, Garden & Plants
- **Personal Development**: Learning Resources, Goal Setting Tools, Mindfulness Apps

## 🎮 User Experience

### Visual Interface
- **Interactive Canvas**: Click on nodes to view details
- **Color Coding**: 
  - 🟢 Green = Purchased
  - 🟡 Yellow = Unlocked (available to purchase)
  - ⚫ Gray = Locked (requires prerequisites)
- **Branch Selector**: Switch between different skill trees
- **Balance Display**: Shows current Hamster Coins

### Progression System
1. **Start**: All users begin with root nodes unlocked
2. **Purchase**: Buy skills with Hamster Coins to unlock new paths
3. **Unlock**: Each purchase automatically unlocks connected child skills
4. **Progress**: Build your unique skill tree based on your goals

## 🔧 Technical Implementation

### API Endpoints
- `GET /api/skill-tree` - Fetch user's skill tree progress
- `POST /api/skill-tree` - Purchase a skill node

### Data Structure
- **SkillTreeNode**: Individual skill with position, cost, connections
- **SkillTreeBranch**: Collection of related skills
- **User Progress**: Tracks unlocked and purchased nodes

### Database Schema
- **UserSkillTree**: Stores user's progression
- **Currency**: Manages Hamster Coins balance

## 🚀 Features

### Interactive Elements
- **Canvas-based Tree**: Visual representation with clickable nodes
- **Real-time Updates**: Balance and progress update immediately
- **Detailed Views**: Click nodes for full information
- **Purchase System**: Integrated with existing currency system

### User Benefits
- **Progressive Unlocking**: Each purchase opens new possibilities
- **Strategic Choices**: Users must decide which paths to pursue
- **Visual Feedback**: Clear indication of progress and available options
- **Balanced Economy**: Costs scale appropriately with skill levels

## 🎯 Future Enhancements

### Potential Additions
- **Skill Benefits**: Stat boosts and special abilities
- **Achievement System**: Rewards for completing branches
- **Social Features**: Compare skill trees with friends
- **Seasonal Events**: Limited-time skills and branches
- **Advanced Prerequisites**: Complex unlock requirements

### Technical Improvements
- **Animation System**: Smooth transitions and effects
- **Mobile Optimization**: Touch-friendly interface
- **Performance**: Optimized rendering for large trees
- **Analytics**: Track user progression patterns

## 📱 Access

### How to Use
1. Navigate to `/skill-tree-shop` or click "🌳 Skill Tree Shop" from the main shop
2. Select a branch using the branch selector
3. Click on nodes to view details
4. Purchase unlocked skills with Hamster Coins
5. Watch your skill tree grow as you unlock new paths!

### Requirements
- Must be logged in
- Requires Hamster Coins for purchases
- All users start with 100 Hamster Coins

---

*The Skill Tree Shop transforms the traditional shop experience into an engaging progression system that encourages strategic thinking and long-term planning.*
