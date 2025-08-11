# 🏢 Business Empire

A real-time multiplayer business investment simulation game built with Next.js, React, and Socket.IO.

![Business Empire Game](https://img.shields.io/badge/Game-Business%20Empire-blue?style=for-the-badge&logo=react)
![Next.js](https://img.shields.io/badge/Next.js-15.4.6-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8.1-black?style=for-the-badge&logo=socket.io)

## 🎮 Game Overview

Business Empire is an engaging multiplayer investment simulation where players compete to build the most profitable business portfolio. Each player starts with 100,000฿ and must strategically invest in various companies to maximize their returns.

## ✨ Features

### 🎯 Core Gameplay
- **Real-time Multiplayer**: Play with friends in real-time using Socket.IO
- **Strategic Investment**: Invest in multiple companies simultaneously
- **Market Dynamics**: Companies grow based on total investment distribution
- **Profit Tracking**: Real-time calculation of profits and losses
- **Competitive Rankings**: See who's leading the investment race

### 👑 Host Controls
- **Game Management**: Only the host can start the investment phase
- **Company Management**: Add and delete companies during setup
- **Room Control**: Manage player access and game flow

### 🎨 Modern UI/UX
- **Dark Theme**: Beautiful gradient backgrounds with glassmorphism effects
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Real-time Updates**: Live game state synchronization
- **Smooth Animations**: Hover effects and transitions throughout
- **Professional Styling**: Modern game-like interface

### 📊 Analytics & Results
- **Company Analysis**: Detailed breakdown of each company's performance
- **Player Rankings**: Complete leaderboard with profit/loss calculations
- **Investment Tracking**: Monitor your portfolio in real-time
- **Market Share**: See your percentage ownership in each company

## 🛠️ Tech Stack

- **Frontend**: Next.js 15.4.6, React 19, TypeScript
- **Styling**: Tailwind CSS with custom animations
- **Real-time**: Socket.IO for multiplayer functionality
- **Backend**: Node.js with Express
- **State Management**: React hooks with localStorage persistence
- **Deployment**: Ready for Vercel, Netlify, or any Node.js hosting

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/business-empire.git
   cd business-empire
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Start the multiplayer server**
   ```bash
   npm run multiplayer
   ```

5. **Open your browser**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3002

## 🎯 How to Play

### 1. **Join a Game**
- Enter your name and a game room ID
- Share the room ID with friends to play together

### 2. **Setup Phase**
- **Host**: Add companies to invest in
- **All Players**: Wait for the host to start the game

### 3. **Investment Phase**
- All players invest simultaneously in all companies
- Each player has 100,000฿ to distribute
- Monitor your total investment vs. budget

### 4. **Results Phase**
- View detailed company performance analysis
- See player rankings and profit/loss calculations
- Celebrate the winner!

## 🌐 Multiplayer Setup

### Local Network
- Share your local IP with friends on the same network
- Use: `http://YOUR_IP:3000`

### Global Access (ngrok)
1. Install ngrok: `npm install -g ngrok`
2. Run: `ngrok http 3002`
3. Share the ngrok URL with friends worldwide

## 📱 Mobile Support

The game is fully responsive and works great on:
- 📱 Smartphones
- 📱 Tablets
- 💻 Desktop computers
- 🖥️ Large displays

## 🎨 UI Features

- **Glassmorphism Effects**: Modern transparent card designs
- **Gradient Backgrounds**: Beautiful color transitions
- **Hover Animations**: Interactive feedback on all elements
- **Real-time Indicators**: Live status updates and notifications
- **Professional Typography**: Clear, readable text hierarchy

## 🔧 Development

### Project Structure
```
business-empire/
├── src/
│   ├── app/                 # Next.js app router
│   ├── components/          # React components
│   │   ├── MultiplayerGame.tsx
│   │   ├── MultiplayerLobby.tsx
│   │   ├── PlayerSetup.tsx
│   │   ├── CompanySetup.tsx
│   │   ├── InvestmentPhase.tsx
│   │   └── Results.tsx
├── server.js               # Socket.IO server
├── package.json
└── README.md
```

### Available Scripts
- `npm run dev` - Start Next.js development server
- `npm run multiplayer` - Start Socket.IO multiplayer server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🚀 Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Connect repository to Vercel
3. Deploy automatically

### Other Platforms
- **Netlify**: Supports Next.js out of the box
- **Railway**: Great for full-stack apps
- **Heroku**: Traditional Node.js hosting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js Team** for the amazing React framework
- **Socket.IO** for real-time communication
- **Tailwind CSS** for the utility-first styling
- **React Community** for the excellent ecosystem

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/business-empire/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/business-empire/discussions)
- **Email**: your.email@example.com

---

<div align="center">

**Made with ❤️ by [Your Name]**

[![GitHub stars](https://img.shields.io/github/stars/yourusername/business-empire?style=social)](https://github.com/yourusername/business-empire)
[![GitHub forks](https://img.shields.io/github/forks/yourusername/business-empire?style=social)](https://github.com/yourusername/business-empire)

</div>
