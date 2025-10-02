import React from 'react';
import { render } from '@testing-library/react-native';

import { HelloWave } from '../HelloWave';

describe('HelloWave', () => {
  it('renders waving emoji', () => {
    const { getByText } = render(<HelloWave />);
    expect(getByText('👋')).toBeTruthy();
  });
});
