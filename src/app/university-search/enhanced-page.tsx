'use client';

import React, { useState, useEffect } from 'react';
import { Search, University, GraduationCap, Users, Award, TrendingUp, BarChart3, PieChart, LineChart, Filter, ArrowLeft, Eye, Target, BookOpen, Globe, Home } from 'lucide-react';

interface UniversityData {
  universityCode: string;
  universityName: string;
  totalPrograms: number;
  totalQuota: number;
  totalApplicants: number;
  totalPassed: number;
  totalConfirmed: number;
  computerSciencePrograms: number;
  computerScienceQuota: number;
  computerScienceApplicants: number;
  computerSciencePassed: number;
  computerScienceConfirmed: number;
  roundStats: {
    round1: { quota: number; applicants: number; passed: number; confirmed: number };
    round2: { quota: number; applicants: number; passed: number; confirmed: number };
    round3: { quota: number; applicants: number; passed: number; confirmed: number };
    round4: { applicants: number; passed: number; confirmed: number };
    round42: { quota: number; applicants: number; passed: number; confirmed: number };
  };
}

interface ProgramData {
  universityCode: string;
  universityName: string;
  programCode: string;
  branchCode: string;
  programName: string;
  branchName: string;
  round1: {
    quota: number;
    applicants: number;
    passed: number;
    confirmed: number;
    notUsed: number;
    waived: number;
  };
  round2: {
    quota: number;
    applicants: number;
    passed: number;
    confirmed: number;
    notUsed: number;
    waived: number;
  };
  round3: {
    quota: number;
    applicants: number;
    passed: number;
    confirmed: number;
    notUsed: number;
    waived: number;
  };
  round4: {
    applicants: number;
    passed: number;
    confirmed: number;
    notUsed: number;
    waived: number;
  };
  round42: {
    quota: number;
    applicants: number;
    passed: number;
    confirmed: number;
    notUsed: number;
    waived: number;
  };
  totalConfirmed: number;
}

interface FacultyData {
  facultyName: string;
  programs: ProgramData[];
  totalPrograms: number;
  totalApplicants: number;
  totalConfirmed: number;
  acceptanceRate: number;
}

const EnhancedUniversitySearch: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [universities, setUniversities] = useState<UniversityData[]>([]);
  const [selectedUniversity, setSelectedUniversity] = useState<UniversityData | null>(null);
  const [universityPrograms, setUniversityPrograms] = useState<ProgramData[]>([]);
  const [faculties, setFaculties] = useState<FacultyData[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'main' | 'search' | 'university' | 'faculty' | 'analytics'>('main');
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyData | null>(null);
  const [analyticsView, setAnalyticsView] = useState<'overview' | 'rounds' | 'faculties' | 'comparison'>('overview');

  // Fetch all universities on component mount
  useEffect(() => {
    if (currentStep === 'main') {
      fetchUniversities();
    }
  }, [currentStep]);

  const fetchUniversities = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tcas-analysis?action=universities');
      if (response.ok) {
        const data = await response.json();
        setUniversities(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching universities:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchUniversities = async () => {
    if (!searchQuery.trim()) {
      fetchUniversities();
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/tcas-analysis?action=search&q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setUniversities(data.data || []);
      }
    } catch (error) {
      console.error('Error searching universities:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUniversityPrograms = async (universityCode: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tcas-analysis?action=university&code=${universityCode}`);
      if (response.ok) {
        const data = await response.json();
        const programs = data.data || [];
        setUniversityPrograms(programs);
        
        // Group programs by faculty
        const facultyMap = new Map<string, ProgramData[]>();
        programs.forEach((program: ProgramData) => {
          const facultyName = program.programName.split(' ')[0]; // Simple faculty extraction
          if (!facultyMap.has(facultyName)) {
            facultyMap.set(facultyName, []);
          }
          facultyMap.get(facultyName)!.push(program);
        });

        const facultyData: FacultyData[] = Array.from(facultyMap.entries()).map(([facultyName, programs]) => {
          const totalApplicants = programs.reduce((sum, p) => 
            sum + p.round1.applicants + p.round2.applicants + p.round3.applicants, 0);
          const totalConfirmed = programs.reduce((sum, p) => sum + p.totalConfirmed, 0);
          
          return {
            facultyName,
            programs,
            totalPrograms: programs.length,
            totalApplicants,
            totalConfirmed,
            acceptanceRate: totalApplicants > 0 ? (totalConfirmed / totalApplicants) * 100 : 0
          };
        });

        setFaculties(facultyData);
        setCurrentStep('university');
      }
    } catch (error) {
      console.error('Error fetching university programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchUniversities();
  };

  const handleUniversityClick = (university: UniversityData) => {
    setSelectedUniversity(university);
    fetchUniversityPrograms(university.universityCode);
  };

  const handleFacultyClick = (faculty: FacultyData) => {
    setSelectedFaculty(faculty);
    setCurrentStep('faculty');
  };

  const handleViewAnalytics = () => {
    setCurrentStep('analytics');
  };

  const handleBackToMain = () => {
    setCurrentStep('main');
    setSelectedUniversity(null);
    setSelectedFaculty(null);
    setSearchQuery('');
  };

  const handleBackToSearch = () => {
    setCurrentStep('search');
    setSelectedUniversity(null);
    setSelectedFaculty(null);
  };

  const handleBackToUniversity = () => {
    setCurrentStep('university');
    setSelectedFaculty(null);
  };

  const calculateAcceptanceRate = (applicants: number, confirmed: number) => {
    if (applicants === 0) return 0;
    return ((confirmed / applicants) * 100).toFixed(2);
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('th-TH');
  };

  const getCompetitionLevel = (applicants: number, quota: number) => {
    if (quota === 0) return 'N/A';
    const ratio = applicants / quota;
    if (ratio > 10) return 'สูงมาก';
    if (ratio > 5) return 'สูง';
    if (ratio > 2) return 'ปานกลาง';
    return 'ต่ำ';
  };

  const getCompetitionColor = (applicants: number, quota: number) => {
    if (quota === 0) return 'text-gray-400';
    const ratio = applicants / quota;
    if (ratio > 10) return 'text-red-400';
    if (ratio > 5) return 'text-orange-400';
    if (ratio > 2) return 'text-yellow-400';
    return 'text-green-400';
  };

  // Render Main Menu
  const renderMainMenu = () => (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent mb-4">
          🏫 University Search Journey
        </h1>
        <p className="text-gray-300 text-xl">ค้นหามหาวิทยาลัยและดูข้อมูลการรับสมัคร TCAS</p>
      </div>

      {/* Main Menu Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {/* Search Universities */}
        <button
          onClick={() => setCurrentStep('search')}
          className="group bg-gradient-to-br from-blue-900/50 to-indigo-900/50 backdrop-blur-sm rounded-2xl border border-blue-500/20 p-8 hover:border-blue-400/40 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20"
        >
          <div className="text-center">
            <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">🔍</div>
            <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-300 transition-colors duration-300">
              ค้นหามหาวิทยาลัย
            </h3>
            <p className="text-gray-400 text-sm group-hover:text-blue-200 transition-colors duration-300">
              ค้นหามหาวิทยาลัยที่ต้องการ
            </p>
          </div>
        </button>

        {/* View All Universities */}
        <button
          onClick={() => {
            fetchUniversities();
            setCurrentStep('search');
          }}
          className="group bg-gradient-to-br from-green-900/50 to-emerald-900/50 backdrop-blur-sm rounded-2xl border border-green-500/20 p-8 hover:border-green-400/40 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-green-500/20"
        >
          <div className="text-center">
            <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">🏛️</div>
            <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-green-300 transition-colors duration-300">
              ดูทั้งหมด
            </h3>
            <p className="text-gray-400 text-sm group-hover:text-green-200 transition-colors duration-300">
              ดูรายชื่อมหาวิทยาลัยทั้งหมด
            </p>
          </div>
        </button>

        {/* Analytics */}
        <button
          onClick={() => {
            fetchUniversities();
            setCurrentStep('search');
          }}
          className="group bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-sm rounded-2xl border border-purple-500/20 p-8 hover:border-purple-400/40 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20"
        >
          <div className="text-center">
            <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">📊</div>
            <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors duration-300">
              Analytics
            </h3>
            <p className="text-gray-400 text-sm group-hover:text-purple-200 transition-colors duration-300">
              วิเคราะห์ข้อมูลสถิติ
            </p>
          </div>
        </button>
      </div>

      {/* Quick Stats */}
      <div className="max-w-4xl mx-auto mt-12">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">สถิติโดยรวม</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 p-4 rounded-lg border border-blue-500/30">
            <div className="text-2xl font-bold text-blue-300">{universities.length}</div>
            <div className="text-sm text-gray-300">มหาวิทยาลัย</div>
          </div>
          <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 p-4 rounded-lg border border-green-500/30">
            <div className="text-2xl font-bold text-green-300">
              {formatNumber(universities.reduce((sum, u) => sum + u.totalPrograms, 0))}
            </div>
            <div className="text-sm text-gray-300">โปรแกรม</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 p-4 rounded-lg border border-yellow-500/30">
            <div className="text-2xl font-bold text-yellow-300">
              {formatNumber(universities.reduce((sum, u) => sum + u.totalApplicants, 0))}
            </div>
            <div className="text-sm text-gray-300">ผู้สมัคร</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 p-4 rounded-lg border border-purple-500/30">
            <div className="text-2xl font-bold text-purple-300">
              {formatNumber(universities.reduce((sum, u) => sum + u.totalConfirmed, 0))}
            </div>
            <div className="text-sm text-gray-300">รับแล้ว</div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Search Step
  const renderSearchStep = () => (
    <div className="space-y-8">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={handleBackToMain}
          className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          กลับไปเมนูหลัก
        </button>
        <h1 className="text-3xl font-bold text-white">🔍 ค้นหามหาวิทยาลัย</h1>
      </div>

      {/* Search Form */}
      <div className="max-w-2xl mx-auto mb-8">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหามหาวิทยาลัย, โปรแกรม, หรือสาขา..."
              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <Search className="w-5 h-5" />
            ค้นหา
          </button>
        </form>
      </div>

      {/* Universities List */}
      {!loading && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <University className="w-6 h-6" />
            รายชื่อมหาวิทยาลัย ({universities.length})
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {universities.map((university) => (
              <div
                key={university.universityCode}
                onClick={() => handleUniversityClick(university)}
                className="p-4 rounded-lg border cursor-pointer transition-all hover:scale-105 bg-white/10 border-white/20 hover:border-blue-400/50 hover:bg-blue-600/20"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-white">{university.universityName}</h3>
                  <span className="text-sm text-gray-400">#{university.universityCode}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1 text-blue-300">
                    <GraduationCap className="w-4 h-4" />
                    {formatNumber(university.totalPrograms)} โปรแกรม
                  </div>
                  <div className="flex items-center gap-1 text-green-300">
                    <Users className="w-4 h-4" />
                    {formatNumber(university.totalApplicants)} ผู้สมัคร
                  </div>
                  <div className="flex items-center gap-1 text-yellow-300">
                    <Award className="w-4 h-4" />
                    {formatNumber(university.totalConfirmed)} รับแล้ว
                  </div>
                  <div className="flex items-center gap-1 text-purple-300">
                    <TrendingUp className="w-4 h-4" />
                    {calculateAcceptanceRate(university.totalApplicants, university.totalConfirmed)}%
                  </div>
                </div>

                {university.computerSciencePrograms > 0 && (
                  <div className="mt-2 p-2 bg-blue-500/20 rounded text-xs text-blue-200">
                    💻 คอมพิวเตอร์: {university.computerSciencePrograms} โปรแกรม
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Render University Step
  const renderUniversityStep = () => (
    <div className="space-y-8">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={handleBackToSearch}
          className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          กลับไปค้นหา
        </button>
        <h1 className="text-3xl font-bold text-white">{selectedUniversity?.universityName}</h1>
        <button
          onClick={handleViewAnalytics}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <BarChart3 className="w-5 h-5" />
          ดู Analytics
        </button>
      </div>

      {/* University Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Main Statistics */}
        <div className="bg-white/10 rounded-lg p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            สถิติโดยรวม
          </h3>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-500/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-300">{formatNumber(selectedUniversity?.totalPrograms || 0)}</div>
              <div className="text-sm text-gray-300">โปรแกรมทั้งหมด</div>
            </div>
            <div className="bg-green-500/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-300">{formatNumber(selectedUniversity?.totalApplicants || 0)}</div>
              <div className="text-sm text-gray-300">ผู้สมัครทั้งหมด</div>
            </div>
            <div className="bg-yellow-500/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-300">{formatNumber(selectedUniversity?.totalConfirmed || 0)}</div>
              <div className="text-sm text-gray-300">รับแล้ว</div>
            </div>
            <div className="bg-purple-500/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-300">
                {calculateAcceptanceRate(selectedUniversity?.totalApplicants || 0, selectedUniversity?.totalConfirmed || 0)}%
              </div>
              <div className="text-sm text-gray-300">อัตราการรับ</div>
            </div>
          </div>

          {/* Computer Science Statistics */}
          {selectedUniversity?.computerSciencePrograms && selectedUniversity.computerSciencePrograms > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                💻 ข้อมูลสาขาคอมพิวเตอร์
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-600/20 p-3 rounded">
                  <div className="text-lg font-bold text-blue-300">{selectedUniversity.computerSciencePrograms}</div>
                  <div className="text-xs text-gray-300">โปรแกรม</div>
                </div>
                <div className="bg-green-600/20 p-3 rounded">
                  <div className="text-lg font-bold text-green-300">{formatNumber(selectedUniversity.computerScienceApplicants)}</div>
                  <div className="text-xs text-gray-300">ผู้สมัคร</div>
                </div>
                <div className="bg-yellow-600/20 p-3 rounded">
                  <div className="text-lg font-bold text-yellow-300">{formatNumber(selectedUniversity.computerScienceConfirmed)}</div>
                  <div className="text-xs text-gray-300">รับแล้ว</div>
                </div>
                <div className="bg-purple-600/20 p-3 rounded">
                  <div className="text-lg font-bold text-purple-300">
                    {calculateAcceptanceRate(selectedUniversity.computerScienceApplicants, selectedUniversity.computerScienceConfirmed)}%
                  </div>
                  <div className="text-xs text-gray-300">อัตราการรับ</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Faculties List */}
        <div className="bg-white/10 rounded-lg p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            รายชื่อคณะ ({faculties.length})
          </h3>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {faculties.map((faculty) => (
              <div
                key={faculty.facultyName}
                onClick={() => handleFacultyClick(faculty)}
                className="p-4 rounded-lg border cursor-pointer transition-all hover:scale-105 bg-white/5 border-white/20 hover:border-blue-400/50 hover:bg-blue-600/20"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-lg font-semibold text-white">{faculty.facultyName}</h4>
                  <span className="text-sm text-gray-400">{faculty.totalPrograms} โปรแกรม</span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="flex items-center gap-1 text-green-300">
                    <Users className="w-4 h-4" />
                    {formatNumber(faculty.totalApplicants)}
                  </div>
                  <div className="flex items-center gap-1 text-yellow-300">
                    <Award className="w-4 h-4" />
                    {formatNumber(faculty.totalConfirmed)}
                  </div>
                  <div className="flex items-center gap-1 text-purple-300">
                    <TrendingUp className="w-4 h-4" />
                    {faculty.acceptanceRate.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Render Faculty Step
  const renderFacultyStep = () => (
    <div className="space-y-8">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={handleBackToUniversity}
          className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          กลับไปมหาวิทยาลัย
        </button>
        <h1 className="text-3xl font-bold text-white">{selectedFaculty?.facultyName}</h1>
        <div className="text-right">
          <p className="text-gray-300">{selectedUniversity?.universityName}</p>
        </div>
      </div>

      {/* Faculty Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Faculty Statistics */}
        <div className="bg-white/10 rounded-lg p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            สถิติคณะ
          </h3>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-500/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-300">{selectedFaculty?.totalPrograms}</div>
              <div className="text-sm text-gray-300">โปรแกรม</div>
            </div>
            <div className="bg-green-500/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-300">{formatNumber(selectedFaculty?.totalApplicants || 0)}</div>
              <div className="text-sm text-gray-300">ผู้สมัคร</div>
            </div>
            <div className="bg-yellow-500/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-300">{formatNumber(selectedFaculty?.totalConfirmed || 0)}</div>
              <div className="text-sm text-gray-300">รับแล้ว</div>
            </div>
            <div className="bg-purple-500/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-300">
                {selectedFaculty?.acceptanceRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-300">อัตราการรับ</div>
            </div>
          </div>

          {/* Competition Level */}
          <div className="bg-white/5 p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-white mb-2">ระดับการแข่งขัน</h4>
            <div className="text-3xl font-bold text-green-400">
              {getCompetitionLevel(selectedFaculty?.totalApplicants || 0, selectedFaculty?.totalPrograms || 0)}
            </div>
            <p className="text-sm text-gray-300 mt-1">
              อัตราส่วนผู้สมัครต่อโปรแกรม: {(selectedFaculty?.totalApplicants || 0) / (selectedFaculty?.totalPrograms || 1)}:1
            </p>
          </div>
        </div>

        {/* Programs List */}
        <div className="bg-white/10 rounded-lg p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <GraduationCap className="w-6 h-6" />
            รายการโปรแกรม ({selectedFaculty?.programs.length})
          </h3>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {selectedFaculty?.programs.map((program) => (
              <div key={`${program.programCode}-${program.branchCode}`} className="p-4 rounded-lg border bg-white/5 border-white/20">
                <h4 className="font-semibold text-white mb-2">{program.programName}</h4>
                <p className="text-sm text-gray-300 mb-3">{program.branchName}</p>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">รหัส:</span>
                    <span className="text-white">{program.programCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">สาขา:</span>
                    <span className="text-white">{program.branchCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">ผู้สมัคร:</span>
                    <span className="text-green-300">{formatNumber(program.round1.applicants + program.round2.applicants + program.round3.applicants)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">รับแล้ว:</span>
                    <span className="text-yellow-300">{formatNumber(program.totalConfirmed)}</span>
                  </div>
                </div>

                {/* Competition Level for Program */}
                <div className="mt-2 p-2 rounded text-xs">
                  <span className={`font-semibold ${getCompetitionColor(program.round1.applicants + program.round2.applicants + program.round3.applicants, program.round1.quota)}`}>
                    การแข่งขัน: {getCompetitionLevel(program.round1.applicants + program.round2.applicants + program.round3.applicants, program.round1.quota)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Render Analytics Step
  const renderAnalyticsStep = () => (
    <div className="space-y-8">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={handleBackToUniversity}
          className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          กลับไปมหาวิทยาลัย
        </button>
        <h1 className="text-3xl font-bold text-white">📊 Analytics - {selectedUniversity?.universityName}</h1>
      </div>

      {/* Analytics Tabs */}
      <div className="flex justify-center mb-6">
        <div className="bg-white/10 rounded-lg p-1 border border-white/20">
          {[
            { key: 'overview', label: 'ภาพรวม', icon: BarChart3 },
            { key: 'rounds', label: 'รอบการรับ', icon: LineChart },
            { key: 'faculties', label: 'คณะ', icon: PieChart },
            { key: 'comparison', label: 'เปรียบเทียบ', icon: Target }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setAnalyticsView(tab.key as any)}
              className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
                analyticsView === tab.key ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Analytics Content */}
      <div className="bg-white/10 rounded-lg p-6 border border-white/20">
        {analyticsView === 'overview' && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white mb-4">ภาพรวมสถิติ</h3>
            
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 p-4 rounded-lg border border-blue-500/30">
                <div className="text-3xl font-bold text-blue-300">{formatNumber(selectedUniversity?.totalPrograms || 0)}</div>
                <div className="text-sm text-gray-300">โปรแกรมทั้งหมด</div>
              </div>
              <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 p-4 rounded-lg border border-green-500/30">
                <div className="text-3xl font-bold text-green-300">{formatNumber(selectedUniversity?.totalApplicants || 0)}</div>
                <div className="text-sm text-gray-300">ผู้สมัครทั้งหมด</div>
              </div>
              <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 p-4 rounded-lg border border-yellow-500/30">
                <div className="text-3xl font-bold text-yellow-300">{formatNumber(selectedUniversity?.totalConfirmed || 0)}</div>
                <div className="text-sm text-gray-300">รับแล้ว</div>
              </div>
              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 p-4 rounded-lg border border-purple-500/30">
                <div className="text-3xl font-bold text-purple-300">
                  {calculateAcceptanceRate(selectedUniversity?.totalApplicants || 0, selectedUniversity?.totalConfirmed || 0)}%
                </div>
                <div className="text-sm text-gray-300">อัตราการรับ</div>
              </div>
            </div>

            {/* Faculty Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-white mb-3">การกระจายคณะ</h4>
                <div className="space-y-2">
                  {faculties.slice(0, 5).map((faculty) => (
                    <div key={faculty.facultyName} className="flex justify-between items-center">
                      <span className="text-gray-300">{faculty.facultyName}</span>
                      <span className="text-white font-semibold">{faculty.totalPrograms} โปรแกรม</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-white/5 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-white mb-3">อัตราการรับตามคณะ</h4>
                <div className="space-y-2">
                  {faculties.slice(0, 5).map((faculty) => (
                    <div key={faculty.facultyName} className="flex justify-between items-center">
                      <span className="text-gray-300">{faculty.facultyName}</span>
                      <span className="text-purple-300 font-semibold">{faculty.acceptanceRate.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {analyticsView === 'rounds' && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white mb-4">สถิติตามรอบการรับ</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(selectedUniversity?.roundStats || {}).map(([round, stats]) => (
                <div key={round} className="bg-white/5 p-4 rounded-lg border border-white/20">
                  <h4 className="text-lg font-semibold text-white mb-3">รอบ {round}</h4>
                  <div className="space-y-2">
                    {'quota' in stats && (
                      <div className="flex justify-between">
                        <span className="text-gray-300">โควตา:</span>
                        <span className="text-blue-300 font-semibold">{formatNumber(stats.quota)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-300">ผู้สมัคร:</span>
                      <span className="text-green-300 font-semibold">{formatNumber(stats.applicants)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">ผ่าน:</span>
                      <span className="text-yellow-300 font-semibold">{formatNumber(stats.passed)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">รับแล้ว:</span>
                      <span className="text-purple-300 font-semibold">{formatNumber(stats.confirmed)}</span>
                    </div>
                    <div className="pt-2 border-t border-white/20">
                      <div className="flex justify-between">
                        <span className="text-gray-300">อัตราการรับ:</span>
                        <span className="text-purple-400 font-semibold">
                          {stats.applicants > 0 ? calculateAcceptanceRate(stats.applicants, stats.confirmed) : '0'}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {analyticsView === 'faculties' && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white mb-4">สถิติตามคณะ</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {faculties.map((faculty) => (
                <div key={faculty.facultyName} className="bg-white/5 p-4 rounded-lg border border-white/20">
                  <h4 className="text-lg font-semibold text-white mb-3">{faculty.facultyName}</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-300">โปรแกรม:</span>
                      <span className="text-blue-300 font-semibold">{faculty.totalPrograms}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">ผู้สมัคร:</span>
                      <span className="text-green-300 font-semibold">{formatNumber(faculty.totalApplicants)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">รับแล้ว:</span>
                      <span className="text-yellow-300 font-semibold">{formatNumber(faculty.totalConfirmed)}</span>
                    </div>
                    <div className="pt-2 border-t border-white/20">
                      <div className="flex justify-between">
                        <span className="text-gray-300">อัตราการรับ:</span>
                        <span className="text-purple-400 font-semibold">{faculty.acceptanceRate.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {analyticsView === 'comparison' && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white mb-4">การเปรียบเทียบ</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Competition Level Comparison */}
              <div className="bg-white/5 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-white mb-3">ระดับการแข่งขันตามคณะ</h4>
                <div className="space-y-2">
                  {faculties.map((faculty) => {
                    const competitionLevel = getCompetitionLevel(faculty.totalApplicants, faculty.totalPrograms);
                    const competitionColor = getCompetitionColor(faculty.totalApplicants, faculty.totalPrograms);
                    return (
                      <div key={faculty.facultyName} className="flex justify-between items-center">
                        <span className="text-gray-300">{faculty.facultyName}</span>
                        <span className={`font-semibold ${competitionColor}`}>{competitionLevel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Acceptance Rate Comparison */}
              <div className="bg-white/5 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-white mb-3">อัตราการรับเปรียบเทียบ</h4>
                <div className="space-y-2">
                  {faculties
                    .sort((a, b) => b.acceptanceRate - a.acceptanceRate)
                    .map((faculty) => (
                      <div key={faculty.facultyName} className="flex justify-between items-center">
                        <span className="text-gray-300">{faculty.facultyName}</span>
                        <span className="text-purple-300 font-semibold">{faculty.acceptanceRate.toFixed(1)}%</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Loading State */}
        {loading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
              <p className="text-white mt-4 text-lg">กำลังโหลดข้อมูล...</p>
            </div>
          </div>
        )}

        {/* Content */}
        {currentStep === 'main' && renderMainMenu()}
        {currentStep === 'search' && renderSearchStep()}
        {currentStep === 'university' && renderUniversityStep()}
        {currentStep === 'faculty' && renderFacultyStep()}
        {currentStep === 'analytics' && renderAnalyticsStep()}
      </div>
    </div>
  );
};

export default EnhancedUniversitySearch;
