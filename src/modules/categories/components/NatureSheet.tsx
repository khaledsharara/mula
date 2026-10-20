import { BottomSheet } from '../../shared/components/BottomSheet';
import { Icon } from '../../shared/components/Icon';
import { ListRow } from '../../shared/components/List';
import type { Category, Nature } from '../../shared/db/types';
import { setCategoryNature } from '../data/categoriesRepo';
import { NATURE_HINTS, NATURE_OPTIONS, natureLabel } from '../utils/categoryMeta';

type Props = {
  visible: boolean;
  onClose: () => void;
  category: Category | null;
  /** The group it belongs to; "Not set" follows the group's setting. */
  parent?: Category | null;
};

/** Picks need / want / saving for one category and saves it right away. */
export function NatureSheet({ visible, onClose, category, parent }: Props) {
  const choose = (n: Nature) => {
    onClose();
    if (category && category.nature !== n) void setCategoryNature(category.id, n);
  };

  const followsParent = parent && parent.nature !== 'none' ? `Follows ${parent.name}: ${natureLabel(parent.nature)}` : null;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Counts as"
      subtitle={category ? `Where spending on ${category.name} lands in your needs, wants and savings split.` : undefined}
      testID="nature-sheet"
    >
      {NATURE_OPTIONS.map((o, i) => (
        <ListRow
          key={o.value}
          testID={`nature-option-${o.value}`}
          title={o.label}
          subtitle={o.value === 'none' ? followsParent : NATURE_HINTS[o.value]}
          right={category?.nature === o.value ? <Icon name="check" size={18} tone="accent" /> : null}
          divider={i < NATURE_OPTIONS.length - 1}
          onPress={() => choose(o.value)}
        />
      ))}
    </BottomSheet>
  );
}
