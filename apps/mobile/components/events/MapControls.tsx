import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface MapControlsProps {
  onLocate: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function MapControls({ onLocate, onZoomIn, onZoomOut }: MapControlsProps) {
  return (
    <View style={styles.panel}>
      <CtrlBtn icon="add" onPress={onZoomIn} />
      <View style={styles.divider} />
      <CtrlBtn icon="remove" onPress={onZoomOut} />
      <View style={styles.gap} />
      <CtrlBtn icon="locate-outline" onPress={onLocate} accent />
    </View>
  );
}

function CtrlBtn({ icon, onPress, accent = false }: { icon: IoniconName; onPress: () => void; accent?: boolean | undefined }) {
  return (
    <Pressable onPress={onPress} style={[styles.btn, accent && styles.btnAccent]}>
      <Ionicons name={icon} size={20} color={accent ? '#8250FF' : 'rgba(255,255,255,0.7)'} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    right: 16,
    bottom: '32%',
    backgroundColor: 'rgba(12,10,20,0.88)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    overflow: 'hidden',
  },
  btn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnAccent: {
    backgroundColor: 'rgba(130,80,255,0.15)',
  },
  divider: {
    width: '80%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  gap: {
    height: 8,
  },
});
