import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  APP_NAVIGATION_BORDER_HEIGHT,
  APP_NAVIGATION_BOTTOM_PADDING,
  APP_NAVIGATION_ITEM_HEIGHT,
  APP_NAVIGATION_TOP_PADDING,
} from '@/theme/layout';
import { spacing } from '@/theme/tokens';

export function useBottomContentPadding(extra = spacing.xl) {
  const insets = useSafeAreaInsets();

  return useMemo(
    () =>
      APP_NAVIGATION_BORDER_HEIGHT +
      APP_NAVIGATION_TOP_PADDING +
      APP_NAVIGATION_ITEM_HEIGHT +
      Math.max(insets.bottom, APP_NAVIGATION_BOTTOM_PADDING) +
      extra,
    [extra, insets.bottom],
  );
}
