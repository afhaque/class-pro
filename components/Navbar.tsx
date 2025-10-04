'use client';

interface NavbarProps {
  userType: 'teacher' | 'student';
  onUserTypeChange: (type: 'teacher' | 'student') => void;
}

export default function Navbar({ userType, onUserTypeChange }: NavbarProps) {
  return (
    <header className="bg-white border-b border-[#E5E5E5] px-6 py-4 flex items-center justify-between">
      <h1 className="text-[15px] font-semibold text-[#0D0D0D]">
        ClassPro
      </h1>
      <div className="flex gap-2">
        <button
          onClick={() => onUserTypeChange('teacher')}
          className={`px-3 py-1.5 text-[13px] font-medium rounded-md transition-all ${
            userType === 'teacher'
              ? 'bg-[#5E6AD2] text-white'
              : 'bg-transparent text-[#6B6F76] hover:bg-[#F5F5F5]'
          }`}
        >
          Teacher
        </button>
        <button
          onClick={() => onUserTypeChange('student')}
          className={`px-3 py-1.5 text-[13px] font-medium rounded-md transition-all ${
            userType === 'student'
              ? 'bg-[#5E6AD2] text-white'
              : 'bg-transparent text-[#6B6F76] hover:bg-[#F5F5F5]'
          }`}
        >
          Student
        </button>
      </div>
    </header>
  );
}

