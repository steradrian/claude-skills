import { useState } from 'react';

export function DisplayNameField({ initialValue }) {
  const [value, setValue] = useState(initialValue);

  return (
    <input
      type="text"
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  );
}
