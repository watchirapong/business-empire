'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useBehaviorTracking } from '@/hooks/useBehaviorTracking';
import { io, Socket } from 'socket.io-client';
import { isAdmin } from '@/lib/admin-config';

interface Question {
  _id: string;
  id?: string; // For compatibility
  phase: number;
  path?: string;
  questionText: string;
  questionImage?: string; // Keep for backward compatibility
  questionImages?: string[]; // New field for multiple images
  requiresImageUpload: boolean;
  timeLimitMinutes?: number; // Time limit in minutes
  skillCategories: {
    selfLearning?: number;
    creative?: number;
    algorithm?: number;
    logic?: number;
    communication?: number;
    presentation?: number;
    leadership?: number;
    careerKnowledge?: number;
  };
  // New field to define which categories this question awards points in
  awardsCategories: {
    selfLearning: boolean;
    creative: boolean;
    algorithm: boolean;
    logic: boolean;
    communication: boolean;
    presentation: boolean;
    leadership: boolean;
    careerKnowledge: boolean;
  };
  order: number;
}

interface UserProgress {
  id: string;
  userId: string;
  phase1Completed: boolean;
  phase2Completed: boolean;
  selectedPath?: string;
  phase1Answers: string[];
  phase2Answers: string[];
  totalScore: {
    selfLearning: number;
    creative: number;
    algorithm: number;
    logic: number;
    communication: number;
    presentation: number;
    leadership: number;
    careerKnowledge: number;
  };
  isApproved: boolean;
  approvedAt?: string;
  approvedBy?: string;
  hasDeclinedSubmissions?: boolean;
}

interface SystemSettings {
  phase2Open: boolean;
  allowFriendAnswers: boolean;
}

const CAREER_PATHS = [
  { id: 'health', name: 'Health Science & Medical', icon: '🏥', color: 'bg-red-500' },
  { id: 'creative', name: 'Creative & Design', icon: '🎨', color: 'bg-purple-500' },
  { id: 'gamedev', name: 'Game Design & Development', icon: '🎮', color: 'bg-blue-500' },
  { id: 'engineering', name: 'Engineering & Programming & AI', icon: '⚙️', color: 'bg-green-500' },
  { id: 'business', name: 'Business & Startup', icon: '💼', color: 'bg-yellow-500' }
];

// Session state persisted in MongoDB
interface SessionStatePayload {
  currentPhase: 1 | 2;
  currentQuestionIndex: number;
  draftAnswerText: string;
  timeRemainingSeconds: number | null;
  timeStartedAt: string | null;
  showPathSelection: boolean;
}

// Debounced save to API for session state
const debounceDelayMs = 800;

export default function AssessmentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { trackBehavior } = useBehaviorTracking({
    behaviorType: 'profile_visit',
    section: 'profile',
    action: 'assessment_page_visit',
    details: { page: 'assessment' }
  });

  // Guest mode state
  const [isGuest, setIsGuest] = useState(false);
  const [guestName, setGuestName] = useState('');

  const [currentPhase, setCurrentPhase] = useState<1 | 2>(1);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [answerImage, setAnswerImage] = useState<File | null>(null);
  const [showPathSelection, setShowPathSelection] = useState(false);
  const [friendAnswers, setFriendAnswers] = useState<any[]>([]);
  const [nicknames, setNicknames] = useState<{ [key: string]: string }>({});

  // Live lobby state
  const socketRef = useRef<Socket | null>(null);
  const [inRoom, setInRoom] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [roomQuestionIndex, setRoomQuestionIndex] = useState<number | null>(null);
  const [gameState, setGameState] = useState<'waiting' | 'started' | 'ended'>('waiting');
  const [roomStartedAt, setRoomStartedAt] = useState<Date | null>(null);
  const [submissionCount, setSubmissionCount] = useState<number>(0);

  // Full-screen image viewer state
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Timer state - persisted via API
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timeStarted, setTimeStarted] = useState<Date | null>(null);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  

  // Handle ESC key to close full-screen image
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && fullscreenImage) {
        setFullscreenImage(null);
      }
    };

    if (fullscreenImage) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [fullscreenImage]);

  // Timer functions
  const startTimer = (timeLimitMinutes: number, initialRemaining?: number | null) => {
    // Always clear any existing interval to avoid double ticking
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }

    const timeLimitSeconds = timeLimitMinutes * 60;
    const nextRemaining = typeof initialRemaining === 'number' && initialRemaining > 0
      ? Math.min(initialRemaining, timeLimitSeconds)
      : timeLimitSeconds;

    setTimeRemaining(nextRemaining);
    setTimeStarted(new Date());

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setTimerInterval(null);
          // Time is up: do not auto-submit; keep as a visual timer only
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setTimerInterval(interval);
  };

  const stopTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Start timer when question changes (only when game has started in room)
  useEffect(() => {
    // If inside a live room but the game hasn't started, ensure timer is stopped
    if (inRoom && gameState !== 'started') {
      stopTimer();
      setTimeRemaining(null);
      setTimeStarted(null);
      return () => stopTimer();
    }

    if (questions.length > 0 && currentQuestionIndex < questions.length) {
      const currentQuestion = questions[currentQuestionIndex];
      if (currentQuestion?.timeLimitMinutes) {
        // Reset and start fresh for each question
        stopTimer();
        setTimeRemaining(null);
        setTimeStarted(null);
        startTimer(currentQuestion.timeLimitMinutes, null);
      } else {
        // Even for questions without time limits, track the start time when allowed
        setTimeStarted(new Date());
        stopTimer();
        setTimeRemaining(null);
      }
    }

    return () => stopTimer();
  // Only re-run when question index, questions, or room game state changes
  }, [currentQuestionIndex, questions, inRoom, gameState]);

  // When game state switches to waiting or ended, hard stop the timer
  useEffect(() => {
    if (inRoom && gameState !== 'started') {
      stopTimer();
      setTimeRemaining(null);
      setTimeStarted(null);
    }
  }, [inRoom, gameState]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => stopTimer();
  }, []);

  // Debounced API save for session state
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        await fetch('/api/assessment/progress', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentPhase,
            currentQuestionIndex,
            draftAnswerText: answerText,
            timeRemainingSeconds: timeRemaining,
            timeStartedAt: timeStarted ? timeStarted.toISOString() : null,
            showPathSelection
          } as SessionStatePayload),
          signal: controller.signal
        });
      } catch (e) {
        // ignore background persistence errors
      }
    }, debounceDelayMs);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [currentPhase, currentQuestionIndex, answerText, timeRemaining, timeStarted, showPathSelection]);

  // Sync question index with room state only when game is started
  useEffect(() => {
    if (inRoom && gameState === 'started' && questions.length > 0 && roomQuestionIndex !== null) {
      const boundedIndex = Math.max(0, Math.min(roomQuestionIndex, questions.length - 1));
      if (boundedIndex !== currentQuestionIndex) {
        setCurrentQuestionIndex(boundedIndex);
      }
    }
  }, [inRoom, gameState, roomQuestionIndex, questions, currentQuestionIndex]);

  useEffect(() => {
    if (status === 'loading') return;
    
    // Check for guest mode
    const guestMode = sessionStorage.getItem('isGuest') === 'true';
    const storedGuestName = sessionStorage.getItem('guestName');
    
    if (guestMode && storedGuestName) {
      setIsGuest(true);
      setGuestName(storedGuestName);
      loadInitialData();
      // Auto-join default room after loading
      setTimeout(() => {
        autoJoinRoom();
      }, 1000);
    } else if (!session) {
      router.push('/');
      return;
    } else {
      loadInitialData();
      // Auto-join default room after loading
      setTimeout(() => {
        autoJoinRoom();
      }, 1000);
    }
  }, [session, status]);

  const autoJoinRoom = () => {
    if (inRoom) return; // Already in a room
    
    const defaultRoomCode = 'ASSESS01'; // Default room code
    const s = ensureSocket();
    s.emit('assessment:joinRoom', {
      roomId: defaultRoomCode,
      name: isGuest ? guestName : (session?.user as any)?.name || 'Player',
      isAdmin: isGuest ? false : isAdmin(((session?.user as any)?.id) as string),
      userId: isGuest ? `guest_${Date.now()}` : (session?.user as any)?.id
    });
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);

      if (isGuest) {
        // For guests, skip API calls and set default values
        setUserProgress({
          id: `guest_${Date.now()}`,
          userId: `guest_${Date.now()}`,
          phase1Completed: false,
          phase2Completed: false,
          phase1Answers: [],
          phase2Answers: [],
          totalScore: {
            selfLearning: 0,
            creative: 0,
            algorithm: 0,
            logic: 0,
            communication: 0,
            presentation: 0,
            leadership: 0,
            careerKnowledge: 0
          },
          isApproved: false
        });
        setSystemSettings({
          phase2Open: true,
          allowFriendAnswers: true
        });
        setCurrentPhase(1);
        await loadQuestions(1, undefined, null);
      } else {
        // Load user progress and system settings for authenticated users
        const [progressResponse, settingsResponse] = await Promise.all([
          fetch('/api/assessment/progress'),
          fetch('/api/assessment/settings')
        ]);

        const progressData = await progressResponse.json();
        const settingsData = await settingsResponse.json();

        setUserProgress(progressData.progress);
        setSystemSettings(settingsData.settings);

        // Check for declined submissions and reset progress if needed
        if (progressData.hasDeclinedSubmissions) {
        // Reset the user's progress to allow retry
        await resetDeclinedProgress();
        // Reload progress after reset
        const newProgressResponse = await fetch('/api/assessment/progress');
        const newProgressData = await newProgressResponse.json();
        setUserProgress(newProgressData.progress);
        // Reset state to defaults
        setCurrentQuestionIndex(0);
        setAnswerText('');
        setTimeRemaining(null);
        setTimeStarted(null);
        setShowPathSelection(false);
      }

      // Determine current phase - add null checks
      if (progressData && progressData.progress) {
        const sessionState = progressData.progress.sessionState;
        // Restore persisted session state from backend
        if (sessionState) {
          setCurrentPhase(sessionState.currentPhase);
          setCurrentQuestionIndex(sessionState.currentQuestionIndex || 0);
          setAnswerText(sessionState.draftAnswerText || '');
          setShowPathSelection(Boolean(sessionState.showPathSelection));

          // Timer restoration with server timestamps
          if (sessionState.timeRemainingSeconds != null && sessionState.timeStartedAt) {
            // Compute remaining based on timeStartedAt, not lastUpdatedAt, to avoid drift
            const startedAt = new Date(sessionState.timeStartedAt);
            const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000);
            const remaining = Math.max(0, (sessionState.timeRemainingSeconds as number) - elapsed);
            if (remaining > 0) {
              setTimeRemaining(remaining);
              setTimeStarted(startedAt);
            } else {
              setTimeRemaining(0);
            }
          }
        }

        // Show path selection only if Phase 2 is open and Phase 1 can proceed
        if (progressData.canProceedToPhase2 && !progressData.progress.selectedPath) {
          setShowPathSelection(true);
          setCurrentQuestionIndex(0);
          setAnswerText('');
          await loadQuestions(1, undefined, progressData.progress);
        } else if (progressData.progress.selectedPath) {
          setCurrentPhase(2);
          await loadQuestions(2, progressData.progress.selectedPath, progressData.progress);
        } else {
          setCurrentPhase(1);
          await loadQuestions(1, undefined, progressData.progress);
        }
      } else {
        // Default to phase 1 if no progress data
        setCurrentPhase(1);
        await loadQuestions(1, undefined, null);
      }
      }

    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetDeclinedProgress = async () => {
    try {
      const response = await fetch('/api/assessment/progress', {
        method: 'DELETE'
      });
      if (!response.ok) {
        console.error('Failed to reset declined progress');
      }
    } catch (error) {
      console.error('Error resetting declined progress:', error);
    }
  };

  const loadQuestions = async (phase: number, path?: string, progress?: UserProgress | null) => {
    try {
      const url = `/api/assessment/questions?phase=${phase}${path ? `&path=${path}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();
      const fetchedQuestions: Question[] = data.questions || [];
      setQuestions(fetchedQuestions);

      // Determine starting index: prefer server sessionState if valid and not already answered; otherwise first unanswered
      const answeredIds: string[] | undefined = phase === 1
        ? (progress as any)?.phase1Answers
        : (progress as any)?.phase2Answers;

      const sessionIndex = (progress as any)?.sessionState?.currentQuestionIndex ?? 0;
      const sessionValid = Number.isInteger(sessionIndex) && sessionIndex >= 0 && sessionIndex < fetchedQuestions.length;
      const sessionQuestion = sessionValid ? fetchedQuestions[sessionIndex] : null;
      const sessionQuestionId = sessionQuestion ? (sessionQuestion as any)?._id || (sessionQuestion as any)?.id : null;
      const sessionAnswered = sessionQuestionId && Array.isArray(answeredIds) ? answeredIds.includes(sessionQuestionId) : false;

      // Helper to locate first unanswered
      const firstUnansweredIndex = Array.isArray(answeredIds)
        ? fetchedQuestions.findIndex((q: any) => {
            const qid = q?._id || q?.id;
            return qid ? !answeredIds.includes(qid) : true;
          })
        : 0;

      if (sessionValid && !sessionAnswered) {
        setCurrentQuestionIndex(sessionIndex);
      } else if (firstUnansweredIndex >= 0) {
        setCurrentQuestionIndex(firstUnansweredIndex);
      } else if (fetchedQuestions.length > 0) {
        // default to last question if all answered to allow completion flow
        setCurrentQuestionIndex(fetchedQuestions.length - 1);
      } else {
        setCurrentQuestionIndex(0);
      }
    } catch (error) {
      console.error('Error loading questions:', error);
    }
  };

  const fetchNicknames = async (userIds: string[]) => {
    try {
      const response = await fetch('/api/users/nicknames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds })
      });
      const data = await response.json();
      if (response.ok) {
        setNicknames(data.nicknames);
      }
    } catch (error) {
      console.error('Error fetching nicknames:', error);
    }
  };

  const loadFriendAnswers = async (questionId: string) => {
    try {
      const response = await fetch(`/api/assessment/answers?questionId=${questionId}`);
      const data = await response.json();
      const friendAnswersData = data.answers.filter((answer: any) => answer.userId !== (session?.user as any)?.id);
      setFriendAnswers(friendAnswersData);
      
      // Fetch nicknames for friend answers
      const userIds = friendAnswersData.map((answer: any) => answer.userId);
      if (userIds.length > 0) {
        await fetchNicknames(userIds);
      }
    } catch (error) {
      console.error('Error loading friend answers:', error);
    }
  };

  // Count submissions for the current question (live polling when game is started)
  const refreshSubmissionCount = async (qId?: string) => {
    try {
      const id = qId || (questions[currentQuestionIndex]?._id || questions[currentQuestionIndex]?.id);
      if (!id) return;
      const adminView = isAdmin(((session?.user as any)?.id) as string);
      const res = await fetch(`/api/assessment/answers?questionId=${id}${adminView ? '&admin=true' : ''}`);
      const data = await res.json();
      if (Array.isArray(data?.answers)) {
        setSubmissionCount(data.answers.length);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!inRoom || gameState !== 'started') return;
    // initial fetch
    refreshSubmissionCount();
    // poll every 3s while on this question
    const interval = setInterval(() => refreshSubmissionCount(), 3000);
    return () => clearInterval(interval);
  }, [inRoom, gameState, currentQuestionIndex, questions]);

  // Socket helpers
  const ensureSocket = () => {
    if (!socketRef.current) {
      const s = io();
      socketRef.current = s;

      s.on('connect', () => {
        // no-op
      });

      s.on('assessment:state', (state: any) => {
        try {
          console.log('🔍 Received assessment:state:', state);
          console.log('🔍 Socket ID:', s.id);
          console.log('🔍 Host ID:', state.hostId);
          console.log('🔍 Is Host:', state.hostId === s.id);
          
          setInRoom(true);
          setRoomId(state.roomId);
          setParticipants(Array.isArray(state.participants) ? state.participants : []);
          setRoomQuestionIndex(Number(state.currentQuestionIndex) || 0);
          setIsHost(state.hostId === s.id);
          setGameState(state.gameState || 'waiting');
          setRoomStartedAt(state.startedAt ? new Date(state.startedAt) : null);
        } catch (error) {
          console.error('Error processing assessment:state:', error);
        }
      });

      s.on('assessment:error', ({ message }: any) => {
        alert(message || 'Assessment live session error');
      });

      s.on('disconnect', () => {
        setInRoom(false);
        setIsHost(false);
        setParticipants([]);
      });
    }
    return socketRef.current!;
  };

  const handleCreateRoom = () => {
    const admin = isAdmin(((session?.user as any)?.id) as string);
    if (!admin) {
      alert('Only admin can create a room');
      return;
    }
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const s = ensureSocket();
    s.emit('assessment:createRoom', {
      roomId: code,
      hostName: (session?.user as any)?.name || 'Admin',
      isAdmin: true,
      hostUserId: (session?.user as any)?.id
    });
  };

  const handleJoinRoom = (codeInput?: string) => {
    const code = (codeInput || roomId || '').toUpperCase().trim();
    if (!code) {
      alert('Enter room code to join');
      return;
    }
    const s = ensureSocket();
    s.emit('assessment:joinRoom', {
      roomId: code,
      name: (session?.user as any)?.name || 'Player',
      isAdmin: isAdmin(((session?.user as any)?.id) as string),
      userId: (session?.user as any)?.id
    });
  };

  const handleLeaveRoom = () => {
    const code = roomId;
    try {
      socketRef.current?.emit('assessment:leave', { roomId: code });
    } catch {}
    socketRef.current?.disconnect();
    socketRef.current = null;
    setInRoom(false);
    setIsHost(false);
    setParticipants([]);
    setRoomQuestionIndex(null);
    setGameState('waiting');
    setRoomStartedAt(null);
    // Redirect to home page
    router.push('/');
  };

  const handleAdminStart = () => {
    if (!isHost) return;
    socketRef.current?.emit('assessment:startGame', { roomId });
  };

  const handleAdminNext = () => {
    if (!isHost) return;
    socketRef.current?.emit('assessment:next', { roomId });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        socketRef.current?.disconnect();
      } catch {}
    };
  }, []);

  const handleAnswerSubmit = async (forceSubmit = false) => {
    if (!answerText.trim() && !forceSubmit) {
      alert('Please enter your answer');
      return;
    }

    try {
      setSubmitting(true);
      
      if (isGuest) {
        // For guests, just simulate submission without API calls
        console.log('Guest submission:', {
          questionIndex: currentQuestionIndex,
          answerText: answerText.trim() || (forceSubmit ? 'ว่างเปล่าไม่ได้ส่งอะไร' : answerText),
          guestName
        });
        
        // Move to next question or show completion
        if (currentQuestionIndex < questions.length - 1) {
          if (!inRoom) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
          }
          setAnswerText('');
          setAnswerImage(null);
        } else {
          // All questions completed for this phase
          if (currentPhase === 1) {
            // Show path selection after completing Phase 1
            setShowPathSelection(true);
          } else {
            // Phase 2 completed, show completion message
            alert('Assessment completed! Thank you for participating.');
          }
        }
        return;
      }
      
      const formData = new FormData();
      console.log('Questions array:', questions);
      console.log('Current question index:', currentQuestionIndex);
      console.log('Questions length:', questions.length);
      
      const currentQuestion = questions[currentQuestionIndex];
      console.log('Current question object:', currentQuestion);
      
      const questionId = currentQuestion?._id || currentQuestion?.id;
      console.log('Sending questionId:', questionId);
      
      if (!questionId) {
        alert('Question ID not found');
        return;
      }
      
      formData.append('questionId', questionId);
      
      // If no answer text and forced submit (time ran out), use default message
      const finalAnswerText = answerText.trim() || (forceSubmit ? 'ว่างเปล่าไม่ได้ส่งอะไร' : answerText);
      formData.append('answerText', finalAnswerText);
      
      if (answerImage) {
        formData.append('answerImage', answerImage);
      }
      
      // Add time tracking data
      if (timeStarted) {
        const timeSpentSeconds = Math.floor((new Date().getTime() - timeStarted.getTime()) / 1000);
        formData.append('timeSpentSeconds', timeSpentSeconds.toString());
        formData.append('timeStartedAt', timeStarted.toISOString());
      }

      const response = await fetch('/api/assessment/answers', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        // Immediately refresh submission count for admins/hosts
        try { await refreshSubmissionCount(questionId); } catch {}
        // Clear draft answer on server
        try {
          await fetch('/api/assessment/progress', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ draftAnswerText: '' })
          });
        } catch {}

        // Move to next question or show friend answers
        if (currentQuestionIndex < questions.length - 1) {
          if (!inRoom) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
          }
          setAnswerText('');
          setAnswerImage(null);
        } else {
          // All questions completed for this phase
          if (currentPhase === 1) {
            // Show friend answers for the last question
            const questionId = questions[currentQuestionIndex]._id || questions[currentQuestionIndex].id;
            if (questionId) {
              await loadFriendAnswers(questionId);
            }
            // Show path selection after completing Phase 1
            setShowPathSelection(true);
            // Clear question-specific state on server
            try {
              await fetch('/api/assessment/progress', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentQuestionIndex: 0, draftAnswerText: '' })
              });
            } catch {}
          } else {
            // Phase 2 completed, show waiting message
            await loadInitialData(); // Refresh progress
          }
        }
      } else {
        const message: string = (data && data.error) ? String(data.error) : 'Failed to submit answer';
        if (message.toLowerCase().includes('already answered')) {
          // Auto-skip to next unanswered question or completion flow
          const answeredIds: string[] | undefined = currentPhase === 1
            ? (userProgress as any)?.phase1Answers
            : (userProgress as any)?.phase2Answers;

          const nextIndex = (questions || []).findIndex((q: any, idx: number) => {
            if (idx <= currentQuestionIndex) return false;
            const qid = q?._id || q?.id;
            return qid ? !(answeredIds || []).includes(qid) : true;
          });

          if (nextIndex >= 0) {
            if (!inRoom) {
              setCurrentQuestionIndex(nextIndex);
            }
            setAnswerText('');
            setAnswerImage(null);
          } else {
            // End of list → trigger phase completion behavior
            if (currentPhase === 1) {
              const qid = questions[currentQuestionIndex]?._id || questions[currentQuestionIndex]?.id;
              if (qid) {
                await loadFriendAnswers(qid);
              }
              setShowPathSelection(true);
            } else {
              await loadInitialData();
            }
          }
        } else {
          alert(message);
        }
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      alert('Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePathSelection = async (pathId: string) => {
    try {
      if (isGuest) {
        // For guests, just proceed without API calls
        setShowPathSelection(false);
        setCurrentPhase(2);
        await loadQuestions(2, pathId);
        setCurrentQuestionIndex(0);
        setAnswerText('');
        return;
      }

      const response = await fetch('/api/assessment/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedPath: pathId })
      });

      const data = await response.json();

      if (response.ok) {
        setShowPathSelection(false);
        setCurrentPhase(2);
        await loadQuestions(2, pathId);

        // Reset question state for new path in server session state
        try {
          await fetch('/api/assessment/progress', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPhase: 2, currentQuestionIndex: 0, draftAnswerText: '', showPathSelection: false })
          });
        } catch {}
        setCurrentQuestionIndex(0);
        setAnswerText('');

        // Leave Phase 1 lobby and join path-specific lobby
        const leaveCurrentRoomSilently = () => {
          try {
            if (socketRef.current && roomId) {
              socketRef.current.emit('assessment:leave', { roomId });
            }
          } catch {}
          setInRoom(false);
          setIsHost(false);
          setParticipants([]);
          setRoomQuestionIndex(null);
          setGameState('waiting');
          setRoomStartedAt(null);
        };

        const joinPathRoom = (selectedPathId: string) => {
          const s = ensureSocket();
          const code = `ASSESS2-${(selectedPathId || '').toUpperCase()}`;
          s.emit('assessment:joinRoom', {
            roomId: code,
            name: (session?.user as any)?.name || 'Player',
            isAdmin: isAdmin(((session?.user as any)?.id) as string),
            userId: (session?.user as any)?.id
          });
        };

        if (inRoom) {
          leaveCurrentRoomSilently();
        }
        joinPathRoom(pathId);
      } else {
        alert(data.error || 'Failed to select path');
      }
    } catch (error) {
      console.error('Error selecting path:', error);
      alert('Failed to select path');
    }
  };


  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAnswerImage(file);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
        {/* Enhanced Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,0.1),transparent_50%)]"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse animate-morphing"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl animate-pulse delay-1000 animate-morphing animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl animate-pulse delay-500 animate-morphing animation-delay-4000"></div>

          {/* Additional floating elements for depth */}
          <div className="absolute top-1/3 right-1/3 w-32 h-32 bg-purple-500/5 rounded-full blur-xl animate-float"></div>
          <div className="absolute bottom-1/3 left-1/3 w-24 h-24 bg-pink-500/5 rounded-full blur-xl animate-float animation-delay-2000"></div>
          <div className="absolute top-2/3 right-1/4 w-16 h-16 bg-blue-500/5 rounded-full blur-lg animate-float animation-delay-4000"></div>
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center glass-card rounded-3xl p-12 border border-orange-500/30 animate-slide-in-bottom">
            <div className="text-7xl mb-6 animate-bounce-in">📝</div>
            <h1 className="text-3xl font-bold gradient-text-primary mb-4">Loading Assessment...</h1>
            <div className="w-10 h-10 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Show path selection
  if (showPathSelection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
        {/* Enhanced Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,0.1),transparent_50%)]"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse animate-morphing"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl animate-pulse delay-1000 animate-morphing animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl animate-pulse delay-500 animate-morphing animation-delay-4000"></div>

          {/* Additional floating elements for depth */}
          <div className="absolute top-1/3 right-1/3 w-32 h-32 bg-purple-500/5 rounded-full blur-xl animate-float"></div>
          <div className="absolute bottom-1/3 left-1/3 w-24 h-24 bg-pink-500/5 rounded-full blur-xl animate-float animation-delay-2000"></div>
          <div className="absolute top-2/3 right-1/4 w-16 h-16 bg-blue-500/5 rounded-full blur-lg animate-float animation-delay-4000"></div>
        </div>

        <div className="relative z-10 container mx-auto px-4 py-8 sm:py-12 md:py-16">
          <div className="text-center mb-12 animate-slide-in-bottom">
            <h1 className="text-5xl sm:text-6xl font-black mb-6 gradient-text">Choose Your Career Path</h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">Select the path that interests you most for Phase 2</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {CAREER_PATHS.map((path, index) => (
              <div key={path.id} className="flex flex-col space-y-4">
                <button
                  onClick={() => handlePathSelection(path.id)}
                  className={`group glass-card rounded-3xl p-8 hover:border-orange-400/60 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 w-full flex flex-col items-center justify-center animate-slide-in-bottom relative overflow-hidden`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Background gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-orange-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                  {/* Floating particles */}
                  <div className="absolute top-4 right-4 w-2 h-2 bg-orange-400/40 rounded-full animate-ping animation-delay-1000"></div>
                  <div className="absolute bottom-6 left-6 w-1.5 h-1.5 bg-orange-300/60 rounded-full animate-ping animation-delay-2000"></div>

                  <div className="text-center w-full flex flex-col items-center justify-center relative z-10">
                    <div className="text-7xl mb-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 flex justify-center animate-bounce-in">{path.icon}</div>
                    <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-orange-300 transition-colors duration-300 text-center leading-tight">
                      {path.name}
                    </h3>
                    <p className="text-gray-400 text-sm group-hover:text-orange-200 transition-colors duration-300 text-center leading-relaxed">
                      Click to select this path
                    </p>
                  </div>
                </button>
                
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show waiting for admin approval (only if no declined submissions)
  if (userProgress?.phase2Completed && !userProgress?.isApproved && !userProgress?.hasDeclinedSubmissions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
        {/* Enhanced Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,0.1),transparent_50%)]"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse animate-morphing"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl animate-pulse delay-1000 animate-morphing animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl animate-pulse delay-500 animate-morphing animation-delay-4000"></div>

          {/* Additional floating elements for depth */}
          <div className="absolute top-1/3 right-1/3 w-32 h-32 bg-purple-500/5 rounded-full blur-xl animate-float"></div>
          <div className="absolute bottom-1/3 left-1/3 w-24 h-24 bg-pink-500/5 rounded-full blur-xl animate-float animation-delay-2000"></div>
          <div className="absolute top-2/3 right-1/4 w-16 h-16 bg-blue-500/5 rounded-full blur-lg animate-float animation-delay-4000"></div>
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center glass-card rounded-3xl p-12 border border-orange-500/30 animate-slide-in-bottom max-w-2xl mx-auto">
            <div className="text-7xl mb-6 animate-bounce-in">⏳</div>
            <h1 className="text-4xl font-bold gradient-text-primary mb-6">Waiting for Admin Review</h1>
            <p className="text-xl text-gray-300 mb-4 leading-relaxed">Your assessment has been submitted and is under review.</p>
            <p className="text-gray-400 leading-relaxed">You will be notified once the review is complete.</p>
          </div>
        </div>
      </div>
    );
  }

  // Show approved message
  if (userProgress?.isApproved) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
        {/* Enhanced Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,0.1),transparent_50%)]"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse animate-morphing"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl animate-pulse delay-1000 animate-morphing animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl animate-pulse delay-500 animate-morphing animation-delay-4000"></div>

          {/* Additional floating elements for depth */}
          <div className="absolute top-1/3 right-1/3 w-32 h-32 bg-purple-500/5 rounded-full blur-xl animate-float"></div>
          <div className="absolute bottom-1/3 left-1/3 w-24 h-24 bg-pink-500/5 rounded-full blur-xl animate-float animation-delay-2000"></div>
          <div className="absolute top-2/3 right-1/4 w-16 h-16 bg-blue-500/5 rounded-full blur-lg animate-float animation-delay-4000"></div>
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center glass-card rounded-3xl p-12 border border-orange-500/30 animate-slide-in-bottom max-w-3xl mx-auto">
            <div className="text-7xl mb-6 animate-bounce-in">✅</div>
            <h1 className="text-4xl font-bold gradient-text-primary mb-6">Assessment Complete!</h1>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">Your assessment has been reviewed and approved.</p>
            <div className="glass-card rounded-2xl p-8 border border-white/20">
            <h3 className="text-xl font-semibold text-white mb-4">Your Scores</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-gray-300">Self Learning: <span className="text-white font-semibold">{userProgress.totalScore.selfLearning.toFixed(1)}</span></div>
              <div className="text-gray-300">Creative: <span className="text-white font-semibold">{userProgress.totalScore.creative.toFixed(1)}</span></div>
              <div className="text-gray-300">Algorithm: <span className="text-white font-semibold">{userProgress.totalScore.algorithm.toFixed(1)}</span></div>
              <div className="text-gray-300">Logic: <span className="text-white font-semibold">{userProgress.totalScore.logic.toFixed(1)}</span></div>
              <div className="text-gray-300">Communication: <span className="text-white font-semibold">{userProgress.totalScore.communication.toFixed(1)}</span></div>
              <div className="text-gray-300">Presentation: <span className="text-white font-semibold">{userProgress.totalScore.presentation.toFixed(1)}</span></div>
              <div className="text-gray-300">Leadership: <span className="text-white font-semibold">{userProgress.totalScore.leadership.toFixed(1)}</span></div>
              <div className="text-gray-300">Career Knowledge: <span className="text-white font-semibold">{userProgress.totalScore.careerKnowledge.toFixed(1)}</span></div>
            </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show friend answers
  if (friendAnswers.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
        {/* Enhanced Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,0.1),transparent_50%)]"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse animate-morphing"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl animate-pulse delay-1000 animate-morphing animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl animate-pulse delay-500 animate-morphing animation-delay-4000"></div>

          {/* Additional floating elements for depth */}
          <div className="absolute top-1/3 right-1/3 w-32 h-32 bg-purple-500/5 rounded-full blur-xl animate-float"></div>
          <div className="absolute bottom-1/3 left-1/3 w-24 h-24 bg-pink-500/5 rounded-full blur-xl animate-float animation-delay-2000"></div>
          <div className="absolute top-2/3 right-1/4 w-16 h-16 bg-blue-500/5 rounded-full blur-lg animate-float animation-delay-4000"></div>
        </div>

        <div className="relative z-10 container mx-auto px-4 py-8 sm:py-12 md:py-16">
          <div className="text-center mb-12 animate-slide-in-bottom">
            <h1 className="text-4xl sm:text-5xl font-black mb-6 gradient-text">Friend&apos;s Answers</h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">See how others answered this question</p>
          </div>

          <div className="space-y-6">
            {friendAnswers.map((answer, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {(nicknames[answer.userId] || answer.userId).charAt(0).toUpperCase()}
                  </div>
                  <div className="ml-3">
                    <div className="text-white font-semibold">{nicknames[answer.userId] || `User ${answer.userId.slice(-4)}`}</div>
                    <div className="text-gray-400 text-sm">{new Date(answer.submittedAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <p className="text-gray-300 mb-4">{answer.answerText}</p>
                {answer.answerImage && (
                  <img src={answer.answerImage} alt="Answer" className="max-w-full h-auto rounded-lg" />
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <button
              onClick={() => {
                setFriendAnswers([]);
                if (systemSettings?.phase2Open) {
                  setShowPathSelection(true);
                } else {
                  alert('Phase 2 is not yet open. Please wait for admin to open it.');
                }
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg transition-colors"
            >
              Continue to Phase 2
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show waiting room when in room but game hasn't started
  if (inRoom && gameState === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
        {/* Enhanced Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,0.1),transparent_50%)]"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse animate-morphing"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl animate-pulse delay-1000 animate-morphing animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl animate-pulse delay-500 animate-morphing animation-delay-4000"></div>
        </div>

        <div className="relative z-10 container mx-auto px-4 py-8 sm:py-12 md:py-16">
          <div className="text-center mb-12 animate-slide-in-bottom">
            <h1 className="text-4xl sm:text-5xl font-black mb-6 gradient-text">Assessment Room</h1>
            <div className="glass-card rounded-2xl p-6 border border-orange-500/30 max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="text-white font-semibold">
                  Room Code: <span className="font-mono bg-white/10 px-3 py-1 rounded text-orange-300">{roomId}</span>
                </div>
                <button
                  onClick={handleLeaveRoom}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  Leave Room
                </button>
              </div>
              
              <div className="text-center mb-6">
                <div className="text-2xl mb-2">⏳</div>
                <h2 className="text-xl font-bold text-white mb-2">Waiting for Admin to Start</h2>
                <p className="text-gray-300">All participants are waiting for the assessment to begin</p>
              </div>

              {isHost && (
                <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                  <div className="text-yellow-300 font-semibold mb-2">🔑 Admin Controls</div>
                  <p className="text-yellow-200 text-sm mb-3">You are the room admin. Start the assessment when everyone is ready.</p>
                  <button
                    onClick={handleAdminStart}
                    className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors"
                  >
                    🚀 Start Assessment
                  </button>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">Participants ({participants.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {participants.map((participant, index) => (
                    <div key={participant.id} className="flex items-center space-x-3 bg-white/5 rounded-lg p-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                        {participant.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-medium">{participant.name}</div>
                        {participant.isAdmin && (
                          <div className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded font-semibold">ADMIN</div>
                        )}
                      </div>
                      <div className="text-green-400">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show current question
  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
        {/* Enhanced Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,0.1),transparent_50%)]"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse animate-morphing"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl animate-pulse delay-1000 animate-morphing animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl animate-pulse delay-500 animate-morphing animation-delay-4000"></div>

          {/* Additional floating elements for depth */}
          <div className="absolute top-1/3 right-1/3 w-32 h-32 bg-purple-500/5 rounded-full blur-xl animate-float"></div>
          <div className="absolute bottom-1/3 left-1/3 w-24 h-24 bg-pink-500/5 rounded-full blur-xl animate-float animation-delay-2000"></div>
          <div className="absolute top-2/3 right-1/4 w-16 h-16 bg-blue-500/5 rounded-full blur-lg animate-float animation-delay-4000"></div>
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center glass-card rounded-3xl p-12 border border-orange-500/30 animate-slide-in-bottom">
            <div className="text-7xl mb-6 animate-bounce-in">❓</div>
            <h1 className="text-3xl font-bold gradient-text-primary mb-4">No questions available</h1>
            <p className="text-gray-300">Please contact administrator for assistance.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
      {/* Enhanced Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,0.1),transparent_50%)]"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse animate-morphing"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl animate-pulse delay-1000 animate-morphing animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl animate-pulse delay-500 animate-morphing animation-delay-4000"></div>

        {/* Additional floating elements for depth */}
        <div className="absolute top-1/3 right-1/3 w-32 h-32 bg-purple-500/5 rounded-full blur-xl animate-float"></div>
        <div className="absolute bottom-1/3 left-1/3 w-24 h-24 bg-pink-500/5 rounded-full blur-xl animate-float animation-delay-2000"></div>
        <div className="absolute top-2/3 right-1/4 w-16 h-16 bg-blue-500/5 rounded-full blur-lg animate-float animation-delay-4000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 sm:py-12 md:py-16">
        {/* Header */}
        <div className="text-center mb-12 animate-slide-in-bottom">
          <h1 className="text-4xl sm:text-5xl font-black mb-6 gradient-text">
            Phase {currentPhase} Assessment
          </h1>
          {isGuest && (
            <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg inline-block">
              <p className="text-blue-300 font-semibold">
                👤 Guest Mode: {guestName}
              </p>
              <button
                onClick={() => {
                  sessionStorage.removeItem('isGuest');
                  sessionStorage.removeItem('guestName');
                  router.push('/guest-login');
                }}
                className="text-blue-400 hover:text-blue-300 text-sm underline mt-1"
              >
                Switch User
              </button>
            </div>
          )}
          <p className="text-xl text-gray-300 mb-4">
            Question {currentQuestionIndex + 1} of {questions.length}
          </p>

          {/* Live Room Controls */}
          <div className="max-w-3xl mx-auto mb-6">
            {!inRoom ? (
              <div className="glass-card rounded-2xl p-4 border border-blue-500/30 bg-blue-500/10">
                <div className="flex items-center justify-center gap-3">
                  <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  <div className="text-white font-semibold">🔄 Joining Assessment Room...</div>
                </div>
              </div>
            ) : gameState === 'started' ? (
              <div className="glass-card rounded-2xl p-4 border border-green-500/30 bg-green-500/10">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="text-white font-semibold">
                    🟢 Live Assessment: <span className="font-mono bg-white/10 px-2 py-1 rounded">{roomId}</span>
                    {isHost && <span className="ml-2 bg-yellow-400 text-black px-2 py-1 rounded">Admin</span>}
                    <span className="ml-3 text-gray-300">Participants: {participants.length}</span>
                    <span className="ml-3 text-gray-300">Submissions: {submissionCount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isHost && (
                      <button
                        onClick={handleAdminNext}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold"
                        title="Next question for everyone"
                      >Next Question →</button>
                    )}
                    <button
                      onClick={handleLeaveRoom}
                      className="px-4 py-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg"
                    >Leave</button>
                  </div>
                </div>
                {!isHost && (
                  <div className="mt-3 text-center">
                    <p className="text-green-300 text-sm">⏳ Waiting for admin to advance to next question</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
          
          {/* Timer Display */}
          {timeRemaining !== null && (
            <div className="mt-6 mb-6 animate-scale-in">
              <div className={`inline-flex items-center px-6 py-3 rounded-2xl text-xl font-bold glass-card border transition-all duration-300 ${
                timeRemaining <= 60 ? 'border-red-500/50 bg-red-500/20 text-red-300' : 
                timeRemaining <= 300 ? 'border-yellow-500/50 bg-yellow-500/20 text-yellow-300' : 
                'border-green-500/50 bg-green-500/20 text-green-300'
              }`}>
                <span className="mr-3 text-2xl">⏰</span>
                {formatTime(timeRemaining)}
              </div>
              {timeRemaining <= 60 && (
                <div className="mt-3">
                  <p className="text-red-400 text-lg animate-pulse font-semibold">⚠️ Time is running out!</p>
                  {!answerText.trim() && (
                    <p className="text-orange-400 text-sm mt-1 animate-pulse">
                      📝 หากไม่พิมพ์คำตอบ ระบบจะส่งข้อความ &quot;ว่างเปล่าไม่ได้ส่งอะไร&quot; แทน
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          
          <div className="w-full bg-gray-700/50 rounded-full h-3 mt-6 glass-card border border-white/10">
            <div 
              className="bg-gradient-to-r from-orange-500 to-orange-400 h-3 rounded-full transition-all duration-500 animate-pulse"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Question Card */}
        <div className="glass-card rounded-3xl p-8 border border-orange-500/30 mb-8 animate-slide-in-bottom">
          <h2 className="text-2xl font-bold gradient-text-primary mb-6">
            {currentQuestion.questionText}
          </h2>
          
          {/* Multiple Question Images */}
          {currentQuestion.questionImages && currentQuestion.questionImages.length > 0 && (
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuestion.questionImages.map((imageUrl, index) => (
                  <div key={index} className="relative">
                    <img 
                      src={imageUrl} 
                      alt={`Question image ${index + 1}`} 
                      className="w-full h-auto rounded-lg"
                    />
                    <button
                      onClick={() => setFullscreenImage(imageUrl)}
                      className="absolute top-2 right-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold opacity-80 hover:opacity-100 transition-opacity"
                      title="View full screen"
                    >
                      ⛶
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Backward compatibility: Show single questionImage if no questionImages */}
          {(!currentQuestion.questionImages || currentQuestion.questionImages.length === 0) && currentQuestion.questionImage && (
            <div className="mb-6">
              <div className="relative inline-block">
                <img 
                  src={currentQuestion.questionImage} 
                  alt="Question" 
                  className="max-w-full h-auto rounded-lg"
                />
                <button
                  onClick={() => setFullscreenImage(currentQuestion.questionImage || null)}
                  className="absolute top-2 right-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold opacity-80 hover:opacity-100 transition-opacity"
                  title="View full screen"
                >
                  ⛶
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-white font-medium mb-2">
                Your Answer:
              </label>
              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                className="w-full p-4 glass-card border border-orange-500/30 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-400 transition-all duration-300"
                rows={6}
                placeholder="Type your answer here..."
              />
            </div>

            {currentQuestion.requiresImageUpload && (
              <div>
                <label className="block text-white font-medium mb-2">
                  Upload Image (Optional):
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full p-3 glass-card border border-orange-500/30 rounded-2xl text-white file:bg-orange-500/20 file:border-0 file:text-white file:rounded-lg file:px-4 file:py-2 file:mr-4 hover:file:bg-orange-500/30 transition-all duration-300"
                />
                {answerImage && (
                  <p className="text-gray-300 mt-2">Selected: {answerImage.name}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="text-center animate-slide-in-bottom">
          <button
            onClick={() => handleAnswerSubmit()}
            disabled={submitting || !answerText.trim()}
            className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 disabled:from-gray-500 disabled:to-gray-400 disabled:cursor-not-allowed text-white px-12 py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-orange-500/25 transition-all duration-200 cursor-pointer hover:scale-105 flex items-center space-x-3 mx-auto"
          >
            <span className="text-2xl">📝</span>
            <span>{submitting ? 'Submitting...' : 'Submit Answer'}</span>
          </button>
          {currentPhase === 1 && currentQuestionIndex === questions.length - 1 && (
            <div className="mt-4">
              <button
                onClick={async () => {
                  try {
                    // Persist that the chooser is open so backend allows selection
                    await fetch('/api/assessment/progress', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ showPathSelection: true })
                    });
                  } catch {}
                  handleAnswerSubmit(true);
                }}
                disabled={submitting}
                className="px-6 py-3 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-600"
                title="Skip this question and proceed to path selection"
              >
                Skip and Choose Path →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Full-screen Image Modal */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="relative max-w-full max-h-full">
            <button
              onClick={() => setFullscreenImage(null)}
              className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl font-bold z-10"
            >
              ×
            </button>
            <img
              src={fullscreenImage}
              alt="Full screen view"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
