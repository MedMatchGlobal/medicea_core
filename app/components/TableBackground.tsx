'use client';

export default function TableBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white shadow rounded p-4">
      {children}
    </div>
  );
}
