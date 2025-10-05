'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Check, Star, Users, BarChart3, Calendar, Target, ArrowRight, Sparkles } from 'lucide-react';

interface UserOnboardingProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
  currentUser?: any;
}

const UserOnboarding: React.FC<UserOnboardingProps> = ({
  isOpen,
  onComplete,
  onSkip,
  currentUser
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [userPreferences, setUserPreferences] = useState({
    role: '',
    experience: '',
    goals: [] as string[],
    notifications: true,
    theme: 'light'
  });

  const steps = [
    {
      id: 'welcome',
      title: 'Welcome to Project Manager!',
      subtitle: 'Let&apos;s get you set up in just a few steps',
      content: 'welcome'
    },
    {
      id: 'role',
      title: 'What&apos;s your role?',
      subtitle: 'This helps us customize your experience',
      content: 'role'
    },
    {
      id: 'experience',
      title: 'How experienced are you?',
      subtitle: 'We&apos;ll adjust the interface accordingly',
      content: 'experience'
    },
    {
      id: 'goals',
      title: 'What are your main goals?',
      subtitle: 'Select all that apply',
      content: 'goals'
    },
    {
      id: 'preferences',
      title: 'Set your preferences',
      subtitle: 'You can change these later',
      content: 'preferences'
    },
    {
      id: 'complete',
      title: 'You&apos;re all set!',
      subtitle: 'Ready to start managing your projects',
      content: 'complete'
    }
  ];

  const roles = [
    { id: 'project-manager', label: 'Project Manager', icon: '📋', description: 'Manage multiple projects and teams' },
    { id: 'team-lead', label: 'Team Lead', icon: '👥', description: 'Lead a small team on specific projects' },
    { id: 'developer', label: 'Developer', icon: '💻', description: 'Focus on development tasks and sprints' },
    { id: 'designer', label: 'Designer', icon: '🎨', description: 'Work on design projects and creative tasks' },
    { id: 'freelancer', label: 'Freelancer', icon: '🚀', description: 'Manage your own projects and clients' },
    { id: 'student', label: 'Student', icon: '🎓', description: 'Organize academic and personal projects' }
  ];

  const experienceLevels = [
    { id: 'beginner', label: 'Beginner', description: 'New to project management' },
    { id: 'intermediate', label: 'Intermediate', description: 'Some experience with project management' },
    { id: 'advanced', label: 'Advanced', description: 'Experienced project manager' },
    { id: 'expert', label: 'Expert', description: 'Very experienced with complex projects' }
  ];

  const goals = [
    { id: 'organize-tasks', label: 'Organize my tasks better', icon: '📝' },
    { id: 'team-collaboration', label: 'Improve team collaboration', icon: '🤝' },
    { id: 'track-progress', label: 'Track project progress', icon: '📊' },
    { id: 'meet-deadlines', label: 'Meet deadlines consistently', icon: '⏰' },
    { id: 'increase-productivity', label: 'Increase productivity', icon: '⚡' },
    { id: 'reduce-stress', label: 'Reduce project stress', icon: '😌' },
    { id: 'better-planning', label: 'Improve project planning', icon: '🗺️' },
    { id: 'time-tracking', label: 'Track time spent on tasks', icon: '⏱️' }
  ];

  const features = [
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: 'Kanban Boards',
      description: 'Visual task management with drag-and-drop'
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: 'Calendar View',
      description: 'See all your deadlines in one place'
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Team Collaboration',
      description: 'Work together seamlessly with your team'
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: 'Analytics & Reports',
      description: 'Track progress and identify bottlenecks'
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      // Save user preferences to backend
      const response = await fetch('/api/users/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          preferences: userPreferences
        })
      });

      if (response.ok) {
        onComplete();
      } else {
        // Still complete onboarding even if preferences save fails
        onComplete();
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      onComplete();
    }
  };

  const toggleGoal = (goalId: string) => {
    setUserPreferences(prev => ({
      ...prev,
      goals: prev.goals.includes(goalId)
        ? prev.goals.filter(id => id !== goalId)
        : [...prev.goals, goalId]
    }));
  };

  const renderStepContent = () => {
    const step = steps[currentStep];
    
    switch (step.content) {
      case 'welcome':
        return (
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Hi {currentUser?.name || 'there'}! 👋
            </h3>
            <p className="text-gray-600 mb-8">
              We&apos;re excited to help you organize your projects and boost your productivity. 
              Let&apos;s personalize your experience in just a few quick steps.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <div className="text-blue-600">{feature.icon}</div>
                  <div>
                    <h4 className="font-medium text-gray-900">{feature.title}</h4>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'role':
        return (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setUserPreferences(prev => ({ ...prev, role: role.id }))}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    userPreferences.role === role.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{role.icon}</span>
                    <span className="font-medium text-gray-900">{role.label}</span>
                  </div>
                  <p className="text-sm text-gray-600">{role.description}</p>
                </button>
              ))}
            </div>
          </div>
        );

      case 'experience':
        return (
          <div className="space-y-4">
            {experienceLevels.map((level) => (
              <button
                key={level.id}
                onClick={() => setUserPreferences(prev => ({ ...prev, experience: level.id }))}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  userPreferences.experience === level.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-gray-900">{level.label}</div>
                <div className="text-sm text-gray-600">{level.description}</div>
              </button>
            ))}
          </div>
        );

      case 'goals':
        return (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {goals.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => toggleGoal(goal.id)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    userPreferences.goals.includes(goal.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{goal.icon}</span>
                    <span className="font-medium text-gray-900">{goal.label}</span>
                    {userPreferences.goals.includes(goal.id) && (
                      <Check className="w-4 h-4 text-blue-600 ml-auto" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 'preferences':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Notifications</h4>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={userPreferences.notifications}
                  onChange={(e) => setUserPreferences(prev => ({ ...prev, notifications: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700">Receive email notifications for important updates</span>
              </label>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Theme</h4>
              <div className="flex gap-3">
                <button
                  onClick={() => setUserPreferences(prev => ({ ...prev, theme: 'light' }))}
                  className={`px-4 py-2 rounded-lg border-2 transition-all ${
                    userPreferences.theme === 'light'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  ☀️ Light
                </button>
                <button
                  onClick={() => setUserPreferences(prev => ({ ...prev, theme: 'dark' }))}
                  className={`px-4 py-2 rounded-lg border-2 transition-all ${
                    userPreferences.theme === 'dark'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  🌙 Dark
                </button>
              </div>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Perfect! You&apos;re all set up! 🎉
            </h3>
            <p className="text-gray-600 mb-8">
              Your personalized project management experience is ready. 
              You can always update your preferences in settings.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Quick Start Tips:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Create your first project to get started</li>
                <li>• Add team members to collaborate</li>
                <li>• Use the Kanban board for visual task management</li>
                <li>• Set up recurring tasks for better organization</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{steps[currentStep].title}</h2>
            <p className="text-gray-600">{steps[currentStep].subtitle}</p>
          </div>
          <button
            onClick={onSkip}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            Skip
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4">
          <div className="flex items-center gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 flex-1 rounded-full ${
                  index <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between text-sm text-gray-500 mt-2">
            <span>Step {currentStep + 1} of {steps.length}</span>
            <span>{Math.round(((currentStep + 1) / steps.length) * 100)}% complete</span>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex gap-2">
            {currentStep === steps.length - 1 ? (
              <button
                onClick={handleComplete}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={
                  (currentStep === 1 && !userPreferences.role) ||
                  (currentStep === 2 && !userPreferences.experience)
                }
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserOnboarding;
