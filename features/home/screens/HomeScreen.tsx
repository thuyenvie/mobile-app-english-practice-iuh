import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSession } from '@/lib/auth/useSession';
import { ContinueExamCard } from "../../study/components/ContinueExamCard";
import { ScrollView } from 'react-native';
import { TodayStudySessionCard } from '../components/TodayStudySessionCard';
import { HomeHeader } from '../components/HomeHeader';
import { HomeScaffold } from '../components/HomeScaffold';
import { loadProfile } from '../data/homeDataSource';
import type { HomeProfile } from '../types';

export default function HomeScreen() {
  const session = useSession();
  const { status, generation } = session;
  const [profile, setProfile] = useState<{ generation: number; data: HomeProfile }>();
  useFocusEffect(useCallback(() => {
    if (status !== 'authenticated') return;
    let active = true;
    void loadProfile(status).then(data => {
      if (active) setProfile({ generation, data });
    }).catch(() => undefined);
    return () => { active = false; };
  }, [status, generation]));
  return (
    <HomeScaffold>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
        {status !== 'loading' ? (
          <HomeHeader profile={profile?.generation === generation ? profile.data : { fullName: 'bạn' }} />
        ) : null}
        <TodayStudySessionCard key={session.generation}>
          <ContinueExamCard home />
        </TodayStudySessionCard>
      </ScrollView>
    </HomeScaffold>
  );
}
