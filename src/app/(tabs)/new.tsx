import { Redirect } from 'expo-router';

// Placeholder for the center Add tab. The tab itself opens /add; this only runs if the tab
// route is navigated to directly.
export default function NewRecordTab() {
  return <Redirect href="/add" />;
}
