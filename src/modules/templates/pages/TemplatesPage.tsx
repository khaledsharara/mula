import { router } from 'expo-router';
import { View } from 'react-native';

import { useLookups } from '../../transactions/data/useLookups';
import { IconButton } from '../../shared/components/Button';
import { ListRow } from '../../shared/components/List';
import { EmptyState, IconTile } from '../../shared/components/Misc';
import { Money } from '../../shared/components/Money';
import { Text } from '../../shared/components/Text';
import { Screen } from '../../shared/layouts/Screen';
import { useSettings } from '../../shared/settings/settingsStore';
import { useTemplates } from '../data/templatesRepo';
import { templateIcon, templateSummary } from '../utils/templateSummary';

export default function TemplatesPage() {
  const { data: templates } = useTemplates();
  const lookups = useLookups();
  const baseCurrency = useSettings((s) => s.baseCurrency);
  const add = () => router.push('/templates/edit');

  return (
    <Screen
      title="Templates"
      back
      testID="templates"
      right={<IconButton icon="plus" label="New template" onPress={add} testID="template-add" />}
    >
      {templates && !templates.length ? (
        <View testID="templates-empty">
          <EmptyState
            icon="sparkle"
            title="No templates yet"
            body="Templates sit at the top of the add screen, so records you repeat, like rent or a morning coffee, take one tap."
            action={{ label: 'Create a template', icon: 'plus', onPress: add }}
          />
        </View>
      ) : null}

      {templates?.length ? (
        <View>
          <Text variant="label" weight="regular" tone="graphite" className="px-5 pb-2 pt-1">
            These appear at the top of the add screen. Tap one there to fill in a record.
          </Text>
          {templates.map((t, i) => {
            const glyph = templateIcon(t, lookups);
            return (
              <ListRow
                key={t.id}
                testID={`template-row-${t.id}`}
                title={t.name}
                subtitle={templateSummary(t, lookups)}
                left={<IconTile icon={glyph.icon} color={glyph.color} muted={glyph.muted} size={40} />}
                right={
                  t.amount ? (
                    <Money
                      minor={t.amount}
                      currency={t.currency ?? undefined}
                      showCurrency={Boolean(t.currency && t.currency !== baseCurrency)}
                      colorIncome={t.type === 'income'}
                      sign="never"
                      size="md"
                    />
                  ) : null
                }
                onPress={() => router.push({ pathname: '/templates/edit', params: { id: t.id } })}
                divider={i < templates.length - 1}
              />
            );
          })}
        </View>
      ) : null}
    </Screen>
  );
}
