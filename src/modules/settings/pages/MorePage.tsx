import { router } from 'expo-router';
import type { ReactNode } from 'react';

import { backupAgeLabel } from '../../data-transfer/utils/format';
import { useDebts } from '../../debts/data/debtsRepo';
import { ListRow, Section } from '../../shared/components/List';
import { IconTile } from '../../shared/components/Misc';
import { Text } from '../../shared/components/Text';
import { Screen } from '../../shared/layouts/Screen';
import { useSettings } from '../../shared/settings/settingsStore';

type Link = { title: string; icon: string; href: string; testID: string; value?: string; right?: ReactNode };

function LinkSection({ title, links }: { title: string; links: Link[] }) {
  return (
    <Section title={title}>
      {links.map((l, i) => (
        <ListRow
          key={l.href}
          testID={l.testID}
          title={l.title}
          left={<IconTile icon={l.icon} size={36} muted />}
          value={l.value}
          right={l.right}
          chevron
          divider={i < links.length - 1}
          onPress={() => router.push(l.href)}
        />
      ))}
    </Section>
  );
}

export default function MorePage() {
  const { data: debts } = useDebts();
  const lastBackupAt = useSettings((s) => s.lastBackupAt);
  const openDebts = (debts ?? []).filter((d) => d.status === 'open').length;

  return (
    <Screen title="More" large tabBar testID="more-page">
      <LinkSection
        title="Money"
        links={[
          { title: 'Accounts', icon: 'landmark', href: '/accounts', testID: 'more-accounts' },
          { title: 'Planned payments', icon: 'repeat', href: '/recurring', testID: 'more-recurring' },
          { title: 'Debts', icon: 'handshake', href: '/debts', testID: 'more-debts', value: openDebts ? `${openDebts} open` : undefined },
          { title: 'Templates', icon: 'sparkle', href: '/templates', testID: 'more-templates' },
        ]}
      />
      <LinkSection
        title="Organize"
        links={[
          { title: 'Categories', icon: 'shapes', href: '/categories', testID: 'more-categories' },
          { title: 'Payees and names', icon: 'users', href: '/payees', testID: 'more-payees' },
        ]}
      />
      <LinkSection
        title="Data"
        links={[
          {
            title: 'Import and export',
            icon: 'archive',
            href: '/data',
            testID: 'more-data',
            value: lastBackupAt ? `Backed up ${backupAgeLabel(lastBackupAt)}` : undefined,
            right: lastBackupAt ? undefined : (
              <Text variant="label" weight="regular" tone="alert" testID="more-no-backup">
                No backup yet
              </Text>
            ),
          },
        ]}
      />
      <LinkSection
        title="App"
        links={[
          { title: 'Automation', icon: 'zap', href: '/integrations', testID: 'more-integrations' },
          { title: 'Settings', icon: 'settings-2', href: '/settings', testID: 'more-settings' },
        ]}
      />
    </Screen>
  );
}
