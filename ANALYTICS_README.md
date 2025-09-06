# Analytics Dashboard

This analytics system tracks daily active users and website activity for the Business Empire application.

## Features

### 📊 Analytics Dashboard
- **Daily Active Users**: Track unique users who visit the website each day
- **Visit Statistics**: Total visits, sessions, and user engagement metrics
- **Hourly Distribution**: See when users are most active throughout the day
- **Top Pages**: Most visited pages on the website
- **User Details**: Individual user visit history and activity patterns

### 🎯 Behavior Analytics
- **Section Tracking**: Monitor user interactions with different website sections
  - 🛒 **Shop**: Track shop visits and purchases
  - 🎰 **Gacha**: Monitor gacha plays and spending
  - 🎓 **University**: Track university data access
  - 📋 **Hamster Board**: Monitor task board interactions
  - 👤 **Profile**: Track profile page visits
  - 👑 **Admin**: Monitor admin panel usage
- **Behavior Types**: Detailed tracking of specific user actions
- **Purchase Analytics**: Track spending patterns and transaction details
- **Top Active Users**: Identify most engaged users across all sections
- **Daily Behavior Trends**: See how user behavior changes over time

### 🔄 Automatic Tracking
- **Session Management**: Automatic session tracking with unique session IDs
- **Page Visits**: Tracks every page visit for logged-in users
- **User Information**: Captures username, global name, avatar, and Discord ID
- **Visit Metadata**: Records user agent, referrer, IP address, and timestamps

## How It Works

### 1. Database Schema
The system uses two main collections:

#### UserVisit Collection
For tracking general page visits:
```javascript
{
  userId: String,           // Discord User ID
  username: String,         // Discord Username
  globalName: String,       // Discord Global Name
  avatar: String,           // Discord Avatar
  visitDate: Date,          // Date of visit (YYYY-MM-DD)
  visitTime: Date,          // Exact timestamp of visit
  userAgent: String,        // Browser user agent
  ipAddress: String,        // User's IP address
  referrer: String,         // Referring page
  page: String,             // Current page path
  sessionId: String,        // Unique session identifier
  isNewSession: Boolean,    // Whether this is a new session
  createdAt: Date           // Record creation timestamp
}
```

#### UserBehavior Collection
For tracking specific user behaviors and interactions:
```javascript
{
  userId: String,           // Discord User ID
  username: String,         // Discord Username
  globalName: String,       // Discord Global Name
  avatar: String,           // Discord Avatar
  behaviorType: String,     // Type of behavior (shop_visit, gacha_play, etc.)
  section: String,          // Website section (shop, gacha, university, etc.)
  action: String,           // Specific action taken
  details: Object,          // Additional data (purchase amount, items, etc.)
  page: String,             // Current page path
  visitDate: Date,          // Date of behavior (YYYY-MM-DD)
  visitTime: Date,          // Exact timestamp
  sessionId: String,        // Session identifier
  userAgent: String,        // Browser user agent
  ipAddress: String,        // User's IP address
  createdAt: Date           // Record creation timestamp
}
```

### 2. API Endpoints

#### Track Visit
- **POST** `/api/analytics/track-visit`
- Records a new user visit
- Automatically called by the client-side tracking system

#### Daily Statistics
- **GET** `/api/analytics/daily-stats`
- Retrieves analytics data for specified time periods
- Supports today, last 7 days, or custom date ranges

#### Track Behavior
- **POST** `/api/analytics/track-behavior`
- Records specific user behaviors and interactions
- Tracks purchases, gacha plays, section visits, etc.

#### Behavior Statistics
- **GET** `/api/analytics/behavior-stats`
- Retrieves behavior analytics data
- Section-wise statistics, top users, purchase analytics

### 3. Automatic Tracking

The system automatically tracks visits and behaviors through:

1. **AnalyticsProvider**: Wraps the entire application
2. **useAnalytics Hook**: Tracks page visits for logged-in users
3. **useBehaviorTracking Hook**: Tracks specific user behaviors on key pages
4. **Session Management**: Maintains session IDs across page visits
5. **Middleware**: Adds tracking headers for non-API routes

#### Behavior Tracking Integration
- **Shop Page**: Tracks visits and purchases with transaction details
- **Gacha Page**: Monitors gacha plays and spending patterns
- **Hamster Board**: Tracks task board interactions
- **Profile Page**: Monitors profile visits
- **Admin Panel**: Tracks admin panel usage

## Usage

### Accessing the Dashboard
1. Navigate to the Admin Panel (`/admin`)
2. Click on the "📊 Analytics Dashboard" tab
3. Choose between "📊 Overview" or "🎯 Behavior Analytics"

### Dashboard Views

#### Overview Tab
- **Today**: View activity for a specific date
- **Last 7 Days**: View weekly activity trends
- **Custom**: Set custom date ranges (1-30 days)

#### Behavior Analytics Tab
- **Section Statistics**: See activity across all website sections
- **Behavior Types**: Detailed breakdown of user actions
- **Top Active Users**: Most engaged users across all sections
- **Purchase Analytics**: Spending patterns and transaction details
- **Daily Behavior Trends**: How user behavior changes over time

### Key Metrics

#### Overview Metrics
- **Unique Users**: Number of different users who visited
- **Total Visits**: Total number of page visits
- **Total Sessions**: Number of unique sessions
- **Average Visits per User**: Engagement metric

#### Behavior Metrics
- **Section Activity**: User interactions per website section
- **Purchase Volume**: Total spending and transaction counts
- **Gacha Engagement**: Gacha plays and spending patterns
- **User Engagement**: Most active users across all sections
- **Behavior Trends**: How user activity changes over time

## Data Privacy

- Only tracks visits for **logged-in users**
- Stores minimal user information (Discord data only)
- IP addresses are stored for analytics purposes
- No personal data beyond Discord profile information

## Technical Implementation

### Components
- `AnalyticsDashboard.tsx`: Main dashboard component
- `AnalyticsProvider.tsx`: Global analytics wrapper
- `useAnalytics.ts`: Client-side tracking hook

### API Routes
- `track-visit/route.ts`: Visit tracking endpoint
- `daily-stats/route.ts`: Statistics retrieval endpoint

### Database
- MongoDB collection: `UserVisit`
- Indexed for efficient queries by date and user
- Automatic cleanup of old data (recommended)

## Future Enhancements

Potential improvements for the analytics system:

1. **Real-time Updates**: WebSocket integration for live data
2. **Export Functionality**: CSV/JSON export of analytics data
3. **Advanced Filtering**: Filter by user type, page category, etc.
4. **Retention Analysis**: User retention and engagement metrics
5. **Geographic Data**: Location-based analytics (if IP geolocation is added)
6. **Custom Events**: Track specific user actions beyond page visits

## Maintenance

### Data Cleanup
Consider implementing automatic cleanup of old analytics data:
```javascript
// Example: Delete visits older than 90 days
db.uservisits.deleteMany({
  visitDate: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
});
```

### Performance Optimization
- Monitor database query performance
- Consider data aggregation for long-term storage
- Implement caching for frequently accessed statistics

## Troubleshooting

### Common Issues
1. **No data showing**: Ensure users are logged in and visiting pages
2. **Missing visits**: Check browser console for tracking errors
3. **Performance issues**: Monitor database indexes and query performance

### Debug Mode
Enable debug logging by checking browser console for analytics-related messages.
