import {
  Apple,
  BookOpen,
  Droplets,
  Flower2,
  MoonStar,
  Music2,
  Pencil,
  PersonStanding,
  Pill,
  Star,
  Target,
  Wind,
  type LucideIcon,
} from 'lucide-react';

const HABIT_ICON_MAP: Record<string, LucideIcon> = {
  Star,
  Droplets,
  BookOpen,
  PersonStanding,
  Wind,
  MoonStar,
  Music2,
  Apple,
  Pencil,
  Flower2,
  Pill,
  Target,
};

export default function HabitMark({ value, size = 21 }: { value: string; size?: number }) {
  const Icon = HABIT_ICON_MAP[value] ?? Star;
  return <Icon size={size} strokeWidth={1.5} aria-hidden="true" />;
}
