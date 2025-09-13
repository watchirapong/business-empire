'use client';

import React, { useEffect } from 'react';

interface UserQuickMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onProfile: () => void;
  onLogout: () => void;
  username: string;
  handle?: string | null;
  avatarUrl: string;
}

const UserQuickMenu: React.FC<UserQuickMenuProps> = ({
  isOpen,
  onClose,
  onProfile,
  onLogout,
  username,
  handle,
  avatarUrl,
}) => {
  // Close with Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1100] flex justify-end bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.currentTarget === e.target) onClose();
      }}
    >
      <div className="w-full max-w-sm h-full bg-gradient-to-b from-white to-gray-50 text-gray-900 shadow-2xl border-l border-gray-200/60 flex flex-col">
        {/* Header */}
        <div className="px-6 py-6 border-b border-gray-200/60">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <img src={avatarUrl} alt="Profile" className="w-14 h-14 rounded-full ring-2 ring-orange-400/60" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white" aria-label="ออนไลน์"></div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold truncate">{username}</p>
              {handle ? <p className="text-sm text-gray-500 truncate">#{handle}</p> : null}
            </div>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 transition"
              aria-label="ปิด"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Actions top (non-destructive) */}
        <div className="p-4 sm:p-6">
          <button
            onClick={onProfile}
            className="w-full h-14 px-4 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-lg font-semibold shadow-lg hover:brightness-110 active:scale-[0.99] transition"
          >
            ดูโปรไฟล์ของคุณ
          </button>
        </div>

        {/* Bottom area: keep logout at the very bottom */}
        <div className="mt-auto p-4 sm:p-6 pb-6 sm:pb-6 pb-[env(safe-area-inset-bottom)]">
          <button
            onClick={onLogout}
            className="w-full h-14 px-4 rounded-2xl bg-gradient-to-r from-red-500 to-pink-500 text-white text-lg font-semibold shadow-lg hover:brightness-110 active:scale-[0.99] transition"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserQuickMenu;


