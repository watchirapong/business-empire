'use client';

import { useState } from 'react';
import { Company } from '../app/page';

interface CompanySetupProps {
  onComplete: (companies: Company[]) => void;
}

export default function CompanySetup({ onComplete }: CompanySetupProps) {
  const [numCompanies, setNumCompanies] = useState<number>(3);
  const [companyNames, setCompanyNames] = useState<string[]>(['', '', '']);
  const [currentStep, setCurrentStep] = useState<'count' | 'names'>('count');

  const handleCompanyCountChange = (count: number) => {
    setNumCompanies(count);
    setCompanyNames(Array(count).fill('').map((_, i) => companyNames[i] || ''));
  };

  const handleNameChange = (index: number, name: string) => {
    const newNames = [...companyNames];
    newNames[index] = name;
    setCompanyNames(newNames);
  };

  const handleContinue = () => {
    if (currentStep === 'count') {
      setCurrentStep('names');
    } else {
      const validNames = companyNames.filter(name => name.trim() !== '');
      if (validNames.length === numCompanies) {
        const companies: Company[] = validNames.map(name => ({
          name: name.trim(),
          totalInvestment: 0,
          growth: 0
        }));
        onComplete(companies);
      }
    }
  };

  const canContinue = currentStep === 'count' ? numCompanies >= 1 : 
    companyNames.slice(0, numCompanies).every(name => name.trim() !== '');

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          🏢 Company Setup
        </h2>
        <p className="text-gray-600">
          {currentStep === 'count' 
            ? 'How many companies will be available for investment?' 
            : 'Enter company names'
          }
        </p>
      </div>

      {currentStep === 'count' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[2, 3, 4, 5, 6, 7, 8].map(count => (
              <button
                key={count}
                onClick={() => handleCompanyCountChange(count)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  numCompanies === count
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm text-gray-600">Companies</div>
              </button>
            ))}
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-green-800">
                  Investment Opportunities
                </div>
                <div className="text-sm text-green-600">
                  Players will invest in these companies and compete for growth
                </div>
              </div>
              <div className="text-3xl">📈</div>
            </div>
          </div>
        </div>
      )}

      {currentStep === 'names' && (
        <div className="space-y-4">
          <div className="grid gap-4">
            {Array.from({ length: numCompanies }, (_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold">
                  {i + 1}
                </div>
                <input
                  type="text"
                  value={companyNames[i]}
                  onChange={(e) => handleNameChange(i, e.target.value)}
                  placeholder={`Company ${i + 1} name`}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            ))}
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">💡</div>
              <div>
                <div className="font-semibold text-blue-800">
                  Investment Strategy
                </div>
                <div className="text-sm text-blue-600">
                  Companies with more total investment will grow faster (max 30% growth)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            canContinue
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {currentStep === 'count' ? 'Continue' : 'Complete Setup'}
        </button>
      </div>
    </div>
  );
}
