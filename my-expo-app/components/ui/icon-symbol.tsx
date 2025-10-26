// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  // Existing mappings
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  
  // Tab icons for driver interface
  'shippingbox.fill': 'local-shipping', // Available Loads - shipping truck icon
  'truck.box.fill': 'inventory', // My Loads - inventory/package icon
  'banknote.fill': 'attach-money', // Earnings - money icon
  
  // Tab icons for vendor interface
  'plus.circle.fill': 'add-circle', // Post Load - add circle icon
  'list.clipboard.fill': 'assignment', // My Loads (vendor) - assignment/clipboard icon
  
  // Profile icon
  'person.fill': 'person', // Profile - person icon
  
  // Hamburger menu icon
  'line.horizontal.3': 'menu', // Hamburger menu icon
  
  // Close icon for modal
  'xmark': 'close', // Close icon
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
