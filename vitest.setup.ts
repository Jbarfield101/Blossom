import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// @ts-expect-error - jsdom doesn't provide this type
global.ResizeObserver = ResizeObserver;

