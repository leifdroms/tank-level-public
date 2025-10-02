import React from 'react';
import { render } from '@testing-library/react-native';

import { IconSymbol } from '../ui/IconSymbol';

describe('IconSymbol', () => {
  it('renders without crashing on non-iOS platforms', () => {
    expect(() => render(<IconSymbol name="house.fill" color="#000" size={20} />)).not.toThrow();
  });
});
