import type { PropsWithChildren } from 'react';
import type { ScrollViewProps, StyleProp, ViewStyle } from 'react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme/tokens';

interface AppScreenProps extends PropsWithChildren {
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
  scrollViewProps?: Omit<ScrollViewProps, 'contentContainerStyle'>;
}

export function AppScreen({
  children,
  contentContainerStyle,
  scrollable = true,
  style,
  scrollViewProps,
}: AppScreenProps) {
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.safeArea, style]}>
      {scrollable ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
          {...scrollViewProps}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, contentContainerStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
