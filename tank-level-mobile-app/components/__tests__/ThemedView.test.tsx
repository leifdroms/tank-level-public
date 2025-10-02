import React from 'react';
import { render } from '@testing-library/react-native';

import { ThemedView } from '../ThemedView';

describe('ThemedView', () => {
  it('applies background color override', () => {
    const { getByTestId } = render(
      <ThemedView testID="view" lightColor="#abcdef" />
    );

    const styles = (getByTestId('view').props.style as any[])[0];
    expect(styles).toEqual(expect.objectContaining({ backgroundColor: '#abcdef' }));
  });
});
