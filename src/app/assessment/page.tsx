'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useBehaviorTracking } from '@/hooks/useBehaviorTracking';

interface Question {
  _id: string;
  id?: string; // For compatibility
  phase: number;
  path?: string;
  questionText: string;
  questionImage?: string;
  requiresImageUpload: boolean;
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

export default function AssessmentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { trackBehavior } = useBehaviorTracking({
    behaviorType: 'profile_visit',
    section: 'profile',
    action: 'assessment_page_visit',
    details: { page: 'assessment' }
  });

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

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/');
      return;
    }
    loadInitialData();
  }, [session, status]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load user progress and system settings
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
      }

      // Determine current phase - add null checks
      if (progressData && progressData.progress) {
        if (progressData.canProceedToPhase2 && !progressData.progress.selectedPath) {
          setShowPathSelection(true);
        } else if (progressData.progress.selectedPath) {
          setCurrentPhase(2);
          await loadQuestions(2, progressData.progress.selectedPath);
        } else {
          setCurrentPhase(1);
          await loadQuestions(1);
        }
      } else {
        // Default to phase 1 if no progress data
        setCurrentPhase(1);
        await loadQuestions(1);
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

  const loadQuestions = async (phase: number, path?: string) => {
    try {
      const url = `/api/assessment/questions?phase=${phase}${path ? `&path=${path}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();
      setQuestions(data.questions);
      setCurrentQuestionIndex(0);
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

  const handleAnswerSubmit = async () => {
    if (!answerText.trim()) {
      alert('Please enter your answer');
      return;
    }

    try {
      setSubmitting(true);
      
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
      formData.append('answerText', answerText);
      if (answerImage) {
        formData.append('answerImage', answerImage);
      }

      const response = await fetch('/api/assessment/answers', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        // Move to next question or show friend answers
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
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
          } else {
            // Phase 2 completed, show waiting message
            await loadInitialData(); // Refresh progress
          }
        }
      } else {
        alert(data.error || 'Failed to submit answer');
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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading Assessment...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Show path selection
  if (showPathSelection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">Choose Your Career Path</h1>
            <p className="text-gray-300 text-lg">Select the path that interests you most for Phase 2</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CAREER_PATHS.map((path) => (
              <div
                key={path.id}
                onClick={() => handlePathSelection(path.id)}
                className={`${path.color} rounded-xl p-6 cursor-pointer hover:scale-105 transition-all duration-300 shadow-lg`}
              >
                <div className="text-center">
                  <div className="text-4xl mb-4">{path.icon}</div>
                  <h3 className="text-xl font-semibold text-white">{path.name}</h3>
                </div>
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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6">⏳</div>
          <h1 className="text-3xl font-bold text-white mb-4">Waiting for Admin Review</h1>
          <p className="text-gray-300 text-lg">Your assessment has been submitted and is under review.</p>
          <p className="text-gray-400 mt-2">You will be notified once the review is complete.</p>
          
          {/* Debug info and manual reset button */}
          <div className="mt-8 p-4 bg-black/20 rounded-lg">
            <p className="text-sm text-gray-400 mb-4">Debug Info:</p>
            <p className="text-xs text-gray-500">Phase2Completed: {userProgress?.phase2Completed ? 'true' : 'false'}</p>
            <p className="text-xs text-gray-500">IsApproved: {userProgress?.isApproved ? 'true' : 'false'}</p>
            <p className="text-xs text-gray-500">HasDeclinedSubmissions: {userProgress?.hasDeclinedSubmissions ? 'true' : 'false'}</p>
            
            <button
              onClick={async () => {
                try {
                  // First try the normal reset
                  const response = await fetch('/api/assessment/progress', {
                    method: 'DELETE'
                  });
                  
                  if (response.ok) {
                    const result = await response.json();
                    console.log('Reset result:', result);
                    // Force reload the page with multiple methods
                    setTimeout(() => {
                      window.location.href = window.location.href;
                    }, 100);
                    window.location.reload();
                  } else {
                    // If normal reset fails, try a more aggressive approach
                    console.log('Normal reset failed, trying aggressive reset...');
                    
                    // Force reset by directly updating the user progress
                    const aggressiveResponse = await fetch('/api/assessment/progress', {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        forceReset: true,
                        phase1Completed: false,
                        phase2Completed: false,
                        isApproved: false
                      })
                    });
                    
                    if (aggressiveResponse.ok) {
                      // Force reload the page with multiple methods
                      setTimeout(() => {
                        window.location.href = window.location.href;
                      }, 100);
                      window.location.reload();
                    } else {
                      alert('Failed to reset progress. Please contact admin.');
                    }
                  }
                } catch (error) {
                  console.error('Reset error:', error);
                  alert('Error resetting progress: ' + (error instanceof Error ? error.message : 'Unknown error'));
                }
              }}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              🔄 Force Reset Progress
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show approved message
  if (userProgress?.isApproved) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6">✅</div>
          <h1 className="text-3xl font-bold text-white mb-4">Assessment Complete!</h1>
          <p className="text-gray-300 text-lg">Your assessment has been reviewed and approved.</p>
          <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-xl p-6 max-w-md mx-auto">
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
    );
  }

  // Show friend answers
  if (friendAnswers.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-4">Friend&apos;s Answers</h1>
            <p className="text-gray-300">See how others answered this question</p>
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

  // Show current question
  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">No questions available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Phase {currentPhase} Assessment
          </h1>
          <p className="text-gray-300">
            Question {currentQuestionIndex + 1} of {questions.length}
          </p>
          <div className="w-full bg-gray-700 rounded-full h-2 mt-4">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            {currentQuestion.questionText}
          </h2>
          
          {currentQuestion.questionImage && (
            <div className="mb-6">
              <img 
                src={currentQuestion.questionImage} 
                alt="Question" 
                className="max-w-full h-auto rounded-lg"
              />
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
                className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white"
                />
                {answerImage && (
                  <p className="text-gray-300 mt-2">Selected: {answerImage.name}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="text-center">
          <button
            onClick={handleAnswerSubmit}
            disabled={submitting || !answerText.trim()}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg transition-colors"
          >
            {submitting ? 'Submitting...' : 'Submit Answer'}
          </button>
        </div>
      </div>
    </div>
  );
}
