# 🎮 Business Games Structure

This document outlines the organization of the business games in the HamsterHub project.

## 📁 Directory Structure

```
src/
├── app/
│   ├── games/
│   │   ├── page.tsx                    # Games Hub - Main games selection page
│   │   ├── stock-trading/
│   │   │   └── page.tsx                # Stock Trading Game page
│   │   └── investment/
│   │       └── page.tsx                # Investment Game page
│   └── ...
├── components/
│   ├── games/
│   │   ├── stock-trading/
│   │   │   ├── StockTradingGame.tsx    # Main stock trading component
│   │   │   ├── CompanySetup.tsx        # Company setup component
│   │   │   └── ProfessionalChart.tsx   # Trading charts component
│   │   └── investment/
│   │       └── InvestmentPhase.tsx     # Investment game component
│   ├── GamesNavigation.tsx             # Navigation component for games
│   └── ...
```

## 🎯 Game Types

### 1. 📈 Stock Trading Game
**Location**: `/games/stock-trading`
**Components**: 
- `StockTradingGame.tsx` - Main trading interface
- `CompanySetup.tsx` - Company configuration
- `ProfessionalChart.tsx` - Market charts and analysis

**Features**:
- Real-time market simulation
- Professional trading charts
- Company setup and management
- Portfolio tracking
- Risk management

### 2. 💰 Investment Game
**Location**: `/games/investment`
**Components**:
- `InvestmentPhase.tsx` - Main investment interface

**Features**:
- Portfolio management
- Risk assessment & strategy
- Diversified investment options
- Performance tracking

## 🚀 How to Access Games

### From Main Page
1. Login to HamsterHub
2. Scroll down to see the "Business Games" section
3. Click on either "Stock Trading" or "Investment" cards

### Direct URLs
- **Games Hub**: `http://localhost:3000/games`
- **Stock Trading**: `http://localhost:3000/games/stock-trading`
- **Investment**: `http://localhost:3000/games/investment`

## 🎨 Design Themes

### Stock Trading Game
- **Color Scheme**: Blue gradient (blue-900 to blue-800)
- **Theme**: Professional trading interface
- **Icons**: 📈, 📊, 💹, 🏢

### Investment Game
- **Color Scheme**: Green gradient (green-900 to green-800)
- **Theme**: Wealth building and portfolio management
- **Icons**: 💰, 📈, 🎯, 💎

### Games Hub
- **Color Scheme**: Purple gradient (purple-900 to purple-800)
- **Theme**: Central games selection interface
- **Icons**: 🎮, 📈, 💰

## 🔧 Development Notes

### Adding New Games
1. Create a new directory in `src/app/games/[game-name]/`
2. Create a new directory in `src/components/games/[game-name]/`
3. Add the game to the Games Hub page
4. Update the GamesNavigation component

### Component Organization
- Each game has its own dedicated directory
- Shared components remain in the main components directory
- Game-specific components are organized by game type

### Styling
- Each game uses its own color theme
- Consistent design patterns across all games
- Responsive design for all screen sizes
- Smooth animations and transitions

## 🎮 Game Features

### Stock Trading Game
- Company setup and configuration
- Real-time price simulation
- Professional charting tools
- Buy/sell orders
- Portfolio management
- Risk assessment

### Investment Game
- Portfolio diversification
- Risk management strategies
- Investment options
- Performance tracking
- Wealth building simulation

## 🔗 Navigation Flow

```
Main Page (/) 
    ↓
Games Navigation Component
    ↓
Games Hub (/games)
    ↓
├── Stock Trading (/games/stock-trading)
└── Investment (/games/investment)
```

This structure provides a clean, organized way to manage multiple business games while maintaining consistency in design and user experience.
