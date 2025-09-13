# User Path Join Flow - Phase 2 Lobby System

## Current System vs New Lobby System

### **Current System (What happens now):**
1. User completes Phase 1
2. User sees path selection screen
3. User clicks on a career path (e.g., 🏥 Health Science)
4. **Current behavior**: User goes directly to individual assessment

### **New Lobby System (What will happen):**
1. User completes Phase 1
2. User sees path selection screen
3. User clicks on a career path (e.g., 🏥 Health Science)
4. **New behavior**: User enters the lobby for that path

---

## Detailed User Flow

### **Step 1: Path Selection Screen**
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        Choose Your Career Path                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Select the path that interests you most for Phase 2                           │
│                                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐    │
│  │  🏥 Health Science  │  │  🎨 Creative Design │  │  🎮 Game Development│    │
│  │                     │  │                     │  │                     │    │
│  │  Click to select    │  │  Click to select    │  │  Click to select    │    │
│  │  this path          │  │  this path          │  │  this path          │    │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘    │
│                                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐                              │
│  │  ⚙️ Engineering AI  │  │  💼 Business Startup│                              │
│  │                     │  │                     │                              │
│  │  Click to select    │  │  Click to select    │                              │
│  │  this path          │  │  this path          │                              │
│  └─────────────────────┘  └─────────────────────┘                              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### **Step 2: User Clicks on a Path**
When user clicks on a path (e.g., 🏥 Health Science), the following happens:

#### **2.1: API Call to Save Path Selection**
```javascript
// POST /api/assessment/progress
{
  "selectedPath": "health"
}
```

#### **2.2: Database Update**
```javascript
// UserProgress document updated
{
  userId: "user123",
  selectedPath: "health",
  phase1Completed: true,
  phase2Completed: false,
  // ... other fields
}
```

#### **2.3: Redirect to Lobby System**
Instead of going to individual assessment, user is redirected to:
```
/assessment/lobby/health
```

### **Step 3: Lobby Page Display**
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    🏥 Health Science Assessment Lobby                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Lobby Status: ⏳ Waiting for Admin to Start                                   │
│  Participants: 12                                                              │
│  Your Position: #3 in Queue                                                    │
│  Estimated Wait: ~15 minutes                                                   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                           PARTICIPANT QUEUE                                ││
│  │                                                                             ││
│  │  🥇 #1  Dr. Sarah Chen        Joined: 2 min ago                          ││
│  │  🥈 #2  Alex Johnson          Joined: 5 min ago                          ││
│  │  🥉 #3  You (Current User)    Joined: 8 min ago                          ││
│  │  #4  Maria Rodriguez          Joined: 10 min ago                         ││
│  │  #5  David Kim                Joined: 12 min ago                         ││
│  │  #6  Lisa Wang                Joined: 15 min ago                         ││
│  │  ...                                                                        ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                 │
│  [Leave Lobby] [Refresh Queue]                                                 │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                        ADMIN CONTROLS (Admin Only)                         ││
│  │                                                                             ││
│  │  [🚀 Start Assessment] [⏱️ Set Time Limit] [👥 Manage Users]               ││
│  │  [📢 Send Announcement] [📊 View Statistics] [🔄 Reset Lobby]              ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────┘
```

### **Step 4: User Waits in Lobby**
- User sees their position in the queue
- Real-time updates show when other users join/leave
- User can refresh to see updated queue position
- User can leave lobby if they change their mind

### **Step 5: Admin Starts Assessment**
When admin clicks "Start Assessment":
1. **5-minute countdown** begins
2. **All users in lobby** see countdown timer
3. **Lobby status** changes to "Starting"
4. **Users cannot leave** during countdown

### **Step 6: Assessment Begins**
After countdown:
1. **All users** are redirected to assessment page
2. **Same UI** as current assessment system
3. **Synchronized questions** - everyone sees same question
4. **Admin controls** - can advance to next question
5. **Real-time status** - see who has answered

---

## Technical Implementation

### **Modified Path Selection Handler**
```javascript
const handlePathSelection = async (pathId: string) => {
  try {
    // 1. Save path selection to database
    const response = await fetch('/api/assessment/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedPath: pathId })
    });

    if (response.ok) {
      // 2. Join the lobby for this path
      await joinLobby(pathId);
      
      // 3. Redirect to lobby page
      router.push(`/assessment/lobby/${pathId}`);
    } else {
      alert('Failed to select path');
    }
  } catch (error) {
    console.error('Error selecting path:', error);
  }
};
```

### **New Lobby Join Function**
```javascript
const joinLobby = async (pathId: string) => {
  try {
    // 1. Connect to Socket.IO
    const socket = io();
    
    // 2. Join lobby room
    socket.emit('lobby:join', { 
      path: pathId, 
      userId: session.user.id,
      username: session.user.name 
    });
    
    // 3. Listen for lobby updates
    socket.on('lobby:updated', (lobbyData) => {
      setLobbyData(lobbyData);
    });
    
    // 4. Listen for assessment start
    socket.on('lobby:started', () => {
      router.push('/assessment');
    });
    
  } catch (error) {
    console.error('Error joining lobby:', error);
  }
};
```

---

## Key Differences from Current System

| **Current System** | **New Lobby System** |
|-------------------|---------------------|
| Direct to assessment | Goes to lobby first |
| Individual assessment | Group assessment |
| No waiting | Wait in queue |
| No admin control | Admin controls timing |
| Immediate start | Synchronized start |

---

## Benefits of New Flow

✅ **Better Organization**: Users grouped by career path  
✅ **Admin Control**: Can manage when assessments start  
✅ **Social Experience**: See other users in same path  
✅ **Fair Queuing**: First-come, first-served system  
✅ **Synchronized Assessment**: Everyone starts together  
✅ **Flexible Timing**: Admin can start when ready  

---

## User Experience Summary

1. **Click Path** → **Save Selection** → **Join Lobby** → **Wait in Queue** → **Assessment Starts**
2. **Familiar UI**: Same assessment interface users know
3. **Clear Feedback**: Always know position and status
4. **Admin Control**: Assessment starts when admin is ready
5. **Group Experience**: Shared assessment with peers in same career path
