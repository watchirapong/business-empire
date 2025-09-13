# Phase 2 Assessment Lobby System Design

## Overview
Design for a lobby system that separates users into 5 distinct lines/channels based on their selected career paths for Phase 2 assessment.

## Current System Analysis
- **5 Career Paths**: Health, Creative, GameDev, Engineering, Business
- **Current Flow**: Users select path → proceed to individual assessment
- **New Requirement**: Create separate lobby queues for each path

## Lobby System Architecture

### 1. Lobby Structure
```
Phase 2 Lobby System
├── Health Science Lobby (🏥)
├── Creative & Design Lobby (🎨)
├── Game Development Lobby (🎮)
├── Engineering & AI Lobby (⚙️)
└── Business & Startup Lobby (💼)
```

### 2. User Flow Design

#### Entry Point
1. User completes Phase 1
2. User selects career path
3. **NEW**: User enters path-specific lobby
4. User waits in lobby queue
5. Admin starts assessment session for that path
6. All users in that lobby begin assessment simultaneously

#### Lobby States
- **Waiting**: Users are queued, waiting for admin to start
- **Starting**: Admin has initiated the session (5-minute countdown)
- **Active**: Assessment is in progress
- **Completed**: Assessment finished, results available

### 3. Database Schema Extensions

#### New Collection: `AssessmentLobby`
```javascript
{
  _id: ObjectId,
  path: String, // 'health', 'creative', 'gamedev', 'engineering', 'business'
  status: String, // 'waiting', 'starting', 'active', 'completed'
  participants: [{
    userId: String,
    username: String,
    joinedAt: Date,
    currentQuestionIndex: Number
  }],
  startedAt: Date,
  completedAt: Date,
  createdBy: String, // Admin user ID
  currentQuestionIndex: Number,
  timeLimitMinutes: Number,
  createdAt: Date,
  updatedAt: Date
}
```

#### Updated: `UserProgress` Schema
```javascript
// Add new fields
lobbyId: String, // Reference to AssessmentLobby
lobbyStatus: String, // 'waiting', 'active', 'completed'
joinedLobbyAt: Date,
lobbyPosition: Number, // Position in queue
```

### 4. User Interface Design

#### Main Lobby Page (`/assessment/lobby`)
```
┌─────────────────────────────────────────────────────────────┐
│                    Phase 2 Assessment Lobby                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🏥 Health Science Lobby          🎨 Creative & Design     │
│  ┌─────────────────────────┐     ┌─────────────────────────┐│
│  │ Status: Waiting         │     │ Status: Active          ││
│  │ Participants: 12        │     │ Participants: 8         ││
│  │ Your Position: #3       │     │ Assessment in Progress  ││
│  │ [Join Lobby]            │     │ [View Progress]         ││
│  └─────────────────────────┘     └─────────────────────────┘│
│                                                             │
│  🎮 Game Development            ⚙️ Engineering & AI         │
│  ┌─────────────────────────┐     ┌─────────────────────────┐│
│  │ Status: Starting        │     │ Status: Waiting         ││
│  │ Participants: 25        │     │ Participants: 18        ││
│  │ Starting in: 3:45       │     │ Your Position: #7       ││
│  │ [Get Ready]             │     │ [Join Lobby]            ││
│  └─────────────────────────┘     └─────────────────────────┘│
│                                                             │
│  💼 Business & Startup                                      │
│  ┌─────────────────────────┐                               │
│  │ Status: Waiting         │                               │
│  │ Participants: 5         │                               │
│  │ Your Position: #1       │                               │
│  │ [Join Lobby]            │                               │
│  └─────────────────────────┘                               │
└─────────────────────────────────────────────────────────────┘
```

#### Individual Lobby View (`/assessment/lobby/[path]`)
```
┌─────────────────────────────────────────────────────────────┐
│              🏥 Health Science Assessment Lobby             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Status: Waiting for Admin to Start                        │
│  Participants: 12                                          │
│  Your Position: #3 in Queue                                │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    Queue List                           ││
│  │ 1. Dr. Sarah Chen        Joined: 2 min ago            ││
│  │ 2. Alex Johnson          Joined: 5 min ago            ││
│  │ 3. You (Current User)    Joined: 8 min ago            ││
│  │ 4. Maria Rodriguez       Joined: 10 min ago           ││
│  │ 5. David Kim             Joined: 12 min ago           ││
│  │ ...                                                    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  [Leave Lobby] [Refresh]                                   │
│                                                             │
│  Admin Controls (Admin Only):                              │
│  [Start Assessment] [Set Time Limit] [Remove User]         │
└─────────────────────────────────────────────────────────────┘
```

#### Assessment Session UI (Same as Current Assessment Design)
The assessment UI for lobby participants will use the **exact same design** as the current Phase 2 assessment system:

**Key Design Elements:**
- **Background**: Same gradient background (`bg-gradient-to-br from-black via-gray-900 to-black`)
- **Animated Elements**: Same floating particles and morphing animations
- **Glass Cards**: Same glass-card styling with orange borders
- **Question Layout**: Identical question display with images and text
- **Answer Input**: Same textarea styling and image upload functionality
- **Timer Display**: Same countdown timer with color-coded warnings
- **Progress Bar**: Same progress indicator showing question completion
- **Submit Button**: Same gradient button styling

**Lobby-Specific Additions:**
- **Live Status Header**: Shows lobby info (room code, participant count, admin status)
- **Participant Progress**: Real-time view of who has answered each question
- **Admin Controls**: Next question button for admins
- **Leave Room**: Option to exit the lobby assessment

**UI Consistency:**
- Maintains all existing assessment functionality
- Uses identical styling and animations
- Preserves user experience familiarity
- Adds lobby-specific features without disrupting core assessment flow

### 5. Real-time Features (Socket.IO)

#### Socket Events
```javascript
// Client → Server
'lobby:join' - Join a specific path lobby
'lobby:leave' - Leave current lobby

// Server → Client
'lobby:joined' - Successfully joined lobby
'lobby:left' - Successfully left lobby
'lobby:updated' - Lobby state updated
'lobby:starting' - Assessment starting soon
'lobby:started' - Assessment has begun
'lobby:error' - Error occurred
```

#### Real-time Updates
- Live participant count
- Queue position updates
- Status changes (waiting → starting → active)
- Admin announcements
- Countdown timers

### 6. Admin Controls

#### Admin Dashboard Section
```
┌─────────────────────────────────────────────────────────────┐
│                    Lobby Management                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🏥 Health Science    🎨 Creative    🎮 GameDev            │
│  [View] [Start]      [View] [Start]  [View] [Start]        │
│                                                             │
│  ⚙️ Engineering      💼 Business                           │
│  [View] [Start]      [View] [Start]                        │
│                                                             │
│  Global Settings:                                           │
│  [Open All Lobbies] [Close All Lobbies] [Reset All]        │
└─────────────────────────────────────────────────────────────┘
```

#### Admin Lobby Management
- View all participants in each lobby
- Start assessment for specific lobby
- Set time limits per lobby
- Remove users from lobby
- Send announcements to specific lobbies
- Monitor real-time activity

### 7. Technical Implementation Plan

#### Phase 1: Database & Models
1. Create `AssessmentLobby` model
2. Update `UserProgress` model
3. Create lobby management API endpoints

#### Phase 2: Socket.IO Integration
1. Implement real-time lobby events
2. Add lobby state synchronization
3. Create admin broadcast system

#### Phase 3: User Interface
1. Create main lobby page
2. Build individual lobby views
3. Add admin management interface
4. Implement real-time updates

#### Phase 4: Assessment Integration
1. Modify existing assessment flow
2. Add lobby-based question delivery
3. Implement synchronized timing
4. Add lobby completion handling

### 8. Benefits of This Design

#### For Users
- **Clear Organization**: Users know exactly where they belong
- **Social Experience**: See other users in same path
- **Fair Queuing**: First-come, first-served system
- **Real-time Updates**: Always know current status

#### For Admins
- **Better Control**: Manage each path separately
- **Flexible Timing**: Start assessments when ready
- **Monitoring**: Track participation per path
- **Scalability**: Handle large numbers of users

#### For System
- **Load Distribution**: Spread users across paths
- **Resource Management**: Better server resource allocation
- **Data Organization**: Cleaner data structure
- **Scalability**: Easy to add more paths or features

### 9. Security Considerations

- **Path Validation**: Ensure users can only join their selected path
- **Admin Authorization**: Verify admin permissions for lobby management
- **Rate Limiting**: Prevent spam joining/leaving
- **Session Management**: Handle disconnections gracefully
- **Data Privacy**: Protect user information in lobby lists

### 10. Future Enhancements

- **Priority Queues**: VIP users get priority
- **Lobby Chat**: Allow communication within lobbies
- **Achievement System**: Rewards for participation
- **Analytics Dashboard**: Detailed lobby statistics
- **Mobile Optimization**: Touch-friendly lobby interface
- **Notification System**: Email/SMS alerts for lobby updates

## Conclusion

This lobby system design provides a structured, scalable, and user-friendly approach to managing Phase 2 assessments. It separates users by career path while maintaining real-time communication and admin control. The system is designed to be easily extensible and provides a foundation for future enhancements.
