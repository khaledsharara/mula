import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/**
 * Saves text to a file and opens the share sheet (Save to Files, AirDrop…); downloads on web.
 * Resolves 'shared' when the share sheet closes: iOS doesn't say whether it was saved or cancelled.
 */
export async function saveAndShare(filename: string, content: string, mimeType: string): Promise<'downloaded' | 'shared'> {
  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return 'downloaded';
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing isn’t available on this device');
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: filename, UTI: mimeType === 'application/json' ? 'public.json' : 'public.comma-separated-values-text' });
  return 'shared';
}

export type PickedFile = { name: string; text: string };

/** Lets the user pick a JSON/CSV file and returns its text, or null when cancelled. */
export async function pickTextFile(kind: 'json' | 'csv' | 'any' = 'any'): Promise<PickedFile | null> {
  const type =
    kind === 'json'
      ? ['application/json', 'public.json', '*/*']
      : kind === 'csv'
        ? ['text/csv', 'text/comma-separated-values', 'public.comma-separated-values-text', '*/*']
        : ['*/*'];
  const res = await DocumentPicker.getDocumentAsync({ type, copyToCacheDirectory: true, multiple: false });
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];
  if (Platform.OS === 'web') {
    const webFile = (asset as unknown as { file?: Blob }).file;
    const text = webFile ? await webFile.text() : await (await fetch(asset.uri)).text();
    return { name: asset.name, text };
  }
  const text = await new File(asset.uri).text();
  return { name: asset.name, text };
}
