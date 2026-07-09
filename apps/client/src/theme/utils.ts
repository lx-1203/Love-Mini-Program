import { designTokens } from './tokens';

type ThemeTokens = typeof designTokens;

export const rpx = (value: number): string => `${value}rpx`;

export const getColor = (path: string, tokens: ThemeTokens = designTokens): string => {
  const parts = path.split('.');
  let result: any = tokens.color;
  for (const part of parts) {
    if (result && typeof result === 'object' && part in result) {
      result = result[part];
    } else {
      return '';
    }
  }
  return typeof result === 'string' ? result : '';
};

export const getShadow = (name: keyof ThemeTokens['shadow'], tokens: ThemeTokens = designTokens): string => {
  return tokens.shadow[name] || '';
};

export const getRadius = (name: keyof ThemeTokens['radius'], tokens: ThemeTokens = designTokens): string => {
  return `${tokens.radius[name]}rpx`;
};

export const getSpacing = (name: keyof ThemeTokens['spacing'], tokens: ThemeTokens = designTokens): string => {
  return `${tokens.spacing[name]}rpx`;
};

export const getGradient = (name: keyof ThemeTokens['color']['gradient'], tokens: ThemeTokens = designTokens): string => {
  return tokens.color.gradient[name] || '';
};

export const classNames = (...classes: (string | boolean | undefined | null)[]): string => {
  return classes.filter(Boolean).join(' ');
};

export const mapVariantToClass = (variant: string, prefix: string): string => `${prefix}--${variant}`;

export const getComponentRadius = (component: 'button' | 'card' | 'tag' | 'input', tokens: ThemeTokens = designTokens): string => {
  const radiusMap = {
    button: tokens.component.button.radius,
    card: tokens.component.card.radius,
    tag: tokens.component.tag.radius,
    input: tokens.component.input.radius,
  };
  return `${radiusMap[component]}rpx`;
};
