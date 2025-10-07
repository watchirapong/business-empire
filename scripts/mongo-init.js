// MongoDB initialization script
// This script runs when the MongoDB container starts for the first time

// Switch to the business-empire database
db = db.getSiblingDB('business-empire');

// Create a user for the application
db.createUser({
  user: 'app_user',
  pwd: '!Huey0608300',
  roles: [
    {
      role: 'readWrite',
      db: 'business-empire'
    }
  ]
});

// Create initial collections with indexes
db.createCollection('users');
db.createCollection('games');
db.createCollection('companies');
db.createCollection('achievements');
db.createCollection('portfolios');
db.createCollection('currencies');
db.createCollection('shopitems');
db.createCollection('purchasehistories');
db.createCollection('gachaitems');
db.createCollection('adminusers');
db.createCollection('systemsettings');

// Create indexes for better performance
db.users.createIndex({ "discordId": 1 }, { unique: true });
db.users.createIndex({ "username": 1 });
db.users.createIndex({ "email": 1 });

db.games.createIndex({ "roomId": 1 }, { unique: true });
db.games.createIndex({ "hostId": 1 });
db.games.createIndex({ "createdAt": 1 });

db.companies.createIndex({ "name": 1 });
db.companies.createIndex({ "gameId": 1 });

db.achievements.createIndex({ "userId": 1 });
db.achievements.createIndex({ "type": 1 });

db.portfolios.createIndex({ "userId": 1 }, { unique: true });
db.portfolios.createIndex({ "updatedAt": 1 });

db.currencies.createIndex({ "userId": 1 }, { unique: true });
db.currencies.createIndex({ "type": 1 });

db.shopitems.createIndex({ "category": 1 });
db.shopitems.createIndex({ "isActive": 1 });

db.purchasehistories.createIndex({ "userId": 1 });
db.purchasehistories.createIndex({ "itemId": 1 });
db.purchasehistories.createIndex({ "purchaseDate": 1 });

db.gachaitems.createIndex({ "rarity": 1 });
db.gachaitems.createIndex({ "isActive": 1 });

db.adminusers.createIndex({ "discordId": 1 }, { unique: true });
db.adminusers.createIndex({ "role": 1 });

db.systemsettings.createIndex({ "key": 1 }, { unique: true });

print('MongoDB initialization completed successfully!');
