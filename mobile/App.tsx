import React, {useMemo, useState} from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {FieldAuthProvider} from './src/context/FieldAuthContext';
import {DashboardScreen} from './src/screens/DashboardScreen';
import {EnrollScreen} from './src/screens/EnrollScreen';
import {VerifyScreen} from './src/screens/VerifyScreen';
import {QueueScreen} from './src/screens/QueueScreen';
import {SyncStatusScreen} from './src/screens/SyncStatusScreen';
import {SettingsScreen} from './src/screens/SettingsScreen';
import {colors} from './src/theme';

type TabKey =
  | 'dashboard'
  | 'enroll'
  | 'verify'
  | 'queue'
  | 'sync'
  | 'settings';

const tabs: Array<{key: TabKey; label: string}> = [
  {key: 'dashboard', label: 'Dashboard'},
  {key: 'enroll', label: 'Enroll'},
  {key: 'verify', label: 'Verify'},
  {key: 'queue', label: 'Queue'},
  {key: 'sync', label: 'Sync'},
  {key: 'settings', label: 'Settings'},
];

function ActiveScreen({activeTab}: {activeTab: TabKey}) {
  switch (activeTab) {
    case 'dashboard':
      return <DashboardScreen />;
    case 'enroll':
      return <EnrollScreen />;
    case 'verify':
      return <VerifyScreen />;
    case 'queue':
      return <QueueScreen />;
    case 'sync':
      return <SyncStatusScreen />;
    case 'settings':
      return <SettingsScreen />;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const fixedScreen = activeTab === 'enroll' || activeTab === 'verify';
  const activeLabel = useMemo(
    () => tabs.find(tab => tab.key === activeTab)?.label ?? 'Dashboard',
    [activeTab],
  );

  return (
    <FieldAuthProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>Secure Field Attendance</Text>
            <Text style={styles.title}>NHAI FieldAuth</Text>
          </View>
          <Text style={styles.activeLabel}>{activeLabel}</Text>
        </View>
        <ScrollView
          horizontal
          style={styles.tabBar}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              accessibilityRole="button"
              onPress={() => setActiveTab(tab.key)}
              style={[
                styles.tab,
                activeTab === tab.key ? styles.activeTab : null,
              ]}>
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === tab.key ? styles.activeTabLabel : null,
                ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {fixedScreen ? (
          <View style={styles.fixedBody}>
            <ActiveScreen activeTab={activeTab} />
          </View>
        ) : (
          <ScrollView style={styles.body} contentContainerStyle={styles.content}>
            <ActiveScreen activeTab={activeTab} />
          </ScrollView>
        )}
      </SafeAreaView>
    </FieldAuthProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  kicker: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
  },
  activeLabel: {
    color: colors.green,
    fontSize: 13,
    fontWeight: '800',
  },
  tabs: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  tabBar: {
    flexGrow: 0,
    height: 54,
    maxHeight: 54,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  tab: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'center',
    backgroundColor: colors.panel,
  },
  activeTab: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  tabLabel: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  activeTabLabel: {
    color: colors.white,
  },
  body: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  fixedBody: {
    flex: 1,
  },
});
