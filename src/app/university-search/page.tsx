'use client';

import React, { useState, useEffect } from 'react';
import { Search, University, GraduationCap, Users, Award, TrendingUp, BarChart3, PieChart, LineChart, Filter, ArrowLeft, Eye, Target, BookOpen, Globe } from 'lucide-react';

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

const UniversitySearch: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [universities, setUniversities] = useState<UniversityData[]>([]);
  const [selectedUniversity, setSelectedUniversity] = useState<UniversityData | null>(null);
  const [universityPrograms, setUniversityPrograms] = useState<ProgramData[]>([]);
  const [faculties, setFaculties] = useState<FacultyData[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'search' | 'university' | 'faculty' | 'analytics'>('search');
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyData | null>(null);
  const [analyticsView, setAnalyticsView] = useState<'overview' | 'rounds' | 'faculties' | 'comparison'>('overview');

  useEffect(() => {
    fetchUniversities();
  }, []);

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
        
        const facultyMap = new Map<string, ProgramData[]>();
        programs.forEach((program: ProgramData) => {
          let facultyName = program.programName;
          facultyName = facultyName.replace(/บัณฑิต|มหาบัณฑิต|ดุษฎีบัณฑิต/g, '').trim();
          const parts = facultyName.split(/[()]/);
          facultyName = parts[0].trim();
          
          if (facultyName.length < 3) {
            facultyName = program.programName;
          }
          
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          {currentStep !== 'search' && (
            <div className="flex justify-start mb-4">
              <button
                onClick={handleBackToSearch}
                className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                กลับไปค้นหา
              </button>
            </div>
          )}
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
            🏫 University Search Journey
          </h1>
          <p className="text-gray-300 text-lg">ค้นหามหาวิทยาลัยและดูข้อมูลการรับสมัคร TCAS</p>
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

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
            <p className="text-gray-300 mt-2">กำลังโหลดข้อมูล...</p>
          </div>
        )}

        {/* Results */}
        {!loading && (
          <div className="space-y-6">
            {/* Universities List */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <University className="w-6 h-6" />
                รายชื่อมหาวิทยาลัย ({universities.length})
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {universities.map((university) => (
                  <div
                    key={university.universityCode}
                    onClick={() => handleUniversityClick(university)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all hover:scale-105 ${
                      selectedUniversity?.universityCode === university.universityCode
                        ? 'bg-blue-600/20 border-blue-400 shadow-lg'
                        : 'bg-white/10 border-white/20 hover:border-blue-400/50'
                    }`}
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

            {/* Selected University Details */}
            {selectedUniversity && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <University className="w-6 h-6" />
                  ข้อมูลมหาวิทยาลัย
                </h2>
                
                <div className="bg-white/10 rounded-lg p-6 border border-white/20">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-white">{selectedUniversity.universityName}</h3>
                    <button
                      onClick={handleViewAnalytics}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm transition-colors flex items-center gap-1"
                    >
                      <BarChart3 className="w-4 h-4" />
                      Analytics
                    </button>
                  </div>
                  
                  {/* Main Statistics */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-blue-500/20 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-blue-300">{formatNumber(selectedUniversity.totalPrograms)}</div>
                      <div className="text-sm text-gray-300">โปรแกรมทั้งหมด</div>
                    </div>
                    <div className="bg-green-500/20 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-green-300">{formatNumber(selectedUniversity.totalApplicants)}</div>
                      <div className="text-sm text-gray-300">ผู้สมัครทั้งหมด</div>
                    </div>
                    <div className="bg-yellow-500/20 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-300">{formatNumber(selectedUniversity.totalConfirmed)}</div>
                      <div className="text-sm text-gray-300">รับแล้ว</div>
                    </div>
                    <div className="bg-purple-500/20 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-purple-300">
                        {calculateAcceptanceRate(selectedUniversity.totalApplicants, selectedUniversity.totalConfirmed)}%
                      </div>
                      <div className="text-sm text-gray-300">อัตราการรับ</div>
                    </div>
                  </div>

                  {/* Faculties List */}
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      รายชื่อคณะ ({faculties?.length || 0})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                      {faculties?.map((faculty) => (
                        <div
                          key={faculty.facultyName}
                          onClick={() => handleFacultyClick(faculty)}
                          className="p-3 rounded-lg border cursor-pointer transition-all hover:scale-105 bg-white/5 border-white/20 hover:border-blue-400/50 hover:bg-blue-600/20"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-white font-medium text-sm">{faculty.facultyName}</span>
                            <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                              {faculty.totalPrograms} โปรแกรม
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-xs mb-2">
                            <div className="flex items-center gap-1 text-green-300">
                              <Users className="w-3 h-3" />
                              <span className="font-semibold">{formatNumber(faculty.totalApplicants)}</span>
                              <span className="text-gray-400">ผู้สมัคร</span>
                            </div>
                            <div className="flex items-center gap-1 text-yellow-300">
                              <Award className="w-3 h-3" />
                              <span className="font-semibold">{formatNumber(faculty.totalConfirmed)}</span>
                              <span className="text-gray-400">รับแล้ว</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1 text-purple-300">
                              <TrendingUp className="w-3 h-3" />
                              <span className="font-semibold">{faculty.acceptanceRate.toFixed(1)}%</span>
                              <span className="text-gray-400">อัตราการรับ</span>
                            </div>
                            <div className="text-xs">
                              <span className={`font-semibold px-2 py-1 rounded ${getCompetitionColor(faculty.totalApplicants, faculty.totalPrograms)}`}>
                                {getCompetitionLevel(faculty.totalApplicants, faculty.totalPrograms)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Faculty Details View */}
            {currentStep === 'faculty' && selectedFaculty && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-6 h-6" />
                    {selectedFaculty.facultyName}
                  </h2>
                  <div className="text-right">
                    <p className="text-gray-300">{selectedUniversity?.universityName}</p>
                    <button
                      onClick={handleBackToUniversity}
                      className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors mt-1"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      กลับไปมหาวิทยาลัย
                    </button>
                  </div>
                </div>

                {/* Faculty Statistics */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  <div className="bg-white/10 rounded-lg p-6 border border-white/20">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <BarChart3 className="w-6 h-6" />
                      สถิติคณะ
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-blue-500/20 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-blue-300">{selectedFaculty.totalPrograms}</div>
                        <div className="text-sm text-gray-300">โปรแกรม</div>
                      </div>
                      <div className="bg-green-500/20 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-green-300">{formatNumber(selectedFaculty.totalApplicants)}</div>
                        <div className="text-sm text-gray-300">ผู้สมัคร</div>
                      </div>
                      <div className="bg-yellow-500/20 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-300">{formatNumber(selectedFaculty.totalConfirmed)}</div>
                        <div className="text-sm text-gray-300">รับแล้ว</div>
                      </div>
                      <div className="bg-purple-500/20 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-purple-300">
                          {selectedFaculty.acceptanceRate.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-300">อัตราการรับ</div>
                      </div>
                    </div>

                    {/* Competition Level */}
                    <div className="bg-white/5 p-4 rounded-lg">
                      <h4 className="text-lg font-semibold text-white mb-2">ระดับการแข่งขัน</h4>
                      <div className="text-3xl font-bold text-green-400">
                        {getCompetitionLevel(selectedFaculty.totalApplicants, selectedFaculty.totalPrograms)}
                      </div>
                      <p className="text-sm text-gray-300 mt-1">
                        อัตราส่วนผู้สมัครต่อโปรแกรม: {(selectedFaculty.totalApplicants / selectedFaculty.totalPrograms).toFixed(1)}:1
                      </p>
                    </div>
                  </div>

                  {/* Round-by-Round Statistics */}
                  <div className="bg-white/10 rounded-lg p-6 border border-white/20">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <LineChart className="w-6 h-6" />
                      การรับตามรอบ
                    </h3>
                    
                    <div className="space-y-4">
                      {/* Round 1 */}
                      <div className="bg-white/5 p-4 rounded-lg">
                        <h4 className="text-lg font-semibold text-white mb-3">รอบ 1 (Portfolio)</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-300">โควตา:</span>
                            <span className="text-blue-300 font-semibold">
                              {formatNumber(selectedFaculty.programs.reduce((sum, p) => sum + p.round1.quota, 0))}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">ผู้สมัคร:</span>
                            <span className="text-green-300 font-semibold">
                              {formatNumber(selectedFaculty.programs.reduce((sum, p) => sum + p.round1.applicants, 0))}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">ผ่าน:</span>
                            <span className="text-yellow-300 font-semibold">
                              {formatNumber(selectedFaculty.programs.reduce((sum, p) => sum + p.round1.passed, 0))}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">รับแล้ว:</span>
                            <span className="text-purple-300 font-semibold">
                              {formatNumber(selectedFaculty.programs.reduce((sum, p) => sum + p.round1.confirmed, 0))}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Round 2 */}
                      <div className="bg-white/5 p-4 rounded-lg">
                        <h4 className="text-lg font-semibold text-white mb-3">รอบ 2 (Quota)</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-300">โควตา:</span>
                            <span className="text-blue-300 font-semibold">
                              {formatNumber(selectedFaculty.programs.reduce((sum, p) => sum + p.round2.quota, 0))}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">ผู้สมัคร:</span>
                            <span className="text-green-300 font-semibold">
                              {formatNumber(selectedFaculty.programs.reduce((sum, p) => sum + p.round2.applicants, 0))}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">ผ่าน:</span>
                            <span className="text-yellow-300 font-semibold">
                              {formatNumber(selectedFaculty.programs.reduce((sum, p) => sum + p.round2.passed, 0))}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">รับแล้ว:</span>
                            <span className="text-purple-300 font-semibold">
                              {formatNumber(selectedFaculty.programs.reduce((sum, p) => sum + p.round2.confirmed, 0))}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Round 3 */}
                      <div className="bg-white/5 p-4 rounded-lg">
                        <h4 className="text-lg font-semibold text-white mb-3">รอบ 3 (Direct Admission)</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-300">โควตา:</span>
                            <span className="text-blue-300 font-semibold">
                              {formatNumber(selectedFaculty.programs.reduce((sum, p) => sum + p.round3.quota, 0))}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">ผู้สมัคร:</span>
                            <span className="text-green-300 font-semibold">
                              {formatNumber(selectedFaculty.programs.reduce((sum, p) => sum + p.round3.applicants, 0))}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">ผ่าน:</span>
                            <span className="text-yellow-300 font-semibold">
                              {formatNumber(selectedFaculty.programs.reduce((sum, p) => sum + p.round3.passed, 0))}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">รับแล้ว:</span>
                            <span className="text-purple-300 font-semibold">
                              {formatNumber(selectedFaculty.programs.reduce((sum, p) => sum + p.round3.confirmed, 0))}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Programs List */}
                <div className="bg-white/10 rounded-lg p-6 border border-white/20">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <GraduationCap className="w-6 h-6" />
                    รายชื่อโปรแกรม ({selectedFaculty.programs.length})
                  </h3>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {selectedFaculty.programs.map((program) => (
                      <div key={program.programCode} className="bg-white/5 p-4 rounded-lg border border-white/10">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-lg font-semibold text-white">{program.programName}</h4>
                          <span className="text-sm text-gray-400">#{program.programCode}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                          <div className="flex items-center gap-1 text-blue-300">
                            <span className="font-semibold">รอบ 1:</span>
                            <span>{formatNumber(program.round1.confirmed)} รับ</span>
                          </div>
                          <div className="flex items-center gap-1 text-green-300">
                            <span className="font-semibold">รอบ 2:</span>
                            <span>{formatNumber(program.round2.confirmed)} รับ</span>
                          </div>
                          <div className="flex items-center gap-1 text-yellow-300">
                            <span className="font-semibold">รอบ 3:</span>
                            <span>{formatNumber(program.round3.confirmed)} รับ</span>
                          </div>
                          <div className="flex items-center gap-1 text-purple-300">
                            <span className="font-semibold">รวม:</span>
                            <span>{formatNumber(program.totalConfirmed)} รับ</span>
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-400">
                          สาขา: {program.branchName}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UniversitySearch;
