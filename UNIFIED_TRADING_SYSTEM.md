# 🎯 Unified Trading System

## Overview

The Unified Trading System is a comprehensive trading platform that combines stocks, forex, and cryptocurrency trading into a single, integrated experience. All trading activities share the same cash balance and are linked to users' Discord accounts for seamless authentication and portfolio management.

## 🌟 Key Features

### 🔗 Discord Integration
- **Discord OAuth Authentication**: Users log in with their Discord accounts
- **Linked Portfolios**: Each Discord user has a unified portfolio across all trading types
- **Real-time Updates**: Portfolio changes are reflected across all trading interfaces

### 💰 Shared Cash Balance
- **Unified Capital**: $100,000 starting balance shared across all trading types
- **Cross-Asset Trading**: Move money between stocks, forex, and crypto seamlessly
- **Real-time Balance Updates**: Cash balance updates instantly across all trading interfaces

### 📊 Multi-Asset Trading

#### 📈 Stock Trading
- **Real-time NASDAQ Data**: Live stock prices and market data
- **Popular Stocks**: AAPL, MSFT, GOOGL, AMZN, TSLA, META, NVDA, NFLX, AMD, INTC
- **Portfolio Tracking**: Track shares, average price, and total value
- **Performance Analytics**: Gain/loss tracking and trade history

#### 🪙 Cryptocurrency Trading
- **Major Cryptocurrencies**: BTC, ETH, BNB, ADA, SOL, DOT, DOGE, AVAX, MATIC, LINK
- **Real-time Prices**: Live crypto market data
- **Fractional Trading**: Buy and sell any amount of crypto
- **Portfolio Management**: Track crypto holdings and performance

#### 💱 Forex Trading
- **Major Currency Pairs**: EUR/USD, GBP/USD, USD/JPY, USD/CHF, AUD/USD, USD/CAD, NZD/USD, EUR/GBP
- **Leverage Trading**: Up to 500:1 leverage options
- **Margin Management**: Automatic margin calculations
- **Position Tracking**: Long/short positions with P&L tracking

## 🏗️ System Architecture

### Database Schema

#### UnifiedPortfolio Model
```javascript
{
  discordId: String,           // Discord user ID
  username: String,            // Discord username
  cash: Number,                // Available cash balance
  totalValue: Number,          // Total portfolio value
  stocks: Map,                 // Stock holdings
  cryptos: Map,                // Crypto holdings
  forexPositions: Map,         // Forex positions
  totalGainLoss: Number,       // Total gain/loss
  totalGainLossPercent: Number, // Percentage gain/loss
  stockTrades: Number,         // Number of stock trades
  cryptoTrades: Number,        // Number of crypto trades
  forexTrades: Number,         // Number of forex trades
  successfulTrades: Number,    // Number of profitable trades
  assetAllocation: {           // Asset allocation breakdown
    stocks: Number,
    cryptos: Number,
    forex: Number,
    cash: Number
  },
  valueHistory: Array,         // Portfolio value history
  createdAt: Date,
  updatedAt: Date
}
```

### API Endpoints

#### `/api/unified-trading`
- **GET**: Retrieve user's unified portfolio
- **POST**: Execute trades (stocks, crypto, forex)
- **PUT**: Update portfolio with market data

#### `/api/unified-trading/leaderboard`
- **GET**: Retrieve leaderboard data with rankings

## 🎮 User Experience

### Unified Trading Dashboard
- **Portfolio Overview**: View total value, cash balance, and asset allocation
- **Trading Interface**: Access to all three trading types
- **Performance Tracking**: Real-time gain/loss and trade statistics
- **Discord Integration**: User profile and authentication status

### Individual Trading Games
- **Stock Trading**: `/games/stock-trading`
- **Crypto Trading**: `/games/crypto-trading`
- **Forex Trading**: `/games/forex-trading`
- **Unified Dashboard**: `/games/unified-trading`

## 🔧 Technical Implementation

### Frontend Components
- `UnifiedTradingDashboard.tsx`: Main dashboard component
- `StockTradingGame.tsx`: Stock trading interface
- `CryptoTradingGame.tsx`: Crypto trading interface
- `ForexTradingGame.tsx`: Forex trading interface

### Backend Models
- `UnifiedPortfolio.js`: Main portfolio model with all asset types
- `User.js`: Discord user data model

### API Integration
- **Market Data**: Real-time stock, crypto, and forex prices
- **Discord OAuth**: User authentication and profile data
- **MongoDB**: Portfolio and user data storage

## 📈 Trading Features

### Stock Trading
- Buy/sell shares of popular stocks
- Real-time price updates
- Portfolio tracking with average cost basis
- Trade history and performance analytics

### Crypto Trading
- Buy/sell major cryptocurrencies
- Fractional trading support
- Real-time market data
- Portfolio value tracking

### Forex Trading
- Trade major currency pairs
- Leverage options (50:1 to 500:1)
- Margin management
- Long/short position tracking

## 🏆 Leaderboard System

### Ranking Criteria
- **Total Gain/Loss Percentage**: Primary ranking metric
- **Total Portfolio Value**: Secondary ranking metric
- **Trade Success Rate**: Performance indicator

### Timeframes
- **All Time**: Overall performance
- **Weekly**: Last 7 days performance
- **Monthly**: Last 30 days performance

## 🔐 Security & Authentication

### Discord OAuth
- Secure authentication via Discord
- User profile data synchronization
- Session management with NextAuth.js

### Data Protection
- MongoDB connection security
- API endpoint authentication
- User data privacy protection

## 🚀 Getting Started

### Prerequisites
- Node.js and npm installed
- MongoDB database
- Discord OAuth application
- Environment variables configured

### Environment Variables
```env
MONGODB_URI=your_mongodb_connection_string
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=your_application_url
```

### Installation
1. Clone the repository
2. Install dependencies: `npm install`
3. Configure environment variables
4. Start the development server: `npm run dev`
5. Access the application at `http://localhost:3000`

## 📊 Performance Monitoring

### Portfolio Tracking
- Real-time value updates
- Asset allocation monitoring
- Performance analytics
- Trade history logging

### Market Data
- Live price feeds
- Historical data tracking
- Market trend analysis
- Volatility monitoring

## 🔄 Future Enhancements

### Planned Features
- **Advanced Charts**: Technical analysis tools
- **Social Trading**: Copy successful traders
- **News Integration**: Market news and analysis
- **Mobile App**: Native mobile application
- **API Access**: Public API for third-party integrations

### Scalability
- **Microservices Architecture**: Separate services for different asset types
- **Real-time Updates**: WebSocket connections for live data
- **Caching Layer**: Redis for improved performance
- **Load Balancing**: Horizontal scaling support

## 📞 Support

For technical support or questions about the Unified Trading System:
- Check the documentation
- Review the code comments
- Contact the development team

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
