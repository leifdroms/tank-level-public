import React from 'react';
import { render } from '@testing-library/react-native';

import { ThemedText } from '../ThemedText';

describe('ThemedText', () => {
  it('applies provided color overrides', () => {
    const { getByText } = render(
      <ThemedText lightColor="#123456">Hello</ThemedText>
    );

    const styles = getByText('Hello').props.style as any[];
    expect(styles[0]).toEqual(expect.objectContaining({ color: '#123456' }));
  });
});
