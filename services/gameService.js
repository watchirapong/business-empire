const Game = require('../models/Game');

class GameService {
  // Create a new game
  async createGame(roomId, hostName, hostId) {
    try {
      const game = new Game({
        roomId,
        hostName,
        hostId,
        players: [],
        companies: [],
        phase: 'waiting'
      });
      await game.save();
      return game;
    } catch (error) {
      console.error('Error creating game:', error);
      throw error;
    }
  }

  // Get game by room ID
  async getGame(roomId) {
    try {
      return await Game.findOne({ roomId });
    } catch (error) {
      console.error('Error getting game:', error);
      throw error;
    }
  }

  // Update game state
  async updateGame(roomId, gameData) {
    try {
      const game = await Game.findOneAndUpdate(
        { roomId },
        { ...gameData, updatedAt: new Date() },
        { new: true, upsert: true }
      );
      return game;
    } catch (error) {
      console.error('Error updating game:', error);
      throw error;
    }
  }

  // Add player to game
  async addPlayer(roomId, player) {
    try {
      const game = await Game.findOne({ roomId });
      if (!game) {
        throw new Error('Game not found');
      }

      // Check if player already exists
      const existingPlayerIndex = game.players.findIndex(p => p.name === player.name);
      if (existingPlayerIndex === -1) {
        game.players.push(player);
      } else {
        // Update existing player
        game.players[existingPlayerIndex] = player;
      }

      await game.save();
      return game;
    } catch (error) {
      console.error('Error adding player:', error);
      throw error;
    }
  }

  // Remove player from game
  async removePlayer(roomId, playerId) {
    try {
      const game = await Game.findOne({ roomId });
      if (!game) {
        throw new Error('Game not found');
      }

      game.players = game.players.filter(p => p.id !== playerId);
      await game.save();
      return game;
    } catch (error) {
      console.error('Error removing player:', error);
      throw error;
    }
  }

  // Update game phase
  async updatePhase(roomId, phase) {
    try {
      const game = await Game.findOneAndUpdate(
        { roomId },
        { phase, updatedAt: new Date() },
        { new: true }
      );
      return game;
    } catch (error) {
      console.error('Error updating phase:', error);
      throw error;
    }
  }

  // Add company to game
  async addCompany(roomId, company) {
    try {
      const game = await Game.findOne({ roomId });
      if (!game) {
        throw new Error('Game not found');
      }

      game.companies.push(company);
      await game.save();
      return game;
    } catch (error) {
      console.error('Error adding company:', error);
      throw error;
    }
  }

  // Update company prices
  async updateCompanyPrices(roomId, companies) {
    try {
      const game = await Game.findOne({ roomId });
      if (!game) {
        throw new Error('Game not found');
      }

      game.companies = companies;
      await game.save();
      return game;
    } catch (error) {
      console.error('Error updating company prices:', error);
      throw error;
    }
  }

  // Update player investments
  async updateInvestments(roomId, investments) {
    try {
      const game = await Game.findOne({ roomId });
      if (!game) {
        throw new Error('Game not found');
      }

      game.investments = investments;
      await game.save();
      return game;
    } catch (error) {
      console.error('Error updating investments:', error);
      throw error;
    }
  }

  // Delete game
  async deleteGame(roomId) {
    try {
      await Game.findOneAndDelete({ roomId });
      return true;
    } catch (error) {
      console.error('Error deleting game:', error);
      throw error;
    }
  }

  // Get all games
  async getAllGames() {
    try {
      return await Game.find({});
    } catch (error) {
      console.error('Error getting all games:', error);
      throw error;
    }
  }

  // Reset all games
  async resetAllGames() {
    try {
      await Game.deleteMany({});
      return true;
    } catch (error) {
      console.error('Error resetting all games:', error);
      throw error;
    }
  }
}

module.exports = new GameService();
