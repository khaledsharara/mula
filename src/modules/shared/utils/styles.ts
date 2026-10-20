import { Platform, type TextStyle } from 'react-native';

/** Removes the browser's focus ring on text inputs; native inputs have none. */
export const noOutline: TextStyle | null = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;
