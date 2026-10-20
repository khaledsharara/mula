import * as Clipboard from 'expo-clipboard';
import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { BottomSheet } from '../../shared/components/BottomSheet';
import { Button } from '../../shared/components/Button';
import { confirm, toast } from '../../shared/components/Feedback';
import { TextField } from '../../shared/components/Fields';
import { ListRow, Section } from '../../shared/components/List';
import { Text } from '../../shared/components/Text';
import { getSettings, setSetting, useSettings } from '../../shared/settings/settingsStore';
import { ageLabel } from '../../shared/utils/dates';
import { ENV_RELAY_URL, availableToken, getRelayConfig, relayRequest } from '../data/relayClient';
import { connectRelay, disconnectRelay, linkCloud, syncNow, type LinkPlan, type SyncResult } from '../data/syncEngine';
import type { CloudCounts, CloudStatus } from '../types';

const records = (c: CloudCounts) => `${c.transactions.toLocaleString('en-US')} records, ${c.accounts} ${c.accounts === 1 ? 'account' : 'accounts'}`;

function resultMessage(r: SyncResult): string {
  if (r.status === 'off') return 'Not connected';
  if (r.status === 'error') return r.message;
  if (r.fromClaude) return `Synced. ${r.fromClaude} ${r.fromClaude === 1 ? 'change' : 'changes'} from Claude`;
  return r.pushed || r.pulled ? 'Synced' : 'Up to date';
}

/**
 * Connects Mula to its relay on Cloudflare: a cloud copy of your data that stays in sync, and
 * that Claude can read and change through its Mula connector.
 */
export function CloudSection() {
  const url = useSettings((s) => s.syncRelayUrl);
  const datasetId = useSettings((s) => s.syncDatasetId);
  const lastSync = useSettings((s) => s.syncLastAt);
  const lastError = useSettings((s) => s.syncLastError);
  const [urlText, setUrlText] = useState(url ?? ENV_RELAY_URL ?? '');
  const [token, setToken] = useState('');
  const [hasToken, setHasToken] = useState(false);
  const [busy, setBusy] = useState<null | 'connect' | 'sync' | 'link'>(null);
  const [plan, setPlan] = useState<LinkPlan | null>(null);
  const [claudeConnected, setClaudeConnected] = useState<boolean | null>(null);
  const linked = Boolean(url && datasetId);

  useEffect(() => {
    void availableToken().then((t) => setHasToken(Boolean(t)));
  }, [url]);

  useEffect(() => {
    if (!linked) return;
    let live = true;
    void (async () => {
      const config = await getRelayConfig();
      if (!config) return;
      const s = await relayRequest<CloudStatus & { claudeConnected: boolean }>(config, '/sync/status').catch(() => null);
      if (live && s) setClaudeConnected(s.claudeConnected);
    })();
    return () => {
      live = false;
    };
  }, [linked, lastSync]);

  const link = async (choice: 'keep-phone' | 'keep-cloud' | 'resume') => {
    setPlan(null);
    setBusy('link');
    const r = await linkCloud(choice);
    setBusy(null);
    toast(r.status === 'ok' ? (choice === 'keep-cloud' ? 'This phone now has the cloud copy' : 'Connected. Your data is in sync') : resultMessage(r));
    // Came here from the welcome screen: the cloud copy brought the accounts, so setup is done.
    if (r.status === 'ok' && choice === 'keep-cloud' && !getSettings().onboarded) {
      await setSetting('onboarded', true);
      router.replace('/');
    }
  };

  const connect = async () => {
    setBusy('connect');
    const r = await connectRelay(urlText, token);
    setBusy(null);
    if (!r.ok) return toast(r.message);
    setToken('');
    setHasToken(true);
    const { mode } = r.plan;
    if (mode === 'choose') return setPlan(r.plan);
    await link(mode === 'download' ? 'keep-cloud' : mode === 'upload' ? 'keep-phone' : 'resume');
  };

  const keepCloud = async () => {
    const ok = await confirm({
      title: 'Replace this phone’s data?',
      message: 'Everything on this phone is replaced by the cloud copy. Export a backup first if you might want it back.',
      confirmLabel: 'Use the cloud copy',
      destructive: true,
    });
    if (ok) await link('keep-cloud');
  };

  const sync = async () => {
    setBusy('sync');
    const r = await syncNow();
    setBusy(null);
    toast(resultMessage(r));
  };

  const copyConnector = async () => {
    await Clipboard.setStringAsync(`${url}/mcp`);
    toast('Copied the connector address');
  };

  const signOutClaude = async () => {
    const ok = await confirm({
      title: 'Sign Claude out?',
      message: 'Claude loses access until you approve it again with your relay password.',
      confirmLabel: 'Sign out',
      destructive: true,
    });
    if (!ok) return;
    const config = await getRelayConfig();
    if (!config) return;
    try {
      await relayRequest(config, '/sync/sign-out-claude', { method: 'POST', body: '{}' });
      setClaudeConnected(false);
      toast('Claude is signed out');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t reach the relay');
    }
  };

  const disconnect = async (eraseCloud: boolean) => {
    const ok = await confirm(
      eraseCloud
        ? {
            title: 'Erase the cloud copy?',
            message: 'The relay forgets all your data and Claude sees nothing. This phone keeps everything and stops syncing.',
            confirmLabel: 'Erase and disconnect',
            destructive: true,
          }
        : {
            title: 'Stop syncing?',
            message: 'This phone keeps its data. The cloud copy stays as it is now, so Claude still sees it until you erase it.',
            confirmLabel: 'Disconnect',
            destructive: true,
          },
    );
    if (!ok) return;
    try {
      await disconnectRelay({ eraseCloud });
    } catch (e) {
      return toast(e instanceof Error ? e.message : 'Couldn’t reach the relay');
    }
    setHasToken(Boolean(await availableToken()));
    setClaudeConnected(null);
    toast(eraseCloud ? 'Cloud copy erased' : 'Disconnected');
  };

  /** A fresh random app token, copied for the relay's setup (APP_TOKEN) and kept here for Connect. */
  const createToken = async () => {
    const fresh = `${randomUUID()}${randomUUID()}`.replace(/-/g, '');
    setToken(fresh);
    await Clipboard.setStringAsync(fresh);
    toast('Token copied. Paste it as APP_TOKEN when you deploy the relay');
  };

  const status = !linked
    ? 'Not connected yet.'
    : lastError
      ? `Last sync failed: ${lastError}`
      : lastSync
        ? `In sync. Last synced ${ageLabel(lastSync)} ago.`
        : 'Connected.';

  return (
    <>
      <Section title="Claude" footer="Mula syncs when it opens, a few seconds after each change, and every minute while it’s open.">
        <Text variant="body" tone="graphite" className="px-5">
          Keeps a copy of your data on your own relay (Cloudflare’s free plan) in sync with this phone. Claude can then answer questions about your money and
          add, edit or delete anything for you: transactions, the review inbox, accounts, categories, payees, planned payments and debts. Every change it makes
          can be undone here. Setup guide: docs/cloud-and-claude.md in the Mula repository on GitHub.
        </Text>
        <Text variant="label" tone={linked && !lastError ? 'income' : lastError ? 'danger' : 'graphite'} className="mt-3 px-5" testID="cloud-status">
          {status}
        </Text>
        {!linked ? (
          <>
            <View className="mt-2">
              <TextField
                label="Relay address"
                value={urlText}
                onChangeText={setUrlText}
                placeholder="https://mula-relay.you.workers.dev"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                testID="cloud-url"
              />
              <TextField
                label="App token"
                value={token}
                onChangeText={setToken}
                placeholder={hasToken ? 'Saved (paste a new one to change it)' : 'The APP_TOKEN you set on the relay'}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                testID="cloud-token"
              />
            </View>
            <View className="flex-row flex-wrap gap-2.5 px-5 pt-2">
              <Button label="Create a token" variant="secondary" icon="key-round" onPress={() => void createToken()} testID="cloud-create-token" />
              <Button
                label="Connect"
                onPress={() => void connect()}
                loading={busy === 'connect' || busy === 'link'}
                disabled={!urlText.trim() || (!token.trim() && !hasToken)}
                testID="cloud-connect"
              />
            </View>
          </>
        ) : (
          <View className="mt-2">
            <ListRow
              title="Claude’s changes"
              subtitle="What Claude did, with undo"
              chevron
              onPress={() => router.push('/claude-activity')}
              testID="claude-activity-link"
            />
            <ListRow
              title="Connector address"
              subtitle={`${url}/mcp`}
              value="Copy"
              onPress={() => void copyConnector()}
              testID="copy-connector-url"
            />
            <Text variant="caption" tone="graphite" className="px-5 pt-1">
              {claudeConnected
                ? 'Claude is signed in.'
                : 'In Claude: Settings › Connectors › Add custom connector, paste this address, then approve with your relay password.'}
            </Text>
            <View className="flex-row flex-wrap gap-2.5 px-5 pt-3">
              <Button label="Sync now" variant="secondary" onPress={() => void sync()} loading={busy === 'sync'} testID="cloud-sync" />
              {claudeConnected ? <Button label="Sign Claude out" variant="ghost" onPress={() => void signOutClaude()} testID="claude-sign-out" /> : null}
              <Button label="Disconnect" variant="ghost" onPress={() => void disconnect(false)} testID="cloud-disconnect" />
              <Button label="Erase cloud copy" variant="ghost" onPress={() => void disconnect(true)} testID="cloud-erase" />
            </View>
          </View>
        )}
      </Section>

      <BottomSheet
        visible={Boolean(plan)}
        onClose={() => setPlan(null)}
        title="Which data should Mula keep?"
        subtitle="This phone and the cloud copy both have data. One replaces the other."
        scroll={false}
        testID="cloud-choice-sheet"
      >
        {plan ? (
          <View className="gap-2.5 px-5 pb-2 pt-3">
            <Button label={`Keep this phone’s data (${records(plan.phone)})`} onPress={() => void link('keep-phone')} testID="cloud-keep-phone" />
            <Button label={`Use the cloud copy (${records(plan.cloud)})`} variant="secondary" onPress={() => void keepCloud()} testID="cloud-keep-cloud" />
            <Button label="Cancel" variant="ghost" onPress={() => setPlan(null)} />
          </View>
        ) : null}
      </BottomSheet>
    </>
  );
}
