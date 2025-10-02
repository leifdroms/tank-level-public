import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { Collapsible } from '../Collapsible';

describe('Collapsible', () => {
  it('toggles open state when heading pressed', () => {
    const { getByText, queryByText } = render(
      <Collapsible title="Section">
        <Text>Content</Text>
      </Collapsible>
    );

    expect(queryByText('Content')).toBeNull();
    fireEvent.press(getByText('Section'));
    expect(queryByText('Content')).not.toBeNull();
  });
});
