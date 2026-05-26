import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@/contexts/AuthContext';
import { LoginScreen } from '@/screens/LoginScreen';
import { MainTabs } from '@/navigation/MainTabs';
import { DocumentDetailScreen } from '@/screens/DocumentDetailScreen';
import { ScanDocumentScreen } from '@/screens/ScanDocumentScreen';
import { UploadReviewScreen } from '@/screens/UploadReviewScreen';
import { RequestDetailScreen } from '@/screens/RequestDetailScreen';
import { colors } from '@/lib/theme';

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  DocumentDetail: { documentId: string };
  RequestDetail: { requestId: string };
  Scan: { requestId?: string } | undefined;
  UploadReview: {
    pageUris: string[];
    suggestedTitle?: string;
    requestId?: string;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { loading, session, clientAccount } = useAuth();

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const authed = !!session && clientAccount?.access_status === 'active';

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      {!authed ? (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Main"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="DocumentDetail"
            component={DocumentDetailScreen}
            options={{ title: 'Document' }}
          />
          <Stack.Screen
            name="RequestDetail"
            component={RequestDetailScreen}
            options={{ title: 'Demande' }}
          />
          <Stack.Screen
            name="Scan"
            component={ScanDocumentScreen}
            options={{ title: 'Scanner un document' }}
          />
          <Stack.Screen
            name="UploadReview"
            component={UploadReviewScreen}
            options={{ title: 'Vérifier et envoyer' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
