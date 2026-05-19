import {
  IconBolt,
  IconBook,
  IconBriefcase,
  IconBuildingBank,
  IconCar,
  IconCash,
  IconChartBar,
  IconCoffee,
  IconCreditCard,
  IconDeviceTv,
  IconGift,
  IconHeart,
  IconHome,
  IconMoodSmile,
  IconMusic,
  IconPlane,
  IconReceipt,
  IconShirt,
  IconShoppingCart,
  IconStar,
  IconTool,
  IconTrendingUp,
  IconUmbrella,
  IconWallet,
  type Icon,
} from '@tabler/icons-react';

export interface ICategoryIcon {
  key: string;
  label: string;
  Component: Icon;
}

export const CATEGORY_ICONS: ICategoryIcon[] = [
  { key: 'cash', label: 'Cash', Component: IconCash },
  { key: 'wallet', label: 'Wallet', Component: IconWallet },
  { key: 'shopping-cart', label: 'Shopping', Component: IconShoppingCart },
  { key: 'home', label: 'Home', Component: IconHome },
  { key: 'car', label: 'Car', Component: IconCar },
  { key: 'coffee', label: 'Coffee', Component: IconCoffee },
  { key: 'heart', label: 'Health', Component: IconHeart },
  { key: 'gift', label: 'Gift', Component: IconGift },
  { key: 'plane', label: 'Travel', Component: IconPlane },
  { key: 'briefcase', label: 'Work', Component: IconBriefcase },
  { key: 'trending-up', label: 'Investments', Component: IconTrendingUp },
  { key: 'chart-bar', label: 'Reports', Component: IconChartBar },
  { key: 'building-bank', label: 'Bank', Component: IconBuildingBank },
  { key: 'credit-card', label: 'Card', Component: IconCreditCard },
  { key: 'receipt', label: 'Bills', Component: IconReceipt },
  { key: 'bolt', label: 'Utilities', Component: IconBolt },
  { key: 'book', label: 'Education', Component: IconBook },
  { key: 'music', label: 'Music', Component: IconMusic },
  { key: 'device-tv', label: 'Entertainment', Component: IconDeviceTv },
  { key: 'shirt', label: 'Clothing', Component: IconShirt },
  { key: 'mood-smile', label: 'Leisure', Component: IconMoodSmile },
  { key: 'star', label: 'Favorite', Component: IconStar },
  { key: 'tool', label: 'Maintenance', Component: IconTool },
  { key: 'umbrella', label: 'Insurance', Component: IconUmbrella },
];

export function getCategoryIcon(key: string): Icon {
  return CATEGORY_ICONS.find((entry) => entry.key === key)?.Component ?? IconCash;
}

export const DEFAULT_CATEGORY_ICON = CATEGORY_ICONS[0].key;
