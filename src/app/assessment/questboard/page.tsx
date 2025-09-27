'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Question {
  id: string;
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
}

const SKILL_ICONS = {
  selfLearning: '📚',
  creative: '🎨',
  algorithm: '⚙️',
  logic: '🧠',
  communication: '💬',
  presentation: '🎤',
  leadership: '👑',
  careerKnowledge: '🎓'
};

const SKILL_COLORS = {
  selfLearning: 'bg-blue-500',
  creative: 'bg-purple-500',
  algorithm: 'bg-green-500',
  logic: 'bg-yellow-500',
  communication: 'bg-pink-500',
  presentation: 'bg-red-500',
  leadership: 'bg-indigo-500',
  careerKnowledge: 'bg-orange-500'
};

export default function QuestboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [answerImage, setAnswerImage] = useState<File | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load user progress
      const progressResponse = await fetch('/api/assessment/progress');
      const progressData = await progressResponse.json();
      setUserProgress(progressData.progress);

      if (!progressData.progress.selectedPath) {
        router.push('/assessment');
        return;
      }

      // Load Phase 2 questions for selected path
      const questionsResponse = await fetch(`/api/assessment/questions?phase=2&path=${progressData.progress.selectedPath}`);
      const questionsData = await questionsResponse.json();
      setQuestions(questionsData.questions);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/');
      return;
    }
    loadData();
  }, [session, status, loadData, router]);

  const handleQuestionSelect = (question: Question) => {
    setSelectedQuestion(question);
    setAnswerText('');
    setAnswerImage(null);
  };

  const handleAnswerSubmit = async () => {
    if (!selectedQuestion || !answerText.trim()) {
      alert('Please enter your answer');
      return;
    }

    try {
      setSubmitting(true);
      
      const formData = new FormData();
      formData.append('questionId', selectedQuestion.id);
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
        setSelectedQuestion(null);
        await loadData(); // Refresh to update progress
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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAnswerImage(file);
    }
  };

  const getQuestionStatus = (questionId: string) => {
    if (!userProgress) return 'locked';
    if (userProgress.phase2Answers.includes(questionId)) return 'completed';
    return 'available';
  };

  const getSkillCategories = (question: Question) => {
    return Object.entries(question.skillCategories)
      .filter(([_, value]) => value && value > 0)
      .map(([skill, _]) => skill);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading Questboard...</div>
      </div>
    );
  }

  if (!session || !userProgress) {
    return null;
  }

  // Show completion message
  if (userProgress.phase2Completed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-3xl font-bold text-white mb-4">Phase 2 Complete!</h1>
          <p className="text-gray-300 text-lg">You have completed all questions in your selected path.</p>
          <p className="text-gray-400 mt-2">Waiting for admin review...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Questboard</h1>
          <p className="text-gray-300 text-lg">Choose any question to complete in any order</p>
          <div className="mt-4">
            <span className="bg-blue-500 text-white px-4 py-2 rounded-full">
              Path: {userProgress.selectedPath ? userProgress.selectedPath.charAt(0).toUpperCase() + userProgress.selectedPath.slice(1) : 'Unknown'}
            </span>
          </div>
        </div>

        {/* Progress Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 text-center">
            <div className="text-2xl font-bold text-white">
              {userProgress.phase2Answers.length}
            </div>
            <div className="text-gray-300">Completed</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 text-center">
            <div className="text-2xl font-bold text-white">
              {questions.length - userProgress.phase2Answers.length}
            </div>
            <div className="text-gray-300">Remaining</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 text-center">
            <div className="text-2xl font-bold text-white">
              {Math.round((userProgress.phase2Answers.length / questions.length) * 100)}%
            </div>
            <div className="text-gray-300">Progress</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 text-center">
            <div className="text-2xl font-bold text-white">
              {questions.length}
            </div>
            <div className="text-gray-300">Total</div>
          </div>
        </div>

        {/* Questboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          {questions.map((question, index) => {
            const status = getQuestionStatus(question.id);
            const skillCategories = getSkillCategories(question);
            
            return (
              <div
                key={question.id}
                onClick={() => status === 'available' && handleQuestionSelect(question)}
                className={`relative rounded-xl p-6 border-2 transition-all duration-300 cursor-pointer ${
                  status === 'completed'
                    ? 'bg-green-500/20 border-green-500 hover:bg-green-500/30'
                    : status === 'available'
                    ? 'bg-white/10 border-white/20 hover:bg-white/20 hover:scale-105'
                    : 'bg-gray-500/20 border-gray-500 cursor-not-allowed'
                }`}
              >
                {/* Question Number */}
                <div className="absolute top-4 right-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    status === 'completed'
                      ? 'bg-green-500 text-white'
                      : status === 'available'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-500 text-white'
                  }`}>
                    {status === 'completed' ? '✓' : index + 1}
                  </div>
                </div>

                {/* Question Text */}
                <h3 className="text-white font-semibold mb-4 pr-12">
                  {question.questionText.length > 100 
                    ? question.questionText.substring(0, 100) + '...'
                    : question.questionText
                  }
                </h3>

                {/* Question Image Preview */}
                {question.questionImage && (
                  <div className="mb-4">
                    <Image 
                      src={question.questionImage} 
                      alt="Question" 
                      width={400}
                      height={96}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                  </div>
                )}

                {/* Skill Categories */}
                <div className="flex flex-wrap gap-2">
                  {skillCategories.map((skill) => (
                    <span
                      key={skill}
                      className={`${SKILL_COLORS[skill as keyof typeof SKILL_COLORS]} text-white px-2 py-1 rounded text-xs flex items-center space-x-1`}
                    >
                      <span>{SKILL_ICONS[skill as keyof typeof SKILL_ICONS]}</span>
                      <span>{skill}</span>
                    </span>
                  ))}
                </div>

                {/* Status Badge */}
                <div className="mt-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    status === 'completed'
                      ? 'bg-green-500 text-white'
                      : status === 'available'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-500 text-white'
                  }`}>
                    {status === 'completed' ? 'Completed' : status === 'available' ? 'Available' : 'Locked'}
                  </span>
                </div>

                {/* Image Upload Requirement */}
                {question.requiresImageUpload && (
                  <div className="mt-2">
                    <span className="text-yellow-400 text-xs">📷 Image Required</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Question Modal */}
        {selectedQuestion && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-2xl font-bold text-white">Answer Question</h2>
                  <button
                    onClick={() => setSelectedQuestion(null)}
                    className="text-gray-400 hover:text-white text-2xl"
                  >
                    ×
                  </button>
                </div>

                {/* Question */}
                <div className="bg-white/10 rounded-xl p-6 mb-6">
                  <h3 className="text-xl font-semibold text-white mb-4">
                    {selectedQuestion.questionText}
                  </h3>
                  
                  {selectedQuestion.questionImage && (
                    <div className="mb-4">
                      <Image 
                        src={selectedQuestion.questionImage} 
                        alt="Question" 
                        width={400}
                        height={300}
                        className="max-w-full h-auto rounded-lg"
                      />
                    </div>
                  )}

                  {/* Skill Categories */}
                  <div className="flex flex-wrap gap-2">
                    {getSkillCategories(selectedQuestion).map((skill) => (
                      <span
                        key={skill}
                        className={`${SKILL_COLORS[skill as keyof typeof SKILL_COLORS]} text-white px-3 py-1 rounded-full text-sm flex items-center space-x-2`}
                      >
                        <span>{SKILL_ICONS[skill as keyof typeof SKILL_ICONS]}</span>
                        <span>{skill}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Answer Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-white font-medium mb-2">
                      Your Answer:
                    </label>
                    <textarea
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={8}
                      placeholder="Type your detailed answer here..."
                    />
                  </div>

                  {selectedQuestion.requiresImageUpload && (
                    <div>
                      <label className="block text-white font-medium mb-2">
                        Upload Image:
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white"
                      />
                      {answerImage && (
                        <p className="text-gray-300 mt-2">Selected: {answerImage.name}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    onClick={() => setSelectedQuestion(null)}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAnswerSubmit}
                    disabled={submitting || !answerText.trim()}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors"
                  >
                    {submitting ? 'Submitting...' : 'Submit Answer'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
