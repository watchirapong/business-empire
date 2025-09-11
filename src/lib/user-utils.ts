import mongoose from 'mongoose';

// Connect to MongoDB
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      return;
    }
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('MongoDB Connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Get user nickname from servermemberdatas collection
export const getUserNickname = async (userId: string): Promise<string | null> => {
  try {
    await connectDB();

    if (!mongoose.connection.db) {
      throw new Error('Database connection not established');
    }

    const serverMemberDatas = mongoose.connection.db.collection('servermemberdatas');

    const serverData = await serverMemberDatas.findOne({
      userId: userId,
      serverId: '699984143542517801' // Default server ID
    });

    if (serverData && serverData.serverData?.nick) {
      return serverData.serverData.nick;
    }

    return null; // Return null if no nickname found
  } catch (error) {
    console.error('Error getting user nickname:', error);
    return null;
  }
};

// Batch get nicknames for multiple users
export const getUserNicknames = async (userIds: string[]): Promise<Record<string, string>> => {
  try {
    await connectDB();

    if (!mongoose.connection.db) {
      throw new Error('Database connection not established');
    }

    const serverMemberDatas = mongoose.connection.db.collection('servermemberdatas');

    const serverDatas = await serverMemberDatas.find({
      userId: { $in: userIds },
      serverId: '699984143542517801' // Default server ID
    }).toArray();

    const nicknames: Record<string, string> = {};

    serverDatas.forEach(serverData => {
      if (serverData.serverData?.nick) {
        nicknames[serverData.userId] = serverData.serverData.nick;
      }
    });

    return nicknames;
  } catch (error) {
    console.error('Error getting user nicknames:', error);
    return {};
  }
};
