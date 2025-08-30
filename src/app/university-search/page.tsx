'use client';

import React, { useState, useEffect } from 'react';
import { Search, University, GraduationCap, Users, Award, TrendingUp } from 'lucide-react';

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

const UniversitySearch: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [universities, setUniversities] = useState<UniversityData[]>([]);
  const [selectedUniversity, setSelectedUniversity] = useState<UniversityData | null>(null);
  const [universityPrograms, setUniversityPrograms] = useState<ProgramData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState<'universities' | 'programs'>('universities');
  const [showPrograms, setShowPrograms] = useState(false);

  // Fetch all universities on component mount
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
        setUniversityPrograms(data.data || []);
        setShowPrograms(true);
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

  const calculateAcceptanceRate = (applicants: number, confirmed: number) => {
    if (applicants === 0) return 0;
    return ((confirmed / applicants) * 100).toFixed(2);
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('th-TH');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
            🏫 University Search
          </h1>
          <p className="text-gray-300 text-lg">ค้นหามหาวิทยาลัยและดูข้อมูลการรับสมัคร</p>
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

        {/* Search Type Toggle */}
        <div className="flex justify-center mb-6">
          <div className="bg-white/10 rounded-lg p-1 border border-white/20">
            <button
              onClick={() => setSearchType('universities')}
              className={`px-4 py-2 rounded-md transition-colors ${
                searchType === 'universities' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              <University className="w-4 h-4 inline mr-2" />
              มหาวิทยาลัย
            </button>
            <button
              onClick={() => setSearchType('programs')}
              className={`px-4 py-2 rounded-md transition-colors ${
                searchType === 'programs' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              <GraduationCap className="w-4 h-4 inline mr-2" />
              โปรแกรม
            </button>
          </div>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Universities List */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <University className="w-6 h-6" />
                รายชื่อมหาวิทยาลัย ({universities.length})
              </h2>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
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
            <div className="space-y-4">
              {selectedUniversity ? (
                <>
                  <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                    <University className="w-6 h-6" />
                    ข้อมูลมหาวิทยาลัย
                  </h2>
                  
                  <div className="bg-white/10 rounded-lg p-6 border border-white/20">
                    <h3 className="text-xl font-bold text-white mb-4">{selectedUniversity.universityName}</h3>
                    
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

                    {/* Computer Science Statistics */}
                    {selectedUniversity.computerSciencePrograms > 0 && (
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

                    {/* Round Statistics */}
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-3">สถิติตามรอบการรับ</h4>
                      <div className="space-y-2">
                        {Object.entries(selectedUniversity.roundStats).map(([round, stats]) => (
                          <div key={round} className="bg-white/5 p-3 rounded">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-semibold text-gray-300">รอบ {round}</span>
                              <span className="text-xs text-gray-400">
                                {stats.applicants > 0 ? `${calculateAcceptanceRate(stats.applicants, stats.confirmed)}%` : 'N/A'}
                              </span>
                            </div>
                                                         <div className="grid grid-cols-3 gap-2 text-xs">
                               <div>โควตา: {formatNumber('quota' in stats ? stats.quota : 0)}</div>
                               <div>สมัคร: {formatNumber(stats.applicants)}</div>
                               <div>รับ: {formatNumber(stats.confirmed)}</div>
                             </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* View Programs Button */}
                    <button
                      onClick={() => setShowPrograms(!showPrograms)}
                      className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                    >
                      {showPrograms ? 'ซ่อนรายการโปรแกรม' : 'ดูรายการโปรแกรมทั้งหมด'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="bg-white/10 rounded-lg p-6 border border-white/20 text-center">
                  <University className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-300">เลือกมหาวิทยาลัยเพื่อดูข้อมูล</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Programs List */}
        {showPrograms && selectedUniversity && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <GraduationCap className="w-6 h-6" />
              รายการโปรแกรมทั้งหมด ({universityPrograms.length})
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {universityPrograms.map((program) => (
                <div key={`${program.programCode}-${program.branchCode}`} className="bg-white/10 rounded-lg p-4 border border-white/20">
                  <h3 className="font-semibold text-white mb-2">{program.programName}</h3>
                  <p className="text-sm text-gray-300 mb-3">{program.branchName}</p>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">รหัสโปรแกรม:</span>
                      <span className="text-white">{program.programCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">รหัสสาขา:</span>
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
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UniversitySearch;
