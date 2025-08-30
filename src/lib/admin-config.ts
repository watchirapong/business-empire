// Centralized admin configuration
export const ADMIN_USER_IDS = ['898059066537029692', '664458019442262018', '547402456363958273', '535471828525776917'];

// Helper function to check if a user is admin
export const isAdmin = (userId: string): boolean => {
  return ADMIN_USER_IDS.includes(userId);
};

// Admin configuration object
export const adminConfig = {
  userIds: ADMIN_USER_IDS,
  isAdmin,
};
