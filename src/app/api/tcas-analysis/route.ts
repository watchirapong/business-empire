import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import TCASService from '../../../../services/tcasService';

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

// Connect to MongoDB
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;
  
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/business-empire');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Helper function for computer science program detection
function isComputerScienceProgram(programName: string, branchName: string): boolean {
  const computerScienceKeywords = [
    'คอมพิวเตอร์', 'computer', 'วิทยาการคอมพิวเตอร์', 'วิศวกรรมคอมพิวเตอร์',
    'เทคโนโลยีสารสนเทศ', 'information technology', 'software engineering',
    'data science', 'artificial intelligence', 'machine learning',
    'cybersecurity', 'network', 'programming', 'software'
  ];
  
  const fullText = `${programName} ${branchName}`.toLowerCase();
  return computerScienceKeywords.some(keyword => 
    fullText.includes(keyword.toLowerCase())
  );
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    
    switch (action) {
      case 'universities':
        const universityStats = await TCASService.getUniversityStats();
        return NextResponse.json({
          success: true,
          data: universityStats,
          total: universityStats.length
        });
        
      case 'computer-science':
        const csPrograms = await TCASService.getComputerSciencePrograms(page, limit);
        return NextResponse.json({
          success: true,
          ...csPrograms
        });
        
      case 'search':
        const query = searchParams.get('q') || '';
        const searchResults = await TCASService.searchData(query, page, limit);
        return NextResponse.json({
          success: true,
          ...searchResults
        });
        
      case 'round-analysis':
        const roundAnalysis = await TCASService.getRoundAnalysis();
        return NextResponse.json({
          success: true,
          data: roundAnalysis
        });
        
      case 'statistics':
        const statistics = await TCASService.getStatistics();
        return NextResponse.json({
          success: true,
          data: statistics
        });
        
      case 'university':
        const universityCode = searchParams.get('code');
        if (!universityCode) {
          return NextResponse.json(
            { success: false, error: 'University code is required' },
            { status: 400 }
          );
        }
        const universityData = await TCASService.getDataByUniversity(universityCode);
        return NextResponse.json({
          success: true,
          data: universityData,
          total: universityData.length
        });
        
      case 'program':
        const programCode = searchParams.get('code');
        if (!programCode) {
          return NextResponse.json(
            { success: false, error: 'Program code is required' },
            { status: 400 }
          );
        }
        const programData = await TCASService.getDataByProgram(programCode);
        return NextResponse.json({
          success: true,
          data: programData,
          total: programData.length
        });
        
      default:
        const allData = await TCASService.getAllData(page, limit);
        return NextResponse.json({
          success: true,
          ...allData
        });
    }
  } catch (error) {
    console.error('Error processing TCAS data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process data' },
      { status: 500 }
    );
  }
}
