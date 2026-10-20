import { View } from 'react-native';

import { useAccounts } from '../../accounts/data/accountsRepo';
import { BottomSheet } from '../../shared/components/BottomSheet';
import { Icon } from '../../shared/components/Icon';
import { ListRow } from '../../shared/components/List';
import { IconTile } from '../../shared/components/Misc';
import type { ID } from '../../shared/db/types';

const Check = () => (
  <View className="ml-2">
    <Icon name="check" size={18} tone="accent" />
  </View>
);

/** "Card Payments (EGP)" -> "card-payments-egp"; falls back to the index for non-Latin names. */
export function testIdPart(s: string, fallback: number): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || String(fallback)
  );
}

type AccountChoiceProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  selected: ID | null | undefined;
  onSelect: (id: ID | null) => void;
  /** Label of the "no account" choice, e.g. "Don’t import these". */
  noneLabel: string;
  testID?: string;
};

/** Account list with an explicit "none" choice, for mappings that may be left out. */
export function AccountChoiceSheet({ visible, onClose, title, subtitle, selected, onSelect, noneLabel, testID }: AccountChoiceProps) {
  const { data: accounts } = useAccounts();
  const choose = (id: ID | null) => {
    onSelect(id);
    onClose();
  };
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} subtitle={subtitle} testID={testID}>
      {(accounts ?? []).map((a, i) => (
        <ListRow
          key={a.id}
          testID={`account-choice-${testIdPart(a.name, i)}`}
          title={a.name}
          subtitle={a.currency}
          left={<IconTile icon={a.icon} color={a.color} size={36} />}
          right={a.id === selected ? <Check /> : null}
          onPress={() => choose(a.id)}
        />
      ))}
      <ListRow
        testID="account-choice-none"
        title={noneLabel}
        left={<IconTile icon="x" size={36} muted />}
        right={selected == null ? <Check /> : null}
        divider={false}
        onPress={() => choose(null)}
      />
    </BottomSheet>
  );
}

type ColumnChoiceProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  headers: string[];
  samples: Record<string, string | null>;
  selected: string | null;
  onSelect: (header: string | null) => void;
};

/** Lists a CSV file's columns (with a sample value each) plus "Not used". */
export function ColumnChoiceSheet({ visible, onClose, title, subtitle, headers, samples, selected, onSelect }: ColumnChoiceProps) {
  const choose = (h: string | null) => {
    onSelect(h);
    onClose();
  };
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} subtitle={subtitle} testID="column-sheet">
      <ListRow
        testID="column-option-none"
        title="Not used"
        right={selected == null ? <Check /> : null}
        onPress={() => choose(null)}
      />
      {headers.map((h, i) => (
        <ListRow
          key={`${h}-${i}`}
          testID={`column-option-${i + 1}`}
          title={h || `Column ${i + 1}`}
          subtitle={samples[h] ? `For example ${samples[h]}` : 'Empty in the first rows'}
          right={h === selected ? <Check /> : null}
          divider={i < headers.length - 1}
          onPress={() => choose(h)}
        />
      ))}
    </BottomSheet>
  );
}
