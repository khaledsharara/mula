import { Avatar, IconTile } from '../../shared/components/Misc';
import type { Payee } from '../../shared/db/types';

/** Initials for people, a muted shop glyph for places. */
export function PayeeAvatar({ payee, size = 40 }: { payee: Pick<Payee, 'name' | 'kind'>; size?: number }) {
  return payee.kind === 'person' ? <Avatar name={payee.name || '?'} size={size} /> : <IconTile icon="store" size={size} muted />;
}
