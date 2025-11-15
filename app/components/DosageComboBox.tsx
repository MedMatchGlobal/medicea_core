'use client';

import { useState } from 'react';

type Props = {
  selectedDosage: string;
  setSelectedDosage: (val: string) => void;
};

const commonDosages = ['100mg', '250mg', '500mg', '750mg', '1000mg'];

export default function DosageComboBox({ selectedDosage, setSelectedDosage }: Props) {
  const [customDosage, setCustomDosage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'custom') {
      setCustomDosage('');
      setSelectedDosage('');
    } else {
      setSelectedDosage(val);
    }
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomDosage(e.target.value);
    setSelectedDosage(e.target.value);
  };

  return (
    <div>
      <select
        value={commonDosages.includes(selectedDosage) ? selectedDosage : 'custom'}
        onChange={handleChange}
        className="border p-2 rounded"
      >
        {commonDosages.map((dose) => (
          <option key={dose} value={dose}>
            {dose}
          </option>
        ))}
        <option value="custom">Custom...</option>
      </select>

      {selectedDosage && !commonDosages.includes(selectedDosage) && (
        <input
          type="text"
          placeholder="Enter custom dosage"
          value={customDosage}
          onChange={handleCustomChange}
          className="border p-2 mt-2 rounded w-full"
        />
      )}
    </div>
  );
}
