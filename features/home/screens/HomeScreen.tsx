import { ScrollView } from 'react-native';

import { HomeDataMessage } from '../components/HomeDataMessage';
import { HomeHeader } from '../components/HomeHeader';
import { HomeScaffold } from '../components/HomeScaffold';
import { HomeSection } from '../components/HomeSection';
import { useHomeData } from '../hooks/useHomeData';

export default function HomeScreen() {
  const { state, retry } = useHomeData();
  return (
    <HomeScaffold>
      {state.status === 'loading' ? <HomeDataMessage loading message="Đang tải bài học..." />
        : state.status === 'error' ? <HomeDataMessage message={state.message} onRetry={retry} />
          : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
              <HomeHeader profile={state.data.profile} welcomeText={state.data.welcomeText} />
              {state.data.sections.map((section) => <HomeSection key={section.id} section={section} />)}
              {!state.data.sections.length && <HomeDataMessage message="Chưa có bài học." />}
            </ScrollView>
          )}
    </HomeScaffold>
  );
}
