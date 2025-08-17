'use client';

import { useState } from 'react';
import { Company } from '../types';

interface CompanySetupProps {
  onComplete: (companies: Company[]) => void;
}

export default function CompanySetup({ onComplete }: CompanySetupProps) {
  const [companies, setCompanies] = useState<Company[]>([
    { name: '', totalInvestment: 0, growth: 0 }
  ]);

  const addCompany = () => {
    setCompanies([...companies, { name: '', totalInvestment: 0, growth: 0 }]);
  };

  const removeCompany = (index: number) => {
    if (companies.length > 1) {
      setCompanies(companies.filter((_, i) => i !== index));
    }
  };

  const updateCompany = (index: number, field: keyof Company, value: string | number) => {
    const updatedCompanies = [...companies];
    updatedCompanies[index] = { ...updatedCompanies[index], [field]: value };
    setCompanies(updatedCompanies);
  };

  const handleComplete = () => {
    const validCompanies = companies.filter(company => company.name.trim() !== '');
    if (validCompanies.length > 0) {
      onComplete(validCompanies);
    }
  };

  const canComplete = companies.some(company => company.name.trim() !== '');

  return (
    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center">
        <span className="mr-2">🏢</span> ตั้งค่าบริษัท
      </h3>
      
      <div className="space-y-4">
        {companies.map((company, index) => (
          <div key={index} className="bg-white/10 rounded-lg p-4 border border-white/20">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {index + 1}
              </div>
              <input
                type="text"
                value={company.name}
                onChange={(e) => updateCompany(index, 'name', e.target.value)}
                placeholder={`ชื่อบริษัท ${index + 1}`}
                className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              {companies.length > 1 && (
                <button
                  onClick={() => removeCompany(index)}
                  className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all duration-200 hover:scale-105"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mt-6">
        <button
          onClick={addCompany}
          className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-semibold transition-all duration-200 hover:scale-105"
        >
          ➕ เพิ่มบริษัท
        </button>
        
        <button
          onClick={handleComplete}
          disabled={!canComplete}
          className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
        >
          ✅ เสร็จสิ้น
        </button>
      </div>
    </div>
  );
}
