const TCASData = require('../models/TCASData');

class TCASService {
  // Get all TCAS data with pagination
  async getAllData(page = 1, limit = 100) {
    const skip = (page - 1) * limit;
    const data = await TCASData.find()
      .sort({ universityName: 1, programName: 1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const total = await TCASData.countDocuments();
    
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Search TCAS data
  async searchData(query, page = 1, limit = 100) {
    const skip = (page - 1) * limit;
    
    const searchFilter = {
      $or: [
        { universityName: { $regex: query, $options: 'i' } },
        { programName: { $regex: query, $options: 'i' } },
        { branchName: { $regex: query, $options: 'i' } }
      ]
    };
    
    const data = await TCASData.find(searchFilter)
      .sort({ universityName: 1, programName: 1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const total = await TCASData.countDocuments(searchFilter);
    
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Get computer science programs
  async getComputerSciencePrograms(page = 1, limit = 100) {
    const skip = (page - 1) * limit;
    
    const computerScienceKeywords = [
      'คอมพิวเตอร์', 'computer', 'วิทยาการคอมพิวเตอร์', 'วิศวกรรมคอมพิวเตอร์',
      'เทคโนโลยีสารสนเทศ', 'information technology', 'software engineering',
      'data science', 'artificial intelligence', 'machine learning',
      'cybersecurity', 'network', 'programming', 'software'
    ];
    
    const searchFilter = {
      $or: computerScienceKeywords.map(keyword => ({
        $or: [
          { programName: { $regex: keyword, $options: 'i' } },
          { branchName: { $regex: keyword, $options: 'i' } }
        ]
      }))
    };
    
    const data = await TCASData.find(searchFilter)
      .sort({ universityName: 1, programName: 1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const total = await TCASData.countDocuments(searchFilter);
    
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Get university statistics
  async getUniversityStats() {
    const stats = await TCASData.aggregate([
      {
        $group: {
          _id: '$universityCode',
          universityName: { $first: '$universityName' },
          totalPrograms: { $sum: 1 },
          totalQuota: {
            $sum: {
              $add: ['$round1.quota', '$round2.quota', '$round3.quota', '$round42.quota']
            }
          },
          totalApplicants: {
            $sum: {
              $add: ['$round1.applicants', '$round2.applicants', '$round3.applicants', '$round4.applicants', '$round42.applicants']
            }
          },
          totalPassed: {
            $sum: {
              $add: ['$round1.passed', '$round2.passed', '$round3.passed', '$round4.passed', '$round42.passed']
            }
          },
          totalConfirmed: { $sum: '$totalConfirmed' },
          round1Quota: { $sum: '$round1.quota' },
          round1Applicants: { $sum: '$round1.applicants' },
          round1Passed: { $sum: '$round1.passed' },
          round1Confirmed: { $sum: '$round1.confirmed' },
          round2Quota: { $sum: '$round2.quota' },
          round2Applicants: { $sum: '$round2.applicants' },
          round2Passed: { $sum: '$round2.passed' },
          round2Confirmed: { $sum: '$round2.confirmed' },
          round3Quota: { $sum: '$round3.quota' },
          round3Applicants: { $sum: '$round3.applicants' },
          round3Passed: { $sum: '$round3.passed' },
          round3Confirmed: { $sum: '$round3.confirmed' },
          round4Applicants: { $sum: '$round4.applicants' },
          round4Passed: { $sum: '$round4.passed' },
          round4Confirmed: { $sum: '$round4.confirmed' },
          round42Quota: { $sum: '$round42.quota' },
          round42Applicants: { $sum: '$round42.applicants' },
          round42Passed: { $sum: '$round42.passed' },
          round42Confirmed: { $sum: '$round42.confirmed' }
        }
      },
      {
        $addFields: {
          computerSciencePrograms: 0, // Will be calculated separately
          computerScienceQuota: 0,
          computerScienceApplicants: 0,
          computerSciencePassed: 0,
          computerScienceConfirmed: 0,
          roundStats: {
            round1: {
              quota: '$round1Quota',
              applicants: '$round1Applicants',
              passed: '$round1Passed',
              confirmed: '$round1Confirmed'
            },
            round2: {
              quota: '$round2Quota',
              applicants: '$round2Applicants',
              passed: '$round2Passed',
              confirmed: '$round2Confirmed'
            },
            round3: {
              quota: '$round3Quota',
              applicants: '$round3Applicants',
              passed: '$round3Passed',
              confirmed: '$round3Confirmed'
            },
            round4: {
              applicants: '$round4Applicants',
              passed: '$round4Passed',
              confirmed: '$round4Confirmed'
            },
            round42: {
              quota: '$round42Quota',
              applicants: '$round42Applicants',
              passed: '$round42Passed',
              confirmed: '$round42Confirmed'
            }
          }
        }
      },
      {
        $sort: { totalConfirmed: -1 }
      }
    ]);

    // Calculate computer science statistics for each university
    const computerScienceKeywords = [
      'คอมพิวเตอร์', 'computer', 'วิทยาการคอมพิวเตอร์', 'วิศวกรรมคอมพิวเตอร์',
      'เทคโนโลยีสารสนเทศ', 'information technology', 'software engineering',
      'data science', 'artificial intelligence', 'machine learning',
      'cybersecurity', 'network', 'programming', 'software'
    ];

    const csStats = await TCASData.aggregate([
      {
        $match: {
          $or: computerScienceKeywords.map(keyword => ({
            $or: [
              { programName: { $regex: keyword, $options: 'i' } },
              { branchName: { $regex: keyword, $options: 'i' } }
            ]
          }))
        }
      },
      {
        $group: {
          _id: '$universityCode',
          computerSciencePrograms: { $sum: 1 },
          computerScienceQuota: {
            $sum: {
              $add: ['$round1.quota', '$round2.quota', '$round3.quota', '$round42.quota']
            }
          },
          computerScienceApplicants: {
            $sum: {
              $add: ['$round1.applicants', '$round2.applicants', '$round3.applicants', '$round4.applicants', '$round42.applicants']
            }
          },
          computerSciencePassed: {
            $sum: {
              $add: ['$round1.passed', '$round2.passed', '$round3.passed', '$round4.passed', '$round42.passed']
            }
          },
          computerScienceConfirmed: { $sum: '$totalConfirmed' }
        }
      }
    ]);

    // Merge CS stats with main stats
    const csStatsMap = new Map(csStats.map(stat => [stat._id, stat]));
    
    return stats.map(stat => ({
      universityCode: stat._id,
      universityName: stat.universityName,
      totalPrograms: stat.totalPrograms,
      totalQuota: stat.totalQuota,
      totalApplicants: stat.totalApplicants,
      totalPassed: stat.totalPassed,
      totalConfirmed: stat.totalConfirmed,
      computerSciencePrograms: csStatsMap.get(stat._id)?.computerSciencePrograms || 0,
      computerScienceQuota: csStatsMap.get(stat._id)?.computerScienceQuota || 0,
      computerScienceApplicants: csStatsMap.get(stat._id)?.computerScienceApplicants || 0,
      computerSciencePassed: csStatsMap.get(stat._id)?.computerSciencePassed || 0,
      computerScienceConfirmed: csStatsMap.get(stat._id)?.computerScienceConfirmed || 0,
      roundStats: stat.roundStats
    }));
  }

  // Get round analysis
  async getRoundAnalysis() {
    const analysis = await TCASData.aggregate([
      {
        $group: {
          _id: null,
          round1TotalQuota: { $sum: '$round1.quota' },
          round1TotalApplicants: { $sum: '$round1.applicants' },
          round1TotalPassed: { $sum: '$round1.passed' },
          round1TotalConfirmed: { $sum: '$round1.confirmed' },
          round2TotalQuota: { $sum: '$round2.quota' },
          round2TotalApplicants: { $sum: '$round2.applicants' },
          round2TotalPassed: { $sum: '$round2.passed' },
          round2TotalConfirmed: { $sum: '$round2.confirmed' },
          round3TotalQuota: { $sum: '$round3.quota' },
          round3TotalApplicants: { $sum: '$round3.applicants' },
          round3TotalPassed: { $sum: '$round3.passed' },
          round3TotalConfirmed: { $sum: '$round3.confirmed' },
          round4TotalApplicants: { $sum: '$round4.applicants' },
          round4TotalPassed: { $sum: '$round4.passed' },
          round4TotalConfirmed: { $sum: '$round4.confirmed' },
          round42TotalQuota: { $sum: '$round42.quota' },
          round42TotalApplicants: { $sum: '$round42.applicants' },
          round42TotalPassed: { $sum: '$round42.passed' },
          round42TotalConfirmed: { $sum: '$round42.confirmed' }
        }
      },
      {
        $addFields: {
          round1: {
            totalQuota: '$round1TotalQuota',
            totalApplicants: '$round1TotalApplicants',
            totalPassed: '$round1TotalPassed',
            totalConfirmed: '$round1TotalConfirmed'
          },
          round2: {
            totalQuota: '$round2TotalQuota',
            totalApplicants: '$round2TotalApplicants',
            totalPassed: '$round2TotalPassed',
            totalConfirmed: '$round2TotalConfirmed'
          },
          round3: {
            totalQuota: '$round3TotalQuota',
            totalApplicants: '$round3TotalApplicants',
            totalPassed: '$round3TotalPassed',
            totalConfirmed: '$round3TotalConfirmed'
          },
          round4: {
            totalApplicants: '$round4TotalApplicants',
            totalPassed: '$round4TotalPassed',
            totalConfirmed: '$round4TotalConfirmed'
          },
          round42: {
            totalQuota: '$round42TotalQuota',
            totalApplicants: '$round42TotalApplicants',
            totalPassed: '$round42TotalPassed',
            totalConfirmed: '$round42TotalConfirmed'
          }
        }
      }
    ]);

    return analysis[0] || {
      round1: { totalQuota: 0, totalApplicants: 0, totalPassed: 0, totalConfirmed: 0 },
      round2: { totalQuota: 0, totalApplicants: 0, totalPassed: 0, totalConfirmed: 0 },
      round3: { totalQuota: 0, totalApplicants: 0, totalPassed: 0, totalConfirmed: 0 },
      round4: { totalApplicants: 0, totalPassed: 0, totalConfirmed: 0 },
      round42: { totalQuota: 0, totalApplicants: 0, totalPassed: 0, totalConfirmed: 0 }
    };
  }

  // Get data by university
  async getDataByUniversity(universityCode) {
    return await TCASData.find({ universityCode })
      .sort({ programName: 1, branchName: 1 })
      .lean();
  }

  // Get data by program
  async getDataByProgram(programCode) {
    return await TCASData.find({ programCode })
      .sort({ universityName: 1 })
      .lean();
  }

  // Get statistics
  async getStatistics() {
    const stats = await TCASData.aggregate([
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          totalUniversities: { $addToSet: '$universityCode' },
          totalPrograms: { $addToSet: '$programCode' },
          totalConfirmed: { $sum: '$totalConfirmed' },
          totalQuota: {
            $sum: {
              $add: ['$round1.quota', '$round2.quota', '$round3.quota', '$round42.quota']
            }
          },
          totalApplicants: {
            $sum: {
              $add: ['$round1.applicants', '$round2.applicants', '$round3.applicants', '$round4.applicants', '$round42.applicants']
            }
          }
        }
      }
    ]);

    if (stats.length === 0) {
      return {
        totalRecords: 0,
        totalUniversities: 0,
        totalPrograms: 0,
        totalConfirmed: 0,
        totalQuota: 0,
        totalApplicants: 0
      };
    }

    return {
      totalRecords: stats[0].totalRecords,
      totalUniversities: stats[0].totalUniversities.length,
      totalPrograms: stats[0].totalPrograms.length,
      totalConfirmed: stats[0].totalConfirmed,
      totalQuota: stats[0].totalQuota,
      totalApplicants: stats[0].totalApplicants
    };
  }
}

module.exports = new TCASService();
