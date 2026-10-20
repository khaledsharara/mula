import type { CategoryKind, Nature } from '../types';

type Sub = [key: string, name: string, icon: string, nature: Nature];
type Group = { key: string; name: string; icon: string; color: string; kind: CategoryKind; subs: Sub[] };

/**
 * Wallet by BudgetBakers' category tree, with a needs/wants/savings default per subcategory.
 * IDs are stable (`cat_<key>`) so imports, tests and the SMS rules can refer to them.
 */
export const CATEGORY_TREE: Group[] = [
  {
    key: 'food', name: 'Food & Drinks', icon: 'utensils', color: '#D0533F', kind: 'expense',
    subs: [
      ['food.cafe', 'Bar, cafe', 'coffee', 'want'],
      ['food.groceries', 'Groceries', 'shopping-basket', 'need'],
      ['food.restaurant', 'Restaurant, fast-food', 'pizza', 'want'],
    ],
  },
  {
    key: 'shopping', name: 'Shopping', icon: 'shopping-bag', color: '#3E8FB0', kind: 'expense',
    subs: [
      ['shopping.clothes', 'Clothes & shoes', 'shirt', 'want'],
      ['shopping.pharmacy', 'Drug-store, chemist', 'pill', 'need'],
      ['shopping.electronics', 'Electronics, accessories', 'smartphone', 'want'],
      ['shopping.freetime', 'Free time', 'gamepad-2', 'want'],
      ['shopping.gifts', 'Gifts, joy', 'gift', 'want'],
      ['shopping.beauty', 'Health and beauty', 'sparkles', 'want'],
      ['shopping.home', 'Home, garden', 'sofa', 'want'],
      ['shopping.jewels', 'Jewels, accessories', 'gem', 'want'],
      ['shopping.kids', 'Kids', 'baby', 'need'],
      ['shopping.pets', 'Pets, animals', 'paw-print', 'need'],
      ['shopping.stationery', 'Stationery, tools', 'pencil-ruler', 'need'],
    ],
  },
  {
    key: 'housing', name: 'Housing', icon: 'house', color: '#C77D16', kind: 'expense',
    subs: [
      ['housing.utilities', 'Energy, utilities', 'zap', 'need'],
      ['housing.maintenance', 'Maintenance, repairs', 'wrench', 'need'],
      ['housing.mortgage', 'Mortgage', 'landmark', 'need'],
      ['housing.insurance', 'Property insurance', 'shield', 'need'],
      ['housing.rent', 'Rent', 'key-round', 'need'],
      ['housing.services', 'Services', 'concierge-bell', 'need'],
    ],
  },
  {
    key: 'transport', name: 'Transportation', icon: 'bus', color: '#5B6B7F', kind: 'expense',
    subs: [
      ['transport.business', 'Business trips', 'briefcase', 'need'],
      ['transport.longdistance', 'Long distance', 'plane', 'want'],
      ['transport.public', 'Public transport', 'train-front', 'need'],
      ['transport.taxi', 'Taxi', 'car-taxi-front', 'need'],
    ],
  },
  {
    key: 'vehicle', name: 'Vehicle', icon: 'car', color: '#7C5CC4', kind: 'expense',
    subs: [
      ['vehicle.fuel', 'Fuel', 'fuel', 'need'],
      ['vehicle.leasing', 'Leasing', 'signature', 'need'],
      ['vehicle.parking', 'Parking', 'square-parking', 'need'],
      ['vehicle.rentals', 'Rentals', 'car-front', 'want'],
      ['vehicle.insurance', 'Vehicle insurance', 'shield-check', 'need'],
      ['vehicle.maintenance', 'Vehicle maintenance', 'cog', 'need'],
    ],
  },
  {
    key: 'life', name: 'Life & Entertainment', icon: 'party-popper', color: '#1F8A70', kind: 'expense',
    subs: [
      ['life.fitness', 'Active sport, fitness', 'dumbbell', 'want'],
      ['life.alcohol', 'Alcohol, tobacco', 'wine', 'want'],
      ['life.subscriptions', 'Books, audio, subscriptions', 'book-open', 'want'],
      ['life.charity', 'Charity, gifts', 'hand-heart', 'want'],
      ['life.events', 'Culture, sport events', 'ticket', 'want'],
      ['life.education', 'Education, development', 'graduation-cap', 'need'],
      ['life.health', 'Health care, doctor', 'stethoscope', 'need'],
      ['life.hobbies', 'Hobbies', 'palette', 'want'],
      ['life.holiday', 'Holiday, trips, hotels', 'luggage', 'want'],
      ['life.lifeevents', 'Life events', 'cake', 'want'],
      ['life.gambling', 'Lottery, gambling', 'dices', 'want'],
      ['life.streaming', 'TV, Streaming', 'tv', 'want'],
      ['life.wellness', 'Wellness, beauty', 'flower-2', 'want'],
    ],
  },
  {
    key: 'comms', name: 'Communication, PC', icon: 'monitor-smartphone', color: '#2F6FD0', kind: 'expense',
    subs: [
      ['comms.internet', 'Internet', 'wifi', 'need'],
      ['comms.phone', 'Phone, cell phone', 'phone', 'need'],
      ['comms.postal', 'Postal services', 'mail', 'need'],
      ['comms.software', 'Software, apps, games', 'app-window', 'want'],
    ],
  },
  {
    key: 'financial', name: 'Financial expenses', icon: 'receipt', color: '#4B7A86', kind: 'expense',
    subs: [
      ['financial.advisory', 'Advisory', 'messages-square', 'need'],
      ['financial.fees', 'Charges, Fees', 'badge-percent', 'need'],
      ['financial.childsupport', 'Child Support', 'baby', 'need'],
      ['financial.fines', 'Fines', 'gavel', 'need'],
      ['financial.insurances', 'Insurances', 'shield', 'need'],
      ['financial.loan', 'Loan, interests', 'banknote', 'need'],
      ['financial.taxes', 'Taxes', 'landmark', 'need'],
    ],
  },
  {
    key: 'investments', name: 'Investments', icon: 'trending-up', color: '#B4417A', kind: 'expense',
    subs: [
      ['investments.collections', 'Collections', 'library', 'saving'],
      ['investments.financial', 'Financial investments', 'chart-line', 'saving'],
      ['investments.realty', 'Realty', 'building', 'saving'],
      ['investments.savings', 'Savings', 'piggy-bank', 'saving'],
      ['investments.vehicles', 'Vehicles, chattels', 'car', 'saving'],
    ],
  },
  {
    key: 'income', name: 'Income', icon: 'wallet', color: '#2E7D57', kind: 'income',
    subs: [
      ['income.checks', 'Checks, coupons', 'ticket-percent', 'none'],
      ['income.childsupport', 'Child Support', 'baby', 'none'],
      ['income.grants', 'Dues & grants', 'hand-coins', 'none'],
      ['income.gifts', 'Gifts', 'gift', 'none'],
      ['income.interest', 'Interests, dividends', 'percent', 'none'],
      ['income.lending', 'Lending, renting', 'handshake', 'none'],
      ['income.gambling', 'Lottery, gambling', 'dices', 'none'],
      ['income.refunds', 'Refunds (tax, purchase)', 'undo-2', 'none'],
      ['income.rental', 'Rental income', 'house', 'none'],
      ['income.sale', 'Sale', 'tag', 'none'],
      ['income.wage', 'Wage, invoices', 'briefcase-business', 'none'],
    ],
  },
  {
    key: 'others', name: 'Others', icon: 'shapes', color: '#8A8A8F', kind: 'expense',
    subs: [['others.missing', 'Missing', 'circle-question-mark', 'none']],
  },
];

export const catId = (key: string): string => `cat_${key}`;

/** Category IDs the app logic relies on. */
export const SYSTEM_CATEGORIES = {
  fees: catId('financial.fees'),
  refunds: catId('income.refunds'),
  missing: catId('others.missing'),
  taxi: catId('transport.taxi'),
  groceries: catId('food.groceries'),
  restaurant: catId('food.restaurant'),
  cafe: catId('food.cafe'),
  wage: catId('income.wage'),
  gifts: catId('income.gifts'),
  others: catId('others'),
} as const;

export type SeedCategoryRow = {
  id: string;
  parent_id: string | null;
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  nature: Nature;
  system_key: string;
  sort_order: number;
};

export function seedCategoryRows(): SeedCategoryRow[] {
  const rows: SeedCategoryRow[] = [];
  CATEGORY_TREE.forEach((g, gi) => {
    rows.push({
      id: catId(g.key), parent_id: null, name: g.name, kind: g.kind, icon: g.icon, color: g.color,
      nature: 'none', system_key: g.key, sort_order: gi,
    });
    g.subs.forEach(([key, name, icon, nature], si) => {
      rows.push({
        id: catId(key), parent_id: catId(g.key), name, kind: g.kind, icon, color: g.color, nature,
        system_key: key, sort_order: si,
      });
    });
  });
  return rows;
}
