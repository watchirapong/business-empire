'use client';

import { useState, useEffect } from 'react';
import { 
  Search, 
  University, 
  GraduationCap, 
  Users, 
  TrendingUp, 
  BarChart3,
  Filter,
  Download,
  Eye,
  BookOpen,
  Code,
  Globe,
  Award,
  Target
} from 'lucide-react';

interface TCASData {
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

interface UniversityStats {
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

interface RoundAnalysis {
  round1: { totalQuota: number; totalApplicants: number; totalPassed: number; totalConfirmed: number };
  round2: { totalQuota: number; totalApplicants: number; totalPassed: number; totalConfirmed: number };
  round3: { totalQuota: number; totalApplicants: number; totalPassed: number; totalConfirmed: number };
  round4: { totalQuota?: number; totalApplicants: number; totalPassed: number; totalConfirmed: number };
  round42: { totalQuota: number; totalApplicants: number; totalPassed: number; totalConfirmed: number };
}

export default function TCASAnalysisPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'universities' | 'computer-science' | 'search' | 'rounds'>('overview');
  const [universities, setUniversities] = useState<UniversityStats[]>([]);
  const [csPrograms, setCsPrograms] = useState<TCASData[]>([]);
  const [searchResults, setSearchResults] = useState<TCASData[]>([]);
  const [roundAnalysis, setRoundAnalysis] = useState<RoundAnalysis | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalUniversities: 0,
    totalPrograms: 0,
    totalApplicants: 0,
    totalConfirmed: 0,
    csPrograms: 0,
    csApplicants: 0,
    csConfirmed: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load universities
      const univResponse = await fetch('/api/tcas-analysis?action=universities');
      const univData = await univResponse.json();
      if (univData.success) {
        setUniversities(univData.data);
        setStats(prev => ({
          ...prev,
          totalUniversities: univData.data.length,
          totalPrograms: univData.data.reduce((sum: number, u: UniversityStats) => sum + u.totalPrograms, 0),
          totalApplicants: univData.data.reduce((sum: number, u: UniversityStats) => sum + u.totalApplicants, 0),
          totalConfirmed: univData.data.reduce((sum: number, u: UniversityStats) => sum + u.totalConfirmed, 0),
          csPrograms: univData.data.reduce((sum: number, u: UniversityStats) => sum + u.computerSciencePrograms, 0),
          csApplicants: univData.data.reduce((sum: number, u: UniversityStats) => sum + u.computerScienceApplicants, 0),
          csConfirmed: univData.data.reduce((sum: number, u: UniversityStats) => sum + u.computerScienceConfirmed, 0)
        }));
      }

      // Load CS programs
      const csResponse = await fetch('/api/tcas-analysis?action=computer-science');
      const csData = await csResponse.json();
      if (csData.success) {
        setCsPrograms(csData.data);
      }

      // Load round analysis
      const roundResponse = await fetch('/api/tcas-analysis?action=round-analysis');
      const roundData = await roundResponse.json();
      if (roundData.success) {
        setRoundAnalysis(roundData.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/tcas-analysis?action=search&q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      if (data.success) {
        setSearchResults(data.data);
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color = 'blue' }: any) => (
    <div className={`bg-white rounded-lg p-6 shadow-md border-l-4 border-${color}-500`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
        </div>
        <Icon className={`w-8 h-8 text-${color}-500`} />
      </div>
    </div>
  );

  const RoundCard = ({ round, data }: any) => (
    <div className="bg-white rounded-lg p-6 shadow-md">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">รอบที่ {round}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600">โควตา</p>
          <p className="text-xl font-bold text-blue-600">{data.totalQuota ? data.totalQuota.toLocaleString() : '-'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">ผู้สมัคร</p>
          <p className="text-xl font-bold text-green-600">{data.totalApplicants?.toLocaleString() || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">ผ่าน</p>
          <p className="text-xl font-bold text-yellow-600">{data.totalPassed?.toLocaleString() || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">ยืนยัน</p>
          <p className="text-xl font-bold text-purple-600">{data.totalConfirmed?.toLocaleString() || '-'}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">TCAS 68 ข้อมูลสถิติ</h1>
              <p className="text-gray-600 mt-1">การวิเคราะห์ข้อมูลการคัดเลือกเข้าศึกษาต่อในระดับอุดมศึกษา</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.print()}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'ภาพรวม', icon: BarChart3 },
              { id: 'universities', label: 'มหาวิทยาลัย', icon: University },
              { id: 'computer-science', label: 'คณะคอมพิวเตอร์', icon: Code },
              { id: 'search', label: 'ค้นหา', icon: Search },
              { id: 'rounds', label: 'วิเคราะห์รอบ', icon: Target }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {!loading && (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard
                    title="มหาวิทยาลัยทั้งหมด"
                    value={stats.totalUniversities}
                    icon={University}
                    color="blue"
                  />
                  <StatCard
                    title="หลักสูตรทั้งหมด"
                    value={stats.totalPrograms}
                    icon={BookOpen}
                    color="green"
                  />
                  <StatCard
                    title="ผู้สมัครทั้งหมด"
                    value={stats.totalApplicants}
                    icon={Users}
                    color="yellow"
                  />
                  <StatCard
                    title="ยืนยันทั้งหมด"
                    value={stats.totalConfirmed}
                    icon={Award}
                    color="purple"
                  />
                </div>

                {/* Computer Science Statistics */}
                <div className="bg-white rounded-lg p-6 shadow-md">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <Code className="w-5 h-5 mr-2 text-blue-600" />
                    สถิติคณะคอมพิวเตอร์
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard
                      title="หลักสูตรคอมพิวเตอร์"
                      value={stats.csPrograms}
                      icon={Code}
                      color="blue"
                    />
                    <StatCard
                      title="ผู้สมัครคอมพิวเตอร์"
                      value={stats.csApplicants}
                      icon={Users}
                      color="green"
                    />
                    <StatCard
                      title="ยืนยันคอมพิวเตอร์"
                      value={stats.csConfirmed}
                      icon={Award}
                      color="purple"
                    />
                  </div>
                </div>

                {/* Round Analysis */}
                {roundAnalysis && (
                  <div className="bg-white rounded-lg p-6 shadow-md">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                      <Target className="w-5 h-5 mr-2 text-blue-600" />
                      วิเคราะห์ตามรอบการคัดเลือก
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      <RoundCard round="1" data={roundAnalysis.round1} />
                      <RoundCard round="2" data={roundAnalysis.round2} />
                      <RoundCard round="3" data={roundAnalysis.round3} />
                      <RoundCard round="4" data={roundAnalysis.round4} />
                      <RoundCard round="4.2" data={roundAnalysis.round42} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Universities Tab */}
            {activeTab === 'universities' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">มหาวิทยาลัยทั้งหมด</h2>
                  <div className="flex items-center space-x-4">
                    <Filter className="w-5 h-5 text-gray-400" />
                    <select className="border border-gray-300 rounded-lg px-3 py-2">
                      <option>เรียงตามจำนวนยืนยัน</option>
                      <option>เรียงตามจำนวนผู้สมัคร</option>
                      <option>เรียงตามชื่อ</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {universities.map((university) => (
                    <div key={university.universityCode} className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{university.universityName}</h3>
                          <p className="text-sm text-gray-600">รหัส: {university.universityCode}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600">{university.totalConfirmed.toLocaleString()}</p>
                          <p className="text-sm text-gray-600">ยืนยันทั้งหมด</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600">หลักสูตรทั้งหมด</p>
                          <p className="text-lg font-semibold">{university.totalPrograms}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">ผู้สมัครทั้งหมด</p>
                          <p className="text-lg font-semibold">{university.totalApplicants.toLocaleString()}</p>
                        </div>
                      </div>

                      {university.computerSciencePrograms > 0 && (
                        <div className="bg-blue-50 rounded-lg p-4">
                          <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                            <Code className="w-4 h-4 mr-2" />
                            คณะคอมพิวเตอร์
                          </h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-600">หลักสูตร:</span>
                              <span className="font-semibold ml-1">{university.computerSciencePrograms}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">ยืนยัน:</span>
                              <span className="font-semibold ml-1">{university.computerScienceConfirmed.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Computer Science Tab */}
            {activeTab === 'computer-science' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">คณะคอมพิวเตอร์</h2>
                  <div className="text-sm text-gray-600">
                    พบ {csPrograms.length} หลักสูตร
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">มหาวิทยาลัย</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">หลักสูตร</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รอบ 1</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รอบ 2</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รอบ 3</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ยืนยันทั้งหมด</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {csPrograms.map((program, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{program.universityName}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">{program.programName}</div>
                              {program.branchName && (
                                <div className="text-sm text-gray-500">{program.branchName}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {program.round1.confirmed}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {program.round2.confirmed}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {program.round3.confirmed}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-semibold text-blue-600">{program.totalConfirmed}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Search Tab */}
            {activeTab === 'search' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg p-6 shadow-md">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">ค้นหาข้อมูล</h2>
                  <div className="flex space-x-4">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="ค้นหามหาวิทยาลัย, หลักสูตร, หรือสาขา..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={handleSearch}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      ค้นหา
                    </button>
                  </div>
                </div>

                {searchResults.length > 0 && (
                  <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">ผลการค้นหา ({searchResults.length} รายการ)</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">มหาวิทยาลัย</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">หลักสูตร</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ผู้สมัคร</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ผ่าน</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ยืนยัน</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {searchResults.map((result, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{result.universityName}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900">{result.programName}</div>
                                {result.branchName && (
                                  <div className="text-sm text-gray-500">{result.branchName}</div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {(result.round1.applicants + result.round2.applicants + result.round3.applicants + result.round4.applicants + result.round42.applicants).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {(result.round1.passed + result.round2.passed + result.round3.passed + result.round4.passed + result.round42.passed).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm font-semibold text-blue-600">{result.totalConfirmed.toLocaleString()}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Rounds Analysis Tab */}
            {activeTab === 'rounds' && roundAnalysis && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900">วิเคราะห์ตามรอบการคัดเลือก</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Round Comparison Chart */}
                  <div className="bg-white rounded-lg p-6 shadow-md">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">เปรียบเทียบรอบการคัดเลือก</h3>
                    <div className="space-y-4">
                      {[
                        { name: 'รอบ 1', data: roundAnalysis.round1 },
                        { name: 'รอบ 2', data: roundAnalysis.round2 },
                        { name: 'รอบ 3', data: roundAnalysis.round3 },
                        { name: 'รอบ 4', data: roundAnalysis.round4 },
                        { name: 'รอบ 4.2', data: roundAnalysis.round42 }
                      ].map((round) => (
                        <div key={round.name} className="border-l-4 border-blue-500 pl-4">
                          <h4 className="font-semibold text-gray-900">{round.name}</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                            <div>
                              <span className="text-gray-600">โควตา:</span>
                              <span className="font-semibold ml-1">{round.data.totalQuota?.toLocaleString() || '-'}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">ผู้สมัคร:</span>
                              <span className="font-semibold ml-1">{round.data.totalApplicants?.toLocaleString() || '-'}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">ผ่าน:</span>
                              <span className="font-semibold ml-1">{round.data.totalPassed?.toLocaleString() || '-'}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">ยืนยัน:</span>
                              <span className="font-semibold ml-1">{round.data.totalConfirmed?.toLocaleString() || '-'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Success Rate Analysis */}
                  <div className="bg-white rounded-lg p-6 shadow-md">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">อัตราความสำเร็จ</h3>
                    <div className="space-y-4">
                      {[
                        { name: 'รอบ 1', data: roundAnalysis.round1 },
                        { name: 'รอบ 2', data: roundAnalysis.round2 },
                        { name: 'รอบ 3', data: roundAnalysis.round3 },
                        { name: 'รอบ 4', data: roundAnalysis.round4 },
                        { name: 'รอบ 4.2', data: roundAnalysis.round42 }
                      ].map((round) => {
                        const successRate = round.data.totalApplicants > 0 
                          ? ((round.data.totalConfirmed / round.data.totalApplicants) * 100).toFixed(1)
                          : '0';
                        return (
                          <div key={round.name} className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-900">{round.name}</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${Math.min(parseFloat(successRate), 100)}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-semibold text-gray-900">{successRate}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
