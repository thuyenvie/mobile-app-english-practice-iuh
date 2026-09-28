import { homeMock } from './homeMock';
import type { HomeData } from '../types';

// Replace this boundary with API calls + DTO mapping later, without changing UI.
// Login currently returns a token, not a profile, so the profile is mocked too.
export async function loadHomeData(): Promise<HomeData> {
  return homeMock;
}
