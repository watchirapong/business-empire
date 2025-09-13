# Phase 2 Lobby System - Visual Design

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           PHASE 2 ASSESSMENT LOBBY SYSTEM                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  User Flow:                                                                     │
│  Phase 1 Complete → Path Selection → Enter Lobby → Wait in Queue → Assessment  │
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐            │
│  │   Phase 1       │    │   Path          │    │   Lobby         │            │
│  │   Complete      │───▶│   Selection     │───▶│   System        │            │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘            │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Lobby Layout Design

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        🎯 PHASE 2 ASSESSMENT LOBBY                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐    │
│  │  🏥 HEALTH SCIENCE  │  │  🎨 CREATIVE DESIGN │  │  🎮 GAME DEVELOPMENT│    │
│  │                     │  │                     │  │                     │    │
│  │  Status: Waiting    │  │  Status: Active     │  │  Status: Starting   │    │
│  │  Participants: 12   │  │  Participants: 8    │  │  Participants: 25   │    │
│  │  Your Position: #3  │  │  Assessment Running │  │  Starting in: 3:45  │    │
│  │                     │  │                     │  │                     │    │
│  │  [Join Lobby]       │  │  [View Progress]    │  │  [Get Ready]        │    │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘    │
│                                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐                              │
│  │  ⚙️ ENGINEERING AI  │  │  💼 BUSINESS STARTUP│                              │
│  │                     │  │                     │                              │
│  │  Status: Waiting    │  │  Status: Waiting    │                              │
│  │  Participants: 18   │  │  Participants: 5    │                              │
│  │  Your Position: #7  │  │  Your Position: #1  │                              │
│  │                     │  │                     │                              │
│  │  [Join Lobby]       │  │  [Join Lobby]       │                              │
│  └─────────────────────┘  └─────────────────────┘                              │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Individual Lobby View

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    🏥 HEALTH SCIENCE ASSESSMENT LOBBY                          │
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
│  │  #7  James Brown              Joined: 18 min ago                         ││
│  │  #8  Emma Davis               Joined: 20 min ago                         ││
│  │  #9  Michael Wilson           Joined: 22 min ago                         ││
│  │  #10 Sophia Garcia            Joined: 25 min ago                         ││
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

## Assessment Session View (Same as Current Assessment UI)

**Note**: The assessment UI for lobby participants uses the **exact same design** as the current Phase 2 assessment system, with only lobby-specific additions.

### Current Assessment UI Elements (Maintained):
- **Gradient Background**: `bg-gradient-to-br from-black via-gray-900 to-black`
- **Animated Particles**: Floating morphing circles with orange/purple/blue colors
- **Glass Card Styling**: Semi-transparent cards with orange borders
- **Question Display**: Large text with image support and fullscreen viewing
- **Answer Input**: Styled textarea with placeholder text
- **Timer Display**: Color-coded countdown (green/yellow/red based on time remaining)
- **Progress Bar**: Animated progress indicator
- **Submit Button**: Gradient orange button with hover effects
- **Image Upload**: File input with preview functionality

### Lobby-Specific Additions:
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    Phase 2 Assessment - Health Science Lobby                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  🏥 Health Science Lobby - Live Assessment                                     │
│  Room: ABC123 | Participants: 12 | Admin: Dr. Smith                           │
│                                                                                 │
│  ⏰ Time Remaining: 45:30                                                      │
│                                                                                 │
│  Question 3 of 15                                                              │
│  ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                                                                 │
│  [REST OF UI IDENTICAL TO CURRENT ASSESSMENT SYSTEM]                           │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                        LIVE PARTICIPANT STATUS                             ││
│  │                                                                             ││
│  │  🟢 Dr. Sarah Chen    🟢 Alex Johnson    🟢 You (Current)                 ││
│  │  🟡 Maria Rodriguez   🟢 David Kim       🟢 Lisa Wang                     ││
│  │  🔴 James Brown       🟢 Emma Davis      🟢 Michael Wilson                ││
│  │  🟢 Sophia Garcia     🟢 Robert Lee      🟢 Jennifer Martinez             ││
│  │                                                                             ││
│  │  🟢 = Answered | 🟡 = In Progress | 🔴 = Not Started                      ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                 │
│  [Admin Controls: Next Question →] [Leave Room]                               │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Key Benefits:
- **Familiar Experience**: Users get the same UI they're used to
- **Consistent Styling**: Maintains brand identity and design language
- **Reduced Learning Curve**: No need to learn new interface
- **Proven UX**: Uses tested and refined user experience patterns

## Admin Dashboard View

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           🛠️ LOBBY MANAGEMENT DASHBOARD                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐    │
│  │  🏥 HEALTH SCIENCE  │  │  🎨 CREATIVE DESIGN │  │  🎮 GAME DEVELOPMENT│    │
│  │                     │  │                     │  │                     │    │
│  │  Status: Waiting    │  │  Status: Active     │  │  Status: Starting   │    │
│  │  Participants: 12   │  │  Participants: 8    │  │  Participants: 25   │    │
│  │  Queue Length: 12   │  │  Time Left: 35:20   │  │  Countdown: 3:45    │    │
│  │                     │  │                     │  │                     │    │
│  │  [👁️ View] [🚀 Start]│  │  [👁️ View] [⏹️ Stop]│  │  [👁️ View] [⏸️ Pause]│    │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘    │
│                                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐                              │
│  │  ⚙️ ENGINEERING AI  │  │  💼 BUSINESS STARTUP│                              │
│  │                     │  │                     │                              │
│  │  Status: Waiting    │  │  Status: Waiting    │                              │
│  │  Participants: 18   │  │  Participants: 5    │                              │
│  │  Queue Length: 18   │  │  Queue Length: 5    │                              │
│  │                     │  │                     │                              │
│  │  [👁️ View] [🚀 Start]│  │  [👁️ View] [🚀 Start]│                              │
│  └─────────────────────┘  └─────────────────────┘                              │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                           GLOBAL CONTROLS                                  ││
│  │                                                                             ││
│  │  [🌐 Open All Lobbies] [🔒 Close All Lobbies] [🔄 Reset All]               ││
│  │  [📢 Broadcast Message] [📊 System Statistics] [⚙️ Settings]               ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                           SYSTEM STATISTICS                                ││
│  │                                                                             ││
│  │  Total Users in Lobbies: 68                                                ││
│  │  Active Assessments: 1                                                     ││
│  │  Waiting Lobbies: 4                                                        ││
│  │  Average Wait Time: 12 minutes                                             ││
│  │  System Load: 45%                                                          ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Mobile Responsive Design

```
┌─────────────────────────────────────┐
│        📱 MOBILE LOBBY VIEW         │
├─────────────────────────────────────┤
│                                     │
│  🏥 Health Science                  │
│  Status: Waiting                    │
│  Participants: 12                   │
│  Your Position: #3                  │
│  [Join Lobby]                       │
│                                     │
│  🎨 Creative Design                 │
│  Status: Active                     │
│  Participants: 8                    │
│  Assessment Running                 │
│  [View Progress]                    │
│                                     │
│  🎮 Game Development                │
│  Status: Starting                   │
│  Participants: 25                   │
│  Starting in: 3:45                  │
│  [Get Ready]                        │
│                                     │
│  ⚙️ Engineering AI                  │
│  Status: Waiting                    │
│  Participants: 18                   │
│  Your Position: #7                  │
│  [Join Lobby]                       │
│                                     │
│  💼 Business Startup                │
│  Status: Waiting                    │
│  Participants: 5                    │
│  Your Position: #1                  │
│  [Join Lobby]                       │
│                                     │
└─────────────────────────────────────┘
```

## Real-time Status Indicators

```
Status Icons:
⏳ Waiting    - Lobby is open, waiting for admin to start
🟡 Starting   - Admin has initiated, countdown in progress
🟢 Active     - Assessment is currently running
🔴 Completed  - Assessment has finished
🔒 Closed     - Lobby is temporarily closed

User Status:
🟢 Active     - User is actively participating
⏸️ Paused     - User has paused their session
🚫 Disconnected - User has left or disconnected
```

## Data Flow Diagram

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   User      │    │   Socket    │    │   Database  │    │   Admin     │
│  Interface  │    │    Server   │    │             │    │  Interface  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       │ Join Lobby        │                   │                   │
       ├──────────────────▶│                   │                   │
       │                   │ Save to DB        │                   │
       │                   ├──────────────────▶│                   │
       │                   │                   │                   │
       │                   │ Broadcast Update  │                   │
       │                   ├──────────────────▶│                   │
       │                   │                   │                   │
       │ Lobby Updated     │                   │                   │
       │◀──────────────────┤                   │                   │
       │                   │                   │                   │
       │                   │                   │                   │
       │                   │                   │ Admin Start       │
       │                   │                   │◀──────────────────┤
       │                   │                   │                   │
       │                   │ Start Assessment  │                   │
       │                   │◀──────────────────┤                   │
       │                   │                   │                   │
       │ Assessment Start  │                   │                   │
       │◀──────────────────┤                   │                   │
```

This visual design provides a comprehensive overview of how the Phase 2 Lobby System will look and function across different devices and user roles.
