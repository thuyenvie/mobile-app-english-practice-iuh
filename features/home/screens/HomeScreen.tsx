import { ScrollView } from 'react-native';
import { TodayStudySessionCard } from '../components/TodayStudySessionCard';
import { HomeDataMessage } from '../components/HomeDataMessage';
import { HomeHeader } from '../components/HomeHeader';
import { HomeScaffold } from '../components/HomeScaffold';
import { HomeSection } from '../components/HomeSection';
import { useHomeData } from '../hooks/useHomeData';

export default function HomeScreen() {
  const { state, retry } = useHomeData();
  return (
    <HomeScaffold>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
        {state.status === 'ready' ? <HomeHeader profile={state.data.profile} welcomeText={state.data.welcomeText} /> : null}
        <TodayStudySessionCard />
        {state.status === 'loading' ? <HomeDataMessage loading message="Đang tải bài học..." />
          : state.status === 'error' ? <HomeDataMessage message={state.message} onRetry={retry} />
          : <>
            {state.data.sections.map((section) => <HomeSection key={section.id} section={section} />)}
            {!state.data.sections.length && <HomeDataMessage message="Chưa có bài học." />}
          </>}
      </ScrollView>
    </HomeScaffold>
  );
}
